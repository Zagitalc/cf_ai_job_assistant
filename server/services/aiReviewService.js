const {
    AI_SUPPORTED_SECTION_IDS,
    CONTENT_SECTION_IDS,
    RESPONSE_JSON_SCHEMA,
    getRootField,
    hasExistingStringPath,
    redactSensitiveCvData,
    validateAiResponseShape
} = require("../utils/aiSchema");

class AiReviewError extends Error {
    constructor(message, statusCode = 502, details = []) {
        super(message);
        this.name = "AiReviewError";
        this.statusCode = statusCode;
        this.details = details;
    }
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const BLOCKED_IDENTITY_FIELDS = new Set(["name", "email", "phone", "linkedin"]);

const SECTION_TITLES = {
    summary: "Profile Summary",
    work: "Work",
    volunteer: "Volunteer",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    awards: "Awards",
    "additional-info": "Additional Info"
};

const readMessageText = (payload = {}) => {
    if (typeof payload === "string") {
        return payload;
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
            .join("")
            .trim();
    }

    return "";
};

const tryParseJson = (text = "") => {
    try {
        return JSON.parse(text);
    } catch (error) {
        return null;
    }
};

const parseJsonLenient = (text = "") => {
    const direct = tryParseJson(text);
    if (direct) {
        return direct;
    }

    const fencedMatch = String(text).match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch && fencedMatch[1]) {
        const fencedParsed = tryParseJson(fencedMatch[1].trim());
        if (fencedParsed) {
            return fencedParsed;
        }
    }

    const firstBrace = String(text).indexOf("{");
    const lastBrace = String(text).lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return tryParseJson(String(text).slice(firstBrace, lastBrace + 1));
    }

    return null;
};

const pathTokens = (fieldPath = "") => {
    const tokens = [];
    const matcher = /([^[.\]]+)|\[(\d+)\]/g;
    let match = matcher.exec(fieldPath);

    while (match) {
        if (typeof match[1] === "string") {
            tokens.push(match[1]);
        } else if (typeof match[2] === "string") {
            tokens.push(Number(match[2]));
        }
        match = matcher.exec(fieldPath);
    }

    return tokens;
};

const getValueByPath = (target, fieldPath = "") => {
    const tokens = pathTokens(fieldPath);
    if (!tokens.length) {
        return "";
    }

    let cursor = target;
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (cursor === null || cursor === undefined) {
            return "";
        }
        cursor = cursor[token];
    }

    return typeof cursor === "string" ? cursor : "";
};

const sectionFromFieldPath = (fieldPath = "") => {
    const root = getRootField(fieldPath);
    if (root === "summary") return "summary";
    if (root === "workExperience") return "work";
    if (root === "volunteerExperience") return "volunteer";
    if (root === "education") return "education";
    if (root === "projects") return "projects";
    if (root === "skills") return "skills";
    if (root === "certifications") return "certifications";
    if (root === "awards") return "awards";
    if (root === "additionalInfo") return "additional-info";
    return "";
};

const collectSectionFieldPaths = (sectionId, cvData = {}) => {
    if (sectionId === "summary" && typeof cvData.summary === "string") {
        return ["summary"];
    }

    if (sectionId === "work") {
        return (cvData.workExperience || []).map((_, index) => `workExperience[${index}]`);
    }

    if (sectionId === "volunteer") {
        return (cvData.volunteerExperience || []).map((_, index) => `volunteerExperience[${index}]`);
    }

    if (sectionId === "projects") {
        return (cvData.projects || []).map((_, index) => `projects[${index}]`);
    }

    if (sectionId === "certifications") {
        return (cvData.certifications || []).map((_, index) => `certifications[${index}]`);
    }

    if (sectionId === "awards") {
        return (cvData.awards || []).map((_, index) => `awards[${index}]`);
    }

    if (sectionId === "skills") {
        return (cvData.skills || []).map((_, index) => `skills[${index}]`);
    }

    if (sectionId === "additional-info" && typeof cvData.additionalInfo === "string") {
        return ["additionalInfo"];
    }

    if (sectionId === "education") {
        const paths = [];
        (cvData.education || []).forEach((_, index) => {
            paths.push(`education[${index}].degree`);
            paths.push(`education[${index}].school`);
            paths.push(`education[${index}].location`);
            paths.push(`education[${index}].additionalInfo`);
        });
        return paths;
    }

    return [];
};

const collectAllCandidatePaths = (cvData = {}) =>
    AI_SUPPORTED_SECTION_IDS.flatMap((sectionId) => collectSectionFieldPaths(sectionId, cvData))
        .filter((fieldPath) => hasExistingStringPath(cvData, fieldPath))
        .filter((fieldPath) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

const pickFallbackFieldPath = (sectionId, requestInput) => {
    const sectionPaths = collectSectionFieldPaths(sectionId, requestInput.cvData)
        .filter((fieldPath) => hasExistingStringPath(requestInput.cvData, fieldPath))
        .filter((fieldPath) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

    if (sectionPaths.length > 0) {
        return sectionPaths[0];
    }

    const globalPaths = collectAllCandidatePaths(requestInput.cvData);
    return globalPaths[0] || "";
};

const normalizeSuggestion = (rawSuggestion, index, requestInput) => {
    const fallbackSection =
        requestInput.mode === "section"
            ? requestInput.sectionId
            : AI_SUPPORTED_SECTION_IDS.find((sectionId) => collectSectionFieldPaths(sectionId, requestInput.cvData).length > 0) || "summary";

    const requestedFieldPath = String(
        rawSuggestion?.fieldPath || rawSuggestion?.field || rawSuggestion?.path || ""
    ).trim();

    const derivedSection = sectionFromFieldPath(requestedFieldPath);
    const proposedSection = String(rawSuggestion?.sectionId || derivedSection || fallbackSection).trim();
    const safeSection = requestInput.mode === "section"
        ? requestInput.sectionId
        : (AI_SUPPORTED_SECTION_IDS.includes(proposedSection) ? proposedSection : fallbackSection);

    let safeFieldPath = requestedFieldPath;
    const existingPath = hasExistingStringPath(requestInput.cvData, safeFieldPath);
    const blockedPath = BLOCKED_IDENTITY_FIELDS.has(getRootField(safeFieldPath));
    if (!existingPath || blockedPath) {
        safeFieldPath = pickFallbackFieldPath(safeSection, requestInput);
    }

    if (!safeFieldPath) {
        return null;
    }

    const existingText = getValueByPath(requestInput.cvData, safeFieldPath);
    const fallbackSuggestedText = existingText
        ? `${existingText} (refine with scope, action verbs, and measurable impact).`
        : "Refine this content with specific actions, context, and measurable outcomes.";

    return {
        id: String(rawSuggestion?.id || `sug_${index + 1}`),
        priority: Number.isFinite(rawSuggestion?.priority) ? Math.max(1, Math.round(rawSuggestion.priority)) : index + 1,
        sectionId: safeSection,
        fieldPath: safeFieldPath,
        reason: String(rawSuggestion?.reason || rawSuggestion?.issue || "This change increases clarity and recruiter impact.").trim(),
        suggestedText: String(rawSuggestion?.suggestedText || rawSuggestion?.suggestion || fallbackSuggestedText).trim(),
        title: String(rawSuggestion?.title || `Improve ${SECTION_TITLES[safeSection] || safeSection}`).trim()
    };
};

const enforceSuggestionCardinality = (topFixes, requestInput) => {
    const limited = (topFixes || []).slice(0, requestInput.mode === "section" ? 3 : 3);

    if (requestInput.mode !== "section") {
        return limited;
    }

    const minCount = 2;
    if (limited.length >= minCount) {
        return limited;
    }

    const fallbackPaths = collectSectionFieldPaths(requestInput.sectionId, requestInput.cvData)
        .filter((fieldPath) => hasExistingStringPath(requestInput.cvData, fieldPath))
        .filter((fieldPath) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

    const targetPath = fallbackPaths[0] || collectAllCandidatePaths(requestInput.cvData)[0] || "";
    if (!targetPath) {
        return limited;
    }

    const synthesized = limited.slice();
    while (synthesized.length < minCount) {
        synthesized.push({
            id: `sug_auto_${synthesized.length + 1}`,
            priority: synthesized.length + 1,
            sectionId: requestInput.sectionId,
            fieldPath: targetPath,
            reason: "Focused edits improve readability and impact.",
            suggestedText: "Refine this content with stronger action verbs and measurable outcomes.",
            title: synthesized.length === 0 ? "Strengthen phrasing" : "Add measurable impact"
        });
    }

    return synthesized;
};

const normalizeLooseResponse = (rawResponse = {}, requestInput = {}) => {
    const rawFixes = Array.isArray(rawResponse?.topFixes)
        ? rawResponse.topFixes
        : (Array.isArray(rawResponse?.suggestions) ? rawResponse.suggestions : []);

    const normalizedTopFixes = rawFixes
        .map((fix, index) => normalizeSuggestion(fix, index, requestInput))
        .filter(Boolean);

    const topFixes = enforceSuggestionCardinality(normalizedTopFixes, requestInput);
    const mode = requestInput.mode;
    const rawGeneratedAt = String(rawResponse?.generatedAt || "").trim();
    const generatedAt =
        rawGeneratedAt && !Number.isNaN(new Date(rawGeneratedAt).getTime())
            ? rawGeneratedAt
            : new Date().toISOString();

    const rawBySection = rawResponse?.bySection && typeof rawResponse.bySection === "object"
        ? rawResponse.bySection
        : {};

    const bySection = {};
    Object.entries(rawBySection).forEach(([sectionId, sectionFeedback]) => {
        if (!CONTENT_SECTION_IDS.includes(sectionId) || !sectionFeedback || typeof sectionFeedback !== "object") {
            return;
        }
        bySection[sectionId] = {
            strengths: Array.isArray(sectionFeedback.strengths) ? sectionFeedback.strengths.slice(0, 4) : [],
            suggestions: Array.isArray(sectionFeedback.suggestions) ? sectionFeedback.suggestions.slice(0, 5) : []
        };
    });

    if (mode === "section") {
        if (!bySection[requestInput.sectionId]) {
            bySection[requestInput.sectionId] = { strengths: [], suggestions: [] };
        }
        if (bySection[requestInput.sectionId].suggestions.length === 0) {
            bySection[requestInput.sectionId].suggestions = topFixes.map((fix) => fix.title).slice(0, 3);
        }
    } else if (Object.keys(bySection).length === 0 && topFixes.length > 0) {
        topFixes.forEach((fix) => {
            if (!bySection[fix.sectionId]) {
                bySection[fix.sectionId] = { strengths: [], suggestions: [] };
            }
            bySection[fix.sectionId].suggestions.push(fix.title);
        });
    }

    const overallTier = ["Needs Work", "Fair", "Strong", "Excellent"].includes(rawResponse?.overall?.tier)
        ? rawResponse.overall.tier
        : (topFixes.length > 0 ? "Fair" : "Strong");

    const overallSummary = String(rawResponse?.overall?.summary || "").trim()
        || (topFixes.length > 0
            ? "Targeted improvements identified. Apply the top fixes to improve clarity and impact."
            : "Your CV is in a strong baseline state. Keep refining with specific results.");

    const normalized = {
        mode,
        generatedAt,
        overall: {
            tier: overallTier,
            score: Number.isFinite(rawResponse?.overall?.score) ? Number(rawResponse.overall.score) : (topFixes.length > 0 ? 72 : 85),
            summary: overallSummary
        },
        topFixes,
        bySection
    };

    if (mode === "job-match") {
        normalized.jobMatch = {
            score: Number.isFinite(rawResponse?.jobMatch?.score) ? Number(rawResponse.jobMatch.score) : 65,
            missingKeywords: Array.isArray(rawResponse?.jobMatch?.missingKeywords) ? rawResponse.jobMatch.missingKeywords : [],
            matchedKeywords: Array.isArray(rawResponse?.jobMatch?.matchedKeywords) ? rawResponse.jobMatch.matchedKeywords : [],
            roleFitNotes: Array.isArray(rawResponse?.jobMatch?.roleFitNotes)
                ? rawResponse.jobMatch.roleFitNotes
                : ["Role fit estimated from available CV content."]
        };
    }

    return normalized;
};

const buildSystemPrompt = () => `
You are an expert resume reviewer. Follow these rules exactly:
- Return valid JSON only, matching the provided schema.
- Suggest targeted edits only (no full rewrites).
- Do not invent experience, projects, education, dates, or companies.
- Do not modify identity/contact fields (name/email/phone/linkedin).
- Use only existing section IDs and existing field paths from the input.
- Keep suggestions concise and actionable.
- Include why each fix matters.
`.trim();

const buildUserPrompt = ({ mode, sectionId, jobDescription, sectionLayout, cvData }) => {
    const instructions = [
        `Mode: ${mode}.`,
        mode === "section" ? `Focus only on sectionId: ${sectionId}.` : "Review the full CV.",
        mode === "job-match" ? "Evaluate CV against the provided job description." : "No job description comparison required.",
        "Return a response object with overall, topFixes, bySection, and jobMatch (job-match mode only).",
        "For section mode, return exactly 2-3 topFixes.",
        "For full/job-match mode, return at most 3 topFixes sorted by impact.",
        "Use only fieldPath values that already exist in cvData and target string fields."
    ];

    return `${instructions.join("\n")}\n\nInput JSON:\n${JSON.stringify(
        {
            mode,
            sectionId,
            jobDescription: mode === "job-match" ? jobDescription : "",
            sectionLayout,
            cvData
        },
        null,
        2
    )}`;
};

const postOpenAi = async ({ apiKey, requestPayload, fetchImpl }) =>
    fetchImpl(OPENAI_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestPayload)
    });

const callOpenAi = async ({ apiKey, model, messages, fetchImpl }) => {
    const schemaPayload = {
        model,
        messages,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "cv_review_response",
                strict: true,
                schema: RESPONSE_JSON_SCHEMA
            }
        }
    };

    let response = await postOpenAi({
        apiKey,
        requestPayload: schemaPayload,
        fetchImpl
    });

    if (!response.ok && response.status === 400) {
        const fallbackPayload = {
            model,
            messages: [
                ...messages,
                {
                    role: "user",
                    content: "Return raw JSON only. Do not include markdown fences."
                }
            ]
        };

        response = await postOpenAi({
            apiKey,
            requestPayload: fallbackPayload,
            fetchImpl
        });
    }

    if (!response.ok) {
        const errorBody = await response.text();
        const authError = response.status === 401 || response.status === 403;
        const message = authError
            ? "OpenAI authentication failed. Check OPENAI_API_KEY in server/.env."
            : `OpenAI request failed with status ${response.status}.`;
        throw new AiReviewError(message, response.status, [errorBody]);
    }

    const data = await response.json();
    const messageText = readMessageText(data);
    if (!messageText) {
        throw new AiReviewError("OpenAI returned an empty response.", 502);
    }

    return {
        rawText: messageText,
        usage: data.usage || {}
    };
};

const normalizeBySection = (bySection = {}, requestInput = {}) => {
    const normalized = {};
    const keys = Object.keys(bySection || {});

    keys.forEach((sectionId) => {
        if (!CONTENT_SECTION_IDS.includes(sectionId)) {
            return;
        }

        const sectionFeedback = bySection[sectionId] || {};
        normalized[sectionId] = {
            strengths: Array.isArray(sectionFeedback.strengths) ? sectionFeedback.strengths.slice(0, 4) : [],
            suggestions: Array.isArray(sectionFeedback.suggestions) ? sectionFeedback.suggestions.slice(0, 5) : []
        };
    });

    if (requestInput.mode === "section" && requestInput.sectionId && !normalized[requestInput.sectionId]) {
        normalized[requestInput.sectionId] = {
            strengths: [],
            suggestions: []
        };
    }

    return normalized;
};

const normalizeTopFixes = (topFixes = []) =>
    (topFixes || []).map((fix, index) => ({
        id: fix.id || `sug_${index + 1}`,
        priority: Number.isFinite(fix.priority) ? Math.max(1, Math.round(fix.priority)) : index + 1,
        sectionId: fix.sectionId,
        fieldPath: fix.fieldPath,
        reason: String(fix.reason || "").trim(),
        suggestedText: String(fix.suggestedText || "").trim(),
        title: String(fix.title || "").trim()
    }));

const normalizeReviewResponse = (rawResponse = {}, requestInput = {}) => {
    const payload = {
        mode: rawResponse.mode,
        generatedAt: rawResponse.generatedAt,
        overall: {
            tier: rawResponse.overall?.tier,
            score: Number(rawResponse.overall?.score || 0),
            summary: String(rawResponse.overall?.summary || "").trim()
        },
        topFixes: normalizeTopFixes(rawResponse.topFixes),
        bySection: normalizeBySection(rawResponse.bySection, requestInput)
    };

    if (requestInput.mode === "job-match") {
        payload.jobMatch = {
            score: Number(rawResponse.jobMatch?.score || 0),
            missingKeywords: Array.isArray(rawResponse.jobMatch?.missingKeywords)
                ? rawResponse.jobMatch.missingKeywords
                : [],
            matchedKeywords: Array.isArray(rawResponse.jobMatch?.matchedKeywords)
                ? rawResponse.jobMatch.matchedKeywords
                : [],
            roleFitNotes: Array.isArray(rawResponse.jobMatch?.roleFitNotes)
                ? rawResponse.jobMatch.roleFitNotes
                : []
        };
    }

    return payload;
};

const buildRepairPrompt = (rawText, validationErrors = []) => `
Your previous response was invalid JSON or failed schema validation.
Validation errors:
${validationErrors.map((error) => `- ${error}`).join("\n")}

Previous response:
${rawText}

Return corrected JSON only.
`.trim();

const requestAiReview = async (input, options = {}) => {
    const start = Date.now();
    const fetchImpl = options.fetchImpl || global.fetch;

    if (typeof fetchImpl !== "function") {
        throw new AiReviewError("Fetch is unavailable in runtime.", 500);
    }

    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    const model = options.model || process.env.OPENAI_MODEL || "gpt-5-mini";

    const safeInput = {
        ...input,
        cvData: redactSensitiveCvData(input.cvData)
    };

    const baseMessages = [
        {
            role: "system",
            content: buildSystemPrompt()
        },
        {
            role: "user",
            content: buildUserPrompt(safeInput)
        }
    ];

    let usage = {};
    let rawText = "";
    let parsed = null;
    let validation = { ok: false, errors: ["Unknown validation state"] };

    for (let attempt = 0; attempt < 2; attempt += 1) {
        const messages =
            attempt === 0
                ? baseMessages
                : [
                      ...baseMessages,
                      {
                          role: "user",
                          content: buildRepairPrompt(rawText, validation.errors)
                      }
                  ];

        const response = await callOpenAi({ apiKey, model, messages, fetchImpl });
        rawText = response.rawText;
        usage = response.usage || usage;
        parsed = parseJsonLenient(rawText);

        if (!parsed) {
            validation = { ok: false, errors: ["Model response is not valid JSON."] };
            continue;
        }

        const normalizedCandidate = normalizeLooseResponse(parsed, input);
        validation = validateAiResponseShape(normalizedCandidate, input);
        if (validation.ok) {
            parsed = normalizedCandidate;
            break;
        }
    }

    const durationMs = Date.now() - start;
    console.info("[AI_REVIEW]", {
        mode: input.mode,
        status: validation.ok ? "valid" : "invalid",
        durationMs,
        promptTokens: usage.prompt_tokens || null,
        completionTokens: usage.completion_tokens || null,
        totalTokens: usage.total_tokens || null
    });

    if (!validation.ok || !parsed) {
        throw new AiReviewError("AI returned an invalid response shape.", 502, validation.errors);
    }

    return normalizeReviewResponse(parsed, input);
};

module.exports = {
    AiReviewError,
    requestAiReview
};

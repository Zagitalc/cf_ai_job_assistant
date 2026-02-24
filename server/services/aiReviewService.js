const {
    AI_SUPPORTED_SECTION_IDS,
    CONTENT_SECTION_IDS,
    ISSUE_TYPES,
    RESPONSE_JSON_SCHEMA,
    getRootField,
    hasExistingStringPath,
    redactSensitiveCvData,
    validateAiResponseShape
} = require("../utils/aiSchema");
const { stripHtml } = require("../utils/textUtils");

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

const ISSUE_TYPE_FALLBACK = "clarity";

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

const sanitizeString = (value) => stripHtml(typeof value === "string" ? value : "");

const sanitizeEntryDescriptions = (entries = []) => {
    if (!Array.isArray(entries)) {
        return [];
    }

    return entries.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return entry;
        }

        if (!("description" in entry)) {
            return entry;
        }

        return {
            ...entry,
            description: sanitizeString(entry.description)
        };
    });
};

const sanitizeStringArray = (values = []) => {
    if (!Array.isArray(values)) {
        return [];
    }

    return values.map((value) => (typeof value === "string" ? sanitizeString(value) : value));
};

const sanitizeProjectsForPrompt = (projects = []) => {
    if (!Array.isArray(projects)) {
        return [];
    }

    if (projects.every((item) => typeof item === "string")) {
        return sanitizeStringArray(projects);
    }

    if (projects.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
        return sanitizeEntryDescriptions(projects);
    }

    return projects;
};

const sanitizeCvDataForPrompt = (cvData = {}) => ({
    ...cvData,
    summary: sanitizeString(cvData.summary),
    workExperience: sanitizeStringArray(cvData.workExperience),
    volunteerExperience: sanitizeStringArray(cvData.volunteerExperience),
    projects: sanitizeProjectsForPrompt(cvData.projects),
    certifications: sanitizeStringArray(cvData.certifications),
    awards: sanitizeStringArray(cvData.awards),
    additionalInfo: sanitizeString(cvData.additionalInfo),
    education: Array.isArray(cvData.education)
        ? cvData.education.map((item = {}) => ({
              ...item,
              additionalInfo: sanitizeString(item.additionalInfo)
          }))
        : [],
    work: sanitizeEntryDescriptions(cvData.work),
    volunteer: sanitizeEntryDescriptions(cvData.volunteer),
    projectsObject: sanitizeEntryDescriptions(cvData.projectsObject)
});

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

const inferIssueType = (rawSuggestion = {}) => {
    const direct = String(rawSuggestion?.issueType || rawSuggestion?.category || rawSuggestion?.type || "")
        .trim()
        .toLowerCase();
    if (ISSUE_TYPES.includes(direct)) {
        return direct;
    }

    const hint = `${rawSuggestion?.title || ""} ${rawSuggestion?.reason || ""} ${rawSuggestion?.issue || ""}`.toLowerCase();
    if (hint.includes("ats") || hint.includes("keyword")) {
        return "ats";
    }
    if (hint.includes("length") || hint.includes("long") || hint.includes("concise")) {
        return "length";
    }
    if (hint.includes("impact") || hint.includes("metric") || hint.includes("result")) {
        return "impact";
    }

    return ISSUE_TYPE_FALLBACK;
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

    const existingText = stripHtml(getValueByPath(requestInput.cvData, safeFieldPath));
    const fallbackSuggestedText = existingText
        ? existingText
        : "Add a concise, specific achievement with measurable impact.";
    const originalText = sanitizeString(rawSuggestion?.originalText || rawSuggestion?.sourceText || existingText);

    return {
        id: String(rawSuggestion?.id || `sug_${index + 1}`),
        priority: Number.isFinite(rawSuggestion?.priority) ? Math.max(1, Math.round(rawSuggestion.priority)) : index + 1,
        sectionId: safeSection,
        fieldPath: safeFieldPath,
        issueType: inferIssueType(rawSuggestion),
        originalText,
        reason: String(rawSuggestion?.reason || rawSuggestion?.issue || "This change increases clarity and recruiter impact.").trim(),
        suggestedText: sanitizeString(rawSuggestion?.suggestedText || rawSuggestion?.suggestion || fallbackSuggestedText),
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
            issueType: ISSUE_TYPE_FALLBACK,
            originalText: getValueByPath(requestInput.cvData, targetPath),
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
- For each suggestion object in topFixes, include exactly these fields:
{
  sectionId: string,           // e.g. "work", "summary", "skills"
  field: string,               // e.g. "workExperience[0]"
  category: string,            // one of: Impact | Clarity | ATS | Grammar
  originalText: string,        // exact current plain text, no HTML
  suggestedText: string,       // complete rewritten replacement, ready to apply, no HTML
  reason: string               // max 12 words explaining the improvement
}
CRITICAL: suggestedText must be the actual replacement text, not instructions
about what to write. It must be immediately usable. Never include HTML tags
in any field. Never return prose outside the JSON objects.
`.trim();

const buildSectionPrompt = ({ sectionId, sectionLayout, cvData }) =>
    `Mode: section.
Focus only on sectionId: ${sectionId}.
Return a response object with overall, topFixes, bySection.
For section mode, return exactly 2-3 topFixes.
Each suggestion must map:
- field -> existing cvData fieldPath
- category -> one of Impact|Clarity|ATS|Grammar
Use only existing field paths in cvData and only string fields.

Input JSON:
${JSON.stringify(
    {
        mode: "section",
        sectionId,
        sectionLayout,
        cvData
    },
    null,
    2
)}`;

const buildFullReviewPrompt = ({ sectionLayout, cvData }) =>
    `Mode: full.
Review the full CV.
Return a response object with overall, topFixes, bySection.
For full mode, return at most 3 topFixes sorted by impact.
Each suggestion must map:
- field -> existing cvData fieldPath
- category -> one of Impact|Clarity|ATS|Grammar
Use only existing field paths in cvData and only string fields.

Input JSON:
${JSON.stringify(
    {
        mode: "full",
        sectionLayout,
        cvData
    },
    null,
    2
)}`;

const buildJobMatchPrompt = ({ jobDescription, sectionLayout, cvData }) =>
    `Mode: job-match.
Evaluate CV against the provided job description.
Return a response object with overall, topFixes, bySection, and jobMatch.
For job-match mode, return at most 3 topFixes sorted by impact.
Each suggestion must map:
- field -> existing cvData fieldPath
- category -> one of Impact|Clarity|ATS|Grammar
Use only existing field paths in cvData and only string fields.

Input JSON:
${JSON.stringify(
    {
        mode: "job-match",
        jobDescription,
        sectionLayout,
        cvData
    },
    null,
    2
)}`;

const buildPromptByMode = ({ mode, sectionId, jobDescription, sectionLayout, cvData }) => {
    if (mode === "section") {
        return buildSectionPrompt({ sectionId, sectionLayout, cvData });
    }

    if (mode === "job-match") {
        return buildJobMatchPrompt({ jobDescription, sectionLayout, cvData });
    }

    return buildFullReviewPrompt({ sectionLayout, cvData });
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

const normalizeTopFixes = (topFixes = [], requestInput = {}) =>
    (topFixes || []).map((fix, index) => ({
        id: fix.id || `sug_${index + 1}`,
        priority: Number.isFinite(fix.priority) ? Math.max(1, Math.round(fix.priority)) : index + 1,
        sectionId: fix.sectionId,
        fieldPath: fix.fieldPath,
        issueType: inferIssueType(fix),
        originalText: sanitizeString(fix.originalText || getValueByPath(requestInput.cvData || {}, fix.fieldPath || "")),
        reason: String(fix.reason || "").trim(),
        suggestedText: sanitizeString(fix.suggestedText || ""),
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
        topFixes: normalizeTopFixes(rawResponse.topFixes, requestInput),
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
    const fetchImpl = options.fetchImpl || global.fetch;

    if (typeof fetchImpl !== "function") {
        throw new AiReviewError("Fetch is unavailable in runtime.", 500);
    }

    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    const model = options.model || process.env.OPENAI_MODEL || "gpt-5-mini";

    const sanitizedCvData = sanitizeCvDataForPrompt(input.cvData || {});
    const safeInput = {
        ...input,
        cvData: redactSensitiveCvData(sanitizedCvData)
    };

    const baseMessages = [
        {
            role: "system",
            content: buildSystemPrompt()
        },
        {
            role: "user",
            content: buildPromptByMode(safeInput)
        }
    ];

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

    if (!validation.ok || !parsed) {
        throw new AiReviewError("AI returned an invalid response shape.", 502, validation.errors);
    }

    return normalizeReviewResponse(parsed, input);
};

module.exports = {
    AiReviewError,
    requestAiReview
};

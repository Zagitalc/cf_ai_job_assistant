// @ts-nocheck
import aiSchemaModule from "../../../server/utils/aiSchema.js";
import textUtilsModule from "../../../server/utils/textUtils.js";

const {
  AI_SUPPORTED_SECTION_IDS,
  CONTENT_SECTION_IDS,
  ISSUE_TYPES,
  RESPONSE_JSON_SCHEMA,
  getRootField,
  hasExistingStringPath,
  redactSensitiveCvData,
  validateAiResponseShape,
} = aiSchemaModule as any;
const { stripHtml } = textUtilsModule as any;

export class AiReviewError extends Error {
  statusCode: number;
  details: string[];

  constructor(message: string, statusCode = 502, details: string[] = []) {
    super(message);
    this.name = "AiReviewError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

const WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const BLOCKED_IDENTITY_FIELDS = new Set(["name", "email", "phone", "linkedin"]);
const ISSUE_TYPE_FALLBACK = "clarity";
const AI_REVIEW_LOG_PREVIEW_LIMIT = 1200;

const SECTION_TITLES = {
  summary: "Profile Summary",
  work: "Work",
  volunteer: "Volunteer",
  education: "Education",
  projects: "Projects",
  skills: "Skills",
  certifications: "Certifications",
  awards: "Awards",
  "additional-info": "Additional Info",
};

const sanitizeString = (value: unknown) =>
  stripHtml(typeof value === "string" ? value : "");

const sanitizeStringArray = (values: unknown[] = []) =>
  Array.isArray(values)
    ? values.map((value) => (typeof value === "string" ? sanitizeString(value) : value))
    : [];

const sanitizeEntryDescriptions = (entries: unknown[] = []) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry: any) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return entry;
    }

    if (!("description" in entry)) {
      return entry;
    }

    return {
      ...entry,
      description: sanitizeString(entry.description),
    };
  });
};

const sanitizeProjectsForPrompt = (projects: unknown[] = []) => {
  if (!Array.isArray(projects)) {
    return [];
  }

  if (projects.every((item) => typeof item === "string")) {
    return sanitizeStringArray(projects);
  }

  if (projects.every((item) => item && typeof item === "object" && !Array.isArray(item))) {
    return sanitizeEntryDescriptions(projects as any[]);
  }

  return projects;
};

const sanitizeCvDataForPrompt = (cvData: any = {}) => ({
  ...cvData,
  summary: sanitizeString(cvData.summary),
  workExperience: sanitizeStringArray(cvData.workExperience),
  volunteerExperience: sanitizeStringArray(cvData.volunteerExperience),
  projects: sanitizeProjectsForPrompt(cvData.projects),
  certifications: sanitizeStringArray(cvData.certifications),
  awards: sanitizeStringArray(cvData.awards),
  additionalInfo: sanitizeString(cvData.additionalInfo),
  education: Array.isArray(cvData.education)
    ? cvData.education.map((item: any = {}) => ({
        ...item,
        additionalInfo: sanitizeString(item.additionalInfo),
      }))
    : [],
  work: sanitizeEntryDescriptions(cvData.work),
  volunteer: sanitizeEntryDescriptions(cvData.volunteer),
  projectsObject: sanitizeEntryDescriptions(cvData.projectsObject),
});

const tryParseJson = (value = "") => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractBalancedJsonCandidate = (text = "") => {
  const source = String(text || "");
  const startIndex = source.search(/[\{\[]/);
  if (startIndex < 0) {
    return "";
  }

  const opening = source[startIndex];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return source.slice(startIndex).trim();
};

const parseJsonLenient = (text = "") => {
  const direct = tryParseJson(text);
  if (direct) {
    return direct;
  }

  const fencedMatch = String(text).match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (fencedMatch?.[1]) {
    const fencedPayload = fencedMatch[1].trim();
    const parsed =
      tryParseJson(fencedPayload) ||
      tryParseJson(extractBalancedJsonCandidate(fencedPayload));
    if (parsed) {
      return parsed;
    }
  }

  const balancedCandidate = extractBalancedJsonCandidate(String(text));
  if (balancedCandidate) {
    const parsed = tryParseJson(balancedCandidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const readWorkersAiText = (payload: any = {}) => {
  if (typeof payload === "string") {
    return payload;
  }

  if (typeof payload?.response === "string") {
    return payload.response;
  }

  if (typeof payload?.result?.response === "string") {
    return payload.result.response;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((entry: any) => (typeof entry?.text === "string" ? entry.text : ""))
      .join("")
      .trim();
  }

  return "";
};

const isAiReviewDebugEnabled = (env: any) =>
  String(env?.AI_REVIEW_DEBUG || "").trim().toLowerCase() === "true";

const truncateForLog = (value: unknown, limit = AI_REVIEW_LOG_PREVIEW_LIMIT) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) {
    return "";
  }

  return text.length > limit ? `${text.slice(0, limit)}...<truncated>` : text;
};

const logAiReviewDebug = (env: any, label: string, details: Record<string, unknown> = {}) => {
  if (!isAiReviewDebugEnabled(env)) {
    return;
  }

  console.log(
    `[ai-review-debug] ${label}`,
    JSON.stringify(
      details,
      (_key, value) => {
        if (typeof value === "string") {
          return truncateForLog(value);
        }
        return value;
      },
      2
    )
  );
};

const getValueByPath = (target: any, fieldPath = "") => {
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

  let cursor = target;
  for (const token of tokens) {
    if (cursor === null || cursor === undefined) {
      return "";
    }
    cursor = cursor[token];
  }

  return typeof cursor === "string" ? cursor : "";
};

const inferIssueType = (rawSuggestion: any = {}) => {
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

const collectSectionFieldPaths = (sectionId: string, cvData: any = {}) => {
  if (sectionId === "summary" && typeof cvData.summary === "string") {
    return ["summary"];
  }

  if (sectionId === "work") {
    return (cvData.workExperience || []).map((_: unknown, index: number) => `workExperience[${index}]`);
  }

  if (sectionId === "volunteer") {
    return (cvData.volunteerExperience || []).map((_: unknown, index: number) => `volunteerExperience[${index}]`);
  }

  if (sectionId === "projects") {
    return (cvData.projects || []).map((_: unknown, index: number) => `projects[${index}]`);
  }

  if (sectionId === "certifications") {
    return (cvData.certifications || []).map((_: unknown, index: number) => `certifications[${index}]`);
  }

  if (sectionId === "awards") {
    return (cvData.awards || []).map((_: unknown, index: number) => `awards[${index}]`);
  }

  if (sectionId === "skills") {
    return (cvData.skills || []).map((_: unknown, index: number) => `skills[${index}]`);
  }

  if (sectionId === "additional-info" && typeof cvData.additionalInfo === "string") {
    return ["additionalInfo"];
  }

  if (sectionId === "education") {
    const paths: string[] = [];
    (cvData.education || []).forEach((_: unknown, index: number) => {
      paths.push(`education[${index}].degree`);
      paths.push(`education[${index}].school`);
      paths.push(`education[${index}].location`);
      paths.push(`education[${index}].additionalInfo`);
    });
    return paths;
  }

  return [];
};

const collectAllCandidatePaths = (cvData: any = {}) =>
  AI_SUPPORTED_SECTION_IDS.flatMap((sectionId: string) => collectSectionFieldPaths(sectionId, cvData))
    .filter((fieldPath: string) => hasExistingStringPath(cvData, fieldPath))
    .filter((fieldPath: string) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

const pickFallbackFieldPath = (sectionId: string, requestInput: any) => {
  const sectionPaths = collectSectionFieldPaths(sectionId, requestInput.cvData)
    .filter((fieldPath: string) => hasExistingStringPath(requestInput.cvData, fieldPath))
    .filter((fieldPath: string) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

  if (sectionPaths.length > 0) {
    return sectionPaths[0];
  }

  const globalPaths = collectAllCandidatePaths(requestInput.cvData);
  return globalPaths[0] || "";
};

const normalizeSuggestion = (rawSuggestion: any, index: number, requestInput: any) => {
  const fallbackSection =
    requestInput.mode === "section"
      ? requestInput.sectionId
      : AI_SUPPORTED_SECTION_IDS.find((sectionId: string) => collectSectionFieldPaths(sectionId, requestInput.cvData).length > 0) || "summary";

  const requestedFieldPath = String(rawSuggestion?.fieldPath || rawSuggestion?.field || rawSuggestion?.path || "").trim();
  const derivedSection = sectionFromFieldPath(requestedFieldPath);
  const proposedSection = String(rawSuggestion?.sectionId || derivedSection || fallbackSection).trim();
  const safeSection =
    requestInput.mode === "section"
      ? requestInput.sectionId
      : AI_SUPPORTED_SECTION_IDS.includes(proposedSection)
        ? proposedSection
        : fallbackSection;

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
  const fallbackSuggestedText = existingText || "Add a concise, specific achievement with measurable impact.";
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
    title: String(rawSuggestion?.title || `Improve ${SECTION_TITLES[safeSection] || safeSection}`).trim(),
  };
};

const enforceSuggestionCardinality = (topFixes: any[], requestInput: any) => {
  const limited = (topFixes || []).slice(0, 3);

  if (requestInput.mode !== "section") {
    return limited;
  }

  if (limited.length >= 2) {
    return limited;
  }

  const fallbackPaths = collectSectionFieldPaths(requestInput.sectionId, requestInput.cvData)
    .filter((fieldPath: string) => hasExistingStringPath(requestInput.cvData, fieldPath))
    .filter((fieldPath: string) => !BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath)));

  const targetPath = fallbackPaths[0] || collectAllCandidatePaths(requestInput.cvData)[0] || "";
  if (!targetPath) {
    return limited;
  }

  const synthesized = limited.slice();
  while (synthesized.length < 2) {
    synthesized.push({
      id: `sug_auto_${synthesized.length + 1}`,
      priority: synthesized.length + 1,
      sectionId: requestInput.sectionId,
      fieldPath: targetPath,
      issueType: ISSUE_TYPE_FALLBACK,
      originalText: getValueByPath(requestInput.cvData, targetPath),
      reason: "Focused edits improve readability and impact.",
      suggestedText: "Refine this content with stronger action verbs and measurable outcomes.",
      title: synthesized.length === 0 ? "Strengthen phrasing" : "Add measurable impact",
    });
  }

  return synthesized;
};

const normalizeLooseResponse = (rawResponse: any = {}, requestInput: any = {}) => {
  const rawFixes = Array.isArray(rawResponse?.topFixes)
    ? rawResponse.topFixes
    : Array.isArray(rawResponse?.suggestions)
      ? rawResponse.suggestions
      : [];

  const normalizedTopFixes = rawFixes
    .map((fix: any, index: number) => normalizeSuggestion(fix, index, requestInput))
    .filter(Boolean);

  const topFixes = enforceSuggestionCardinality(normalizedTopFixes, requestInput);
  const rawBySection = rawResponse?.bySection && typeof rawResponse.bySection === "object" ? rawResponse.bySection : {};
  const bySection: Record<string, { strengths: string[]; suggestions: string[] }> = {};

  Object.entries(rawBySection).forEach(([sectionId, sectionFeedback]: [string, any]) => {
    if (!CONTENT_SECTION_IDS.includes(sectionId) || !sectionFeedback || typeof sectionFeedback !== "object") {
      return;
    }

    bySection[sectionId] = {
      strengths: Array.isArray(sectionFeedback.strengths) ? sectionFeedback.strengths.slice(0, 4) : [],
      suggestions: Array.isArray(sectionFeedback.suggestions) ? sectionFeedback.suggestions.slice(0, 5) : [],
    };
  });

  if (requestInput.mode === "section") {
    if (!bySection[requestInput.sectionId]) {
      bySection[requestInput.sectionId] = { strengths: [], suggestions: [] };
    }
    if (bySection[requestInput.sectionId].suggestions.length === 0) {
      bySection[requestInput.sectionId].suggestions = topFixes.map((fix: any) => fix.title).slice(0, 3);
    }
  } else if (Object.keys(bySection).length === 0 && topFixes.length > 0) {
    topFixes.forEach((fix: any) => {
      if (!bySection[fix.sectionId]) {
        bySection[fix.sectionId] = { strengths: [], suggestions: [] };
      }
      bySection[fix.sectionId].suggestions.push(fix.title);
    });
  }

  const overallSummarySource =
    typeof rawResponse?.overall === "string"
      ? rawResponse.overall
      : rawResponse?.overall?.summary;

  const overallTier = ["Needs Work", "Fair", "Strong", "Excellent"].includes(rawResponse?.overall?.tier)
    ? rawResponse.overall.tier
    : topFixes.length > 0
      ? "Fair"
      : "Strong";

  return {
    mode: requestInput.mode,
    generatedAt:
      String(rawResponse?.generatedAt || "").trim() && !Number.isNaN(new Date(rawResponse.generatedAt).getTime())
        ? rawResponse.generatedAt
        : new Date().toISOString(),
    overall: {
      tier: overallTier,
      score: Number.isFinite(rawResponse?.overall?.score) ? Number(rawResponse.overall.score) : topFixes.length > 0 ? 72 : 85,
      summary:
        String(overallSummarySource || "").trim() ||
        (topFixes.length > 0
          ? "Targeted improvements identified. Apply the top fixes to improve clarity and impact."
          : "Your CV is in a strong baseline state. Keep refining with specific results."),
    },
    topFixes,
    bySection,
    ...(requestInput.mode === "job-match"
      ? {
          jobMatch: {
            score: Number.isFinite(rawResponse?.jobMatch?.score) ? Number(rawResponse.jobMatch.score) : 65,
            missingKeywords: Array.isArray(rawResponse?.jobMatch?.missingKeywords) ? rawResponse.jobMatch.missingKeywords : [],
            matchedKeywords: Array.isArray(rawResponse?.jobMatch?.matchedKeywords) ? rawResponse.jobMatch.matchedKeywords : [],
            roleFitNotes: Array.isArray(rawResponse?.jobMatch?.roleFitNotes)
              ? rawResponse.jobMatch.roleFitNotes
              : ["Role fit estimated from available CV content."],
          },
        }
      : {}),
  };
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
- Never use markdown fences.
- Never include prose before or after the JSON object.
- Do not use keys named "field" or "category". Use "fieldPath" and "issueType".
- "overall" must be an object, not a string.
- Keep output compact to avoid truncation.
- "overall.summary" must be one short sentence.
- Each "reason" must be one short sentence.
- Each "title" must be 2-5 words.
- "originalText" should be a short excerpt or an empty string, never a full paragraph.
- "suggestedText" should be concise and limited to the targeted field only.
- "bySection" should include only sections that have actual feedback.
- Each "bySection.*.strengths" and "bySection.*.suggestions" array must have at most 2 short strings.
- For each suggestion object in topFixes, include exactly these fields:
  {
    "id": "string",
    "priority": 1,
    "sectionId": "summary|work|volunteer|education|projects|skills|certifications|awards|additional-info",
    "fieldPath": "existing.string.path",
    "issueType": "impact|clarity|ats|length",
    "originalText": "existing plain text",
    "reason": "why this change helps",
    "suggestedText": "replacement plain text",
    "title": "short suggestion title"
  }
- The full response must follow this shape:
  {
    "mode": "full|section|job-match",
    "generatedAt": "ISO-8601 timestamp",
    "overall": {
      "tier": "Needs Work|Fair|Strong|Excellent",
      "score": 0,
      "summary": "short summary"
    },
    "topFixes": [],
    "bySection": {
      "summary": {
        "strengths": [],
        "suggestions": []
      }
    }
  }
CRITICAL: suggestedText must be the actual replacement text, not instructions.
Never include HTML tags in any field. Never return prose outside the JSON object.
`.trim();

const buildPromptByMode = (input: any) => {
  if (input.mode === "section") {
    return `Mode: section.
Focus only on sectionId: ${input.sectionId}.
Return a response object with overall, topFixes, bySection.
For section mode, return exactly 2 topFixes.

Input JSON:
${JSON.stringify(input, null, 2)}`;
  }

  if (input.mode === "job-match") {
    return `Mode: job-match.
Evaluate CV against the provided job description.
Return a response object with overall, topFixes, bySection, and jobMatch.
For job-match mode, return at most 2 topFixes sorted by impact.

Input JSON:
${JSON.stringify(input, null, 2)}`;
  }

  return `Mode: full.
Review the full CV.
Return a response object with overall, topFixes, bySection.
For full mode, return at most 2 topFixes sorted by impact.

Input JSON:
${JSON.stringify(input, null, 2)}`;
};

const buildRepairPrompt = (rawText: string, validationErrors: string[] = []) => `
Your previous response was invalid JSON or failed schema validation.
Validation errors:
${validationErrors.map((error) => `- ${error}`).join("\n")}

Previous response:
${rawText}

Return corrected JSON only.
`.trim();

const normalizeReviewResponse = (rawResponse: any = {}, requestInput: any = {}) => {
  const payload = {
    mode: rawResponse.mode,
    generatedAt: rawResponse.generatedAt,
    overall: {
      tier: rawResponse.overall?.tier,
      score: Number(rawResponse.overall?.score || 0),
      summary: String(rawResponse.overall?.summary || "").trim(),
    },
    topFixes: (rawResponse.topFixes || []).map((fix: any, index: number) => ({
      id: fix.id || `sug_${index + 1}`,
      priority: Number.isFinite(fix.priority) ? Math.max(1, Math.round(fix.priority)) : index + 1,
      sectionId: fix.sectionId,
      fieldPath: fix.fieldPath,
      issueType: inferIssueType(fix),
      originalText: sanitizeString(fix.originalText || getValueByPath(requestInput.cvData || {}, fix.fieldPath || "")),
      reason: String(fix.reason || "").trim(),
      suggestedText: sanitizeString(fix.suggestedText || ""),
      title: String(fix.title || "").trim(),
    })),
    bySection: rawResponse.bySection || {},
  };

  if (requestInput.mode === "job-match") {
    payload.jobMatch = {
      score: Number(rawResponse.jobMatch?.score || 0),
      missingKeywords: Array.isArray(rawResponse.jobMatch?.missingKeywords) ? rawResponse.jobMatch.missingKeywords : [],
      matchedKeywords: Array.isArray(rawResponse.jobMatch?.matchedKeywords) ? rawResponse.jobMatch.matchedKeywords : [],
      roleFitNotes: Array.isArray(rawResponse.jobMatch?.roleFitNotes) ? rawResponse.jobMatch.roleFitNotes : [],
    };
  }

  return payload;
};

const callTextWorkersAi = async (
  env: any,
  messages: { role: string; content: string }[],
  responseFormat?: { type: "json_object" }
) => {
  const requestPayload: any = {
    messages,
    max_tokens: 2200,
    temperature: 0.2,
  };
  if (responseFormat) {
    requestPayload.response_format = responseFormat;
  }

  return env.AI.run(WORKERS_AI_MODEL, requestPayload);
};

const extractStructuredPayload = (rawPayload: any) => {
  if (rawPayload && typeof rawPayload === "object" && typeof rawPayload.response === "string") {
    return parseJsonLenient(rawPayload.response);
  }

  if (rawPayload && typeof rawPayload === "object" && rawPayload.response && typeof rawPayload.response === "object") {
    return rawPayload.response;
  }

  if (rawPayload && typeof rawPayload === "object" && typeof rawPayload.result?.response === "string") {
    return parseJsonLenient(rawPayload.result.response);
  }

  if (rawPayload && typeof rawPayload === "object" && rawPayload.result?.response && typeof rawPayload.result.response === "object") {
    return rawPayload.result.response;
  }

  const choiceContent = rawPayload?.choices?.[0]?.message?.content;
  if (typeof choiceContent === "string") {
    return parseJsonLenient(choiceContent);
  }

  if (Array.isArray(choiceContent)) {
    const merged = choiceContent
      .map((entry: any) => (typeof entry?.text === "string" ? entry.text : ""))
      .join("")
      .trim();
    if (merged) {
      return parseJsonLenient(merged);
    }
  }

  if (rawPayload && typeof rawPayload === "object" && !Array.isArray(rawPayload) && "mode" in rawPayload) {
    return rawPayload;
  }

  return null;
};

const collectPresentSections = (cvData: any = {}) =>
  AI_SUPPORTED_SECTION_IDS.filter((sectionId: string) => collectSectionFieldPaths(sectionId, cvData).length > 0);

const buildFallbackReview = (requestInput: any = {}, reason = "") => {
  const sectionIds =
    requestInput.mode === "section"
      ? [requestInput.sectionId]
      : collectPresentSections(requestInput.cvData);
  const summary =
    requestInput.mode === "job-match"
      ? "Generated a fallback review because the AI response could not be normalized for this job-match request."
      : "Generated a fallback review because the AI response could not be normalized.";

  const bySection = Object.fromEntries(
    sectionIds.map((sectionId: string) => [
      sectionId,
      {
        strengths: ["Section content is present and ready for refinement."],
        suggestions: [
          sectionId === "summary"
            ? "Tailor the summary to the target role and emphasize measurable scope."
            : "Lead with the strongest outcome and make the impact easier to scan.",
          "Prefer concise wording and role-relevant keywords.",
        ],
      },
    ])
  );

  return {
    mode: requestInput.mode,
    generatedAt: new Date().toISOString(),
    overall: {
      tier: "Fair",
      score: 70,
      summary: reason ? `${summary} ${reason}`.trim() : summary,
    },
    topFixes: [],
    bySection,
    ...(requestInput.mode === "job-match"
      ? {
          jobMatch: {
            score: 65,
            missingKeywords: [],
            matchedKeywords: [],
            roleFitNotes: ["Job match fallback generated without structured model output."],
          },
        }
      : {}),
  };
};

export const requestAiReview = async (env: any, input: any) => {
  const sanitizedCvData = sanitizeCvDataForPrompt(input.cvData || {});
  const safeInput = {
    ...input,
    cvData: redactSensitiveCvData(sanitizedCvData),
  };

  const baseMessages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: buildPromptByMode(safeInput) },
  ];

  logAiReviewDebug(env, "request.start", {
    mode: input.mode,
    sectionId: input.sectionId || "",
    hasJobDescription: Boolean(String(input.jobDescription || "").trim()),
    sectionIds: collectPresentSections(input.cvData),
  });

  let rawText = "";
  let parsed = null;
  let validation = { ok: false, errors: ["Unknown validation state"] };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages =
      attempt === 0
        ? baseMessages
        : [...baseMessages, { role: "user", content: buildRepairPrompt(rawText, validation.errors) }];

    let response: any = null;

    try {
      response = await callTextWorkersAi(env, messages, { type: "json_object" });
    } catch (error: any) {
      logAiReviewDebug(env, "request.error", {
        attempt,
        message: String(error?.message || "Workers AI request failed."),
      });

      if (attempt === 0) {
        validation = { ok: false, errors: [String(error?.message || "Workers AI request failed.")] };
        rawText = "";
        continue;
      }

      return buildFallbackReview(input, String(error?.message || "Workers AI request failed."));
    }

    rawText = readWorkersAiText(response);
    parsed = extractStructuredPayload(response) || parseJsonLenient(rawText);

    logAiReviewDebug(env, "response.received", {
      attempt,
      responseKeys: response && typeof response === "object" ? Object.keys(response) : [],
      rawTextPreview: rawText,
      parsedType: parsed ? typeof parsed : "null",
      parsedPreview: parsed,
    });

    if (!parsed) {
      validation = { ok: false, errors: ["Model response is not valid JSON."] };
      logAiReviewDebug(env, "response.parse_failed", {
        attempt,
        errors: validation.errors,
      });
      continue;
    }

    const normalizedCandidate = normalizeLooseResponse(parsed, input);
    validation = validateAiResponseShape(normalizedCandidate, input);
    logAiReviewDebug(env, "response.normalized", {
      attempt,
      validationOk: validation.ok,
      validationErrors: validation.errors,
      topFixesCount: Array.isArray(normalizedCandidate?.topFixes) ? normalizedCandidate.topFixes.length : 0,
      bySectionKeys:
        normalizedCandidate?.bySection && typeof normalizedCandidate.bySection === "object"
          ? Object.keys(normalizedCandidate.bySection)
          : [],
      overall: normalizedCandidate?.overall || null,
    });
    if (validation.ok) {
      return normalizeReviewResponse(normalizedCandidate, input);
    }

    logAiReviewDebug(env, "response.fallback_to_normalized_candidate", {
      attempt,
      reason: "Validation failed, returning salvaged normalized candidate.",
      validationErrors: validation.errors,
    });
    return normalizeReviewResponse(normalizedCandidate, input);
  }

  logAiReviewDebug(env, "response.synthetic_fallback", {
    reason: validation.errors[0] || "Model response is not valid JSON.",
    validationErrors: validation.errors,
  });
  return buildFallbackReview(input, validation.errors[0] || "Model response is not valid JSON.");
};

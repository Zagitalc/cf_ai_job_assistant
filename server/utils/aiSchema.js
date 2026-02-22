const { CONTENT_SECTION_IDS, normalizeSectionLayout } = require("./sectionLayout");

const REVIEW_MODES = ["section", "full", "job-match"];
const OVERALL_TIERS = ["Needs Work", "Fair", "Strong", "Excellent"];
const ISSUE_TYPES = ["impact", "clarity", "ats", "length"];
const BLOCKED_IDENTITY_FIELDS = new Set(["name", "email", "phone", "linkedin"]);
const AI_SUPPORTED_SECTION_IDS = CONTENT_SECTION_IDS.filter((sectionId) => sectionId !== "personal");

const RESPONSE_JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        mode: {
            type: "string",
            enum: REVIEW_MODES
        },
        generatedAt: {
            type: "string"
        },
        overall: {
            type: "object",
            additionalProperties: false,
            properties: {
                tier: {
                    type: "string",
                    enum: OVERALL_TIERS
                },
                score: {
                    type: "number"
                },
                summary: {
                    type: "string"
                }
            },
            required: ["tier", "score", "summary"]
        },
        topFixes: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    id: { type: "string" },
                    priority: { type: "number" },
                    sectionId: { type: "string", enum: CONTENT_SECTION_IDS },
                    fieldPath: { type: "string" },
                    issueType: { type: "string", enum: ISSUE_TYPES },
                    originalText: { type: "string" },
                    reason: { type: "string" },
                    suggestedText: { type: "string" },
                    title: { type: "string" }
                },
                required: ["id", "priority", "sectionId", "fieldPath", "issueType", "originalText", "reason", "suggestedText", "title"]
            }
        },
        bySection: {
            type: "object",
            additionalProperties: {
                type: "object",
                additionalProperties: false,
                properties: {
                    strengths: {
                        type: "array",
                        items: { type: "string" }
                    },
                    suggestions: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["strengths", "suggestions"]
            }
        },
        jobMatch: {
            type: "object",
            additionalProperties: false,
            properties: {
                score: { type: "number" },
                missingKeywords: {
                    type: "array",
                    items: { type: "string" }
                },
                matchedKeywords: {
                    type: "array",
                    items: { type: "string" }
                },
                roleFitNotes: {
                    type: "array",
                    items: { type: "string" }
                }
            },
            required: ["score", "missingKeywords", "matchedKeywords", "roleFitNotes"]
        }
    },
    required: ["mode", "generatedAt", "overall", "topFixes", "bySection"]
};

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const toPathTokens = (fieldPath = "") => {
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

const getRootField = (fieldPath = "") => {
    const tokens = toPathTokens(fieldPath);
    return typeof tokens[0] === "string" ? tokens[0] : "";
};

const getValueByPath = (target, fieldPath = "") => {
    if (!isObject(target) || !isNonEmptyString(fieldPath)) {
        return "";
    }

    const tokens = toPathTokens(fieldPath);
    if (tokens.length === 0) {
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

const hasExistingStringPath = (target, fieldPath = "") => {
    if (!isObject(target) || !isNonEmptyString(fieldPath)) {
        return false;
    }

    const tokens = toPathTokens(fieldPath);
    if (tokens.length === 0) {
        return false;
    }

    let cursor = target;

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        const isLast = i === tokens.length - 1;

        if (typeof token === "number") {
            if (!Array.isArray(cursor) || token < 0 || token >= cursor.length) {
                return false;
            }

            cursor = cursor[token];
            if (isLast) {
                return typeof cursor === "string";
            }
            continue;
        }

        if (!isObject(cursor) && !Array.isArray(cursor)) {
            return false;
        }

        if (!(token in cursor)) {
            return false;
        }

        cursor = cursor[token];
        if (isLast) {
            return typeof cursor === "string";
        }
    }

    return false;
};

const redactSensitiveCvData = (cvData = {}) => ({
    ...cvData,
    name: cvData.name ? "[redacted]" : "",
    email: cvData.email ? "[redacted]" : "",
    phone: cvData.phone ? "[redacted]" : "",
    linkedin: cvData.linkedin ? "[redacted]" : ""
});

const createValidationResult = (errors = [], value = null) => ({
    ok: errors.length === 0,
    errors,
    value
});

const validateReviewRequest = (payload = {}) => {
    const errors = [];
    if (!isObject(payload)) {
        return createValidationResult(["Request body must be a JSON object."]);
    }

    const mode = String(payload.mode || "").trim();
    if (!REVIEW_MODES.includes(mode)) {
        errors.push("mode must be one of: section, full, job-match.");
    }

    const cvData = isObject(payload.cvData) ? payload.cvData : null;
    if (!cvData) {
        errors.push("cvData is required and must be an object.");
    }

    const sectionLayout = normalizeSectionLayout(payload.sectionLayout || {}, cvData || {});
    const sectionId = String(payload.sectionId || "").trim();
    const jobDescription = String(payload.jobDescription || "").trim();

    if (mode === "section") {
        if (!isNonEmptyString(sectionId)) {
            errors.push("sectionId is required when mode is section.");
        } else if (!AI_SUPPORTED_SECTION_IDS.includes(sectionId)) {
            errors.push("sectionId must reference an AI-supported content section.");
        }
    }

    if (mode === "job-match" && !isNonEmptyString(jobDescription)) {
        errors.push("jobDescription is required when mode is job-match.");
    }

    return createValidationResult(errors, {
        mode,
        cvData: cvData || {},
        sectionLayout,
        sectionId,
        jobDescription
    });
};

const normalizeSuggestion = (suggestion = {}, index = 0, requestInput = {}) => {
    const fieldPath = String(suggestion.fieldPath || "").trim();
    const rootReason = String(suggestion.reason || "").trim();
    const fallbackOriginal = getValueByPath(requestInput.cvData || {}, fieldPath);
    const issueType = String(suggestion.issueType || "").trim().toLowerCase();

    return {
        id: isNonEmptyString(suggestion.id) ? suggestion.id.trim() : `sug_${index + 1}`,
        priority: Number.isFinite(suggestion.priority) ? Math.max(1, Math.round(suggestion.priority)) : index + 1,
        sectionId: String(suggestion.sectionId || "").trim(),
        fieldPath,
        issueType,
        originalText: String(suggestion.originalText || fallbackOriginal || "").trim(),
        reason: rootReason,
        suggestedText: String(suggestion.suggestedText || "").trim(),
        title: String(suggestion.title || "").trim()
    };
};

const validateAiResponseShape = (response = {}, requestInput = {}) => {
    const errors = [];

    if (!isObject(response)) {
        return createValidationResult(["AI response must be a JSON object."]);
    }

    if (response.mode !== requestInput.mode) {
        errors.push("AI response mode does not match request mode.");
    }

    const generatedAt = String(response.generatedAt || "");
    if (!generatedAt || Number.isNaN(new Date(generatedAt).getTime())) {
        errors.push("generatedAt must be a valid ISO date string.");
    }

    const overall = response.overall;
    if (!isObject(overall)) {
        errors.push("overall is required.");
    } else {
        if (!OVERALL_TIERS.includes(String(overall.tier || ""))) {
            errors.push(`overall.tier must be one of: ${OVERALL_TIERS.join(", ")}.`);
        }
        if (!Number.isFinite(overall.score)) {
            errors.push("overall.score must be numeric.");
        }
        if (!isNonEmptyString(overall.summary)) {
            errors.push("overall.summary is required.");
        }
    }

    if (!Array.isArray(response.topFixes)) {
        errors.push("topFixes must be an array.");
    } else {
        if (requestInput.mode === "section" && (response.topFixes.length < 2 || response.topFixes.length > 3)) {
            errors.push("section mode requires 2-3 topFixes.");
        }
        if (requestInput.mode !== "section" && response.topFixes.length > 3) {
            errors.push("full/job-match modes allow at most 3 topFixes.");
        }

        response.topFixes.forEach((rawSuggestion, index) => {
            const suggestion = normalizeSuggestion(rawSuggestion, index, requestInput);

            if (!CONTENT_SECTION_IDS.includes(suggestion.sectionId)) {
                errors.push(`topFixes[${index}].sectionId is invalid.`);
            }
            if (requestInput.mode === "section" && suggestion.sectionId !== requestInput.sectionId) {
                errors.push(`topFixes[${index}] must target sectionId ${requestInput.sectionId}.`);
            }
            if (!hasExistingStringPath(requestInput.cvData, suggestion.fieldPath)) {
                errors.push(`topFixes[${index}].fieldPath must target an existing string field.`);
            }
            if (BLOCKED_IDENTITY_FIELDS.has(getRootField(suggestion.fieldPath))) {
                errors.push(`topFixes[${index}].fieldPath cannot edit protected identity fields.`);
            }
            if (!isNonEmptyString(suggestion.reason)) {
                errors.push(`topFixes[${index}].reason is required.`);
            }
            if (!isNonEmptyString(suggestion.suggestedText)) {
                errors.push(`topFixes[${index}].suggestedText is required.`);
            }
            if (!isNonEmptyString(suggestion.title)) {
                errors.push(`topFixes[${index}].title is required.`);
            }
            if (!ISSUE_TYPES.includes(suggestion.issueType)) {
                errors.push(`topFixes[${index}].issueType must be one of: ${ISSUE_TYPES.join(", ")}.`);
            }
            if (!isNonEmptyString(suggestion.originalText)) {
                errors.push(`topFixes[${index}].originalText is required.`);
            }
        });
    }

    if (!isObject(response.bySection)) {
        errors.push("bySection is required.");
    } else {
        Object.entries(response.bySection).forEach(([sectionId, sectionFeedback]) => {
            if (!CONTENT_SECTION_IDS.includes(sectionId)) {
                errors.push(`bySection.${sectionId} is not a valid section.`);
            }

            if (!isObject(sectionFeedback)) {
                errors.push(`bySection.${sectionId} must be an object.`);
                return;
            }

            if (!Array.isArray(sectionFeedback.strengths)) {
                errors.push(`bySection.${sectionId}.strengths must be an array.`);
            }

            if (!Array.isArray(sectionFeedback.suggestions)) {
                errors.push(`bySection.${sectionId}.suggestions must be an array.`);
            }
        });
    }

    if (requestInput.mode === "job-match") {
        if (!isObject(response.jobMatch)) {
            errors.push("jobMatch is required when mode is job-match.");
        } else {
            if (!Number.isFinite(response.jobMatch.score)) {
                errors.push("jobMatch.score must be numeric.");
            }
            if (!Array.isArray(response.jobMatch.missingKeywords)) {
                errors.push("jobMatch.missingKeywords must be an array.");
            }
            if (!Array.isArray(response.jobMatch.matchedKeywords)) {
                errors.push("jobMatch.matchedKeywords must be an array.");
            }
            if (!Array.isArray(response.jobMatch.roleFitNotes)) {
                errors.push("jobMatch.roleFitNotes must be an array.");
            }
        }
    }

    return createValidationResult(errors, response);
};

module.exports = {
    AI_SUPPORTED_SECTION_IDS,
    CONTENT_SECTION_IDS,
    OVERALL_TIERS,
    ISSUE_TYPES,
    RESPONSE_JSON_SCHEMA,
    REVIEW_MODES,
    getRootField,
    hasExistingStringPath,
    redactSensitiveCvData,
    validateAiResponseShape,
    validateReviewRequest
};

// @ts-nocheck
import { callable } from "agents";
import { AIChatAgent } from "@cloudflare/ai-chat";
import aiSchemaModule from "../../server/utils/aiSchema.js";

const BLOCKED_IDENTITY_FIELDS = new Set(["name", "email", "phone", "linkedin"]);
const AI_ASSISTANT_LOG_PREVIEW_LIMIT = 1200;
const { hasExistingStringPath, getRootField } = aiSchemaModule as any;

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

const collectEditableStringPaths = (cvData: any = {}) => {
  const paths: string[] = [];

  if (typeof cvData.summary === "string") {
    paths.push("summary");
  }
  if (typeof cvData.additionalInfo === "string") {
    paths.push("additionalInfo");
  }

  ["workExperience", "volunteerExperience", "projects", "certifications", "awards", "skills"].forEach((key) => {
    if (Array.isArray(cvData[key])) {
      cvData[key].forEach((value: unknown, index: number) => {
        if (typeof value === "string") {
          paths.push(`${key}[${index}]`);
        }
      });
    }
  });

  if (Array.isArray(cvData.education)) {
    cvData.education.forEach((_item: unknown, index: number) => {
      ["degree", "school", "location", "additionalInfo"].forEach((field) => {
        if (typeof cvData.education?.[index]?.[field] === "string") {
          paths.push(`education[${index}].${field}`);
        }
      });
    });
  }

  return paths.slice(0, 25);
};

const sanitizeAssistantSuggestions = (cvData: any, suggestions: any[] = []) =>
  (Array.isArray(suggestions) ? suggestions : [])
    .slice(0, 2)
    .map((suggestion, index) => {
      const fieldPath = String(suggestion?.fieldPath || "").trim();
      if (!fieldPath || !hasExistingStringPath(cvData, fieldPath)) {
        return null;
      }

      if (BLOCKED_IDENTITY_FIELDS.has(getRootField(fieldPath))) {
        return null;
      }

      return {
        id: String(suggestion?.id || `assistant_sug_${index + 1}`),
        priority: Number.isFinite(suggestion?.priority)
          ? Math.max(1, Math.round(suggestion.priority))
          : index + 1,
        title: String(suggestion?.title || "Tailor this section").trim(),
        reason: String(suggestion?.reason || "Improves fit for the target role.").trim(),
        fieldPath,
        sectionId: String(suggestion?.sectionId || sectionFromFieldPath(fieldPath) || "").trim(),
        issueType: String(suggestion?.issueType || "clarity").trim().toLowerCase(),
        originalText: String(suggestion?.originalText || getValueByPath(cvData, fieldPath)).trim(),
        suggestedText: String(suggestion?.suggestedText || "").trim(),
        status: String(suggestion?.status || "pending").trim(),
      };
    })
    .filter(Boolean);

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

const isAssistantDebugEnabled = (env: any) =>
  String(env?.AI_ASSISTANT_DEBUG || "").trim().toLowerCase() === "true";

const truncateForLog = (value: unknown, limit = AI_ASSISTANT_LOG_PREVIEW_LIMIT) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) {
    return "";
  }

  return text.length > limit ? `${text.slice(0, limit)}...<truncated>` : text;
};

const logAssistantDebug = (env: any, label: string, details: Record<string, unknown> = {}) => {
  if (!isAssistantDebugEnabled(env)) {
    return;
  }

  console.log(
    `[assistant-debug] ${label}`,
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
    return tryParseJson(fencedPayload) || tryParseJson(extractBalancedJsonCandidate(fencedPayload));
  }

  const balancedCandidate = extractBalancedJsonCandidate(String(text));
  if (balancedCandidate) {
    return tryParseJson(balancedCandidate);
  }

  return null;
};

const getMessageText = (message: any = {}) =>
  (Array.isArray(message?.parts) ? message.parts : [])
    .map((part: any) => (part?.type === "text" ? String(part.text || "") : ""))
    .filter(Boolean)
    .join("\n")
    .trim();

const buildConversationMessages = (messages: any[] = []) =>
  messages
    .map((message) => ({
      role: message?.role === "assistant" ? "assistant" : "user",
      content: getMessageText(message),
    }))
    .filter((message) => message.content)
    .slice(-8);

const buildAssistantSystemPrompt = (cvData: any, jobDescription: string) => `
You are a job application assistant embedded in a CV editor.
You help tailor the existing CV for a target role.

Rules:
- Return valid JSON only.
- Never use markdown fences.
- Never include prose before or after the JSON object.
- Never invent experience, employers, dates, education, certifications, or metrics.
- Use the supplied CV data as the source of truth.
- Keep output compact to avoid truncation.
- If concrete CV edits would help, include up to 2 suggestions.
- Suggestions must reference only existing editable string field paths from the CV.
- Use only paths from this allowed list:
${collectEditableStringPaths(cvData).join(", ")}
- Do not target name, email, phone, or linkedin fields.
- Do not use array root paths like "skills" or "workExperience". Use an exact string field path like "skills[0]" or "workExperience[0]".
- Keep "answer" to one short paragraph.
- Keep each "title" to 2-5 words.
- Keep each "reason" to one short sentence.
- "sectionId" is optional. If you include it, it must be one of: summary, work, volunteer, education, projects, skills, certifications, awards, additional-info.
- "originalText" may be empty. Do not copy long paragraphs into it.
- "suggestedText" must be concise and focused only on the targeted field.
- If no concrete edit is needed, return an empty suggestions array.

Return exactly this shape:
{
  "answer": "short plain-language response to the user",
  "suggestions": [
    {
      "title": "short label",
      "reason": "why this change helps",
      "fieldPath": "existing.field.path",
      "sectionId": "optional section id",
      "issueType": "clarity|impact|ats|length",
      "originalText": "optional short excerpt or empty string",
      "suggestedText": "replacement plain text"
    }
  ]
}

Current CV JSON:
${JSON.stringify(cvData, null, 2)}

Current job description:
${jobDescription || "No job description provided yet."}
`.trim();

const buildAssistantResponse = (payload: any, cvData: any) => {
  const suggestions = sanitizeAssistantSuggestions(cvData, payload?.suggestions || []);
  const answer = String(payload?.answer || "").trim() || "I have suggested a few targeted improvements for this role.";

  return {
    answer,
    suggestions,
  };
};

export class JobAssistant extends AIChatAgent {
  initialState = {
    cvData: {},
    jobDescription: "",
    suggestions: [],
    lastContextUpdatedAt: null,
  };

  @callable()
  getChatSnapshot() {
    return {
      messages: this.messages || [],
      state: this.state || this.initialState,
    };
  }

  async onChatMessage() {
    const cvData = this.state?.cvData || {};
    const jobDescription = String(this.state?.jobDescription || "").trim();
    const conversationMessages = buildConversationMessages(this.messages);
    const baseMessages = [
      {
        role: "system",
        content: buildAssistantSystemPrompt(cvData, jobDescription),
      },
      ...conversationMessages,
    ];

    logAssistantDebug(this.env, "request.start", {
      hasJobDescription: Boolean(jobDescription),
      conversationCount: conversationMessages.length,
      existingSuggestionCount: Array.isArray(this.state?.suggestions) ? this.state.suggestions.length : 0,
      latestUserMessage: conversationMessages.filter((message) => message.role === "user").slice(-1)[0]?.content || "",
    });

    let payload = null;
    let rawText = "";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const messages =
        attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              {
                role: "user",
                content: `Your previous response was invalid. Return corrected JSON only.\n\nPrevious response:\n${rawText}`,
              },
            ];

      let response: any = null;
      try {
        response = await this.env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
          messages,
          max_tokens: 1400,
          temperature: 0.2,
          response_format: { type: "json_object" },
        });
      } catch (error: any) {
        logAssistantDebug(this.env, "request.error", {
          attempt,
          message: String(error?.message || "Workers AI request failed."),
        });
        continue;
      }

      rawText = readWorkersAiText(response);
      payload =
        (response?.response && typeof response.response === "object" ? response.response : null) ||
        (response?.result?.response && typeof response.result.response === "object" ? response.result.response : null) ||
        parseJsonLenient(rawText);

      logAssistantDebug(this.env, "response.received", {
        attempt,
        responseKeys: response && typeof response === "object" ? Object.keys(response) : [],
        rawTextPreview: rawText,
        parsedType: payload ? typeof payload : "null",
        parsedPreview: payload,
      });

      if (payload && typeof payload === "object") {
        break;
      }

      logAssistantDebug(this.env, "response.parse_failed", {
        attempt,
        reason: "Assistant response is not valid JSON.",
      });
    }

    if (!payload || typeof payload !== "object") {
      logAssistantDebug(this.env, "response.fallback_text", {
        reason: "Assistant response is not valid JSON.",
      });
      return new Response("I could not generate a structured tailoring response for that request.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const normalized = buildAssistantResponse(payload, cvData);
    logAssistantDebug(this.env, "response.normalized", {
      suggestionCount: normalized.suggestions.length,
      answerPreview: normalized.answer,
      fieldPaths: normalized.suggestions.map((suggestion: any) => suggestion.fieldPath),
    });
    this.setState({
      ...this.state,
      suggestions: normalized.suggestions,
      lastContextUpdatedAt: new Date().toISOString(),
    });

    return new Response(normalized.answer, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

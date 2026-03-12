// @ts-nocheck
import { Hono } from "hono";
import { cors } from "hono/cors";
import { routeAgentRequest } from "agents";
import aiSchemaModule from "../../server/utils/aiSchema.js";
import { JobAssistant } from "./agent";
import { CVStoreDurableObject } from "./durableObject";
import { loadCvDocument, saveCvDocument } from "./services/cvStore";
import { requestAiReview, AiReviewError } from "./services/aiReview";
import { generatePdfBuffer, generateWordBuffer } from "./services/export";

export interface Env {
  AI: Ai;
  BROWSER: Fetcher;
  CV_STORE: DurableObjectNamespace;
  JobAssistant: DurableObjectNamespace;
  ENVIRONMENT: string;
  AI_REVIEW_ENABLED: string;
  ALLOWED_ORIGINS?: string;
  PAGES_URL?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://cf-ai-job-assistant.pages.dev",
];

const parseAllowedOrigins = (env: Env) => {
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
};

const isAiReviewEnabled = (env: Env) =>
  String(env.AI_REVIEW_ENABLED || "").toLowerCase() === "true";
const { validateReviewRequest } = aiSchemaModule as any;

const requireUserId = (userId: string) => {
  if (!String(userId || "").trim()) {
    return { ok: false, message: "userId is required." };
  }

  return { ok: true, value: String(userId).trim() };
};

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: parseAllowedOrigins(c.env),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  });

  return corsMiddleware(c, next);
});

app.use("/agents/*", async (c, next) => {
  const corsMiddleware = cors({
    origin: parseAllowedOrigins(c.env),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  });

  return corsMiddleware(c, next);
});

app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    environment: c.env.ENVIRONMENT,
    message: "CF AI Job Assistant Worker is running",
    timestamp: new Date().toISOString(),
  })
);

app.post("/api/cv/save", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid save payload." }, 400);
  }

  const userIdResult = requireUserId((body as any).userId);
  if (!userIdResult.ok) {
    return c.json({ error: userIdResult.message }, 400);
  }

  try {
    const saved = await saveCvDocument(c.env, userIdResult.value, (body as any).cvData || {});
    return c.json({
      ...(saved.cvData || {}),
      userId: userIdResult.value,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to save CV" }, error.status || 500);
  }
});

app.get("/api/cv/:userId", async (c) => {
  const userIdResult = requireUserId(c.req.param("userId"));
  if (!userIdResult.ok) {
    return c.json({ error: userIdResult.message }, 400);
  }

  try {
    const document = await loadCvDocument(c.env, userIdResult.value);
    return c.json({
      ...(document.cvData || {}),
      userId: userIdResult.value,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error: any) {
    const status = error.status || 500;
    return c.json(
      { error: status === 404 ? "CV not found" : error.message || "Failed to fetch CV" },
      status
    );
  }
});

app.post("/api/ai/review", async (c) => {
  if (!isAiReviewEnabled(c.env)) {
    return c.json({ error: "AI review is disabled." }, 404);
  }

  const body = await c.req.json().catch(() => null);
  const validation = validateReviewRequest(body);

  if (!validation.ok) {
    return c.json({ error: "Invalid AI review request.", details: validation.errors }, 400);
  }

  try {
    const result = await requestAiReview(c.env, validation.value);
    return c.json(result);
  } catch (error: any) {
    if (error instanceof AiReviewError) {
      return c.json({ error: error.message, details: error.details || [] }, error.statusCode || 502);
    }

    return c.json({ error: "Unexpected AI review failure." }, 500);
  }
});

app.post("/api/ai/review/stream", async (c) => {
  if (!isAiReviewEnabled(c.env)) {
    return c.json({ error: "AI review is disabled." }, 404);
  }

  const body = await c.req.json().catch(() => null);
  const validation = validateReviewRequest(body);

  if (!validation.ok) {
    return c.json({ error: "Invalid AI review request.", details: validation.errors }, 400);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const emit = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        emit("start", {
          mode: validation.value.mode,
          generatedAt: new Date().toISOString(),
        });

        const result = await requestAiReview(c.env, validation.value);

        emit("overall", {
          mode: result.mode,
          generatedAt: result.generatedAt,
          overall: result.overall,
          bySection: result.bySection,
          jobMatch: result.jobMatch || null,
        });

        for (let index = 0; index < (result.topFixes || []).length; index += 1) {
          emit("suggestion", {
            suggestion: result.topFixes[index],
            index,
          });
        }

        emit("complete", {
          mode: result.mode,
          generatedAt: result.generatedAt,
        });
      } catch (error: any) {
        emit("error", {
          error:
            error instanceof AiReviewError
              ? error.message
              : "Unexpected AI review failure.",
          details: error instanceof AiReviewError ? error.details || [] : [],
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});

app.post("/api/export/word", async (c) => {
  const body = await c.req.json().catch(() => null);
  const cvData = (body as any)?.cvData || {};
  const template = String((body as any)?.template || "A");

  try {
    const buffer = await generateWordBuffer(cvData, template);
    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="OnClickCV.docx"',
      },
    });
  } catch (error) {
    console.error("Error generating Word doc:", error);
    return c.json({ error: "Failed to generate Word." }, 500);
  }
});

app.post("/api/export/pdf", async (c) => {
  const body = await c.req.json().catch(() => null);
  const cvData = (body as any)?.cvData || {};
  const template = String((body as any)?.template || "A");

  if (!c.env.BROWSER) {
    return c.json(
      { error: "PDF export is unavailable in local-only dev mode. Use remote worker dev for Browser Rendering." },
      503
    );
  }

  try {
    const buffer = await generatePdfBuffer(c.env, cvData, template);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="OnClickCV.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return c.json({ error: "Failed to generate PDF." }, 500);
  }
});

app.all("/agents/*", async (c) => {
  const response = await routeAgentRequest(c.req.raw, c.env);
  return response || c.json({ error: "Agent route not found" }, 404);
});

app.get("/", (c) => c.text("CF AI Job Assistant Worker - see /api/health"));

app.notFound((c) => c.json({ error: "Route not found" }, 404));

export default app;
export { CVStoreDurableObject, JobAssistant };

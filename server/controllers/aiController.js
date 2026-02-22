const { validateReviewRequest } = require("../utils/aiSchema");
const { AiReviewError, requestAiReview } = require("../services/aiReviewService");

const isAiReviewEnabled = () => String(process.env.AI_REVIEW_ENABLED || "").toLowerCase() === "true";

const reviewCV = async (req, res) => {
    if (!isAiReviewEnabled()) {
        return res.status(404).json({ error: "AI review is disabled." });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: "AI review is unavailable: OPENAI_API_KEY is not configured." });
    }

    const validation = validateReviewRequest(req.body);
    if (!validation.ok) {
        return res.status(400).json({
            error: "Invalid AI review request.",
            details: validation.errors
        });
    }

    try {
        const result = await requestAiReview(validation.value);
        return res.json(result);
    } catch (error) {
        if (error instanceof AiReviewError) {
            return res.status(error.statusCode || 502).json({
                error: error.message,
                details: error.details || []
            });
        }

        return res.status(500).json({
            error: "Unexpected AI review failure."
        });
    }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const writeSse = (res, event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const reviewCVStream = async (req, res) => {
    if (!isAiReviewEnabled()) {
        return res.status(404).json({ error: "AI review is disabled." });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({ error: "AI review is unavailable: OPENAI_API_KEY is not configured." });
    }

    const validation = validateReviewRequest(req.body);
    if (!validation.ok) {
        return res.status(400).json({
            error: "Invalid AI review request.",
            details: validation.errors
        });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    let clientClosed = false;
    req.on("close", () => {
        clientClosed = true;
    });

    try {
        writeSse(res, "start", {
            mode: validation.value.mode,
            generatedAt: new Date().toISOString()
        });

        const result = await requestAiReview(validation.value);
        if (clientClosed) {
            return res.end();
        }

        writeSse(res, "overall", {
            mode: result.mode,
            generatedAt: result.generatedAt,
            overall: result.overall,
            bySection: result.bySection,
            jobMatch: result.jobMatch || null
        });

        for (let index = 0; index < (result.topFixes || []).length; index += 1) {
            if (clientClosed) {
                break;
            }
            writeSse(res, "suggestion", {
                suggestion: result.topFixes[index],
                index
            });
            await sleep(90);
        }

        if (!clientClosed) {
            writeSse(res, "complete", {
                mode: result.mode,
                generatedAt: result.generatedAt
            });
        }
        return res.end();
    } catch (error) {
        const payload = {
            error: error instanceof AiReviewError ? error.message : "Unexpected AI review failure.",
            details: error instanceof AiReviewError ? error.details || [] : []
        };
        writeSse(res, "error", payload);
        return res.end();
    }
};

module.exports = {
    reviewCV,
    reviewCVStream
};

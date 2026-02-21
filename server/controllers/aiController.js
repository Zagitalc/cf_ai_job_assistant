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

module.exports = {
    reviewCV
};

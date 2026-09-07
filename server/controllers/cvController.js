const CV = require("../models/CV");

const sanitizeCvData = (cvData) => {
    if (!cvData || typeof cvData !== "object" || Array.isArray(cvData)) {
        return {};
    }

    const allowedFields = [
        "personalInfo",
        "summary",
        "education",
        "experience",
        "skills",
        "projects",
        "certifications",
        "languages",
        "interests",
        "references"
    ];

    return allowedFields.reduce((acc, key) => {
        if (Object.prototype.hasOwnProperty.call(cvData, key)) {
            acc[key] = cvData[key];
        }
        return acc;
    }, {});
};

const sanitizeUserId = (value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

// Save or update a CV
exports.saveCV = async (req, res) => {
    try {
        const { cvData, userId } = req.body;
        const safeCvData = sanitizeCvData(cvData);
        let cv;
        if (userId !== undefined && userId !== null) {
            const safeUserId = sanitizeUserId(userId);
            if (!safeUserId) {
                return res.status(400).json({ error: "Invalid userId" });
            }
            cv = await CV.findOneAndUpdate(
                { userId: { $eq: safeUserId } },
                { ...safeCvData, userId: safeUserId, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        } else {
            cv = await CV.create({ ...safeCvData });
        }
        res.json(cv);
    } catch (err) {
        res.status(500).json({ error: "Failed to save CV" });
    }
};

// Get a CV by userId
exports.getCV = async (req, res) => {
    try {
        const { userId } = req.params;
        const safeUserId = sanitizeUserId(userId);
        if (!safeUserId) {
            return res.status(400).json({ error: "Invalid userId" });
        }
        const cv = await CV.findOne({ userId: { $eq: safeUserId } });
        if (!cv) return res.status(404).json({ error: "CV not found" });
        res.json(cv);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch CV" });
    }
};
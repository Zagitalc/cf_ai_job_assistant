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

// Save or update a CV
exports.saveCV = async (req, res) => {
    try {
        const { cvData, userId } = req.body;
        const safeCvData = sanitizeCvData(cvData);
        let cv;
        if (userId) {
            cv = await CV.findOneAndUpdate(
                { userId },
                { ...safeCvData, userId, updatedAt: new Date() },
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
        const cv = await CV.findOne({ userId });
        if (!cv) return res.status(404).json({ error: "CV not found" });
        res.json(cv);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch CV" });
    }
};
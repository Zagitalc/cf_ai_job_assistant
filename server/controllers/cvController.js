const CV = require("../models/CV");

// Save or update a CV
exports.saveCV = async (req, res) => {
    try {
        const { cvData, userId } = req.body;
        let cv;
        if (userId) {
            cv = await CV.findOneAndUpdate(
                { userId },
                { ...cvData, userId, updatedAt: new Date() },
                { upsert: true, new: true }
            );
        } else {
            cv = await CV.create({ ...cvData });
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
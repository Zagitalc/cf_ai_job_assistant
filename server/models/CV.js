const mongoose = require("mongoose");

const EducationSchema = new mongoose.Schema({
    degree: String,
    school: String,
    location: String,
    startDate: String,
    endDate: String,
    additionalInfo: String,
});

const CVSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    linkedin: String,
    summary: String,
    workExperience: [String], // HTML strings
    volunteerExperience: [String], // HTML strings
    education: [EducationSchema],
    skills: [String],
    projects: [String], // HTML strings
    certifications: [String], // HTML strings
    awards: [String], // HTML strings
    interests: String,
    sectionLayout: {
        left: [String],
        right: [String],
        editorCardOrder: [String]
    },
    userId: String, // Optional: for user authentication
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CV", CVSchema);

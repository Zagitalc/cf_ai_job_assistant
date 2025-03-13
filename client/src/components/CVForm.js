import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CVForm = ({ cvData, setCvData, template, setTemplate }) => {
    // Local state for adding new skills
    const [newSkill, setNewSkill] = useState("");

    // Local state for adding new education entry
    const [newEdu, setNewEdu] = useState({
        degree: "",
        school: "",
        location: "",
        startDate: "",
        endDate: "",
        // We'll store the Quill HTML content here
        additionalInfo: ""
    });

    // Update top-level cvData for fields like name, summary, phone, etc.
    const handleChange = (e) => {
        setCvData({
            ...cvData,
            [e.target.name]: e.target.value
        });
    };

    /* =========================
       SKILLS: ADD/REMOVE LOGIC
       ========================= */
    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        const updatedSkills = [...cvData.skills, newSkill.trim()];
        setCvData({ ...cvData, skills: updatedSkills });
        setNewSkill("");
    };

    const handleRemoveSkill = (index) => {
        const updatedSkills = cvData.skills.filter((_, i) => i !== index);
        setCvData({ ...cvData, skills: updatedSkills });
    };

    /* =========================
       EDUCATION: ADD/REMOVE LOGIC
       ========================= */
    // For standard input fields in newEdu
    const handleEduChange = (e) => {
        setNewEdu({
            ...newEdu,
            [e.target.name]: e.target.value
        });
    };

    // For ReactQuill (handles HTML content)
    const handleAdditionalInfoChange = (content) => {
        setNewEdu({
            ...newEdu,
            additionalInfo: content
        });
    };

    const handleAddEducation = () => {
        // Basic validation: if both degree & school are empty, skip
        if (!newEdu.degree && !newEdu.school) return;

        // Add the newEdu object to the main cvData.education array
        const updatedEdu = [...cvData.education, { ...newEdu }];
        setCvData({ ...cvData, education: updatedEdu });

        // Reset local newEdu form
        setNewEdu({
            degree: "",
            school: "",
            location: "",
            startDate: "",
            endDate: "",
            additionalInfo: ""
        });
    };

    /* =========================
       EXPORT FUNCTIONS
       ========================= */
    const exportPDF = async () => {
        try {
            const response = await fetch("http://localhost:4000/api/export/pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ cvData, template })
            });
            if (!response.ok) throw new Error("PDF export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "OnClickCV.pdf";
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        }
    };

    const exportWord = async () => {
        try {
            const response = await fetch("http://localhost:4000/api/export/word", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ cvData })
            });
            if (!response.ok) throw new Error("Word export failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "OnClickCV.docx";
            link.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <h2>CV Form</h2>

            {/* Basic Info */}
            <div>
                <label>Name:</label>
                <input
                    name="name"
                    value={cvData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                />
            </div>
            <div>
                <label>Email:</label>
                <input
                    name="email"
                    value={cvData.email}
                    onChange={handleChange}
                    placeholder="john@example.com"
                />
            </div>
            <div>
                <label>Phone:</label>
                <input
                    name="phone"
                    value={cvData.phone}
                    onChange={handleChange}
                    placeholder="(123) 456-7890"
                />
            </div>
            <div>
                <label>Profile Summary:</label>
                <textarea
                    name="summary"
                    value={cvData.summary}
                    onChange={handleChange}
                    placeholder="Write a brief profile summary..."
                    rows={3}
                />
            </div>

            {/* Work Experience */}
            <div>
                <label>Work/Volunteer Experience:</label>
                <textarea
                    name="workExperience"
                    value={cvData.workExperience}
                    onChange={handleChange}
                    placeholder="List your experience..."
                    rows={3}
                />
            </div>

            {/* Projects */}
            <div>
                <label>Projects:</label>
                <textarea
                    name="projects"
                    value={cvData.projects}
                    onChange={handleChange}
                    placeholder="Describe your projects..."
                    rows={3}
                />
            </div>

            {/* SKILLS: dynamic list */}
            <div>
                <label>Add a Skill:</label>
                <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="e.g. Python, React"
                />
                <button onClick={handleAddSkill}>Add Skill</button>
                {cvData.skills.length > 0 && (
                    <ul>
                        {cvData.skills.map((skill, idx) => (
                            <li key={idx}>
                                {skill}{" "}
                                <button
                                    onClick={() => handleRemoveSkill(idx)}
                                    style={{ background: "#ccc" }}
                                >
                                    x
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* EDUCATION: dynamic list with ReactQuill for additional info */}
            <h3>Education</h3>
            <div>
                <label>Degree:</label>
                <input
                    name="degree"
                    value={newEdu.degree}
                    onChange={handleEduChange}
                    placeholder="e.g., BSc in Computer Science"
                />
            </div>
            <div>
                <label>School:</label>
                <input
                    name="school"
                    value={newEdu.school}
                    onChange={handleEduChange}
                    placeholder="e.g., Durham University"
                />
            </div>
            <div>
                <label>Location:</label>
                <input
                    name="location"
                    value={newEdu.location}
                    onChange={handleEduChange}
                    placeholder="e.g., Durham, UK"
                />
            </div>
            <div>
                <label>Start Date:</label>
                <input
                    name="startDate"
                    value={newEdu.startDate}
                    onChange={handleEduChange}
                    placeholder="e.g., 2020"
                />
            </div>
            <div>
                <label>End Date:</label>
                <input
                    name="endDate"
                    value={newEdu.endDate}
                    onChange={handleEduChange}
                    placeholder="e.g., 2024 (or 'Present')"
                />
            </div>
            <div>
                <label>Additional Info:</label>
                <ReactQuill
                    theme="snow"
                    value={newEdu.additionalInfo}
                    onChange={handleAdditionalInfoChange}
                    placeholder="Optional details, honors, relevant coursework..."
                />
            </div>
            <button onClick={handleAddEducation}>Add Education</button>

            {/* Certifications, Awards, Interests */}
            <div>
                <label>Certifications:</label>
                <textarea
                    name="certifications"
                    value={cvData.certifications}
                    onChange={handleChange}
                    placeholder="List any certifications..."
                    rows={2}
                />
            </div>
            <div>
                <label>Awards:</label>
                <textarea
                    name="awards"
                    value={cvData.awards}
                    onChange={handleChange}
                    placeholder="List any awards..."
                    rows={2}
                />
            </div>
            <div>
                <label>Interests:</label>
                <textarea
                    name="interests"
                    value={cvData.interests}
                    onChange={handleChange}
                    placeholder="Your interests or hobbies..."
                    rows={2}
                />
            </div>

            {/* Template Selector */}
            <div style={{ marginTop: "10px" }}>
                <label>Template: </label>
                <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="A">Template A (Clean)</option>
                    <option value="B">Template B (Icons/Colors)</option>
                </select>
            </div>

            {/* Export Buttons */}
            <div style={{ marginTop: "20px" }}>
                <button onClick={exportPDF}>Export PDF</button>
                <button onClick={exportWord}>Export Word</button>
            </div>
        </div>
    );
};

export default CVForm;

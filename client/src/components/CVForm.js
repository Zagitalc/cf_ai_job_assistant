import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CVForm = ({ cvData, setCvData, template, setTemplate }) => {
    // Local state for adding new skills
    const [newSkill, setNewSkill] = useState("");
    const [newCert, setNewCert] = useState("");
    const [newAward, setNewAward] = useState("");

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

    const [showCert, setShowCert] = useState(false);
    const [showAwards, setShowAwards] = useState(false);

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
       CERTIFICATIONS: ADD/REMOVE LOGIC
       ========================= */
    const handleAddCert = () => {
        if (!newCert.trim()) return;
        const updatedCerts = [...(cvData.certifications || []), newCert.trim()];
        setCvData({ ...cvData, certifications: updatedCerts });
        setNewCert("");
    };

    const handleRemoveCert = (index) => {
        const updatedCerts = cvData.certifications.filter((_, i) => i !== index);
        setCvData({ ...cvData, certifications: updatedCerts });
    };

    /* =========================
       AWARDS: ADD/REMOVE LOGIC
       ========================= */
    const handleAddAward = () => {
        if (!newAward.trim()) return;
        const updatedAwards = [...(cvData.awards || []), newAward.trim()];
        setCvData({ ...cvData, awards: updatedAwards });
        setNewAward("");
    };

    const handleRemoveAward = (index) => {
        const updatedAwards = cvData.awards.filter((_, i) => i !== index);
        setCvData({ ...cvData, awards: updatedAwards });
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
                                    Remove
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
            <div className="dates-row">
                <div>
                    <label>Start Date:</label>
                    <input
                        type="date"
                        name="startDate"
                        value={newEdu.startDate}
                        onChange={handleEduChange}
                    />
                </div>
                <div>
                    <label>End Date:</label>
                    <input
                        type="date"
                        name="endDate"
                        value={newEdu.endDate}
                        onChange={handleEduChange}
                    />
                </div>
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
            {cvData.education.length > 0 && (
                <div className="education-list">
                    {cvData.education.map((edu, idx) => (
                        <div key={idx} className="education-entry" style={{ border: "1px solid #eee", borderRadius: "6px", padding: "8px", marginBottom: "8px", position: "relative" }}>
                            <button
                                type="button"
                                className="delete-btn"
                                style={{ position: "absolute", top: "8px", right: "8px" }}
                                onClick={() => {
                                    const updatedEdu = cvData.education.filter((_, i) => i !== idx);
                                    setCvData({ ...cvData, education: updatedEdu });
                                }}
                                aria-label="Delete education entry"
                            >
                                Remove
                            </button>
                            <div><strong>Degree:</strong> {edu.degree}</div>
                            <div><strong>School:</strong> {edu.school}</div>
                            <div><strong>Location:</strong> {edu.location}</div>
                            <div><strong>Dates:</strong> {edu.startDate} - {edu.endDate}</div>
                            {edu.additionalInfo && (
                                <div>
                                    <strong>Details:</strong>
                                    <div dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Certifications */}
            <div>
                <label>Add a Certification:</label>
                <input
                    type="text"
                    value={newCert}
                    onChange={(e) => setNewCert(e.target.value)}
                    placeholder="e.g. AWS Certified Solutions Architect"
                />
                <button type="button" onClick={handleAddCert}>Add Certification</button>
                {cvData.certifications && cvData.certifications.length > 0 && (
                    <ul className="skills-list">
                        {cvData.certifications.map((cert, idx) => (
                            <li key={idx}>
                                {cert}
                                <button
                                    type="button"
                                    className="delete-btn"
                                    onClick={() => handleRemoveCert(idx)}
                                    aria-label="Delete certification"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Awards */}
            <div>
                <label>Add an Award:</label>
                <input
                    type="text"
                    value={newAward}
                    onChange={(e) => setNewAward(e.target.value)}
                    placeholder="e.g. Dean's List 2022"
                />
                <button type="button" onClick={handleAddAward}>Add Award</button>
                {cvData.awards && cvData.awards.length > 0 && (
                    <ul className="skills-list">
                        {cvData.awards.map((award, idx) => (
                            <li key={idx}>
                                {award}
                                <button
                                    type="button"
                                    className="delete-btn"
                                    onClick={() => handleRemoveAward(idx)}
                                    aria-label="Delete award"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Interests */}
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

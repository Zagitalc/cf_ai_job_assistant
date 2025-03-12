import React from "react";

const CVForm = ({ cvData, setCvData, template, setTemplate }) => {
    const handleChange = (e) => {
        setCvData({
            ...cvData,
            [e.target.name]: e.target.value
        });
    };

    const handleTemplateChange = (e) => {
        setTemplate(e.target.value);
    };

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

            // Download the PDF
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

            // Download the DOCX
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
        <div style={{ width: "400px" }}>
            <h2>CV Form</h2>
            <div>
                <label>Name: </label>
                <input name="name" value={cvData.name} onChange={handleChange} placeholder="John Doe" />
            </div>
            <div>
                <label>Email: </label>
                <input name="email" value={cvData.email} onChange={handleChange} placeholder="john@example.com" />
            </div>
            <div>
                <label>Phone: </label>
                <input name="phone" value={cvData.phone} onChange={handleChange} placeholder="(123) 456-7890" />
            </div>
            <div>
                <label>Profile Summary: </label>
                <textarea
                    name="summary"
                    value={cvData.summary}
                    onChange={handleChange}
                    placeholder="Write a brief profile summary..."
                    rows={3}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Work Experience / Volunteer Experience: </label>
                <textarea
                    name="workExperience"
                    value={cvData.workExperience}
                    onChange={handleChange}
                    placeholder="List your work or volunteer experience..."
                    rows={3}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Education: </label>
                <textarea
                    name="education"
                    value={cvData.education}
                    onChange={handleChange}
                    placeholder="Your educational background..."
                    rows={3}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Skills: </label>
                <textarea
                    name="skills"
                    value={cvData.skills}
                    onChange={handleChange}
                    placeholder="List your skills..."
                    rows={2}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Projects: </label>
                <textarea
                    name="projects"
                    value={cvData.projects}
                    onChange={handleChange}
                    placeholder="Describe your projects..."
                    rows={3}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Certifications: </label>
                <textarea
                    name="certifications"
                    value={cvData.certifications}
                    onChange={handleChange}
                    placeholder="List any certifications..."
                    rows={2}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Awards: </label>
                <textarea
                    name="awards"
                    value={cvData.awards}
                    onChange={handleChange}
                    placeholder="List any awards..."
                    rows={2}
                    style={{ width: "100%" }}
                />
            </div>
            <div>
                <label>Interests: </label>
                <textarea
                    name="interests"
                    value={cvData.interests}
                    onChange={handleChange}
                    placeholder="Your interests or hobbies..."
                    rows={2}
                    style={{ width: "100%" }}
                />
            </div>

            {/* Template Selector */}
            <div style={{ marginTop: "10px" }}>
                <label>Template: </label>
                <select value={template} onChange={handleTemplateChange}>
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

import React from "react";
import "./../templates/templateA.css";
import "./../templates/TemplateB.css";

const isRichTextEmpty = (value) => !value || value === "<p><br></p>" || value.trim() === "";

const CVPreview = ({ cvData, template }) => {
    const {
        name,
        email,
        phone,
        linkedin,
        summary,
        workExperience,
        volunteerExperience,
        education,
        skills,
        projects,
        certifications,
        awards
    } = cvData;

    const safeTemplate = template === "B" ? "B" : "A";

    const renderRichEntries = (entries) => {
        const validEntries = (entries || []).filter((entry) => !isRichTextEmpty(entry));
        if (validEntries.length === 0) {
            return <div className="preview-empty">N/A</div>;
        }

        return validEntries.map((entry, idx) => (
            <div key={idx} className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: entry }} />
        ));
    };

    return (
        <div className="preview-root">
            <div className={`preview-container template-${safeTemplate}`}>
                <div className="left-column">
                    <h3>Personal Info</h3>
                    <div className="preview-personal-block">
                        <div><span className="preview-label">Name:</span> {name || "N/A"}</div>
                        <div><span className="preview-label">Email:</span> {email || "N/A"}</div>
                        <div><span className="preview-label">Phone:</span> {phone || "N/A"}</div>
                        <div><span className="preview-label">LinkedIn:</span> {linkedin || "N/A"}</div>
                    </div>

                    <h3>Skills</h3>
                    {(skills || []).length > 0 ? (
                        <ul className="preview-list">
                            {(skills || []).map((skill, idx) => (
                                <li key={idx}>{skill}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="preview-empty">N/A</div>
                    )}

                    {(certifications || []).length > 0 && (
                        <>
                            <h3>Certifications</h3>
                            <div className="preview-rich-list">
                                {(certifications || []).map((cert, idx) => (
                                    <div key={idx} className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: cert }} />
                                ))}
                            </div>
                        </>
                    )}

                    {(awards || []).length > 0 && (
                        <>
                            <h3>Awards</h3>
                            <div className="preview-rich-list">
                                {(awards || []).map((award, idx) => (
                                    <div key={idx} className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: award }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="right-column">
                    <h3>Profile Summary</h3>
                    <div className="preview-text-block">{summary || "N/A"}</div>

                    <h3>Work Experience</h3>
                    <div className="preview-rich-list">{renderRichEntries(workExperience)}</div>

                    <h3>Volunteer Experience</h3>
                    <div className="preview-rich-list">{renderRichEntries(volunteerExperience)}</div>

                    <h3>Education</h3>
                    {(education || []).length > 0 ? (
                        <div className="preview-rich-list">
                            {(education || []).map((edu, idx) => (
                                <div key={idx} className="preview-education-entry">
                                    <div className="preview-education-school">{edu.school || "N/A"}</div>
                                    <div>{edu.degree || "N/A"}</div>
                                    <div>{edu.location || "N/A"}</div>
                                    {(edu.startDate || edu.endDate) && (
                                        <div className="preview-education-dates">
                                            {edu.startDate}
                                            {edu.startDate && edu.endDate ? " - " : ""}
                                            {edu.endDate}
                                        </div>
                                    )}
                                    {edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo) && (
                                        <div className="preview-rich-entry" dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="preview-empty">N/A</div>
                    )}

                    <h3>Projects</h3>
                    <div className="preview-rich-list">{renderRichEntries(projects)}</div>
                </div>
            </div>
        </div>
    );
};

export default CVPreview;

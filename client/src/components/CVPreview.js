import React from "react";
import "./../templates/TemplateA.css";
import "./../templates/TemplateB.css";

const CVPreview = ({ cvData, template }) => {
    const {
        name,
        email,
        phone,
        linkedin,
        summary,
        workExperience,
        education,
        skills,
        projects,
        certifications,
        awards
    } = cvData;

    return (
        <div className={`cv-preview-container`}>
            <div className={`a4-preview preview-container template-${template}`}>
                {/* Left Column */}
                <div className="left-column">
                    <h3>Personal Info</h3>
                    <p><strong>Name:</strong> {name || 'N/A'}</p>
                    <p><strong>Email:</strong> {email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {phone || 'N/A'}</p>
                    <p><strong>LinkedIn:</strong> {linkedin || 'N/A'}</p>

                    <h3>Skills</h3>
                    {skills && skills.length > 0 ? (
                        <ul>
                            {skills.map((skill, idx) => (
                                <li key={idx}>{skill}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>N/A</p>
                    )}

                    {certifications && certifications.length > 0 && (
                        <>
                            <h3>Certifications</h3>
                            <ul>
                                {certifications.map((cert, idx) => (
                                    <li key={idx}>
                                        <span dangerouslySetInnerHTML={{ __html: cert }} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {awards && awards.length > 0 && (
                        <>
                            <h3>Awards</h3>
                            <ul>
                                {awards.map((award, idx) => (
                                    <li key={idx}>
                                        <span dangerouslySetInnerHTML={{ __html: award }} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>

                {/* Right Column */}
                <div className="right-column">
                    <h3>Profile Summary</h3>
                    <p>{summary || 'N/A'}</p>

                    <h3>Work Experience</h3>
                    <p>{workExperience || 'N/A'}</p>

                    <h3>Education</h3>
                    {education && education.length > 0 ? (
                        education.map((edu, idx) => (
                            <div key={idx} className="education-entry" style={{ marginBottom: 18 }}>
                                <div style={{ fontWeight: 700, fontSize: "1.15em", marginBottom: 2 }}>
                                    {edu.school}
                                </div>
                                {edu.degree && (
                                    <div style={{ marginBottom: 2 }}>{edu.degree}</div>
                                )}
                                {edu.location && (
                                    <div style={{ marginBottom: 2 }}>{edu.location}</div>
                                )}
                                {(edu.startDate || edu.endDate) && (
                                    <div style={{ color: "#888", fontSize: "0.95em", marginBottom: 2 }}>
                                        {edu.startDate}{edu.startDate && edu.endDate ? " - " : ""}{edu.endDate}
                                    </div>
                                )}
                                {edu.additionalInfo && (
                                    <div
                                        style={{ marginBottom: 2 }}
                                        dangerouslySetInnerHTML={{ __html: edu.additionalInfo }}
                                        className="education-details"
                                    />
                                )}
                            </div>
                        ))
                    ) : (
                        <p>N/A</p>
                    )}

                    <h3>Projects</h3>
                    <p>{projects || 'N/A'}</p>
                </div>
            </div>
        </div>
    );
};

export default CVPreview;
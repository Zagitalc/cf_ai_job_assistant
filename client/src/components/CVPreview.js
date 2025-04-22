import React from "react";
import "./../templates/TemplateA.css";
import "./../templates/TemplateB.css";

const CVPreview = ({ cvData, template }) => {
    const {
        name,
        email,
        phone,
        summary,
        workExperience,
        education,
        skills,
        projects,
        certifications,
        awards,
        interests
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

                    <h3>Skills</h3>
                    {/* Fixed skills rendering to handle array data structure */}
                    {skills && skills.length > 0 ? (
                        <ul>
                            {skills.map((skill, idx) => (
                                <li key={idx}>{skill}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>N/A</p>
                    )}

                    <h3>Certifications</h3>
                    {certifications && certifications.length > 0 ? (
                        <ul>
                            {certifications.map((cert, idx) => (
                                <li key={idx}>{cert}</li>
                            ))}
                        </ul>
                    ) : <p>N/A</p>}

                    <h3>Awards</h3>
                    {awards && awards.length > 0 ? (
                        <ul>
                            {awards.map((award, idx) => (
                                <li key={idx}>{award}</li>
                            ))}
                        </ul>
                    ) : <p>N/A</p>}

                    <h3>Interests</h3>
                    {interests ? <p>{interests}</p> : null}
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
                            <div key={idx} className="education-entry">
                                <p><strong>Degree:</strong> {edu.degree}</p>
                                <p><strong>School:</strong> {edu.school}</p>
                                <p><strong>Location:</strong> {edu.location}</p>
                                <p><strong>Dates:</strong> {edu.startDate} - {edu.endDate}</p>
                                {edu.additionalInfo && (
                                    <div>
                                        <strong>Details:</strong>
                                        {/* Render HTML from Quill with security consideration */}
                                        <div
                                            dangerouslySetInnerHTML={{ __html: edu.additionalInfo }}
                                            className="education-details"
                                        />
                                    </div>
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
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
        projects,
        certifications,
        awards,
        interests,
        skills,
        education
    } = cvData;

    return (
        <div className={`preview-container template-${template}`}>
            {/* Left Column */}
            <div className="left-column">
                <h3>Personal Info</h3>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone}</p>

                <h3>Skills</h3>
                {Array.isArray(skills) && skills.length > 0 ? (
                    <ul className="skills-list">
                        {skills.map((skill, i) => (
                            <li key={i}>{skill}</li>
                        ))}
                    </ul>
                ) : (
                    <p>N/A</p>
                )}

                <h3>Certifications</h3>
                <p>{certifications || "N/A"}</p>

                <h3>Awards</h3>
                <p>{awards || "N/A"}</p>

                <h3>Interests</h3>
                <p>{interests || "N/A"}</p>
            </div>

            {/* Right Column */}
            <div className="right-column">
                <h3>Profile Summary</h3>
                <p>{summary || "N/A"}</p>

                <h3>Work Experience</h3>
                <p>{workExperience || "N/A"}</p>

                <h3>Education</h3>
                {education && education.length > 0 ? (
                    education.map((edu, idx) => (
                        <div key={idx} style={{ marginBottom: "10px" }}>
                            <p><strong>Degree:</strong> {edu.degree}</p>
                            <p><strong>School:</strong> {edu.school}</p>
                            <p><strong>Location:</strong> {edu.location}</p>
                            <p>
                                <strong>Dates:</strong> {edu.startDate} - {edu.endDate}
                            </p>
                            {edu.additionalInfo && (
                                <div>
                                    <strong>Details:</strong>
                                    <div
                                        dangerouslySetInnerHTML={{ __html: edu.additionalInfo }}
                                        style={{ marginTop: "5px" }}
                                    />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p>N/A</p>
                )}

                <h3>Projects</h3>
                <p>{projects || "N/A"}</p>
            </div>
        </div>
    );
};

export default CVPreview;

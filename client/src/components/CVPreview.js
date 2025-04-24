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
        volunteerExperience,
        education,
        skills,
        projects,
        certifications,
        awards
    } = cvData;

    return (
        <div className="w-full h-full">
            <div className={`flex flex-col md:flex-row gap-8 w-full h-full preview-container template-${template}`}>
                {/* Left Column */}
                <div className="left-column w-full md:w-1/3 pr-4">
                    <h3 className="text-lg font-semibold border-b mb-2">Personal Info</h3>
                    <div className="mb-4 space-y-1 text-sm">
                        <div><span className="font-semibold">Name:</span> {name || 'N/A'}</div>
                        <div><span className="font-semibold">Email:</span> {email || 'N/A'}</div>
                        <div><span className="font-semibold">Phone:</span> {phone || 'N/A'}</div>
                        <div><span className="font-semibold">LinkedIn:</span> {linkedin || 'N/A'}</div>
                    </div>

                    <h3 className="text-lg font-semibold border-b mb-2">Skills</h3>
                    {skills && skills.length > 0 ? (
                        <ul className="list-disc pl-5 mb-4 space-y-1">
                            {skills.map((skill, idx) => (
                                <li key={idx}>{skill}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="mb-4 text-gray-400">N/A</div>
                    )}

                    {certifications && certifications.length > 0 && (
                        <>
                            <h3 className="text-lg font-semibold border-b mb-2">Certifications</h3>
                            <ul className="list-disc pl-5 mb-4 space-y-1">
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
                            <h3 className="text-lg font-semibold border-b mb-2">Awards</h3>
                            <ul className="list-disc pl-5 mb-4 space-y-1">
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
                <div className="right-column w-full md:w-2/3">
                    <h3 className="text-lg font-semibold border-b mb-2">Profile Summary</h3>
                    <div className="mb-4">{summary || 'N/A'}</div>

                    <h3 className="text-lg font-semibold border-b mb-2">Work Experience</h3>
                    {workExperience && workExperience.length > 0 ? (
                        workExperience.map((work, idx) => (
                            <div key={idx} className="mb-4">
                                <div dangerouslySetInnerHTML={{ __html: work }} />
                            </div>
                        ))
                    ) : (
                        <div className="mb-4 text-gray-400">N/A</div>
                    )}

                    <h3 className="text-lg font-semibold border-b mb-2">Volunteer Experience</h3>
                    {volunteerExperience && volunteerExperience.length > 0 ? (
                        volunteerExperience.map((vol, idx) => (
                            <div key={idx} className="mb-4">
                                <div dangerouslySetInnerHTML={{ __html: vol }} />
                            </div>
                        ))
                    ) : (
                        <div className="mb-4 text-gray-400">N/A</div>
                    )}

                    <h3 className="text-lg font-semibold border-b mb-2">Education</h3>
                    {education && education.length > 0 ? (
                        education.map((edu, idx) => (
                            <div key={idx} className="mb-4">
                                <div className="font-bold text-base">{edu.school}</div>
                                <div className="text-sm">{edu.degree}</div>
                                <div className="text-sm">{edu.location}</div>
                                {(edu.startDate || edu.endDate) && (
                                    <div className="text-xs text-gray-500 mb-1">
                                        {edu.startDate}{edu.startDate && edu.endDate ? " - " : ""}{edu.endDate}
                                    </div>
                                )}
                                {edu.additionalInfo && (
                                    <div className="text-sm mt-1" dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="mb-4 text-gray-400">N/A</div>
                    )}

                    <h3 className="text-lg font-semibold border-b mb-2">Projects</h3>
                    {projects && projects.length > 0 ? (
                        projects.map((proj, idx) => (
                            <div key={idx} className="mb-4">
                                <div dangerouslySetInnerHTML={{ __html: proj }} />
                            </div>
                        ))
                    ) : (
                        <div className="mb-4 text-gray-400">N/A</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CVPreview;
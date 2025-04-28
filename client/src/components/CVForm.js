import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const CVForm = ({
    cvData, setCvData, template, setTemplate,
    onExport, isExporting, exportError,
    onSave, onLoad
}) => {
    const [newSkill, setNewSkill] = useState("");
    const [newCert, setNewCert] = useState("");
    const [newAward, setNewAward] = useState("");
    const [newEdu, setNewEdu] = useState({
        degree: "",
        school: "",
        location: "",
        startDate: "",
        endDate: "",
        additionalInfo: ""
    });

    // New states for work, volunteer, and projects
    const [newWork, setNewWork] = useState("");
    const [newVolunteer, setNewVolunteer] = useState("");
    const [newProject, setNewProject] = useState("");

    const [userId, setUserId] = useState("");

    // Handlers
    const handleChange = (e) => setCvData({ ...cvData, [e.target.name]: e.target.value });

    // Skills
    const handleAddSkill = () => {
        if (!newSkill.trim()) return;
        setCvData({ ...cvData, skills: [...cvData.skills, newSkill.trim()] });
        setNewSkill("");
    };
    const handleRemoveSkill = (idx) => setCvData({ ...cvData, skills: cvData.skills.filter((_, i) => i !== idx) });

    // Education
    const handleEduChange = (e) => setNewEdu({ ...newEdu, [e.target.name]: e.target.value });
    const handleAdditionalInfoChange = (content) => setNewEdu({ ...newEdu, additionalInfo: content });
    const handleAddEducation = () => {
        if (!newEdu.degree && !newEdu.school) return;
        setCvData({ ...cvData, education: [...cvData.education, { ...newEdu }] });
        setNewEdu({ degree: "", school: "", location: "", startDate: "", endDate: "", additionalInfo: "" });
    };
    const handleRemoveEducation = (idx) => setCvData({ ...cvData, education: cvData.education.filter((_, i) => i !== idx) });

    // Certifications
    const handleAddCert = () => {
        if (!newCert || newCert === "<p><br></p>") return;
        setCvData({ ...cvData, certifications: [...(cvData.certifications || []), newCert] });
        setNewCert("");
    };
    const handleRemoveCert = (idx) => setCvData({ ...cvData, certifications: cvData.certifications.filter((_, i) => i !== idx) });

    // Awards
    const handleAddAward = () => {
        if (!newAward || newAward === "<p><br></p>") return;
        setCvData({ ...cvData, awards: [...(cvData.awards || []), newAward] });
        setNewAward("");
    };
    const handleRemoveAward = (idx) => setCvData({ ...cvData, awards: cvData.awards.filter((_, i) => i !== idx) });

    // Work Experience
    const handleAddWork = () => {
        if (!newWork || newWork === "<p><br></p>") return;
        setCvData({ ...cvData, workExperience: [...(cvData.workExperience || []), newWork] });
        setNewWork("");
    };
    const handleRemoveWork = (idx) => setCvData({ ...cvData, workExperience: cvData.workExperience.filter((_, i) => i !== idx) });

    // Volunteer Experience
    const handleAddVolunteer = () => {
        if (!newVolunteer || newVolunteer === "<p><br></p>") return;
        setCvData({ ...cvData, volunteerExperience: [...(cvData.volunteerExperience || []), newVolunteer] });
        setNewVolunteer("");
    };
    const handleRemoveVolunteer = (idx) => setCvData({ ...cvData, volunteerExperience: cvData.volunteerExperience.filter((_, i) => i !== idx) });

    // Projects
    const handleAddProject = () => {
        if (!newProject || newProject === "<p><br></p>") return;
        setCvData({ ...cvData, projects: [...(cvData.projects || []), newProject] });
        setNewProject("");
    };
    const handleRemoveProject = (idx) => setCvData({ ...cvData, projects: cvData.projects.filter((_, i) => i !== idx) });

    return (
        <form className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">CV Form</h2>
            {/* Personal Info */}
            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        name="name"
                        value={cvData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        name="email"
                        value={cvData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                        name="phone"
                        value={cvData.phone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">LinkedIn</label>
                    <input
                        name="linkedin"
                        value={cvData.linkedin || ""}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/yourprofile"
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Profile Summary */}
            <div>
                <label className="block text-sm font-medium mb-1">Profile Summary</label>
                <textarea
                    name="summary"
                    value={cvData.summary}
                    onChange={handleChange}
                    placeholder="Write a brief profile summary..."
                    rows={3}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Work Experience */}
            <div>
                <label className="block text-sm font-medium mb-1">Add Work Experience</label>
                <ReactQuill
                    theme="snow"
                    value={newWork}
                    onChange={setNewWork}
                    placeholder="Describe your work experience..."
                />
                <button type="button" onClick={handleAddWork} className="mt-2 add-btn">Add Work Experience</button>
                {cvData.workExperience && cvData.workExperience.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.workExperience.map((work, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span dangerouslySetInnerHTML={{ __html: work }} />
                                <button type="button" onClick={() => handleRemoveWork(idx)} className="remove-btn ml-2">Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Volunteer Experience */}
            <div>
                <label className="block text-sm font-medium mb-1">Add Volunteer Experience</label>
                <ReactQuill
                    theme="snow"
                    value={newVolunteer}
                    onChange={setNewVolunteer}
                    placeholder="Describe your volunteer experience..."
                />
                <button type="button" onClick={handleAddVolunteer} className="mt-2 add-btn">Add Volunteer Experience</button>
                {cvData.volunteerExperience && cvData.volunteerExperience.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.volunteerExperience.map((vol, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span dangerouslySetInnerHTML={{ __html: vol }} />
                                <button type="button" onClick={() => handleRemoveVolunteer(idx)} className="remove-btn ml-2">Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Projects */}
            <div>
                <label className="block text-sm font-medium mb-1">Add a Project</label>
                <ReactQuill
                    theme="snow"
                    value={newProject}
                    onChange={setNewProject}
                    placeholder="Describe your project..."
                />
                <button type="button" onClick={handleAddProject} className="mt-2 add-btn">Add Project</button>
                {cvData.projects && cvData.projects.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.projects.map((proj, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span dangerouslySetInnerHTML={{ __html: proj }} />
                                <button type="button" onClick={() => handleRemoveProject(idx)} className="remove-btn ml-2">Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Skills */}
            <div>
                <label className="block text-sm font-medium mb-1">Add a Skill</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="e.g. Python, React"
                        className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="button" onClick={handleAddSkill} className="add-btn">Add</button>
                </div>
                {cvData.skills.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.skills.map((skill, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span>{skill}</span>
                                <button type="button" onClick={() => handleRemoveSkill(idx)} className="remove-btn ml-2">Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Education */}
            <div>
                <h3 className="text-lg font-semibold mb-2">Education</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">Degree</label>
                        <input
                            name="degree"
                            value={newEdu.degree}
                            onChange={handleEduChange}
                            placeholder="e.g., BSc in Computer Science"
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">School</label>
                        <input
                            name="school"
                            value={newEdu.school}
                            onChange={handleEduChange}
                            placeholder="e.g., Durham University"
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                            name="location"
                            value={newEdu.location}
                            onChange={handleEduChange}
                            placeholder="e.g., Durham, UK"
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={newEdu.startDate}
                                onChange={handleEduChange}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label>End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={newEdu.endDate}
                                onChange={handleEduChange}
                                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-2">
                    <label className="block text-sm font-medium mb-1">Additional Info</label>
                    <ReactQuill
                        theme="snow"
                        value={newEdu.additionalInfo}
                        onChange={handleAdditionalInfoChange}
                        placeholder="Optional details, honors, relevant coursework..."
                    />
                </div>
                <button type="button" onClick={handleAddEducation} className="mt-2 add-btn">Add Education</button>
                {cvData.education.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {cvData.education.map((edu, idx) => (
                            <div key={idx} className="border rounded p-3 relative bg-gray-50">
                                <button
                                    type="button"
                                    className="absolute top-2 right-2 remove-btn"
                                    onClick={() => handleRemoveEducation(idx)}
                                >Remove</button>
                                <div className="font-semibold">{edu.school}</div>
                                <div>{edu.degree}</div>
                                <div>{edu.location}</div>
                                <div className="text-xs text-gray-500">{edu.startDate} - {edu.endDate}</div>
                                {edu.additionalInfo && (
                                    <div className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Certifications */}
            <div>
                <label className="block text-sm font-medium mb-1">Add a Certification</label>
                <ReactQuill
                    theme="snow"
                    value={newCert}
                    onChange={setNewCert}
                    placeholder="e.g. AWS Certified Solutions Architect"
                />
                <button type="button" onClick={handleAddCert} className="mt-2 add-btn">Add Certification</button>
                {cvData.certifications && cvData.certifications.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.certifications.map((cert, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span dangerouslySetInnerHTML={{ __html: cert }} />
                                <button
                                    type="button"
                                    className="remove-btn ml-2"
                                    onClick={() => handleRemoveCert(idx)}
                                >Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Awards */}
            <div>
                <label className="block text-sm font-medium mb-1">Add an Award</label>
                <ReactQuill
                    theme="snow"
                    value={newAward}
                    onChange={setNewAward}
                    placeholder="e.g. Dean's List 2022"
                />
                <button type="button" onClick={handleAddAward} className="mt-2 add-btn">Add Award</button>
                {cvData.awards && cvData.awards.length > 0 && (
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        {cvData.awards.map((award, idx) => (
                            <li key={idx} className="flex items-center justify-between">
                                <span dangerouslySetInnerHTML={{ __html: award }} />
                                <button
                                    type="button"
                                    className="remove-btn ml-2"
                                    onClick={() => handleRemoveAward(idx)}
                                >Remove</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Template Selector */}
            <div>
                <label className="block text-sm font-medium mb-1">Template</label>
                <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="A">Template A (Clean)</option>
                    <option value="B">Template B (Icons/Colors)</option>
                </select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => onExport("pdf")} disabled={isExporting} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                    {isExporting ? "Exporting..." : "Export PDF"}
                </button>
                <button type="button" onClick={() => onExport("word")} disabled={isExporting} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
                    {isExporting ? "Exporting..." : "Export Word"}
                </button>
            </div>
            {exportError && <div className="text-red-500 mt-2">{exportError}</div>}

            {/* Save/Load Buttons */}
            <div className="flex gap-2 mt-4 items-center">
                <input
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    placeholder="Enter User ID"
                    className="border rounded px-3 py-2 flex-1"
                />
                <button type="button" onClick={() => onSave && userId && onSave(userId)} className="add-btn">
                    Save CV
                </button>
                <button type="button" onClick={() => onLoad && userId && onLoad(userId)} className="add-btn">
                    Load CV
                </button>
            </div>
        </form>
    );
};

export default CVForm;

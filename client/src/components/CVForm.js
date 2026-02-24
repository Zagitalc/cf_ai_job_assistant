import React, { useMemo, useState } from "react";
import ReactQuill from "react-quill";
import SectionEditorOverlay from "./SectionEditorOverlay";
import SectionCard from "./forms/SectionCard";
import ExportFilenamePicker from "./ExportFilenamePicker";
import { SECTION_REGISTRY } from "../constants/sectionRegistry";
import { canDragSection, getCompletionStatus, reorderEditorCards } from "../utils/sectionLayout";
import "react-quill/dist/quill.snow.css";

const FALLBACK_TEMPLATE_OPTIONS = [
    { value: "A", label: "Template A (Clean)" },
    { value: "B", label: "Template B (Modern Sidebar)" }
];

const isRichTextEmpty = (value) => !value || value === "<p><br></p>" || value.trim() === "";

const stripHtml = (value = "") =>
    String(value)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

const countWords = (value = "") =>
    String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;

const countRichTextWords = (value = "") => countWords(stripHtml(value));

const formatDateShort = (dateString) => {
    if (!dateString) {
        return "";
    }

    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
        return String(dateString);
    }

    return parsed.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
    });
};

const formatDateRange = (startDate, endDate) => {
    const start = formatDateShort(startDate);
    const end = formatDateShort(endDate);

    if (!start && !end) {
        return "N/A";
    }

    if (start && end) {
        return `${start} - ${end}`;
    }

    if (start) {
        return `${start} - Present`;
    }

    return end || "N/A";
};

const CVForm = ({
    cvData,
    setCvData,
    sectionLayout,
    setSectionLayout,
    template,
    setTemplate,
    templateOptions,
    onExport,
    isExporting,
    exportingFormat,
    exportError,
    exportFileBaseName,
    onExportFileBaseNameChange,
    exportFileSuggestions,
    onSave,
    onLoad,
    layoutMetrics,
    isMobile,
    aiEnabled,
    reviewMarkers,
    onOpenAIReview,
    aiReviewStatus
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
    const [newWork, setNewWork] = useState("");
    const [newVolunteer, setNewVolunteer] = useState("");
    const [newProject, setNewProject] = useState("");
    const [userId, setUserId] = useState("");
    const [openSimpleSection, setOpenSimpleSection] = useState("personal");
    const [activeComplexSection, setActiveComplexSection] = useState("");
    const [draggingSectionId, setDraggingSectionId] = useState("");

    const availableTemplates =
        templateOptions && templateOptions.length > 0
            ? templateOptions
            : FALLBACK_TEMPLATE_OPTIONS;

    const getSectionOverflowWarning = (sectionKey) => {
        const sectionHeight = layoutMetrics?.sectionHeights?.[sectionKey] || 0;
        const pageContentHeight = layoutMetrics?.pageContentHeight || 0;
        const threshold = pageContentHeight * 0.7;

        if (sectionHeight > threshold && threshold > 0) {
            return "This section is getting long; consider condensing for a 1-page CV.";
        }

        return "";
    };

    const getLongEntryWarnings = (entries, label) =>
        (entries || [])
            .map((entry, index) => ({ index, words: countRichTextWords(entry) }))
            .filter((entry) => entry.words > 60)
            .map((entry) => `${label} ${entry.index + 1} is ${entry.words} words. Aim for 30-60 words.`);

    const summaryWordCount = countWords(cvData.summary || "");
    const newWorkWordCount = countRichTextWords(newWork);
    const newVolunteerWordCount = countRichTextWords(newVolunteer);
    const newProjectWordCount = countRichTextWords(newProject);
    const newCertWordCount = countRichTextWords(newCert);
    const newAwardWordCount = countRichTextWords(newAward);
    const newEducationInfoWordCount = countRichTextWords(newEdu.additionalInfo || "");
    const additionalInfoWordCount = countRichTextWords(cvData.additionalInfo || "");

    const workWarnings = getLongEntryWarnings(cvData.workExperience, "Work entry");
    const volunteerWarnings = getLongEntryWarnings(cvData.volunteerExperience, "Volunteer entry");
    const projectWarnings = getLongEntryWarnings(cvData.projects, "Project entry");
    const certificationWarnings = getLongEntryWarnings(cvData.certifications, "Certification entry");
    const awardWarnings = getLongEntryWarnings(cvData.awards, "Award entry");

    const handleChange = (event) => {
        const { name, value } = event.target;
        setCvData((prev) => ({ ...prev, [name]: value }));
    };

    const handleAddSkill = () => {
        const cleanedSkill = newSkill.trim();
        if (!cleanedSkill) {
            return;
        }

        setCvData((prev) => ({ ...prev, skills: [...(prev.skills || []), cleanedSkill] }));
        setNewSkill("");
    };

    const handleRemoveSkill = (idx) => {
        setCvData((prev) => ({
            ...prev,
            skills: (prev.skills || []).filter((_, index) => index !== idx)
        }));
    };

    const handleEduChange = (event) => {
        const { name, value } = event.target;
        setNewEdu((prev) => ({ ...prev, [name]: value }));
    };

    const handleAdditionalInfoChange = (content) => {
        setNewEdu((prev) => ({ ...prev, additionalInfo: content }));
    };

    const handleAddEducation = () => {
        if (!newEdu.degree.trim() && !newEdu.school.trim()) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            education: [...(prev.education || []), { ...newEdu }]
        }));

        setNewEdu({
            degree: "",
            school: "",
            location: "",
            startDate: "",
            endDate: "",
            additionalInfo: ""
        });
    };

    const handleRemoveEducation = (idx) => {
        setCvData((prev) => ({
            ...prev,
            education: (prev.education || []).filter((_, index) => index !== idx)
        }));
    };

    const handleAddCert = () => {
        if (isRichTextEmpty(newCert)) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            certifications: [...(prev.certifications || []), newCert]
        }));
        setNewCert("");
    };

    const handleRemoveCert = (idx) => {
        setCvData((prev) => ({
            ...prev,
            certifications: (prev.certifications || []).filter((_, index) => index !== idx)
        }));
    };

    const handleAddAward = () => {
        if (isRichTextEmpty(newAward)) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            awards: [...(prev.awards || []), newAward]
        }));
        setNewAward("");
    };

    const handleRemoveAward = (idx) => {
        setCvData((prev) => ({
            ...prev,
            awards: (prev.awards || []).filter((_, index) => index !== idx)
        }));
    };

    const handleAddWork = () => {
        if (isRichTextEmpty(newWork)) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            workExperience: [...(prev.workExperience || []), newWork]
        }));
        setNewWork("");
    };

    const handleRemoveWork = (idx) => {
        setCvData((prev) => ({
            ...prev,
            workExperience: (prev.workExperience || []).filter((_, index) => index !== idx)
        }));
    };

    const handleAddVolunteer = () => {
        if (isRichTextEmpty(newVolunteer)) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            volunteerExperience: [...(prev.volunteerExperience || []), newVolunteer]
        }));
        setNewVolunteer("");
    };

    const handleRemoveVolunteer = (idx) => {
        setCvData((prev) => ({
            ...prev,
            volunteerExperience: (prev.volunteerExperience || []).filter((_, index) => index !== idx)
        }));
    };

    const handleAddProject = () => {
        if (isRichTextEmpty(newProject)) {
            return;
        }

        setCvData((prev) => ({
            ...prev,
            projects: [...(prev.projects || []), newProject]
        }));
        setNewProject("");
    };

    const handleRemoveProject = (idx) => {
        setCvData((prev) => ({
            ...prev,
            projects: (prev.projects || []).filter((_, index) => index !== idx)
        }));
    };

    const handleSkillInputKeyDown = (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleAddSkill();
        }
    };

    const sectionSubtitle = (sectionId) => {
        if (sectionId === "summary") {
            return `${summaryWordCount} words`;
        }

        if (sectionId === "skills") {
            return `${(cvData.skills || []).length} skills`;
        }

        if (sectionId === "work") {
            return `${(cvData.workExperience || []).length} entries`;
        }

        if (sectionId === "volunteer") {
            return `${(cvData.volunteerExperience || []).length} entries`;
        }

        if (sectionId === "projects") {
            return `${(cvData.projects || []).length} entries`;
        }

        if (sectionId === "education") {
            return `${(cvData.education || []).length} entries`;
        }

        if (sectionId === "certifications") {
            return `${(cvData.certifications || []).length} entries`;
        }

        if (sectionId === "awards") {
            return `${(cvData.awards || []).length} entries`;
        }

        if (sectionId === "additional-info") {
            return `${additionalInfoWordCount} words`;
        }

        if (sectionId === "template-export") {
            return "Actions";
        }

        if (sectionId === "save-load") {
            return userId ? "Ready" : "Optional";
        }

        const hasData = SECTION_REGISTRY[sectionId]?.dataPresenceChecker?.(cvData);
        return hasData ? "Complete" : "Needs info";
    };

    const sectionTone = (sectionId) => {
        if (sectionId === "template-export" || sectionId === "save-load") {
            return "neutral";
        }

        if (sectionId === "summary" && summaryWordCount > 160) {
            return "warning";
        }

        if (sectionId === "additional-info" && additionalInfoWordCount > 160) {
            return "warning";
        }

        if (
            (sectionId === "work" && workWarnings.length > 0) ||
            (sectionId === "volunteer" && volunteerWarnings.length > 0) ||
            (sectionId === "projects" && projectWarnings.length > 0) ||
            (sectionId === "certifications" && certificationWarnings.length > 0) ||
            (sectionId === "awards" && awardWarnings.length > 0)
        ) {
            return "warning";
        }

        const hasData = SECTION_REGISTRY[sectionId]?.dataPresenceChecker?.(cvData);
        return hasData ? "success" : "neutral";
    };

    const toggleSimpleSection = (sectionId) => {
        setOpenSimpleSection((current) => (current === sectionId ? "" : sectionId));
    };

    const openComplexSection = (sectionId) => {
        setActiveComplexSection(sectionId);
    };

    const closeComplexSection = () => {
        setActiveComplexSection("");
    };

    const handleDragStart = (event, sectionId) => {
        if (!canDragSection(sectionId)) {
            event.preventDefault();
            return;
        }

        setDraggingSectionId(sectionId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", sectionId);
    };

    const handleDragOver = (event) => {
        if (!draggingSectionId) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (event, sectionId) => {
        event.preventDefault();

        const activeId = draggingSectionId || event.dataTransfer.getData("text/plain");
        if (!activeId || !sectionId || activeId === sectionId) {
            setDraggingSectionId("");
            return;
        }

        const nextLayout = reorderEditorCards(sectionLayout, activeId, sectionId, cvData);
        setSectionLayout(nextLayout);
        setDraggingSectionId("");
    };

    const renderSectionBody = (sectionId) => {
        if (sectionId === "personal") {
            return (
                <>
                    {getSectionOverflowWarning("personal") ? (
                        <div className="form-warning">{getSectionOverflowWarning("personal")}</div>
                    ) : null}
                    <div className="form-grid two-col">
                        <div>
                            <label htmlFor="cv-name" className="form-label">Name</label>
                            <input
                                id="cv-name"
                                name="name"
                                value={cvData.name || ""}
                                onChange={handleChange}
                                placeholder="Full name"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="cv-email" className="form-label">Email</label>
                            <input
                                id="cv-email"
                                name="email"
                                value={cvData.email || ""}
                                onChange={handleChange}
                                placeholder="Email address"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="cv-phone" className="form-label">Phone</label>
                            <input
                                id="cv-phone"
                                name="phone"
                                value={cvData.phone || ""}
                                onChange={handleChange}
                                placeholder="Phone number"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="cv-linkedin" className="form-label">LinkedIn</label>
                            <input
                                id="cv-linkedin"
                                name="linkedin"
                                value={cvData.linkedin || ""}
                                onChange={handleChange}
                                placeholder="LinkedIn URL"
                                className="form-input"
                            />
                        </div>
                    </div>
                </>
            );
        }

        if (sectionId === "summary") {
            return (
                <>
                    {getSectionOverflowWarning("summary") ? (
                        <div className="form-warning">{getSectionOverflowWarning("summary")}</div>
                    ) : null}
                    <label htmlFor="cv-summary" className="form-label">Profile Summary</label>
                    <textarea
                        id="cv-summary"
                        name="summary"
                        value={cvData.summary || ""}
                        onChange={handleChange}
                        placeholder="Write a brief profile summary..."
                        rows={4}
                        className="form-textarea"
                    />
                    <div className="form-meta">Words: {summaryWordCount}</div>
                </>
            );
        }

        if (sectionId === "work") {
            return (
                <>
                    {getSectionOverflowWarning("work") ? (
                        <div className="form-warning">{getSectionOverflowWarning("work")}</div>
                    ) : null}
                    <label className="form-label">Add Work Experience</label>
                    <ReactQuill theme="snow" value={newWork} onChange={setNewWork} placeholder="Describe your work experience..." />
                    <div className="form-meta">Current draft words: {newWorkWordCount}</div>
                    {newWorkWordCount > 60 ? (
                        <div className="form-warning">This draft is {newWorkWordCount} words. Aim for 30-60 words per entry.</div>
                    ) : null}
                    <button type="button" onClick={handleAddWork} className="add-btn">Add Work Experience</button>
                    {(cvData.workExperience || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.workExperience || []).map((work, idx) => (
                                <div key={idx} className="entry-list-item">
                                    <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: work }} />
                                    <button type="button" onClick={() => handleRemoveWork(idx)} className="remove-btn">Remove</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {workWarnings.length > 0 ? (
                        <ul className="warning-list">
                            {workWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </>
            );
        }

        if (sectionId === "volunteer") {
            return (
                <>
                    {getSectionOverflowWarning("volunteer") ? (
                        <div className="form-warning">{getSectionOverflowWarning("volunteer")}</div>
                    ) : null}
                    <label className="form-label">Add Volunteer Experience</label>
                    <ReactQuill theme="snow" value={newVolunteer} onChange={setNewVolunteer} placeholder="Describe your volunteer experience..." />
                    <div className="form-meta">Current draft words: {newVolunteerWordCount}</div>
                    {newVolunteerWordCount > 60 ? (
                        <div className="form-warning">This draft is {newVolunteerWordCount} words. Aim for 30-60 words per entry.</div>
                    ) : null}
                    <button type="button" onClick={handleAddVolunteer} className="add-btn">Add Volunteer Experience</button>
                    {(cvData.volunteerExperience || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.volunteerExperience || []).map((volunteer, idx) => (
                                <div key={idx} className="entry-list-item">
                                    <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: volunteer }} />
                                    <button type="button" onClick={() => handleRemoveVolunteer(idx)} className="remove-btn">Remove</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {volunteerWarnings.length > 0 ? (
                        <ul className="warning-list">
                            {volunteerWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </>
            );
        }

        if (sectionId === "projects") {
            return (
                <>
                    {getSectionOverflowWarning("projects") ? (
                        <div className="form-warning">{getSectionOverflowWarning("projects")}</div>
                    ) : null}
                    <label className="form-label">Add a Project</label>
                    <ReactQuill theme="snow" value={newProject} onChange={setNewProject} placeholder="Describe your project..." />
                    <div className="form-meta">Current draft words: {newProjectWordCount}</div>
                    {newProjectWordCount > 60 ? (
                        <div className="form-warning">This draft is {newProjectWordCount} words. Aim for 30-60 words per entry.</div>
                    ) : null}
                    <button type="button" onClick={handleAddProject} className="add-btn">Add Project</button>
                    {(cvData.projects || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.projects || []).map((project, idx) => (
                                <div key={idx} className="entry-list-item">
                                    <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: project }} />
                                    <button type="button" onClick={() => handleRemoveProject(idx)} className="remove-btn">Remove</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {projectWarnings.length > 0 ? (
                        <ul className="warning-list">
                            {projectWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </>
            );
        }

        if (sectionId === "skills") {
            return (
                <>
                    {getSectionOverflowWarning("skills") ? (
                        <div className="form-warning">{getSectionOverflowWarning("skills")}</div>
                    ) : null}
                    <label htmlFor="new-skill" className="form-label">Add a Skill</label>
                    <div className="skill-input-row">
                        <input
                            id="new-skill"
                            type="text"
                            value={newSkill}
                            onChange={(event) => setNewSkill(event.target.value)}
                            onKeyDown={handleSkillInputKeyDown}
                            placeholder="e.g. Python, React"
                            className="form-input"
                        />
                        <button type="button" onClick={handleAddSkill} className="add-btn">Add</button>
                    </div>
                    <div className="skill-chips">
                        {(cvData.skills || []).map((skill, idx) => (
                            <span key={`${skill}-${idx}`} className="skill-chip">
                                <span>{skill}</span>
                                <button type="button" onClick={() => handleRemoveSkill(idx)} className="chip-remove-btn">×</button>
                            </span>
                        ))}
                    </div>
                </>
            );
        }

        if (sectionId === "education") {
            return (
                <>
                    {getSectionOverflowWarning("education") ? (
                        <div className="form-warning">{getSectionOverflowWarning("education")}</div>
                    ) : null}
                    <div className="form-grid two-col">
                        <div>
                            <label htmlFor="edu-degree" className="form-label">Degree</label>
                            <input id="edu-degree" name="degree" value={newEdu.degree} onChange={handleEduChange} className="form-input" />
                        </div>
                        <div>
                            <label htmlFor="edu-school" className="form-label">School</label>
                            <input id="edu-school" name="school" value={newEdu.school} onChange={handleEduChange} className="form-input" />
                        </div>
                        <div>
                            <label htmlFor="edu-location" className="form-label">Location</label>
                            <input id="edu-location" name="location" value={newEdu.location} onChange={handleEduChange} className="form-input" />
                        </div>
                        <div className="form-grid two-col compact-gap">
                            <div>
                                <label htmlFor="edu-start" className="form-label">Start Date</label>
                                <input id="edu-start" type="date" name="startDate" value={newEdu.startDate} onChange={handleEduChange} className="form-input" />
                            </div>
                            <div>
                                <label htmlFor="edu-end" className="form-label">End Date</label>
                                <input id="edu-end" type="date" name="endDate" value={newEdu.endDate} onChange={handleEduChange} className="form-input" />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Additional Info</label>
                        <ReactQuill theme="snow" value={newEdu.additionalInfo} onChange={handleAdditionalInfoChange} placeholder="Optional details, honors, relevant coursework..." />
                        <div className="form-meta">Current draft words: {newEducationInfoWordCount}</div>
                        {newEducationInfoWordCount > 60 ? (
                            <div className="form-warning">This draft is {newEducationInfoWordCount} words. Aim for 30-60 words per entry.</div>
                        ) : null}
                    </div>
                    <button type="button" onClick={handleAddEducation} className="add-btn">Add Education</button>

                    {(cvData.education || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.education || []).map((edu, idx) => (
                                <div key={idx} className="education-card">
                                    <button type="button" className="remove-btn" onClick={() => handleRemoveEducation(idx)}>Remove</button>
                                    <div className="education-school">{edu.school || "N/A"}</div>
                                    <div>{edu.degree || "N/A"}</div>
                                    <div>{edu.location || "N/A"}</div>
                                    <div className="education-dates">{formatDateRange(edu.startDate, edu.endDate)}</div>
                                    {edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo) ? (
                                        <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: edu.additionalInfo }} />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </>
            );
        }

        if (sectionId === "certifications") {
            return (
                <>
                    {getSectionOverflowWarning("certifications") ? (
                        <div className="form-warning">{getSectionOverflowWarning("certifications")}</div>
                    ) : null}
                    <label className="form-label">Add a Certification</label>
                    <ReactQuill theme="snow" value={newCert} onChange={setNewCert} placeholder="e.g. AWS Certified Solutions Architect" />
                    <div className="form-meta">Current draft words: {newCertWordCount}</div>
                    {newCertWordCount > 60 ? (
                        <div className="form-warning">This draft is {newCertWordCount} words. Aim for 30-60 words per entry.</div>
                    ) : null}
                    <button type="button" onClick={handleAddCert} className="add-btn">Add Certification</button>
                    {(cvData.certifications || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.certifications || []).map((cert, idx) => (
                                <div key={idx} className="entry-list-item">
                                    <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: cert }} />
                                    <button type="button" className="remove-btn" onClick={() => handleRemoveCert(idx)}>Remove</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {certificationWarnings.length > 0 ? (
                        <ul className="warning-list">
                            {certificationWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </>
            );
        }

        if (sectionId === "awards") {
            return (
                <>
                    {getSectionOverflowWarning("awards") ? (
                        <div className="form-warning">{getSectionOverflowWarning("awards")}</div>
                    ) : null}
                    <label className="form-label">Add an Award</label>
                    <ReactQuill theme="snow" value={newAward} onChange={setNewAward} placeholder="e.g. Dean's List 2022" />
                    <div className="form-meta">Current draft words: {newAwardWordCount}</div>
                    {newAwardWordCount > 60 ? (
                        <div className="form-warning">This draft is {newAwardWordCount} words. Aim for 30-60 words per entry.</div>
                    ) : null}
                    <button type="button" onClick={handleAddAward} className="add-btn">Add Award</button>
                    {(cvData.awards || []).length > 0 ? (
                        <div className="entry-list">
                            {(cvData.awards || []).map((award, idx) => (
                                <div key={idx} className="entry-list-item">
                                    <div className="entry-rich-text" dangerouslySetInnerHTML={{ __html: award }} />
                                    <button type="button" className="remove-btn" onClick={() => handleRemoveAward(idx)}>Remove</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    {awardWarnings.length > 0 ? (
                        <ul className="warning-list">
                            {awardWarnings.map((warning) => (
                                <li key={warning}>{warning}</li>
                            ))}
                        </ul>
                    ) : null}
                </>
            );
        }

        if (sectionId === "additional-info") {
            return (
                <>
                    {getSectionOverflowWarning("additional-info") ? (
                        <div className="form-warning">{getSectionOverflowWarning("additional-info")}</div>
                    ) : null}
                    <label className="form-label">Additional Info</label>
                    <ReactQuill
                        theme="snow"
                        value={cvData.additionalInfo || ""}
                        onChange={(content) => setCvData((prev) => ({ ...prev, additionalInfo: content }))}
                        placeholder="Add extra details that do not fit other sections..."
                    />
                    <div className="form-meta">Words: {additionalInfoWordCount}</div>
                    {additionalInfoWordCount > 160 ? (
                        <div className="form-warning">
                            This section is {additionalInfoWordCount} words. Keep it concise and role-relevant.
                        </div>
                    ) : null}
                </>
            );
        }

        if (sectionId === "template-export") {
            return (
                <>
                    <label htmlFor="template-select" className="form-label">Template</label>
                    <select id="template-select" value={template} onChange={(event) => setTemplate(event.target.value)} className="form-select">
                        {availableTemplates.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                    <ExportFilenamePicker
                        inputId="export-filename"
                        value={exportFileBaseName}
                        onChange={onExportFileBaseNameChange}
                        suggestions={exportFileSuggestions}
                    />

                    <div className="button-row">
                        <button type="button" onClick={() => onExport("pdf", exportFileBaseName)} disabled={isExporting} className="primary-btn">
                            {isExporting && exportingFormat === "pdf" ? "Generating PDF..." : "Export PDF"}
                        </button>
                        <button type="button" onClick={() => onExport("word", exportFileBaseName)} disabled={isExporting} className="primary-btn">
                            {isExporting && exportingFormat === "word" ? "Generating Word..." : "Export Word"}
                        </button>
                    </div>
                    {exportError ? <div className="form-error">{exportError}</div> : null}
                </>
            );
        }

        if (sectionId === "save-load") {
            return (
                <>
                    <label htmlFor="save-user-id" className="form-label">User ID</label>
                    <div className="save-load-row">
                        <input
                            id="save-user-id"
                            type="text"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            placeholder="Enter User ID"
                            className="form-input"
                        />
                        <button type="button" onClick={() => onSave && userId && onSave(userId)} className="add-btn">Save CV</button>
                        <button type="button" onClick={() => onLoad && userId && onLoad(userId)} className="add-btn">Load CV</button>
                    </div>
                </>
            );
        }

        return null;
    };

    const orderedSections = useMemo(
        () => (sectionLayout?.editorCardOrder || []).map((id) => SECTION_REGISTRY[id]).filter(Boolean),
        [sectionLayout]
    );

    const completion = useMemo(() => getCompletionStatus(cvData), [cvData]);
    const showAiEntryPrompt = aiEnabled && completion.completionPercent >= 60 && aiReviewStatus === "idle";

    return (
        <form className="cv-form card-stack-form" aria-label="CV Form">
            <div className="stack-dashboard">
                <div>
                    <h2 className="cv-form-title">My Resume</h2>
                    <div className="stack-subtitle">{completion.isCoreReady ? "Core ready" : "Needs core info"}</div>
                </div>
                <div className="stack-progress-group">
                    <div
                        className="stack-progress-bar"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={completion.completionPercent}
                    >
                        <div
                            className="stack-progress-fill"
                            style={{ width: `${completion.completionPercent}%` }}
                        >
                            <span className="stack-progress-thumb" />
                        </div>
                    </div>
                    <div className="stack-progress-label">{completion.completionPercent}% Complete</div>
                </div>
            </div>

            {showAiEntryPrompt ? (
                <button
                    type="button"
                    className="ai-entry-prompt"
                    onClick={() => onOpenAIReview && onOpenAIReview()}
                    disabled={aiReviewStatus === "loading" || aiReviewStatus === "streaming"}
                >
                    Ready for AI feedback?
                </button>
            ) : null}

            {orderedSections.map((section) => {
                const isSimpleOpen = !section.isComplex && openSimpleSection === section.id;
                return (
                    <SectionCard
                        key={section.id}
                        section={section}
                        isOpen={isSimpleOpen}
                        onToggle={toggleSimpleSection}
                        onOpenComplex={openComplexSection}
                        canDrag={canDragSection(section.id)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        isDragging={draggingSectionId === section.id}
                        subtitle={sectionSubtitle(section.id)}
                        statusTone={sectionTone(section.id)}
                        reviewMarker={reviewMarkers?.[section.id] || "none"}
                    >
                        {renderSectionBody(section.id)}
                    </SectionCard>
                );
            })}

            {activeComplexSection ? (
                <SectionEditorOverlay
                    title={SECTION_REGISTRY[activeComplexSection]?.title || "Section"}
                    isMobile={isMobile}
                    onClose={closeComplexSection}
                >
                    {renderSectionBody(activeComplexSection)}
                </SectionEditorOverlay>
            ) : null}
        </form>
    );
};

export default CVForm;

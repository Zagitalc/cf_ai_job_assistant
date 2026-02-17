const hasRichEntries = (entries = []) =>
    (entries || []).some((entry) => {
        const text = String(entry || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        return text.length > 0;
    });

const hasRichValue = (value = "") =>
    String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim().length > 0;

const hasEducationEntries = (entries = []) =>
    (entries || []).some((entry = {}) => {
        const base = [entry.degree, entry.school, entry.location, entry.startDate, entry.endDate]
            .map((value) => String(value || "").trim())
            .join(" ")
            .trim();
        const additional = String(entry.additionalInfo || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        return Boolean(base || additional);
    });

export const SECTION_REGISTRY = {
    personal: {
        id: "personal",
        title: "Personal Info",
        column: "left",
        pinned: true,
        isComplex: false,
        isUtility: false,
        requiredByDefault: true,
        optional: false,
        hideWhenEmptyInOutput: false,
        completionGroup: "core",
        outputRenderable: true,
        renderKey: "personal",
        dataPresenceChecker: (cvData = {}) =>
            [cvData.name, cvData.email, cvData.phone, cvData.linkedin].some((value) => String(value || "").trim())
    },
    summary: {
        id: "summary",
        title: "Profile Summary",
        column: "right",
        pinned: true,
        isComplex: false,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "optional",
        outputRenderable: true,
        renderKey: "summary",
        dataPresenceChecker: (cvData = {}) => String(cvData.summary || "").trim().length > 0
    },
    work: {
        id: "work",
        title: "Work",
        column: "right",
        pinned: false,
        isComplex: true,
        isUtility: false,
        requiredByDefault: true,
        optional: false,
        hideWhenEmptyInOutput: true,
        completionGroup: "core",
        outputRenderable: true,
        renderKey: "work",
        dataPresenceChecker: (cvData = {}) => hasRichEntries(cvData.workExperience)
    },
    volunteer: {
        id: "volunteer",
        title: "Volunteer",
        column: "right",
        pinned: false,
        isComplex: true,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "optional",
        outputRenderable: true,
        renderKey: "volunteer",
        dataPresenceChecker: (cvData = {}) => hasRichEntries(cvData.volunteerExperience)
    },
    education: {
        id: "education",
        title: "Education",
        column: "right",
        pinned: false,
        isComplex: true,
        isUtility: false,
        requiredByDefault: true,
        optional: false,
        hideWhenEmptyInOutput: true,
        completionGroup: "core",
        outputRenderable: true,
        renderKey: "education",
        dataPresenceChecker: (cvData = {}) => hasEducationEntries(cvData.education)
    },
    projects: {
        id: "projects",
        title: "Projects",
        column: "right",
        pinned: false,
        isComplex: true,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "core",
        outputRenderable: true,
        renderKey: "projects",
        dataPresenceChecker: (cvData = {}) => hasRichEntries(cvData.projects)
    },
    skills: {
        id: "skills",
        title: "Skills",
        column: "left",
        pinned: false,
        isComplex: false,
        isUtility: false,
        requiredByDefault: true,
        optional: false,
        hideWhenEmptyInOutput: true,
        completionGroup: "core",
        outputRenderable: true,
        renderKey: "skills",
        dataPresenceChecker: (cvData = {}) => (cvData.skills || []).some((skill) => String(skill || "").trim())
    },
    certifications: {
        id: "certifications",
        title: "Certifications",
        column: "left",
        pinned: false,
        isComplex: false,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "optional",
        outputRenderable: true,
        renderKey: "certifications",
        dataPresenceChecker: (cvData = {}) => hasRichEntries(cvData.certifications)
    },
    awards: {
        id: "awards",
        title: "Awards",
        column: "left",
        pinned: false,
        isComplex: false,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "optional",
        outputRenderable: true,
        renderKey: "awards",
        dataPresenceChecker: (cvData = {}) => hasRichEntries(cvData.awards)
    },
    "additional-info": {
        id: "additional-info",
        title: "Additional Info",
        column: "right",
        pinned: false,
        locked: false,
        isComplex: false,
        isUtility: false,
        requiredByDefault: false,
        optional: true,
        hideWhenEmptyInOutput: true,
        completionGroup: "optional",
        outputRenderable: true,
        renderKey: "additional-info",
        dataPresenceChecker: (cvData = {}) => hasRichValue(cvData.additionalInfo)
    },
    "template-export": {
        id: "template-export",
        title: "Template & Export",
        column: "utility",
        pinned: false,
        locked: true,
        isComplex: false,
        isUtility: true,
        requiredByDefault: false,
        optional: false,
        hideWhenEmptyInOutput: true,
        completionGroup: "utility",
        outputRenderable: false,
        renderKey: "template-export",
        dataPresenceChecker: () => true
    },
    "save-load": {
        id: "save-load",
        title: "Save / Load",
        column: "utility",
        pinned: false,
        locked: true,
        isComplex: false,
        isUtility: true,
        requiredByDefault: false,
        optional: false,
        hideWhenEmptyInOutput: true,
        completionGroup: "utility",
        outputRenderable: false,
        renderKey: "save-load",
        dataPresenceChecker: () => true
    }
};

export const CONTENT_SECTION_IDS = Object.values(SECTION_REGISTRY)
    .filter((section) => !section.isUtility)
    .map((section) => section.id);

export const UTILITY_SECTION_IDS = Object.values(SECTION_REGISTRY)
    .filter((section) => section.isUtility)
    .map((section) => section.id);

export const LEFT_CONTENT_SECTION_IDS = Object.values(SECTION_REGISTRY)
    .filter((section) => !section.isUtility && section.column === "left")
    .map((section) => section.id);

export const RIGHT_CONTENT_SECTION_IDS = Object.values(SECTION_REGISTRY)
    .filter((section) => !section.isUtility && section.column === "right")
    .map((section) => section.id);

export const PINNED_SECTION_IDS = Object.values(SECTION_REGISTRY)
    .filter((section) => section.pinned)
    .map((section) => section.id);

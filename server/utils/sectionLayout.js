const SECTION_META = {
    personal: { column: "left", pinned: true, dataPresenceChecker: (cvData = {}) => [cvData.name, cvData.email, cvData.phone, cvData.linkedin].some((value) => String(value || "").trim()) },
    summary: { column: "right", pinned: true, dataPresenceChecker: (cvData = {}) => String(cvData.summary || "").trim().length > 0 },
    work: { column: "right", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.workExperience || []).some((entry) => String(entry || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) },
    volunteer: { column: "right", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.volunteerExperience || []).some((entry) => String(entry || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) },
    education: { column: "right", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.education || []).some((entry = {}) => [entry.degree, entry.school, entry.location, entry.startDate, entry.endDate, entry.additionalInfo].some((value) => String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())) },
    projects: { column: "right", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.projects || []).some((entry) => String(entry || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) },
    skills: { column: "left", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.skills || []).some((skill) => String(skill || "").trim()) },
    certifications: { column: "left", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.certifications || []).some((entry) => String(entry || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) },
    awards: { column: "left", pinned: false, dataPresenceChecker: (cvData = {}) => (cvData.awards || []).some((entry) => String(entry || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()) },
    "template-export": { column: "utility", pinned: false, isUtility: true, dataPresenceChecker: () => true },
    "save-load": { column: "utility", pinned: false, isUtility: true, dataPresenceChecker: () => true }
};

const CONTENT_SECTION_IDS = Object.keys(SECTION_META).filter((id) => !SECTION_META[id].isUtility);
const LEFT_CONTENT_SECTION_IDS = CONTENT_SECTION_IDS.filter((id) => SECTION_META[id].column === "left");
const RIGHT_CONTENT_SECTION_IDS = CONTENT_SECTION_IDS.filter((id) => SECTION_META[id].column === "right");
const UTILITY_SECTION_IDS = Object.keys(SECTION_META).filter((id) => SECTION_META[id].isUtility);
const DEFAULT_EDITOR_CARD_ORDER = [
    "personal",
    "summary",
    "work",
    "volunteer",
    "education",
    "projects",
    "skills",
    "certifications",
    "awards",
    "template-export",
    "save-load"
];

const unique = (entries = []) => {
    const seen = new Set();
    return entries.filter((entry) => {
        if (!entry || seen.has(entry)) {
            return false;
        }
        seen.add(entry);
        return true;
    });
};

const mergeOrdered = (primary = [], secondary = []) => unique([...(primary || []), ...(secondary || [])]);

const enforcePinnedAtTop = (ids = []) => {
    const pinned = [];
    const rest = [];

    ids.forEach((id) => {
        if (SECTION_META[id]?.pinned) {
            pinned.push(id);
            return;
        }

        rest.push(id);
    });

    return [...pinned, ...rest];
};

const applyColumnOrderToEditor = (editorOrder = [], left = [], right = []) => {
    const leftQueue = left.slice();
    const rightQueue = right.slice();
    const next = [];

    editorOrder.forEach((sectionId) => {
        if (UTILITY_SECTION_IDS.includes(sectionId)) {
            next.push(sectionId);
            return;
        }

        if (LEFT_CONTENT_SECTION_IDS.includes(sectionId)) {
            const nextLeft = leftQueue.shift();
            if (nextLeft) {
                next.push(nextLeft);
            }
            return;
        }

        if (RIGHT_CONTENT_SECTION_IDS.includes(sectionId)) {
            const nextRight = rightQueue.shift();
            if (nextRight) {
                next.push(nextRight);
            }
        }
    });

    return unique([...next, ...leftQueue, ...rightQueue]);
};

const getDefaultSectionLayout = () => ({
    left: enforcePinnedAtTop(LEFT_CONTENT_SECTION_IDS),
    right: enforcePinnedAtTop(RIGHT_CONTENT_SECTION_IDS),
    editorCardOrder: DEFAULT_EDITOR_CARD_ORDER.slice()
});

const normalizeSectionLayout = (layoutInput = {}, cvData = {}) => {
    const defaults = getDefaultSectionLayout();
    let editorCardOrder = unique((layoutInput.editorCardOrder || []).filter((id) => Boolean(SECTION_META[id])));

    if (editorCardOrder.length === 0) {
        editorCardOrder = defaults.editorCardOrder.slice();
    }

    editorCardOrder = mergeOrdered(editorCardOrder, defaults.editorCardOrder);

    const editorLeft = editorCardOrder.filter((id) => LEFT_CONTENT_SECTION_IDS.includes(id));
    const editorRight = editorCardOrder.filter((id) => RIGHT_CONTENT_SECTION_IDS.includes(id));

    let left = mergeOrdered((layoutInput.left || []).filter((id) => LEFT_CONTENT_SECTION_IDS.includes(id)), editorLeft);
    let right = mergeOrdered((layoutInput.right || []).filter((id) => RIGHT_CONTENT_SECTION_IDS.includes(id)), editorRight);

    left = mergeOrdered(left, defaults.left);
    right = mergeOrdered(right, defaults.right);

    CONTENT_SECTION_IDS.forEach((sectionId) => {
        const inLeft = left.includes(sectionId);
        const inRight = right.includes(sectionId);

        if (inLeft || inRight) {
            return;
        }

        const hasData = SECTION_META[sectionId].dataPresenceChecker(cvData);
        if (!hasData && !defaults.left.includes(sectionId) && !defaults.right.includes(sectionId)) {
            return;
        }

        if (SECTION_META[sectionId].column === "left") {
            left.push(sectionId);
        } else {
            right.push(sectionId);
        }
    });

    left = enforcePinnedAtTop(unique(left));
    right = enforcePinnedAtTop(unique(right));

    editorCardOrder = applyColumnOrderToEditor(editorCardOrder, left, right);

    const utilities = editorCardOrder.filter((id) => UTILITY_SECTION_IDS.includes(id));
    editorCardOrder = [...editorCardOrder, ...UTILITY_SECTION_IDS.filter((id) => !utilities.includes(id))];

    return {
        left,
        right,
        editorCardOrder: unique(editorCardOrder)
    };
};

const getOrderedSectionsForTemplate = (layoutInput, template = "A", cvData = {}) => {
    const normalized = normalizeSectionLayout(layoutInput, cvData);

    if (template === "A") {
        const templateAPriority = [
            "personal",
            "summary",
            "skills",
            "work",
            "volunteer",
            "education",
            "projects",
            "certifications",
            "awards"
        ];
        const knownLinear = unique([...normalized.left, ...normalized.right]);
        const linear = unique([
            ...templateAPriority.filter((sectionId) => knownLinear.includes(sectionId)),
            ...knownLinear
        ]);
        return {
            left: [],
            right: linear,
            linear
        };
    }

    return {
        left: normalized.left,
        right: normalized.right,
        linear: [...normalized.left, ...normalized.right]
    };
};

module.exports = {
    CONTENT_SECTION_IDS,
    LEFT_CONTENT_SECTION_IDS,
    RIGHT_CONTENT_SECTION_IDS,
    SECTION_META,
    getDefaultSectionLayout,
    normalizeSectionLayout,
    getOrderedSectionsForTemplate
};

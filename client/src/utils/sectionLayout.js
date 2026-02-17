import {
    CONTENT_SECTION_IDS,
    LEFT_CONTENT_SECTION_IDS,
    PINNED_SECTION_IDS,
    RIGHT_CONTENT_SECTION_IDS,
    SECTION_REGISTRY,
    UTILITY_SECTION_IDS
} from "../constants/sectionRegistry";

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
    "additional-info",
    "template-export",
    "save-load"
];

const isKnownSection = (sectionId) => Boolean(SECTION_REGISTRY[sectionId]);
const isUtilitySection = (sectionId) => Boolean(SECTION_REGISTRY[sectionId]?.isUtility);
const isContentSection = (sectionId) => Boolean(SECTION_REGISTRY[sectionId] && !SECTION_REGISTRY[sectionId].isUtility);

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

const moveItem = (items, fromIndex, toIndex) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return items.slice();
    }

    const next = items.slice();
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

const enforcePinnedAtTop = (items) => {
    const pinned = [];
    const rest = [];

    items.forEach((id) => {
        if (PINNED_SECTION_IDS.includes(id)) {
            pinned.push(id);
            return;
        }
        rest.push(id);
    });

    return [...pinned, ...rest];
};

const mergeOrdered = (primary = [], secondary = []) => unique([...(primary || []), ...(secondary || [])]);

const splitContentByColumn = (contentOrder = []) => {
    const left = contentOrder.filter((id) => LEFT_CONTENT_SECTION_IDS.includes(id));
    const right = contentOrder.filter((id) => RIGHT_CONTENT_SECTION_IDS.includes(id));
    return { left, right };
};

const applyColumnOrderToEditor = (editorOrder = [], left = [], right = []) => {
    const leftQueue = left.slice();
    const rightQueue = right.slice();
    const next = [];

    editorOrder.forEach((sectionId) => {
        if (isUtilitySection(sectionId)) {
            next.push(sectionId);
            return;
        }

        if (LEFT_CONTENT_SECTION_IDS.includes(sectionId)) {
            const nextId = leftQueue.shift();
            if (nextId) {
                next.push(nextId);
            }
            return;
        }

        if (RIGHT_CONTENT_SECTION_IDS.includes(sectionId)) {
            const nextId = rightQueue.shift();
            if (nextId) {
                next.push(nextId);
            }
        }
    });

    return unique([...next, ...leftQueue, ...rightQueue]);
};

const getUnknownPopulatedSections = (cvData = {}) =>
    CONTENT_SECTION_IDS.filter((sectionId) => {
        const checker = SECTION_REGISTRY[sectionId]?.dataPresenceChecker;
        if (!checker) {
            return false;
        }
        return checker(cvData);
    });

export const getDefaultSectionLayout = () => {
    const left = enforcePinnedAtTop(LEFT_CONTENT_SECTION_IDS);
    const right = enforcePinnedAtTop(RIGHT_CONTENT_SECTION_IDS);

    return {
        left,
        right,
        editorCardOrder: DEFAULT_EDITOR_CARD_ORDER.slice()
    };
};

export const normalizeSectionLayout = (layoutInput = {}, cvData = {}) => {
    const defaults = getDefaultSectionLayout();

    const inputEditor = unique((layoutInput?.editorCardOrder || []).filter(isKnownSection));
    let editorCardOrder = inputEditor.length > 0 ? inputEditor : defaults.editorCardOrder.slice();

    editorCardOrder = mergeOrdered(editorCardOrder, defaults.editorCardOrder);

    const editorContentOrder = editorCardOrder.filter(isContentSection);
    const fromEditorColumns = splitContentByColumn(editorContentOrder);

    const inputLeft = unique((layoutInput?.left || []).filter((id) => LEFT_CONTENT_SECTION_IDS.includes(id)));
    const inputRight = unique((layoutInput?.right || []).filter((id) => RIGHT_CONTENT_SECTION_IDS.includes(id)));

    let left = mergeOrdered(inputLeft, fromEditorColumns.left);
    let right = mergeOrdered(inputRight, fromEditorColumns.right);

    left = mergeOrdered(left, defaults.left);
    right = mergeOrdered(right, defaults.right);

    const populated = getUnknownPopulatedSections(cvData);
    populated.forEach((sectionId) => {
        const column = SECTION_REGISTRY[sectionId]?.column;
        if (column === "left" && !left.includes(sectionId)) {
            left.push(sectionId);
        }
        if (column === "right" && !right.includes(sectionId)) {
            right.push(sectionId);
        }
    });

    left = enforcePinnedAtTop(unique(left));
    right = enforcePinnedAtTop(unique(right));

    editorCardOrder = applyColumnOrderToEditor(editorCardOrder, left, right);

    editorCardOrder = [
        ...editorCardOrder.filter((id) => !isUtilitySection(id)),
        ...UTILITY_SECTION_IDS
    ];

    return {
        left,
        right,
        editorCardOrder: unique(editorCardOrder)
    };
};

export const reorderContentWithinColumn = (layout, activeId, overId, cvData = {}) => {
    const normalized = normalizeSectionLayout(layout, cvData);

    if (!isContentSection(activeId) || !isContentSection(overId) || activeId === overId) {
        return normalized;
    }

    if (PINNED_SECTION_IDS.includes(activeId)) {
        return normalized;
    }

    const activeColumn = SECTION_REGISTRY[activeId].column;
    const overColumn = SECTION_REGISTRY[overId].column;

    if (activeColumn !== overColumn) {
        return normalized;
    }

    const targetColumn = activeColumn === "left" ? normalized.left : normalized.right;
    const fromIndex = targetColumn.indexOf(activeId);
    const toIndex = targetColumn.indexOf(overId);

    if (fromIndex < 0 || toIndex < 0) {
        return normalized;
    }

    const movedColumn = enforcePinnedAtTop(moveItem(targetColumn, fromIndex, toIndex));
    const nextLeft = activeColumn === "left" ? movedColumn : normalized.left;
    const nextRight = activeColumn === "right" ? movedColumn : normalized.right;

    const nextEditor = applyColumnOrderToEditor(normalized.editorCardOrder, nextLeft, nextRight);

    return normalizeSectionLayout(
        {
            left: nextLeft,
            right: nextRight,
            editorCardOrder: nextEditor
        },
        cvData
    );
};

export const reorderEditorCards = (layout, activeId, overId, cvData = {}) => {
    const normalized = normalizeSectionLayout(layout, cvData);

    if (!isKnownSection(activeId) || !isKnownSection(overId) || activeId === overId) {
        return normalized;
    }

    const activeMeta = SECTION_REGISTRY[activeId];
    const overMeta = SECTION_REGISTRY[overId];

    if (!activeMeta || !overMeta) {
        return normalized;
    }

    if (activeMeta.locked || overMeta.locked) {
        return normalized;
    }

    if (activeMeta.pinned || overMeta.isUtility) {
        return normalized;
    }

    if (activeMeta.column !== overMeta.column) {
        return normalized;
    }

    return reorderContentWithinColumn(normalized, activeId, overId, cvData);
};

export const canDragSection = (sectionId) => {
    const section = SECTION_REGISTRY[sectionId];
    if (!section) {
        return false;
    }
    return !section.pinned && !section.locked;
};

export const getOrderedSectionsForTemplate = (layout, template, cvData = {}) => {
    const normalized = normalizeSectionLayout(layout, cvData);

    if (template === "A") {
        const templateAPriority = [
            "personal",
            "summary",
            "skills",
            "work",
            "volunteer",
            "education",
            "projects",
            "additional-info",
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
            linear,
            editorCardOrder: normalized.editorCardOrder
        };
    }

    return {
        left: normalized.left,
        right: normalized.right,
        linear: [...normalized.left, ...normalized.right],
        editorCardOrder: normalized.editorCardOrder
    };
};

export const shouldRenderInOutput = (sectionId, cvData = {}, registryMeta = SECTION_REGISTRY) => {
    const section = registryMeta[sectionId];
    if (!section || section.outputRenderable === false) {
        return false;
    }

    if (section.hideWhenEmptyInOutput === false) {
        return true;
    }

    return Boolean(section.dataPresenceChecker?.(cvData));
};

export const getOutputSectionsForTemplate = (layout, template, cvData = {}, registryMeta = SECTION_REGISTRY) => {
    const ordered = getOrderedSectionsForTemplate(layout, template, cvData);
    return {
        ...ordered,
        left: ordered.left.filter((sectionId) => shouldRenderInOutput(sectionId, cvData, registryMeta)),
        right: ordered.right.filter((sectionId) => shouldRenderInOutput(sectionId, cvData, registryMeta)),
        linear: ordered.linear.filter((sectionId) => shouldRenderInOutput(sectionId, cvData, registryMeta))
    };
};

export const getCompletionStatus = (cvData = {}) => {
    const hasName = String(cvData.name || "").trim().length > 0;
    const hasEmail = String(cvData.email || "").trim().length > 0;
    const hasPhone = String(cvData.phone || "").trim().length > 0;
    const hasSkills = Boolean(SECTION_REGISTRY.skills?.dataPresenceChecker?.(cvData));
    const hasEducation = Boolean(SECTION_REGISTRY.education?.dataPresenceChecker?.(cvData));
    const hasWork = Boolean(SECTION_REGISTRY.work?.dataPresenceChecker?.(cvData));
    const hasProjects = Boolean(SECTION_REGISTRY.projects?.dataPresenceChecker?.(cvData));

    const coreChecks = {
        personal: hasName && (hasEmail || hasPhone),
        skills: hasSkills,
        education: hasEducation,
        experience: hasWork || hasProjects
    };

    const passedCount = Object.values(coreChecks).filter(Boolean).length;
    const completionPercent = Math.round((passedCount / Object.keys(coreChecks).length) * 100);

    return {
        coreChecks,
        isCoreReady: passedCount === Object.keys(coreChecks).length,
        completionPercent
    };
};

const stripHtml = (value = "") =>
    String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, " ")
        .trim();

const slugify = (value = "") =>
    String(value || "")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .replace(/[\\/:*?"<>|#%&{}$!'@+=`]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");

const truncateSafe = (value = "", max = 80) => {
    if (value.length <= max) {
        return value;
    }
    return value.slice(0, max).replace(/_+$/g, "");
};

const formatDatePart = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const summarizeRoleText = (value = "") =>
    stripHtml(value)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 7)
        .join(" ");

export const deriveRoleFromCvData = (cvData = {}) => {
    const summaryFirstLine = String(cvData.summary || "")
        .split(/\r?\n/)
        .map((line) => stripHtml(line))
        .find(Boolean);
    if (summaryFirstLine) {
        return summaryFirstLine;
    }

    const workFirst = (cvData.workExperience || []).map((entry) => summarizeRoleText(entry)).find(Boolean);
    if (workFirst) {
        return workFirst;
    }

    return "Resume";
};

export const sanitizeFilenameBase = (input = "") => {
    const noExt = String(input || "").replace(/\.(pdf|docx)$/i, "");
    const safe = slugify(stripHtml(noExt));
    const trimmed = truncateSafe(safe, 80);
    return trimmed || "CV";
};

export const buildFilenameSuggestions = (cvData = {}, template = "A", date = new Date()) => {
    const namePart = sanitizeFilenameBase(cvData.name || "Candidate");
    const rolePart = sanitizeFilenameBase(deriveRoleFromCvData(cvData));
    const templatePart = sanitizeFilenameBase(template === "B" ? "TemplateB" : "TemplateA");
    const datePart = formatDatePart(date);

    const suggestions = [
        `${namePart}_${rolePart}_${templatePart}_${datePart}`,
        `${namePart}_CV_${templatePart}_${datePart}`,
        `CV_${templatePart}_${datePart}`
    ].map((value) => sanitizeFilenameBase(value));

    return Array.from(new Set(suggestions)).slice(0, 3);
};

export const resolveExportFilename = (baseName = "", format = "pdf") => {
    const safeBase = sanitizeFilenameBase(baseName);
    const ext = String(format).toLowerCase() === "word" ? "docx" : "pdf";
    return `${safeBase}.${ext}`;
};


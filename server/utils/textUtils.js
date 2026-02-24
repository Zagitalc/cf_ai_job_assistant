const stripHtml = (html) => {
    if (!html || typeof html !== "string") {
        return "";
    }

    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
};

module.exports = {
    stripHtml
};

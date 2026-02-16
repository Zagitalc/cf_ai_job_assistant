const puppeteer = require("puppeteer");
const {
    AlignmentType,
    BorderStyle,
    Document,
    ExternalHyperlink,
    LevelFormat,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableLayoutType,
    TableRow,
    TextRun,
    WidthType
} = require("docx");

const normalizeArray = (value) => (Array.isArray(value) ? value : []);
const isRichTextEmpty = (value) => !value || value === "<p><br></p>" || value.trim() === "";

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const decodeHtmlEntities = (value = "") =>
    String(value)
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

const formatPlainText = (value) => {
    if (!value) {
        return "N/A";
    }

    return escapeHtml(value).replace(/\n/g, "<br />");
};

const stripHtml = (value = "") => decodeHtmlEntities(String(value).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

const renderSkillsList = (skills) => {
    const validSkills = normalizeArray(skills)
        .map((skill) => escapeHtml(skill))
        .filter(Boolean);

    if (validSkills.length === 0) {
        return '<div class="preview-empty">N/A</div>';
    }

    return `<ul class="preview-list">${validSkills.map((skill) => `<li>${skill}</li>`).join("")}</ul>`;
};

const renderRichEntries = (entries) => {
    const validEntries = normalizeArray(entries).filter((entry) => !isRichTextEmpty(entry));

    if (validEntries.length === 0) {
        return '<div class="preview-empty">N/A</div>';
    }

    return `<div class="preview-rich-list">${validEntries
        .map((entry) => `<div class="preview-rich-entry">${entry}</div>`)
        .join("")}</div>`;
};

const renderEducationEntries = (education) => {
    const validEntries = normalizeArray(education);
    if (validEntries.length === 0) {
        return '<div class="preview-empty">N/A</div>';
    }

    return `<div class="preview-rich-list">${validEntries
        .map((edu) => {
            const startDate = escapeHtml(edu.startDate || "");
            const endDate = escapeHtml(edu.endDate || "");
            const showDateRange = Boolean(startDate || endDate);

            return `
                <div class="preview-education-entry">
                    <div class="preview-education-school">${escapeHtml(edu.school || "N/A")}</div>
                    <div>${escapeHtml(edu.degree || "N/A")}</div>
                    <div>${escapeHtml(edu.location || "N/A")}</div>
                    ${
                        showDateRange
                            ? `<div class="preview-education-dates">${startDate}${
                                  startDate && endDate ? " - " : ""
                              }${endDate}</div>`
                            : ""
                    }
                    ${
                        edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo)
                            ? `<div class="preview-rich-entry">${edu.additionalInfo}</div>`
                            : ""
                    }
                </div>
            `;
        })
        .join("")}</div>`;
};

const buildTemplateStyles = (template) => {
    const isTemplateB = template === "B";

    const sharedStyles = `
        <style>
            * { box-sizing: border-box; }
            body {
                margin: 0;
                padding: 24px;
                background: #ffffff;
                color: #111827;
            }
            .preview-container {
                width: 100%;
                max-width: 100%;
                background: #ffffff;
                color: #111827;
                word-break: break-word;
                overflow-wrap: anywhere;
            }
            .preview-list,
            .preview-rich-list,
            .preview-personal-block,
            .preview-text-block,
            .preview-empty,
            .preview-education-entry {
                margin-bottom: 16px;
            }
            .preview-list {
                margin-top: 0;
                padding-left: 20px;
            }
            .preview-rich-entry { margin-bottom: 8px; }
            .preview-empty { color: #6b7280; }
            .preview-label { font-weight: 700; }
            .preview-education-school { font-weight: 700; }
            .preview-education-dates {
                color: #64748b;
                font-size: 0.8rem;
                margin: 4px 0;
            }
        </style>
    `;

    const templateAStyles = `
        <style>
            body { font-family: Arial, sans-serif; }
            .preview-container.template-A {
                display: flex;
                gap: 20px;
                border: 1px solid #d1d5db;
                padding: 20px;
            }
            .preview-container.template-A .left-column,
            .preview-container.template-A .right-column {
                min-width: 0;
            }
            .preview-container.template-A .left-column { width: 35%; }
            .preview-container.template-A .right-column { width: 65%; }
            .preview-container.template-A h3 {
                margin: 0 0 8px;
                font-size: 1.1rem;
                font-weight: 700;
                border-bottom: 1px solid #d1d5db;
                padding-bottom: 4px;
                color: #111827;
            }
        </style>
    `;

    const templateBStyles = `
        <style>
            body { font-family: "Roboto", "Helvetica", sans-serif; }
            .preview-container.template-B {
                display: grid;
                grid-template-columns: 1fr 2.5fr;
                border: 1px solid #c7d2fe;
                min-height: 1000px;
            }
            .preview-container.template-B .left-column,
            .preview-container.template-B .right-column {
                min-width: 0;
            }
            .preview-container.template-B .left-column {
                background: linear-gradient(180deg, #1f3b63 0%, #11243f 100%);
                color: #f8fafc;
                padding: 26px 22px;
            }
            .preview-container.template-B .right-column {
                background: #ffffff;
                color: #111827;
                padding: 30px;
            }
            .preview-container.template-B h3 {
                margin: 0 0 8px;
                font-size: 1rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                padding-bottom: 6px;
            }
            .preview-container.template-B .left-column h3 {
                color: #e2e8f0;
                border-bottom: 1px solid rgba(226, 232, 240, 0.5);
            }
            .preview-container.template-B .right-column h3 {
                color: #1f3b63;
                border-bottom: 2px solid #1f3b63;
            }
            .preview-container.template-B .preview-empty { color: #94a3b8; }
        </style>
    `;

    return `${sharedStyles}${isTemplateB ? templateBStyles : templateAStyles}`;
};

const generateHTML = (cvData, template) => {
    const safeTemplate = template === "B" ? "B" : "A";

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
    } = cvData || {};

    const certificationEntries = normalizeArray(certifications).filter((entry) => !isRichTextEmpty(entry));
    const awardEntries = normalizeArray(awards).filter((entry) => !isRichTextEmpty(entry));

    return `
        <html>
            <head>
                <meta charset="UTF-8" />
                ${buildTemplateStyles(safeTemplate)}
            </head>
            <body>
                <div class="preview-container template-${safeTemplate}">
                    <div class="left-column">
                        <h3>Personal Info</h3>
                        <div class="preview-personal-block">
                            <div><span class="preview-label">Name:</span> ${formatPlainText(name)}</div>
                            <div><span class="preview-label">Email:</span> ${formatPlainText(email)}</div>
                            <div><span class="preview-label">Phone:</span> ${formatPlainText(phone)}</div>
                            <div><span class="preview-label">LinkedIn:</span> ${formatPlainText(linkedin)}</div>
                        </div>

                        <h3>Skills</h3>
                        ${renderSkillsList(skills)}

                        ${
                            certificationEntries.length > 0
                                ? `<h3>Certifications</h3>${renderRichEntries(certificationEntries)}`
                                : ""
                        }

                        ${awardEntries.length > 0 ? `<h3>Awards</h3>${renderRichEntries(awardEntries)}` : ""}
                    </div>

                    <div class="right-column">
                        <h3>Profile Summary</h3>
                        <div class="preview-text-block">${formatPlainText(summary)}</div>

                        <h3>Work Experience</h3>
                        ${renderRichEntries(workExperience)}

                        <h3>Volunteer Experience</h3>
                        ${renderRichEntries(volunteerExperience)}

                        <h3>Education</h3>
                        ${renderEducationEntries(education)}

                        <h3>Projects</h3>
                        ${renderRichEntries(projects)}
                    </div>
                </div>
            </body>
        </html>
    `;
};

const parseInlineHtmlToWordRuns = (html, options = {}) => {
    const source = String(html || "");
    const tokens = source.match(/<[^>]+>|[^<]+/g) || [];
    const styleState = { bold: 0, italics: 0, underline: 0 };
    const linkStack = [];
    const runs = [];

    tokens.forEach((token) => {
        if (token.startsWith("<")) {
            const lower = token.toLowerCase();

            if (/<br\s*\/?\s*>/.test(lower)) {
                runs.push(new TextRun({ break: 1 }));
                return;
            }

            if (/<(strong|b)(\s|>)/.test(lower)) {
                styleState.bold += 1;
                return;
            }

            if (/<\/(strong|b)>/.test(lower)) {
                styleState.bold = Math.max(0, styleState.bold - 1);
                return;
            }

            if (/<(em|i)(\s|>)/.test(lower)) {
                styleState.italics += 1;
                return;
            }

            if (/<\/(em|i)>/.test(lower)) {
                styleState.italics = Math.max(0, styleState.italics - 1);
                return;
            }

            if (/<u(\s|>)/.test(lower)) {
                styleState.underline += 1;
                return;
            }

            if (/<\/u>/.test(lower)) {
                styleState.underline = Math.max(0, styleState.underline - 1);
                return;
            }

            if (/<a(\s|>)/.test(lower)) {
                const hrefMatch = token.match(/href\s*=\s*['\"]([^'\"]+)['\"]/i);
                linkStack.push(hrefMatch ? hrefMatch[1] : "");
                return;
            }

            if (/<\/a>/.test(lower)) {
                linkStack.pop();
            }

            return;
        }

        const text = decodeHtmlEntities(token);
        if (!text || !text.trim()) {
            return;
        }

        const textRunOptions = {
            text,
            bold: styleState.bold > 0,
            italics: styleState.italics > 0,
            underline: styleState.underline > 0 ? {} : undefined,
            color: options.color,
            size: options.size
        };

        const currentLink = linkStack[linkStack.length - 1];
        if (currentLink) {
            runs.push(
                new ExternalHyperlink({
                    link: currentLink,
                    children: [
                        new TextRun({
                            ...textRunOptions,
                            color: "0563C1",
                            underline: {}
                        })
                    ]
                })
            );
            return;
        }

        runs.push(new TextRun(textRunOptions));
    });

    if (runs.length === 0) {
        return [new TextRun({ text: "N/A", color: options.color, size: options.size })];
    }

    return runs;
};

const extractInnerTagContent = (html, tagName) => {
    const re = new RegExp(`^<${tagName}[^>]*>([\\s\\S]*)<\\/${tagName}>$`, "i");
    const match = String(html || "").match(re);
    return match ? match[1] : html;
};

const htmlToWordBlocks = (html) => {
    const source = String(html || "").trim();
    if (!source || isRichTextEmpty(source)) {
        return [];
    }

    const blocks = [];
    const blockRegex = /<(ul|ol|p|div)[^>]*>[\s\S]*?<\/\1>|<br\s*\/?>/gi;

    let match;
    while ((match = blockRegex.exec(source))) {
        const token = match[0];
        const lower = token.toLowerCase();

        if (lower.startsWith("<ul")) {
            const ulInner = extractInnerTagContent(token, "ul");
            const liMatches = ulInner.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
            liMatches.forEach((li) => {
                const liInner = extractInnerTagContent(li, "li");
                blocks.push({
                    kind: "bullet",
                    runs: parseInlineHtmlToWordRuns(liInner)
                });
            });
            continue;
        }

        if (lower.startsWith("<ol")) {
            const olInner = extractInnerTagContent(token, "ol");
            const liMatches = olInner.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
            liMatches.forEach((li) => {
                const liInner = extractInnerTagContent(li, "li");
                blocks.push({
                    kind: "numbered",
                    runs: parseInlineHtmlToWordRuns(liInner)
                });
            });
            continue;
        }

        if (lower.startsWith("<p") || lower.startsWith("<div")) {
            const tagName = lower.startsWith("<p") ? "p" : "div";
            const inner = extractInnerTagContent(token, tagName);
            if (!isRichTextEmpty(inner)) {
                blocks.push({
                    kind: "paragraph",
                    runs: parseInlineHtmlToWordRuns(inner)
                });
            }
        }
    }

    if (blocks.length === 0) {
        blocks.push({ kind: "paragraph", runs: parseInlineHtmlToWordRuns(source) });
    }

    return blocks;
};

const quillHtmlToWordParagraphs = (html, options = {}) => {
    const blocks = htmlToWordBlocks(html);
    const paragraphs = [];

    blocks.forEach((block) => {
        const children = (block.runs || []).map((run) => {
            if (run instanceof TextRun || run instanceof ExternalHyperlink) {
                return run;
            }
            return new TextRun(String(run || ""));
        });

        const paragraphOptions = {
            children: children.length > 0 ? children : [new TextRun("N/A")],
            spacing: { after: options.after || 140 },
            keepLines: true
        };

        if (block.kind === "bullet") {
            paragraphOptions.bullet = { level: 0 };
        }

        if (block.kind === "numbered") {
            paragraphOptions.numbering = {
                reference: "cv-numbered",
                level: 0
            };
        }

        paragraphs.push(new Paragraph(paragraphOptions));
    });

    return paragraphs;
};

const createWordHeading = (text, styleOptions = {}) =>
    new Paragraph({
        children: [
            new TextRun({
                text,
                bold: true,
                color: styleOptions.headingColor || "111827",
                size: styleOptions.headingSize || 28
            })
        ],
        keepNext: true,
        keepLines: true,
        spacing: {
            before: styleOptions.before || 240,
            after: styleOptions.after || 120
        },
        border: {
            bottom: {
                color: styleOptions.borderColor || "D1D5DB",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6
            }
        }
    });

const createWordKeyValue = (label, value, options = {}) =>
    new Paragraph({
        children: [
            new TextRun({ text: `${label}: `, bold: true, color: options.labelColor || options.color || "111827" }),
            new TextRun({ text: value || "N/A", color: options.color || "111827" })
        ],
        spacing: { after: 70 },
        keepLines: true
    });

const createWordSpacer = () => new Paragraph({ text: "", spacing: { after: 80 } });

const createWordFallbackParagraph = (text = "N/A") =>
    new Paragraph({
        children: [new TextRun({ text })],
        spacing: { after: 120 },
        keepLines: true
    });

const addWordSectionFromHtmlArray = (target, heading, entries, styleOptions = {}) => {
    target.push(createWordHeading(heading, styleOptions));

    const validEntries = normalizeArray(entries).filter((entry) => !isRichTextEmpty(entry));
    if (validEntries.length === 0) {
        target.push(createWordFallbackParagraph("N/A"));
        return;
    }

    validEntries.forEach((entry, index) => {
        quillHtmlToWordParagraphs(entry).forEach((paragraph) => target.push(paragraph));
        if (index < validEntries.length - 1) {
            target.push(createWordSpacer());
        }
    });
};

const addWordSectionFromString = (target, heading, text, styleOptions = {}) => {
    target.push(createWordHeading(heading, styleOptions));

    if (!text || !String(text).trim()) {
        target.push(createWordFallbackParagraph("N/A"));
        return;
    }

    const lines = String(text).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
        target.push(createWordFallbackParagraph("N/A"));
        return;
    }

    lines.forEach((line) => {
        target.push(
            new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 120 },
                keepLines: true
            })
        );
    });
};

const addWordSkills = (target, skills, styleOptions = {}) => {
    target.push(createWordHeading("Skills", styleOptions));

    const entries = normalizeArray(skills).map((skill) => String(skill || "").trim()).filter(Boolean);
    if (entries.length === 0) {
        target.push(createWordFallbackParagraph("N/A"));
        return;
    }

    entries.forEach((skill) => {
        target.push(
            new Paragraph({
                text: skill,
                bullet: { level: 0 },
                spacing: { after: 100 },
                keepLines: true
            })
        );
    });
};

const addWordEducation = (target, education, styleOptions = {}) => {
    target.push(createWordHeading("Education", styleOptions));

    const entries = normalizeArray(education);
    if (entries.length === 0) {
        target.push(createWordFallbackParagraph("N/A"));
        return;
    }

    entries.forEach((edu, index) => {
        target.push(
            new Paragraph({
                children: [new TextRun({ text: edu.school || "N/A", bold: true, size: 27 })],
                spacing: { after: 60 },
                keepLines: true
            })
        );

        target.push(createWordFallbackParagraph(edu.degree || "N/A"));

        if (edu.location) {
            target.push(createWordFallbackParagraph(edu.location));
        }

        if (edu.startDate || edu.endDate) {
            const dateText = `${edu.startDate || ""}${edu.startDate && edu.endDate ? " - " : ""}${edu.endDate || ""}`;
            target.push(
                new Paragraph({
                    children: [new TextRun({ text: dateText || "N/A", color: "64748B" })],
                    spacing: { after: 80 },
                    keepLines: true
                })
            );
        }

        if (edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo)) {
            quillHtmlToWordParagraphs(edu.additionalInfo).forEach((paragraph) => target.push(paragraph));
        }

        if (index < entries.length - 1) {
            target.push(createWordSpacer());
        }
    });
};

const buildWordTemplateA = (cvData) => {
    const left = [];
    const right = [];

    left.push(createWordHeading("Personal Info", { borderColor: "D1D5DB", headingColor: "111827" }));
    left.push(createWordKeyValue("Name", cvData.name || "N/A"));
    left.push(createWordKeyValue("Email", cvData.email || "N/A"));
    left.push(createWordKeyValue("Phone", cvData.phone || "N/A"));
    left.push(createWordKeyValue("LinkedIn", cvData.linkedin || "N/A"));

    addWordSkills(left, cvData.skills, { borderColor: "D1D5DB", headingColor: "111827" });
    addWordSectionFromHtmlArray(left, "Certifications", cvData.certifications, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });
    addWordSectionFromHtmlArray(left, "Awards", cvData.awards, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });

    addWordSectionFromString(right, "Profile Summary", cvData.summary, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });
    addWordSectionFromHtmlArray(right, "Work Experience", cvData.workExperience, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });
    addWordSectionFromHtmlArray(right, "Volunteer Experience", cvData.volunteerExperience, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });
    addWordEducation(right, cvData.education, { borderColor: "D1D5DB", headingColor: "111827" });
    addWordSectionFromHtmlArray(right, "Projects", cvData.projects, {
        borderColor: "D1D5DB",
        headingColor: "111827"
    });

    return {
        left,
        right,
        leftWidth: 3290,
        rightWidth: 6110,
        leftCellFill: null,
        leftTextColor: "111827"
    };
};

const buildWordTemplateB = (cvData) => {
    const left = [];
    const right = [];

    const leftHeadingStyle = { borderColor: "E2E8F0", headingColor: "E2E8F0" };
    const rightHeadingStyle = { borderColor: "1F3B63", headingColor: "1F3B63" };

    left.push(createWordHeading("Personal Info", leftHeadingStyle));
    left.push(createWordKeyValue("Name", cvData.name || "N/A", { color: "F8FAFC", labelColor: "E2E8F0" }));
    left.push(createWordKeyValue("Email", cvData.email || "N/A", { color: "F8FAFC", labelColor: "E2E8F0" }));
    left.push(createWordKeyValue("Phone", cvData.phone || "N/A", { color: "F8FAFC", labelColor: "E2E8F0" }));
    left.push(createWordKeyValue("LinkedIn", cvData.linkedin || "N/A", { color: "F8FAFC", labelColor: "E2E8F0" }));

    addWordSkills(left, cvData.skills, leftHeadingStyle);
    addWordSectionFromHtmlArray(left, "Certifications", cvData.certifications, leftHeadingStyle);
    addWordSectionFromHtmlArray(left, "Awards", cvData.awards, leftHeadingStyle);

    addWordSectionFromString(right, "Profile Summary", cvData.summary, rightHeadingStyle);
    addWordSectionFromHtmlArray(right, "Work Experience", cvData.workExperience, rightHeadingStyle);
    addWordSectionFromHtmlArray(right, "Volunteer Experience", cvData.volunteerExperience, rightHeadingStyle);
    addWordEducation(right, cvData.education, rightHeadingStyle);
    addWordSectionFromHtmlArray(right, "Projects", cvData.projects, rightHeadingStyle);

    return {
        left,
        right,
        leftWidth: 2800,
        rightWidth: 6600,
        leftCellFill: "1F3B63",
        leftTextColor: "F8FAFC"
    };
};

const buildWordDocument = (cvData = {}, template = "A") => {
    const safeTemplate = template === "B" ? "B" : "A";
    const templateModel = safeTemplate === "B" ? buildWordTemplateB(cvData) : buildWordTemplateA(cvData);

    const leftCell = new TableCell({
        width: { size: templateModel.leftWidth, type: WidthType.DXA },
        children: templateModel.left,
        shading: templateModel.leftCellFill
            ? {
                  fill: templateModel.leftCellFill
              }
            : undefined,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
        },
        margins: {
            top: 140,
            right: 160,
            bottom: 140,
            left: 160
        }
    });

    const rightCell = new TableCell({
        width: { size: templateModel.rightWidth, type: WidthType.DXA },
        children: templateModel.right,
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
        },
        margins: {
            top: 140,
            right: 160,
            bottom: 140,
            left: 160
        }
    });

    const layoutTable = new Table({
        width: {
            size: templateModel.leftWidth + templateModel.rightWidth,
            type: WidthType.DXA
        },
        layout: TableLayoutType.FIXED,
        rows: [
            new TableRow({
                cantSplit: false,
                children: [leftCell, rightCell]
            })
        ],
        borders: {
            top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }
        }
    });

    return new Document({
        numbering: {
            config: [
                {
                    reference: "cv-numbered",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.DECIMAL,
                            text: "%1.",
                            alignment: AlignmentType.START
                        }
                    ]
                }
            ]
        },
        sections: [
            {
                children: [layoutTable]
            }
        ]
    });
};

const exportPDF = async (req, res) => {
    try {
        const { cvData, template } = req.body;
        const htmlContent = generateHTML(cvData, template);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: "networkidle0" });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true
        });

        await browser.close();

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": "attachment; filename=OnClickCV.pdf"
        });

        return res.send(pdfBuffer);
    } catch (err) {
        console.error("Error generating PDF:", err);
        return res.status(500).json({ error: "Failed to generate PDF." });
    }
};

const exportWord = async (req, res) => {
    try {
        const { cvData, template } = req.body;
        const doc = buildWordDocument(cvData || {}, template);

        const buffer = await Packer.toBuffer(doc);
        res.set({
            "Content-Type":
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": "attachment; filename=OnClickCV.docx"
        });

        return res.send(buffer);
    } catch (err) {
        console.error("Error generating Word doc:", err);
        return res.status(500).json({ error: "Failed to generate Word." });
    }
};

module.exports = {
    exportPDF,
    exportWord,
    generateHTML,
    buildTemplateStyles,
    renderRichEntries,
    renderEducationEntries,
    quillHtmlToWordParagraphs,
    htmlToWordBlocks,
    parseInlineHtmlToWordRuns,
    buildWordDocument,
    buildWordTemplateA,
    buildWordTemplateB
};

const puppeteer = require("puppeteer");
const { Document, Packer, Paragraph, TextRun } = require("docx");

const normalizeArray = (value) => (Array.isArray(value) ? value : []);
const isRichTextEmpty = (value) => !value || value === "<p><br></p>" || value.trim() === "";

const escapeHtml = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const formatPlainText = (value) => {
    if (!value) {
        return "N/A";
    }

    return escapeHtml(value).replace(/\n/g, "<br />");
};

const stripHtml = (value = "") => String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

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

const toWordLines = (entries) =>
    normalizeArray(entries)
        .map((entry) => stripHtml(entry))
        .filter(Boolean);

const addHeading = (children, text) => {
    children.push(
        new Paragraph({
            children: [
                new TextRun({
                    text,
                    bold: true
                })
            ]
        })
    );
};

const addLine = (children, text) => {
    children.push(
        new Paragraph({
            children: [new TextRun(text)]
        })
    );
};

const addList = (children, entries) => {
    if (!entries || entries.length === 0) {
        addLine(children, "N/A");
        return;
    }

    entries.forEach((entry) => addLine(children, `• ${entry}`));
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
        const safeCvData = req.body.cvData || {};

        const children = [];

        addHeading(children, `Name: ${safeCvData.name || "N/A"}`);
        addLine(children, `Email: ${safeCvData.email || "N/A"}`);
        addLine(children, `Phone: ${safeCvData.phone || "N/A"}`);
        addLine(children, `LinkedIn: ${safeCvData.linkedin || "N/A"}`);

        addHeading(children, "Skills:");
        addList(children, normalizeArray(safeCvData.skills));

        addHeading(children, "Certifications:");
        addList(children, toWordLines(safeCvData.certifications));

        addHeading(children, "Awards:");
        addList(children, toWordLines(safeCvData.awards));

        addHeading(children, "Profile Summary:");
        addLine(children, safeCvData.summary || "N/A");

        addHeading(children, "Work Experience:");
        addList(children, toWordLines(safeCvData.workExperience));

        addHeading(children, "Volunteer Experience:");
        addList(children, toWordLines(safeCvData.volunteerExperience));

        addHeading(children, "Education:");
        if (normalizeArray(safeCvData.education).length === 0) {
            addLine(children, "N/A");
        } else {
            normalizeArray(safeCvData.education).forEach((edu) => {
                addLine(
                    children,
                    `Degree: ${edu.degree || "N/A"} | School: ${edu.school || "N/A"} | Location: ${
                        edu.location || "N/A"
                    } | Dates: ${edu.startDate || "N/A"} - ${edu.endDate || "N/A"}`
                );

                if (edu.additionalInfo && !isRichTextEmpty(edu.additionalInfo)) {
                    addLine(children, `Details: ${stripHtml(edu.additionalInfo)}`);
                }
            });
        }

        addHeading(children, "Projects:");
        addList(children, toWordLines(safeCvData.projects));

        const doc = new Document({
            sections: [
                {
                    children
                }
            ]
        });

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
    renderEducationEntries
};

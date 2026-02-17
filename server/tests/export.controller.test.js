const {
    generateHTML,
    buildTemplateStyles,
    renderRichEntries,
    renderEducationEntries,
    normalizeRichHtmlForExport,
    formatDateShort,
    formatDateRange,
    htmlToWordBlocks,
    quillHtmlToWordParagraphs,
    buildWordDocument,
    buildWordTemplateA,
    buildWordTemplateB
} = require("../controllers/exportController");

describe("exportController helpers", () => {
    it("renders rich entries without comma-joining artifacts", () => {
        const html = renderRichEntries(["<p>First</p>", "<p>Second</p>"]);

        expect(html).toContain("<p>First</p>");
        expect(html).toContain("<p>Second</p>");
        expect(html).not.toContain("</div>,<div");
    });

    it("renders education blocks with additional info", () => {
        const html = renderEducationEntries([
            {
                degree: "BSc",
                school: "Durham University",
                location: "Durham",
                startDate: "2018-09-01",
                endDate: "2022-06-01",
                additionalInfo: "<p>Honors</p>"
            }
        ]);

        expect(html).toContain("Durham University");
        expect(html).toContain("BSc");
        expect(html).toContain("<p>Honors</p>");
        expect(html).toContain("Sep 2018 - Jun 2022");
    });

    it("builds template B styles with grid layout", () => {
        const css = buildTemplateStyles("B");

        expect(css).toContain("grid-template-columns: 1fr 2.5fr");
        expect(css).toContain("linear-gradient(180deg, #1f3b63 0%, #11243f 100%)");
    });

    it("generates template B HTML with personal, volunteer, and list sections", () => {
        const cvData = {
            name: "Jane Doe",
            email: "jane@example.com",
            phone: "(123) 456-7890",
            linkedin: "https://linkedin.com/in/jane",
            summary: "Senior engineer",
            workExperience: ["<p>Built systems</p>"],
            volunteerExperience: ["<p>Mentored students</p>"],
            education: [],
            skills: ["Node.js", "React"],
            projects: ["<p>Portfolio app</p>"],
            certifications: ["<p>AWS SA</p>"],
            awards: ["<p>Dean's List</p>"]
        };

        const html = generateHTML(cvData, "B");

        expect(html).toContain("template-B");
        expect(html).toContain("LinkedIn:");
        expect(html).toContain("https://linkedin.com/in/jane");
        expect(html).toContain("Volunteer Experience");
        expect(html).toContain("<p>Mentored students</p>");
        expect(html).toContain("<p>AWS SA</p>");
        expect(html).toContain("<p>Dean's List</p>");
        expect(html).not.toContain("</div>,<div");
        expect(html).toContain("section-block");
        expect(html).toContain("entry-block");
        expect(html).toContain('<ul class="preview-list">');
    });

    it("normalizes rich html while preserving useful markup", () => {
        const normalized = normalizeRichHtmlForExport(
            "<p>Line 1</p><p><br></p><p><br></p><ul><li><strong>Item</strong></li></ul><p>&nbsp;&nbsp;</p>"
        );

        expect(normalized).toContain("<p>Line 1</p>");
        expect(normalized).toContain("<ul><li><strong>Item</strong></li></ul>");
        expect(normalized).not.toContain("<p><br></p><p><br></p>");
    });

    it("formats dates with short month and year", () => {
        expect(formatDateShort("2001-09-01")).toBe("Sep 2001");
        expect(formatDateRange("2001-09-01", "2003-07-01")).toBe("Sep 2001 - Jul 2003");
        expect(formatDateRange("2001-09-01", "")).toBe("Sep 2001 - Present");
        expect(formatDateRange("", "")).toBe("N/A");
    });

    it("parses quill html blocks with paragraph, bullet, and numbered items", () => {
        const blocks = htmlToWordBlocks(
            "<p><strong>Hello</strong> world</p><ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>"
        );

        expect(blocks).toHaveLength(4);
        expect(blocks[0].kind).toBe("paragraph");
        expect(blocks[1].kind).toBe("bullet");
        expect(blocks[2].kind).toBe("bullet");
        expect(blocks[3].kind).toBe("numbered");
    });

    it("converts quill html into multiple word paragraphs", () => {
        const paragraphs = quillHtmlToWordParagraphs(
            "<p>Line 1</p><p><em>Line 2</em></p><ul><li>Item A</li><li>Item B</li></ul>"
        );

        expect(paragraphs.length).toBeGreaterThanOrEqual(4);
    });

    it("builds template A/B word models with expected column widths", () => {
        const cvData = {
            name: "Test",
            skills: ["React"],
            workExperience: ["<p>Did things</p>"],
            volunteerExperience: [],
            education: [],
            projects: []
        };

        const modelA = buildWordTemplateA(cvData);
        const modelB = buildWordTemplateB(cvData);

        expect(modelA.leftWidth).toBe(3290);
        expect(modelA.rightWidth).toBe(6110);
        expect(modelB.leftWidth).toBe(2800);
        expect(modelB.rightWidth).toBe(6600);
    });

    it("buildWordDocument creates a single table-based section for two-column layout", () => {
        const doc = buildWordDocument({ name: "Demo", skills: ["JS"] }, "B");

        expect(doc).toBeDefined();
        expect(doc.documentWrapper).toBeDefined();
        expect(doc.documentWrapper.document).toBeDefined();
    });

    it("generates template A HTML with personal first and skills below summary", () => {
        const cvData = {
            name: "Jane Doe",
            summary: "Summary block",
            workExperience: ["<p>Work block</p>"],
            skills: ["React"],
            sectionLayout: {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: []
            }
        };

        const html = generateHTML(cvData, "A");
        const personalIndex = html.indexOf("Personal Info");
        const summaryIndex = html.indexOf("Profile Summary");
        const skillsIndex = html.indexOf("Skills");
        const workIndex = html.indexOf("Work Experience");

        expect(personalIndex).toBeGreaterThan(-1);
        expect(summaryIndex).toBeGreaterThan(personalIndex);
        expect(skillsIndex).toBeGreaterThan(summaryIndex);
        expect(workIndex).toBeGreaterThan(skillsIndex);
        expect(summaryIndex).toBeGreaterThan(-1);
    });

    it("normalizes stale sectionLayout and still renders populated missing sections", () => {
        const cvData = {
            name: "Jane Doe",
            certifications: ["<p>AWS SA</p>"],
            sectionLayout: {
                left: ["personal", "skills"],
                right: ["summary", "work"],
                editorCardOrder: ["personal", "summary", "work", "skills"]
            }
        };

        const html = generateHTML(cvData, "B");

        expect(html).toContain("Certifications");
        expect(html).toContain("<p>AWS SA</p>");
    });
});

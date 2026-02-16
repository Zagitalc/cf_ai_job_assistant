const {
    generateHTML,
    buildTemplateStyles,
    renderRichEntries,
    renderEducationEntries,
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
                startDate: "2018",
                endDate: "2022",
                additionalInfo: "<p>Honors</p>"
            }
        ]);

        expect(html).toContain("Durham University");
        expect(html).toContain("BSc");
        expect(html).toContain("<p>Honors</p>");
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
});

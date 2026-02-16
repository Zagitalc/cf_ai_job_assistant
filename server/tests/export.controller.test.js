const {
    generateHTML,
    buildTemplateStyles,
    renderRichEntries,
    renderEducationEntries
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
});

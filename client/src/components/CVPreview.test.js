import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CVPreview, { buildPreviewColumns, paginateColumnBlocks } from "./CVPreview";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("CVPreview", () => {
    let container;
    let root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("keeps heading with next block during pagination", () => {
        const blocks = [
            { id: "intro", kind: "text", sectionKey: "summary" },
            { id: "heading", kind: "heading", sectionKey: "work", keepWithNext: true },
            { id: "first-item", kind: "html", sectionKey: "work" }
        ];

        const pages = paginateColumnBlocks(
            blocks,
            {
                intro: 900,
                heading: 80,
                "first-item": 80
            },
            1000
        );

        expect(pages).toHaveLength(2);
        expect(pages[0].map((entry) => entry.id)).toEqual(["intro"]);
        expect(pages[1].map((entry) => entry.id)).toEqual(["heading", "first-item"]);
    });

    it("renders multiple virtual A4 pages for long content and emits metrics", () => {
        const metricsSpy = jest.fn();
        const longSentence = "Built scalable systems with measurable impact.";
        const longEntries = Array.from({ length: 45 }, (_, index) => `<p>${index} ${longSentence}</p>`);

        const cvData = {
            name: "Jane",
            email: "jane@example.com",
            phone: "123",
            linkedin: "linkedin.com/in/jane",
            summary: `${longSentence}\n${longSentence}`,
            workExperience: longEntries,
            volunteerExperience: [],
            education: [],
            skills: ["React", "Node.js", "Testing"],
            projects: longEntries,
            certifications: [],
            awards: [],
            additionalInfo: ""
        };

        act(() => {
            root.render(
                <CVPreview
                    cvData={cvData}
                    sectionLayout={{
                        left: ["personal", "skills", "certifications", "awards"],
                        right: ["summary", "work", "volunteer", "education", "projects"],
                        editorCardOrder: []
                    }}
                    template="B"
                    onLayoutMetricsChange={metricsSpy}
                />
            );
        });

        const pages = container.querySelectorAll(".preview-page-shell");
        expect(pages.length).toBeGreaterThan(1);

        expect(container.textContent).toContain("Page 1");
        expect(metricsSpy).toHaveBeenCalled();
        const latestMetrics = metricsSpy.mock.calls[metricsSpy.mock.calls.length - 1][0];
        expect(latestMetrics.totalPages).toBeGreaterThan(1);
        expect(latestMetrics.pageContentHeight).toBeGreaterThan(0);
        expect(Object.keys(latestMetrics.sectionHeights)).toContain("work");
    });

    it("applies template A priority ordering with personal first and skills after summary", () => {
        const cvData = {
            name: "Jane",
            email: "jane@example.com",
            phone: "123",
            linkedin: "linkedin.com/in/jane",
            summary: "Senior engineer",
            workExperience: ["<p>Built systems</p>"],
            volunteerExperience: [],
            education: [],
            skills: ["React"],
            projects: [],
            certifications: [],
            awards: [],
            additionalInfo: ""
        };

        const columns = buildPreviewColumns(
            cvData,
            {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: []
            },
            "A"
        );

        expect(columns.leftBlocks).toHaveLength(0);
        const headingTitles = columns.rightBlocks
            .filter((block) => block.kind === "heading")
            .map((block) => block.title);
        expect(headingTitles[0]).toBe("Personal Info");
        expect(headingTitles[1]).toBe("Profile Summary");
        expect(headingTitles[2]).toBe("Skills");
        expect(headingTitles).toContain("Personal Info");
    });

    it("omits empty optional sections from preview output", () => {
        const cvData = {
            name: "Jane",
            email: "jane@example.com",
            phone: "",
            linkedin: "",
            summary: "",
            workExperience: ["<p>Built systems</p>"],
            volunteerExperience: [],
            education: [{ school: "Durham University", degree: "BSc Computer Science" }],
            skills: ["React"],
            projects: [],
            certifications: [],
            awards: [],
            additionalInfo: ""
        };

        const columns = buildPreviewColumns(
            cvData,
            {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: []
            },
            "B"
        );

        const headingTitles = [...columns.leftBlocks, ...columns.rightBlocks]
            .filter((block) => block.kind === "heading")
            .map((block) => block.title);
        expect(headingTitles).not.toContain("Certifications");
        expect(headingTitles).not.toContain("Awards");
        expect(headingTitles).not.toContain("Profile Summary");
    });

    it("renders additional info section when populated", () => {
        const cvData = {
            name: "Jane",
            email: "jane@example.com",
            phone: "",
            linkedin: "",
            summary: "",
            workExperience: [],
            volunteerExperience: [],
            education: [],
            skills: ["React"],
            projects: [],
            certifications: [],
            awards: [],
            additionalInfo: "<p>Open-source maintainer and conference speaker.</p>"
        };

        const columns = buildPreviewColumns(
            cvData,
            {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects", "additional-info"],
                editorCardOrder: []
            },
            "B"
        );

        const headingTitles = [...columns.leftBlocks, ...columns.rightBlocks]
            .filter((block) => block.kind === "heading")
            .map((block) => block.title);
        expect(headingTitles).toContain("Additional Info");
    });
});

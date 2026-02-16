import React, { act } from "react";
import { createRoot } from "react-dom/client";
import CVPreview, { paginateColumnBlocks } from "./CVPreview";

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
            awards: []
        };

        act(() => {
            root.render(<CVPreview cvData={cvData} template="B" onLayoutMetricsChange={metricsSpy} />);
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
});

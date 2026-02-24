import {
    getCompletionStatus,
    getDefaultSectionLayout,
    getOrderedSectionsForTemplate,
    getOutputSectionsForTemplate,
    normalizeSectionLayout,
    reorderEditorCards
} from "./sectionLayout";

describe("sectionLayout utils", () => {
    it("returns default layout shape", () => {
        const layout = getDefaultSectionLayout();

        expect(layout.left).toContain("personal");
        expect(layout.right).toContain("summary");
        expect(layout.editorCardOrder).toContain("template-export");
        expect(layout.editorCardOrder.indexOf("template-export")).toBeGreaterThan(
            layout.editorCardOrder.indexOf("additional-info")
        );
    });

    it("enforces pinned sections at top and removes unknown sections", () => {
        const normalized = normalizeSectionLayout({
            left: ["skills", "personal", "unknown"],
            right: ["work", "summary"],
            editorCardOrder: ["summary", "work", "personal", "skills", "template-export", "save-load", "ai-review"]
        });

        expect(normalized.left[0]).toBe("personal");
        expect(normalized.right[0]).toBe("summary");
        expect(normalized.left).not.toContain("unknown");
    });

    it("appends populated sections missing from stale layout", () => {
        const normalized = normalizeSectionLayout(
            {
                left: ["personal", "skills"],
                right: ["summary", "work"],
                editorCardOrder: ["personal", "summary", "work", "skills"]
            },
            {
                certifications: ["<p>AWS</p>"]
            }
        );

        expect(normalized.left).toContain("certifications");
    });

    it("provides template A single-column priority order with personal first and skills after summary", () => {
        const ordered = getOrderedSectionsForTemplate(
            {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: []
            },
            "A"
        );

        expect(ordered.left).toEqual([]);
        expect(ordered.right[0]).toBe("personal");
        expect(ordered.right[1]).toBe("summary");
        expect(ordered.right[2]).toBe("skills");
        expect(ordered.right[ordered.right.length - 1]).toBe("awards");
    });

    it("does not move pinned sections during reorder", () => {
        const current = getDefaultSectionLayout();
        const next = reorderEditorCards(current, "personal", "skills");

        expect(next.left[0]).toBe("personal");
    });

    it("keeps utility cards locked in place", () => {
        const current = getDefaultSectionLayout();
        const next = reorderEditorCards(current, "save-load", "template-export");

        expect(next.left).toEqual(current.left);
        expect(next.right).toEqual(current.right);
        expect(next.editorCardOrder).toEqual(current.editorCardOrder);
    });

    it("filters optional empty sections from output", () => {
        const output = getOutputSectionsForTemplate(
            {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: []
            },
            "A",
            {
                name: "Jane Doe",
                email: "jane@example.com",
                skills: ["React"],
                workExperience: ["<p>Built systems</p>"]
            }
        );

        expect(output.right).toContain("personal");
        expect(output.right).not.toContain("certifications");
        expect(output.right).not.toContain("awards");
    });

    it("computes core completion independently of optional sections", () => {
        const completion = getCompletionStatus({
            name: "Jane Doe",
            email: "jane@example.com",
            skills: ["React"],
            education: [{ school: "Durham University", degree: "BSc Computer Science" }],
            projects: ["<p>Capstone</p>"]
        });

        expect(completion.isCoreReady).toBe(true);
        expect(completion.completionPercent).toBe(100);
    });

    it("fails core completion when required core section is missing", () => {
        const completion = getCompletionStatus({
            name: "Jane Doe",
            email: "jane@example.com",
            skills: ["React"],
            projects: ["<p>Capstone</p>"]
        });

        expect(completion.coreChecks.education).toBe(false);
        expect(completion.isCoreReady).toBe(false);
        expect(completion.completionPercent).toBeLessThan(100);
    });
});

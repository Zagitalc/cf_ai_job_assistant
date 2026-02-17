import {
    buildFilenameSuggestions,
    deriveRoleFromCvData,
    resolveExportFilename,
    sanitizeFilenameBase
} from "./exportFilename";

describe("exportFilename utils", () => {
    it("sanitizes invalid characters and collapses underscores", () => {
        expect(sanitizeFilenameBase("Jane  Doe / CV???.pdf")).toBe("Jane_Doe_CV");
    });

    it("derives role from summary first, then work entry fallback", () => {
        expect(
            deriveRoleFromCvData({
                summary: "Software Engineer\nSecond line",
                workExperience: ["<p>Fallback role from work</p>"]
            })
        ).toBe("Software Engineer");

        expect(
            deriveRoleFromCvData({
                summary: "",
                workExperience: ["<p>Built scalable cloud services and automated CI pipelines</p>"]
            })
        ).toContain("Built scalable cloud services");
    });

    it("builds deterministic suggestions", () => {
        const suggestions = buildFilenameSuggestions(
            { name: "Damn Son", summary: "Software Engineer" },
            "A",
            new Date("2026-02-17T12:00:00.000Z")
        );

        expect(suggestions).toHaveLength(3);
        expect(suggestions[0]).toContain("Damn_Son");
        expect(suggestions[0]).toContain("TemplateA");
        expect(suggestions[0]).toContain("2026-02-17");
    });

    it("always resolves extension based on format", () => {
        expect(resolveExportFilename("Damn_Son_CV.docx", "pdf")).toBe("Damn_Son_CV.pdf");
        expect(resolveExportFilename("Damn_Son_CV.pdf", "word")).toBe("Damn_Son_CV.docx");
    });
});


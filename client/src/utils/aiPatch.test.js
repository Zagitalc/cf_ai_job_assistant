import { applySuggestionPatch, parseSuggestionFieldPath } from "./aiPatch";

describe("aiPatch utils", () => {
    it("patches a top-level string field", () => {
        const cvData = {
            summary: "Old summary",
            workExperience: []
        };

        const result = applySuggestionPatch(cvData, "summary", "Updated summary");

        expect(result.ok).toBe(true);
        expect(result.data.summary).toBe("Updated summary");
        expect(cvData.summary).toBe("Old summary");
    });

    it("patches nested array/object string fields", () => {
        const cvData = {
            education: [
                {
                    additionalInfo: "<p>Old</p>"
                }
            ],
            skills: ["JavaScript", "React"]
        };

        const nestedResult = applySuggestionPatch(cvData, "education[0].additionalInfo", "<p>New</p>");
        expect(nestedResult.ok).toBe(true);
        expect(nestedResult.data.education[0].additionalInfo).toBe("<p>New</p>");

        const listResult = applySuggestionPatch(cvData, "skills[1]", "TypeScript");
        expect(listResult.ok).toBe(true);
        expect(listResult.data.skills[1]).toBe("TypeScript");
    });

    it("rejects invalid paths", () => {
        const cvData = {
            summary: "Old summary",
            skills: ["React"]
        };

        const missing = applySuggestionPatch(cvData, "projects[0]", "New");
        expect(missing.ok).toBe(false);

        const wrongType = applySuggestionPatch({ skills: [{ label: "React" }] }, "skills[0]", "New");
        expect(wrongType.ok).toBe(false);
    });

    it("parses field paths into tokens", () => {
        expect(parseSuggestionFieldPath("education[0].additionalInfo")).toEqual(["education", 0, "additionalInfo"]);
    });
});

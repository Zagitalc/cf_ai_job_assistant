import { getWordDiffSegments } from "./textDiff";

describe("textDiff", () => {
    it("returns empty list when both values are empty", () => {
        expect(getWordDiffSegments("", "")).toEqual([]);
    });

    it("marks additions when original is empty", () => {
        expect(getWordDiffSegments("", "hello world")).toEqual([
            { type: "add", text: "hello" },
            { type: "add", text: "world" }
        ]);
    });

    it("marks removals when suggestion is empty", () => {
        expect(getWordDiffSegments("hello world", "")).toEqual([
            { type: "remove", text: "hello" },
            { type: "remove", text: "world" }
        ]);
    });

    it("produces mixed segments for replacements", () => {
        expect(getWordDiffSegments("Responsible for managing a team", "Orchestrated a team")).toEqual([
            { type: "remove", text: "Responsible" },
            { type: "remove", text: "for" },
            { type: "remove", text: "managing" },
            { type: "add", text: "Orchestrated" },
            { type: "same", text: "a" },
            { type: "same", text: "team" }
        ]);
    });
});


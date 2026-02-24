jest.mock("../services/aiReviewService", () => ({
    requestAiReview: jest.fn(),
    AiReviewError: class AiReviewError extends Error {
        constructor(message, statusCode = 502, details = []) {
            super(message);
            this.statusCode = statusCode;
            this.details = details;
        }
    }
}));

const { reviewCV, reviewCVStream } = require("../controllers/aiController");
const { requestAiReview, AiReviewError } = require("../services/aiReviewService");

const makeCvData = () => ({
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "123",
    linkedin: "linkedin.com/in/jane",
    summary: "Backend engineer",
    workExperience: ["<p>Built APIs</p>"],
    volunteerExperience: [],
    education: [{ school: "University", degree: "BSc", additionalInfo: "<p>Honors</p>" }],
    skills: ["Node.js", "React"],
    projects: ["<p>Portfolio</p>"],
    certifications: [],
    awards: [],
    additionalInfo: ""
});

const makeResponse = (mode) => ({
    mode,
    generatedAt: new Date().toISOString(),
    overall: {
        tier: "Strong",
        score: 82,
        summary: "Solid base with a few improvements needed."
    },
    topFixes: [
        {
            id: "sug_1",
            priority: 1,
            sectionId: "summary",
            fieldPath: "summary",
            issueType: "impact",
            originalText: "Backend engineer",
            reason: "Sharper positioning improves first impression.",
            suggestedText: "Senior backend engineer with 6+ years scaling APIs.",
            title: "Strengthen summary opener"
        }
    ],
    bySection: {
        summary: {
            strengths: ["Clear direction"],
            suggestions: ["Add years of experience"]
        }
    },
    ...(mode === "job-match"
        ? {
              jobMatch: {
                  score: 75,
                  missingKeywords: ["AWS"],
                  matchedKeywords: ["Node.js"],
                  roleFitNotes: ["Good backend fit"]
              }
          }
        : {})
});

describe("AI review API", () => {
    const makeRes = () => {
        const response = {
            statusCode: 200,
            body: null,
            headers: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            setHeader(key, value) {
                this.headers[key] = value;
            },
            json(payload) {
                this.body = payload;
                return this;
            },
            write() {
                return true;
            },
            end() {
                return this;
            },
            flushHeaders() {
                return this;
            }
        };
        return response;
    };

    beforeEach(() => {
        process.env.AI_REVIEW_ENABLED = "true";
        process.env.OPENAI_API_KEY = "test-key";
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.AI_REVIEW_ENABLED;
        delete process.env.OPENAI_API_KEY;
    });

    it("returns 200 for valid section review requests", async () => {
        requestAiReview.mockResolvedValueOnce(makeResponse("section"));

        const req = {
            body: {
                mode: "section",
                sectionId: "summary",
                cvData: makeCvData(),
                sectionLayout: {
                    left: ["personal", "skills"],
                    right: ["summary", "work", "education"],
                    editorCardOrder: ["personal", "summary", "work", "skills", "ai-review", "template-export", "save-load"]
                }
            }
        };
        const res = makeRes();

        await reviewCV(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body.mode).toBe("section");
        expect(requestAiReview).toHaveBeenCalledTimes(1);
    });

    it("returns 200 for valid full and job-match requests", async () => {
        requestAiReview
            .mockResolvedValueOnce(makeResponse("full"))
            .mockResolvedValueOnce(makeResponse("job-match"));

        const fullReq = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: { left: [], right: [], editorCardOrder: [] }
            }
        };
        const fullRes = makeRes();
        await reviewCV(fullReq, fullRes);

        const jobReq = {
            body: {
                mode: "job-match",
                jobDescription: "Looking for Node.js engineer with AWS experience",
                cvData: makeCvData(),
                sectionLayout: { left: [], right: [], editorCardOrder: [] }
            }
        };
        const jobRes = makeRes();
        await reviewCV(jobReq, jobRes);

        expect(fullRes.statusCode).toBe(200);
        expect(jobRes.statusCode).toBe(200);
        expect(jobRes.body.jobMatch).toBeDefined();
    });

    it("returns 400 when required fields are missing by mode", async () => {
        const missingSectionReq = {
            body: {
                mode: "section",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const missingSectionRes = makeRes();
        await reviewCV(missingSectionReq, missingSectionRes);

        const missingJobReq = {
            body: {
                mode: "job-match",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const missingJobRes = makeRes();
        await reviewCV(missingJobReq, missingJobRes);

        expect(missingSectionRes.statusCode).toBe(400);
        expect(missingJobRes.statusCode).toBe(400);
    });

    it("returns 503 when OPENAI_API_KEY is missing", async () => {
        delete process.env.OPENAI_API_KEY;

        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const res = makeRes();
        await reviewCV(req, res);

        expect(res.statusCode).toBe(503);
    });

    it("returns 404 when AI review is disabled", async () => {
        process.env.AI_REVIEW_ENABLED = "false";
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const res = makeRes();
        await reviewCV(req, res);
        expect(res.statusCode).toBe(404);
        expect(res.body.error).toMatch(/disabled/i);
    });

    it("returns 502 when AI service reports invalid model output", async () => {
        requestAiReview.mockRejectedValueOnce(
            new AiReviewError("AI returned an invalid response shape.", 502, ["Model response is not valid JSON."])
        );

        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const res = makeRes();
        await reviewCV(req, res);

        expect(res.statusCode).toBe(502);
        expect(res.body.details).toContain("Model response is not valid JSON.");
    });

    it("returns 500 when AI service throws unexpected error", async () => {
        requestAiReview.mockRejectedValueOnce(new Error("unexpected boom"));
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            }
        };
        const res = makeRes();
        await reviewCV(req, res);
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toMatch(/unexpected/i);
    });

    it("stream endpoint returns 404 when disabled", async () => {
        process.env.AI_REVIEW_ENABLED = "false";
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn()
        };
        const res = makeRes();
        await reviewCVStream(req, res);
        expect(res.statusCode).toBe(404);
    });

    it("stream endpoint returns 503 when OPENAI_API_KEY missing", async () => {
        delete process.env.OPENAI_API_KEY;
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn()
        };
        const res = makeRes();
        await reviewCVStream(req, res);
        expect(res.statusCode).toBe(503);
    });

    it("stream endpoint returns 400 for invalid payload", async () => {
        const req = {
            body: {
                mode: "job-match",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn()
        };
        const res = makeRes();
        await reviewCVStream(req, res);
        expect(res.statusCode).toBe(400);
    });

    it("streams AI review events in the expected order", async () => {
        requestAiReview.mockResolvedValueOnce(makeResponse("full"));
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn()
        };
        const writes = [];
        const res = makeRes();
        res.write = jest.fn((chunk) => writes.push(chunk));
        res.end = jest.fn();

        await reviewCVStream(req, res);

        expect(res.headers["Content-Type"]).toBe("text/event-stream");
        const output = writes.join("");
        expect(output).toContain("event: start");
        expect(output).toContain("event: overall");
        expect(output).toContain("event: suggestion");
        expect(output).toContain("event: complete");
        expect(res.end).toHaveBeenCalled();
    });

    it("streams an error event when AI service fails", async () => {
        requestAiReview.mockRejectedValueOnce(new AiReviewError("boom", 502, ["detail"]));
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn()
        };
        const writes = [];
        const res = makeRes();
        res.write = jest.fn((chunk) => writes.push(chunk));
        res.end = jest.fn();

        await reviewCVStream(req, res);

        const output = writes.join("");
        expect(output).toContain("event: error");
        expect(output).toContain("boom");
        expect(res.end).toHaveBeenCalled();
    });

    it("stops streaming gracefully when client closes before suggestions", async () => {
        requestAiReview.mockResolvedValueOnce(makeResponse("full"));
        let closeHandler = null;
        const req = {
            body: {
                mode: "full",
                cvData: makeCvData(),
                sectionLayout: {}
            },
            on: jest.fn((event, handler) => {
                if (event === "close") {
                    closeHandler = handler;
                }
            })
        };

        const writes = [];
        const res = makeRes();
        res.write = jest.fn((chunk) => {
            writes.push(chunk);
            if (typeof chunk === "string" && chunk.includes("event: overall") && closeHandler) {
                closeHandler();
            }
        });
        res.end = jest.fn();

        await reviewCVStream(req, res);

        const output = writes.join("");
        expect(output).toContain("event: start");
        expect(output).toContain("event: overall");
        expect(output).not.toContain("event: suggestion");
        expect(res.end).toHaveBeenCalled();
    });
});

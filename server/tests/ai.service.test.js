const { requestAiReview, AiReviewError } = require("../services/aiReviewService");

const makeCvData = () => ({
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "123",
    linkedin: "linkedin.com/in/jane",
    summary: "Old summary",
    workExperience: ["<p>Built services</p>"],
    volunteerExperience: [],
    education: [{ additionalInfo: "<p>Honors</p>" }],
    skills: ["Node.js", "React"],
    projects: ["<p>Project</p>"],
    certifications: [],
    awards: [],
    additionalInfo: ""
});

const mockOpenAiResponse = (jsonText) => ({
    ok: true,
    json: async () => ({
        choices: [
            {
                message: {
                    content: jsonText
                }
            }
        ],
        usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
        }
    })
});

const makeValidResponse = (mode) =>
    JSON.stringify({
        mode,
        generatedAt: new Date().toISOString(),
        overall: {
            tier: "Strong",
            score: 80,
            summary: "Clear and relevant content with room for stronger metrics."
        },
        topFixes:
            mode === "section"
                ? [
                      {
                          id: "sug_1",
                          priority: 1,
                          sectionId: "summary",
                          fieldPath: "summary",
                          reason: "Stronger lead line improves recruiter scan.",
                          suggestedText: "Backend engineer with 6+ years scaling APIs.",
                          title: "Strengthen opener"
                      },
                      {
                          id: "sug_2",
                          priority: 2,
                          sectionId: "summary",
                          fieldPath: "summary",
                          reason: "Add measurable outcomes.",
                          suggestedText: "Backend engineer who cut latency by 35% across core endpoints.",
                          title: "Add impact metric"
                      }
                  ]
                : [
                      {
                          id: "sug_1",
                          priority: 1,
                          sectionId: "summary",
                          fieldPath: "summary",
                          reason: "Sharper positioning improves first impression.",
                          suggestedText: "Backend engineer with 6+ years and measurable reliability wins.",
                          title: "Clarify value proposition"
                      }
                  ],
        bySection: {
            summary: {
                strengths: ["Clear technical focus"],
                suggestions: ["Lead with measurable impact"]
            }
        },
        ...(mode === "job-match"
            ? {
                  jobMatch: {
                      score: 72,
                      missingKeywords: ["AWS"],
                      matchedKeywords: ["Node.js"],
                      roleFitNotes: ["Strong backend alignment"]
                  }
              }
            : {})
    });

describe("aiReviewService", () => {
    it("returns normalized response for valid section review and redacts identity fields in prompt", async () => {
        const fetchImpl = jest.fn().mockResolvedValueOnce(mockOpenAiResponse(makeValidResponse("section")));

        const result = await requestAiReview(
            {
                mode: "section",
                sectionId: "summary",
                cvData: makeCvData(),
                sectionLayout: { left: [], right: [], editorCardOrder: [] },
                jobDescription: ""
            },
            {
                apiKey: "test-key",
                fetchImpl
            }
        );

        expect(result.mode).toBe("section");
        expect(result.topFixes.length).toBeGreaterThanOrEqual(2);

        const body = JSON.parse(fetchImpl.mock.calls[0][1].body);
        const prompt = body.messages[1].content;
        expect(prompt).toContain('"name": "[redacted]"');
        expect(prompt).toContain('"email": "[redacted]"');
    });

    it("retries once when model returns invalid JSON, then succeeds", async () => {
        const fetchImpl = jest
            .fn()
            .mockResolvedValueOnce(mockOpenAiResponse("not json"))
            .mockResolvedValueOnce(mockOpenAiResponse(makeValidResponse("full")));

        const result = await requestAiReview(
            {
                mode: "full",
                sectionId: "",
                cvData: makeCvData(),
                sectionLayout: { left: [], right: [], editorCardOrder: [] },
                jobDescription: ""
            },
            {
                apiKey: "test-key",
                fetchImpl
            }
        );

        expect(result.mode).toBe("full");
        expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("normalizes partial model output that is missing overall and top-level fields", async () => {
        const invalidShape = JSON.stringify({
            mode: "full",
            generatedAt: "not-a-date",
            overall: {},
            topFixes: [],
            bySection: {}
        });

        const fetchImpl = jest.fn().mockResolvedValueOnce(mockOpenAiResponse(invalidShape));

        const result = await requestAiReview(
            {
                mode: "full",
                sectionId: "",
                cvData: makeCvData(),
                sectionLayout: { left: [], right: [], editorCardOrder: [] },
                jobDescription: ""
            },
            {
                apiKey: "test-key",
                fetchImpl
            }
        );

        expect(result.overall).toBeDefined();
        expect(result.mode).toBe("full");
        expect(Array.isArray(result.topFixes)).toBe(true);
    });

    it("throws AiReviewError when response is non-JSON across retries", async () => {
        const fetchImpl = jest.fn().mockResolvedValueOnce(mockOpenAiResponse("still not json")).mockResolvedValueOnce(
            mockOpenAiResponse("also not json")
        );

        await expect(
            requestAiReview(
                {
                    mode: "full",
                    sectionId: "",
                    cvData: makeCvData(),
                    sectionLayout: { left: [], right: [], editorCardOrder: [] },
                    jobDescription: ""
                },
                {
                    apiKey: "test-key",
                    fetchImpl
                }
            )
        ).rejects.toBeInstanceOf(AiReviewError);
    });
});

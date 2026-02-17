const request = require("supertest");
const { app } = require("../server");
const CV = require("../models/CV");

describe("CV API", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("POST /api/cv/save without userId creates a new CV", async () => {
        const cvData = {
            name: "Alice",
            email: "alice@example.com",
            skills: ["JavaScript", "React"],
            sectionLayout: {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: ["personal", "summary", "work", "skills", "template-export", "save-load"]
            }
        };

        const response = await request(app)
            .post("/api/cv/save")
            .send({ cvData });

        expect(response.status).toBe(200);
        expect(response.body._id).toBeDefined();
        expect(response.body.name).toBe("Alice");
        expect(response.body.skills).toEqual(["JavaScript", "React"]);
        expect(response.body.sectionLayout.left).toContain("personal");
    });

    it("POST /api/cv/save with userId upserts and updates existing CV", async () => {
        const userId = "user-123";

        const firstResponse = await request(app)
            .post("/api/cv/save")
            .send({
                userId,
                cvData: { name: "First Name", summary: "First summary" }
            });

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.body.userId).toBe(userId);

        await new Promise((resolve) => setTimeout(resolve, 10));

        const secondResponse = await request(app)
            .post("/api/cv/save")
            .send({
                userId,
                cvData: { name: "Updated Name", summary: "Updated summary" }
            });

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.userId).toBe(userId);
        expect(secondResponse.body.name).toBe("Updated Name");
        expect(new Date(secondResponse.body.updatedAt).getTime()).toBeGreaterThan(
            new Date(firstResponse.body.updatedAt).getTime()
        );

        const count = await CV.countDocuments({ userId });
        expect(count).toBe(1);
    });

    it("GET /api/cv/:userId returns an existing CV", async () => {
        await CV.create({
            userId: "user-abc",
            name: "Existing User",
            email: "existing@example.com",
            sectionLayout: {
                left: ["personal", "skills", "certifications", "awards"],
                right: ["summary", "work", "volunteer", "education", "projects"],
                editorCardOrder: ["personal", "summary", "work", "skills", "template-export", "save-load"]
            }
        });

        const response = await request(app).get("/api/cv/user-abc");

        expect(response.status).toBe(200);
        expect(response.body.userId).toBe("user-abc");
        expect(response.body.name).toBe("Existing User");
        expect(response.body.sectionLayout.right).toContain("summary");
    });

    it("GET /api/cv/:userId returns 404 when CV does not exist", async () => {
        const response = await request(app).get("/api/cv/missing-user");

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: "CV not found" });
    });

    it("returns 500 when CV.create fails", async () => {
        jest.spyOn(CV, "create").mockRejectedValueOnce(new Error("db create error"));

        const response = await request(app)
            .post("/api/cv/save")
            .send({ cvData: { name: "Failure path" } });

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: "Failed to save CV" });
    });

    it("returns 500 when CV.findOne fails", async () => {
        jest.spyOn(CV, "findOne").mockRejectedValueOnce(new Error("db get error"));

        const response = await request(app).get("/api/cv/user-for-error");

        expect(response.status).toBe(500);
        expect(response.body).toEqual({ error: "Failed to fetch CV" });
    });
});

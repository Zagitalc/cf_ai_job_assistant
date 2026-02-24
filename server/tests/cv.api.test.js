const request = require("supertest");
const app = require("../server");
const CV = require("../models/CV");

describe("CV API", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("POST /api/cv/save creates new CV without userId and returns saved fields", async () => {
        const payload = {
            cvData: {
                name: "Test User",
                email: "test@test.com"
            }
        };
        const res = await request(app)
            .post("/api/cv/save")
            .send(payload)
            .expect(200);

        expect(res.body).toHaveProperty("_id");
        expect(res.body.name).toBe("Test User");
    });

    test("POST /api/cv/save upserts CV with userId on first call", async () => {
        const res = await request(app)
            .post("/api/cv/save")
            .send({
                userId: "api_user_1",
                cvData: { name: "Long Hung" }
            })
            .expect(200);
        expect(res.body.userId).toBe("api_user_1");
        expect(res.body.name).toBe("Long Hung");
    });

    test("POST /api/cv/save updates existing CV on second call without duplicate", async () => {
        await request(app)
            .post("/api/cv/save")
            .send({ userId: "api_user_2", cvData: { name: "Version 1" } });

        await new Promise((resolve) => setTimeout(resolve, 10));

        const res = await request(app)
            .post("/api/cv/save")
            .send({
                userId: "api_user_2",
                cvData: { name: "Version 2" }
            })
            .expect(200);

        const allDocs = await CV.find({ userId: "api_user_2" });
        expect(allDocs).toHaveLength(1);
        expect(res.body.name).toBe("Version 2");
    });

    test("GET /api/cv/:userId returns 200 with CV payload for existing userId", async () => {
        await CV.create({
            userId: "get_user_1",
            name: "Get Test"
        });

        const res = await request(app)
            .get("/api/cv/get_user_1")
            .expect(200);
        expect(res.body.name).toBe("Get Test");
    });

    test("GET /api/cv/:userId returns 404 with error message for missing userId", async () => {
        const res = await request(app)
            .get("/api/cv/nonexistent_user_999")
            .expect(404);
        expect(res.body).toHaveProperty("error");
        expect(res.body.error).toMatch(/not found/i);
    });

    test("save returns 500 when model throws", async () => {
        const spy = jest.spyOn(CV, "findOneAndUpdate")
            .mockRejectedValueOnce(new Error("DB failure"));
        const res = await request(app)
            .post("/api/cv/save")
            .send({ userId: "error_user", cvData: {} })
            .expect(500);
        expect(res.body).toHaveProperty("error");
        spy.mockRestore();
    });

    test("get returns 500 when model throws", async () => {
        const spy = jest.spyOn(CV, "findOne")
            .mockRejectedValueOnce(new Error("DB failure"));
        const res = await request(app)
            .get("/api/cv/error_user")
            .expect(500);
        expect(res.body).toHaveProperty("error");
        spy.mockRestore();
    });
});

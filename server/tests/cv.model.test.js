const CV = require("../models/CV");

describe("CV Model", () => {
    test("creates CV with nested education array and persists correctly", async () => {
        const cv = await CV.create({
            userId: "user_model_1",
            education: [
                {
                    school: "Durham University",
                    degree: "BSc Computer Science",
                    startDate: "2001-09",
                    endDate: "2004-07"
                }
            ]
        });

        expect(cv._id).toBeDefined();
        expect(cv.education).toHaveLength(1);
        expect(cv.education[0].school).toBe("Durham University");
    });

    test("applies createdAt and updatedAt timestamps on create", async () => {
        const cv = await CV.create({ userId: "user_model_2" });
        expect(cv.createdAt).toBeDefined();
        expect(cv.updatedAt).toBeDefined();
        expect(cv.createdAt).toBeInstanceOf(Date);
    });

    test("stores and retrieves skills, projects, work arrays unchanged", async () => {
        const payload = {
            userId: "user_model_3",
            skills: ["React", "Node.js", "TypeScript"],
            projects: ["<p>OnClickCV app</p>"],
            workExperience: ["<p>Warehouse Operative - Harrods</p>"]
        };

        const cv = await CV.create(payload);
        const found = await CV.findById(cv._id);
        expect(found.skills).toEqual(expect.arrayContaining(["React", "Node.js"]));
        expect(found.projects[0]).toContain("OnClickCV");
        expect(found.workExperience[0]).toContain("Harrods");
    });

    test("persists sectionLayout with left and right columns", async () => {
        const cv = await CV.create({
            userId: "user_model_4",
            sectionLayout: {
                left: ["personal", "skills"],
                right: ["summary", "work"],
                editorCardOrder: ["personal", "summary", "work", "skills"]
            }
        });
        expect(cv.sectionLayout.left).toContain("skills");
        expect(cv.sectionLayout.right).toContain("work");
    });
});

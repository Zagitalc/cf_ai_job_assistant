const CV = require("../models/CV");

describe("CV model", () => {
    it("creates a CV with nested education entries", async () => {
        const saved = await CV.create({
            name: "Alice",
            email: "alice@example.com",
            education: [
                {
                    degree: "BSc Computer Science",
                    school: "State University",
                    location: "New York",
                    startDate: "2018",
                    endDate: "2022",
                    additionalInfo: "<p>Honors</p>"
                }
            ]
        });

        expect(saved._id).toBeDefined();
        expect(saved.education).toHaveLength(1);
        expect(saved.education[0].degree).toBe("BSc Computer Science");
    });

    it("applies createdAt and updatedAt defaults", async () => {
        const saved = await CV.create({
            name: "Bob",
            email: "bob@example.com"
        });

        expect(saved.createdAt).toBeInstanceOf(Date);
        expect(saved.updatedAt).toBeInstanceOf(Date);
    });

    it("stores array fields unchanged", async () => {
        const workExperience = ["<p>Role A</p>", "<p>Role B</p>"];
        const projects = ["<p>Project A</p>"];
        const skills = ["Node.js", "MongoDB"];

        const saved = await CV.create({
            name: "Carol",
            workExperience,
            projects,
            skills
        });

        expect(saved.workExperience).toEqual(workExperience);
        expect(saved.projects).toEqual(projects);
        expect(saved.skills).toEqual(skills);
    });
});

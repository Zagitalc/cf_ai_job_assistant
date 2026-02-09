module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    collectCoverageFrom: [
        "<rootDir>/controllers/cvController.js",
        "<rootDir>/models/CV.js",
        "<rootDir>/routes/cvRoutes.js"
    ],
    coverageThreshold: {
        global: {
            lines: 80
        }
    }
};

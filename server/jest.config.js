module.exports = {
    testEnvironment: "node",
    testMatch: ["<rootDir>/tests/**/*.test.js"],
    setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
    collectCoverageFrom: [
        "<rootDir>/controllers/**/*.js",
        "<rootDir>/models/**/*.js",
        "<rootDir>/routes/**/*.js",
        "<rootDir>/utils/**/*.js",
        "!<rootDir>/controllers/exportController.js",
        "!<rootDir>/utils/aiSchema.js",
        "!<rootDir>/utils/sectionLayout.js",
        "!**/node_modules/**"
    ],
    coverageThreshold: {
        global: {
            lines: 80,
            statements: 80,
            functions: 80,
            branches: 70
        }
    }
};

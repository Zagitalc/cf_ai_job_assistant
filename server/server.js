const fs = require("fs");
const path = require("path");

const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
            return;
        }

        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex <= 0) {
            return;
        }

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!key || process.env[key] !== undefined) {
            return;
        }

        process.env[key] = value;
    });
};

loadEnvFile(path.join(__dirname, ".env"));

const express = require("express");
const cors = require("cors");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const aiRoutes = require("./routes/aiRoutes");
const connectDB = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/export", exportRoutes);
app.use("/api/cv", cvRoutes);
app.use("/api/ai", aiRoutes);

const clientBuildPath = path.join(__dirname, "..", "client", "build");
if (process.env.NODE_ENV === "production") {
    app.use(express.static(clientBuildPath));

    app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api/")) {
            return next();
        }
        return res.sendFile(path.join(clientBuildPath, "index.html"));
    });
}

if (require.main === module) {
    const PORT = process.env.PORT || 4000;
    connectDB().then(() => {
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    });
}

module.exports = app;

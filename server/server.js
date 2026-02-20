const express = require("express");
const cors = require("cors");
const path = require("path");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const { connectToDatabase } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/export", exportRoutes);
app.use("/api/cv", cvRoutes);

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

async function startServer() {
    const PORT = process.env.PORT || 4000;
    await connectToDatabase();

    return app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    app,
    startServer
};

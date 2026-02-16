const express = require("express");
const cors = require("cors");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const { connectToDatabase } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/export", exportRoutes);
app.use("/api/cv", cvRoutes);

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

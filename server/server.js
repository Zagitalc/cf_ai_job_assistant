const express = require("express");
const cors = require("cors");
const exportRoutes = require("./routes/exportRoutes");
const cvRoutes = require("./routes/cvRoutes");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/export", exportRoutes);
app.use("/api/cv", cvRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

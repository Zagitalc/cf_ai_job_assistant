const express = require("express");
const router = express.Router();
const { saveCV, getCV } = require("../controllers/cvController");

// Save or update CV
router.post("/save", saveCV);

// Get CV by userId
router.get("/:userId", getCV);

module.exports = router;
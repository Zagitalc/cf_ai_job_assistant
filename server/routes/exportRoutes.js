const express = require("express");
const router = express.Router();
const {
  exportPDF,
  exportWord
} = require("../controllers/exportController");

// PDF Export
router.post("/pdf", exportPDF);

// Word Export
router.post("/word", exportWord);

module.exports = router;

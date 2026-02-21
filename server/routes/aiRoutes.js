const express = require("express");
const { reviewCV } = require("../controllers/aiController");

const router = express.Router();

router.post("/review", reviewCV);

module.exports = router;

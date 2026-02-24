const express = require("express");
const { reviewCV, reviewCVStream } = require("../controllers/aiController");

const router = express.Router();

router.post("/review", reviewCV);
router.post("/review/stream", reviewCVStream);

module.exports = router;

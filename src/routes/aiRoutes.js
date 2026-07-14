const express = require("express");
const { getProjectEstimate } = require("../controllers/aiController");

const router = express.Router();

// Define the API route for the AI assistant
router.post("/estimate", getProjectEstimate);

module.exports = router;
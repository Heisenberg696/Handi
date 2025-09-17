// backend/routes/uploadRoutes.js
const express = require("express");
const router = express.Router();
const { getUploadSignature } = require("../controllers/uploadController");

// Single endpoint that returns signed params for a client to upload directly
router.post("/signature", getUploadSignature);

module.exports = router;

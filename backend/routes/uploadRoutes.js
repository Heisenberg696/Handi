// backend/routes/uploadRoutes.js
const express = require("express");
const router = express.Router();
const {
  getUploadSignature,
  destroyImage,
} = require("../controllers/uploadController");

// Get signed params for client to upload directly
router.post("/signature", getUploadSignature);

// Delete image from Cloudinary
router.delete("/destroy", destroyImage);

module.exports = router;

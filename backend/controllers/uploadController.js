// backend/controllers/uploadController.js
const cloudinary = require("../config/cloudinary");

const MAX_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024);

const getUploadSignature = (req, res) => {
  try {
    // timestamp for signature
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = process.env.CLOUDINARY_FOLDER || "handi/profiles";

    // params you want to sign (do not include api_key or api_secret)
    const paramsToSign = {
      timestamp,
      folder,
      // you can include other signed params here if needed (e.g., eager transforms)
    };

    // generate signature using cloudinary utils (server-side only)
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      success: true,
      data: {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
        allowedFormats: ["jpg", "jpeg", "png", "webp"],
        maxFileSizeBytes: MAX_BYTES,
      },
    });
  } catch (err) {
    console.error("getUploadSignature error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Could not create upload signature" });
  }
};

module.exports = { getUploadSignature };

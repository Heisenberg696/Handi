// backend/controllers/uploadController.js
const cloudinary = require("../config/cloudinary");
const MAX_BYTES = Number(process.env.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024);

// Allowlist of folders that can be used for uploads
const ALLOWED_FOLDERS = ["handi/profiles", "handi/jobs"];

const getUploadSignature = (req, res) => {
  try {
    // Accept folder from body or query, with fallback to env or default
    const requestedFolder =
      req.body.folder ||
      req.query.folder ||
      process.env.CLOUDINARY_FOLDER ||
      "handi/profiles";

    // Validate folder against allowlist
    if (!ALLOWED_FOLDERS.includes(requestedFolder)) {
      return res.status(400).json({
        success: false,
        error: `Invalid folder. Allowed folders: ${ALLOWED_FOLDERS.join(", ")}`,
      });
    }

    // timestamp for signature
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = requestedFolder;

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

// Destroy image endpoint
const destroyImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    // Validate input
    if (!public_id || typeof public_id !== "string") {
      return res.status(400).json({
        success: false,
        error: "public_id is required and must be a string",
      });
    }

    // Validate that public_id belongs to an allowed folder (security check)
    const isAllowed = ALLOWED_FOLDERS.some((folder) =>
      public_id.startsWith(folder)
    );

    if (!isAllowed) {
      return res.status(403).json({
        success: false,
        error: `Access denied: public_id must start with one of: ${ALLOWED_FOLDERS.join(
          ", "
        )}`,
      });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(public_id);

    // Check if deletion was successful
    if (result.result === "ok") {
      return res.status(200).json({
        success: true,
        message: "Image deleted successfully",
        public_id,
      });
    } else if (result.result === "not found") {
      return res.status(404).json({
        success: false,
        error: "Image not found",
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Failed to delete image",
        details: result,
      });
    }
  } catch (err) {
    console.error("destroyImage error:", err);
    return res.status(500).json({
      success: false,
      error: "Internal server error during image deletion",
    });
  }
};

module.exports = {
  getUploadSignature,
  destroyImage,
};

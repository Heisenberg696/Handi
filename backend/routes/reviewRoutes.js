// backend/routes/reviewRoutes.js
const express = require("express");
const requireAuth = require("../middlewares/requireAuth");
const {
  createReview,
  getReviewByJobId,
  getReviewsForWorker,
} = require("../controllers/reviewController");

const router = express.Router();

// All review routes require authentication
router.use(requireAuth);

// IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// This prevents route conflicts

// GET /api/reviews/job/:jobId → check if customer already reviewed this job
// Place this BEFORE the POST to avoid confusion
router.get("/job/:jobId", getReviewByJobId);

// GET /api/reviews/worker/:workerId → fetch worker reviews (paginated)
router.get("/worker/:workerId", getReviewsForWorker);

// POST /api/reviews/:jobId → customer leaves or updates review for a worker
// This MUST come AFTER the specific routes above
router.post("/:jobId", createReview);

module.exports = router;

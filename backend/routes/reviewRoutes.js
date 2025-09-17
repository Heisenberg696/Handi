// backend/routes/reviewRoutes.js
const express = require("express");
const requireAuth = require("../middlewares/requireAuth");
const {
  createReview,
  getReviewsForWorker,
} = require("../controllers/reviewController");

const router = express.Router();

// POST /api/reviews/:jobId → customer leaves review for a worker
router.post("/:jobId", requireAuth, createReview);

// GET /api/reviews/worker/:workerId → fetch worker reviews (paginated)
router.get("/worker/:workerId", requireAuth, getReviewsForWorker);

module.exports = router;

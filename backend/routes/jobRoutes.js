// backend/routes/jobRoutes.js
const express = require("express");
const requireAuth = require("../middlewares/requireAuth");
const {
  createJob,
  getAssignedJobs,
  getCreatedJobs,
  acceptJob,
  declineJob,
  getJobById,
  completeJob,
} = require("../controllers/jobController");

const router = express.Router();

// POST /api/jobs/create → create job
router.post("/create", requireAuth, createJob);

// GET /api/jobs/assigned → get jobs assigned to current user (as worker)
router.get("/assigned", requireAuth, getAssignedJobs);

// GET /api/jobs/created → get jobs created by current user (as customer)
router.get("/created", requireAuth, getCreatedJobs);

// GET /api/jobs/:id → get single job by ID
router.get("/:id", requireAuth, getJobById);

// PATCH /api/jobs/:id/accept → worker accepts job
router.patch("/:id/accept", requireAuth, acceptJob);

// PATCH /api/jobs/:id/decline → worker declines job
router.patch("/:id/decline", requireAuth, declineJob);

// PATCH /api/jobs/:id/complete → worker marks job as completed
router.patch("/:id/complete", requireAuth, completeJob);

module.exports = router;

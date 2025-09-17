// backend/controllers/reviewController.js
const Review = require("../models/Review");
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Profile = require("../models/Profile");

// POST /api/reviews/:jobId → customer leaves a review
const createReview = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.customer.toString() !== customerId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the customer can leave a review for this job" });
    }

    if (job.status !== "completed") {
      return res
        .status(400)
        .json({ error: "You can only review completed jobs" });
    }

    const worker = await User.findById(job.worker);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    // Create review
    const review = await Review.create({
      job: job._id,
      reviewer: customerId,
      reviewee: worker._id,
      rating,
      comment,
    });

    // === Update worker profile rating ===
    const agg = await Review.aggregate([
      { $match: { reviewee: worker._id } },
      {
        $group: {
          _id: "$reviewee",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (agg.length > 0) {
      const avgRating = Math.round(agg[0].avgRating * 10) / 10; // rounded to 1 decimal
      const reviewCount = agg[0].count;

      await Profile.findOneAndUpdate(
        { userId: worker._id },
        { $set: { rating: avgRating, reviewCount } },
        { new: true }
      );
    }

    // === Create notification for worker ===
    const customerUser = await User.findById(customerId).select("username");
    const customerName = customerUser ? customerUser.username : "A customer";

    const message = `${customerName} left you a review: ${rating}★`;

    const notification = await Notification.create({
      recipient: worker._id,
      sender: customerId,
      type: "review_received",
      message,
      jobId: job._id,
    });

    // === Emit WebSocket event ===
    const io = req.app.get("io");
    if (io) {
      io.to(worker._id.toString()).emit("review_added", {
        review,
        message,
      });
    }

    return res.status(201).json({ review, notification });
  } catch (err) {
    console.error("createReview error:", err);
    return res
      .status(500)
      .json({ error: "Server error while creating review" });
  }
};

module.exports = { createReview };

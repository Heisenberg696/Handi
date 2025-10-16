// backend/controllers/reviewController.js
const Review = require("../models/Review");
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Profile = require("../models/Profile");

// POST /api/reviews/:jobId → customer leaves or updates a review
const createReview = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { rating, comment } = req.body;
    const customerId = req.user._id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Find job
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only customer can leave review
    if (job.customer.toString() !== customerId.toString()) {
      return res
        .status(403)
        .json({ error: "Only the customer can leave a review for this job" });
    }

    // Only completed jobs can be reviewed
    if (job.status !== "completed") {
      return res
        .status(400)
        .json({ error: "You can only review completed jobs" });
    }

    // Find worker
    const worker = await User.findById(job.worker);
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    // Check if review already exists for this job
    let review = await Review.findOne({ job: jobId, reviewer: customerId });
    let isUpdate = false;

    if (review) {
      // Update existing review
      isUpdate = true;
      review.rating = rating;
      review.comment = comment || "";
      await review.save();
    } else {
      // Create new review
      review = await Review.create({
        job: jobId,
        reviewer: customerId,
        reviewee: worker._id,
        rating,
        comment: comment || "",
      });
    }

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

    // === Create notification for worker (only on new review, not on update) ===
    if (!isUpdate) {
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

      return res.status(201).json({
        review,
        notification,
        message: "Review created successfully",
      });
    } else {
      // On update, just return the review
      return res.status(200).json({
        review,
        message: "Review updated successfully",
      });
    }
  } catch (err) {
    console.error("createReview error:", err);
    return res
      .status(500)
      .json({ error: "Server error while creating review" });
  }
};

// GET /api/reviews/job/:jobId → check if customer already reviewed this job
const getReviewByJobId = async (req, res) => {
  try {
    const { jobId } = req.params;
    const customerId = req.user._id;

    // Validate jobId
    if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid job ID format" });
    }

    const review = await Review.findOne({
      job: jobId,
      reviewer: customerId,
    })
      .populate("reviewer", "username")
      .populate("reviewee", "username");

    if (!review) {
      return res.status(404).json({ message: "No review found for this job" });
    }

    return res.status(200).json({ review });
  } catch (err) {
    console.error("getReviewByJobId error:", err);
    return res
      .status(500)
      .json({ error: "Server error while fetching review" });
  }
};

// GET /api/reviews/worker/:workerId → fetch worker reviews (paginated)
const getReviewsForWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Validate workerId
    if (!workerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid worker ID format" });
    }

    const reviews = await Review.find({ reviewee: workerId })
      .populate("reviewer", "username")
      .populate("job", "title")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ reviewee: workerId });

    return res.status(200).json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (err) {
    console.error("getReviewsForWorker error:", err);
    return res
      .status(500)
      .json({ error: "Server error while fetching reviews" });
  }
};

module.exports = {
  createReview,
  getReviewByJobId,
  getReviewsForWorker,
};

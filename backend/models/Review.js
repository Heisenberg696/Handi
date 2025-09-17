// backend/models/Review.js
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true, // each job can only have one review from the customer
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // the customer
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // the worker being reviewed
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Ensure that a reviewer cannot leave multiple reviews for the same job
reviewSchema.index({ job: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);

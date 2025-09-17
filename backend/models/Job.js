// backend/models/Job.js
const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    images: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "completed", "cancelled"],
      default: "pending",
    },
    rate: { type: Number }, // optional: could default from worker's profile
    completedAt: { type: Date }, // Add completion timestamp
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);

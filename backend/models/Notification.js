// backend/models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "job_posted",
        "job_accepted",
        "job_declined",
        "job_completed",
        "job_cancelled",
      ],
      required: true,
    },
    message: { type: String, required: true },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

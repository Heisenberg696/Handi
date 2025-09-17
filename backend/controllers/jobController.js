// backend/controllers/jobController.js
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Create a new job
const createJob = async (req, res) => {
  try {
    const { workerId, title, description, rate } = req.body;
    const customerId = req.user._id; // from requireAuth middleware

    // Validate required fields
    if (!workerId || !title || !description) {
      return res.status(400).json({
        error: "Worker ID, title, and description are required",
      });
    }

    // Check if worker exists
    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Create the job
    const jobData = {
      customer: customerId,
      worker: workerId,
      title,
      description,
      status: "pending",
    };

    if (rate) jobData.rate = rate;

    const job = await Job.create(jobData);

    // Populate the job with user details
    const populatedJob = await Job.findById(job._id)
      .populate("customer", "username email")
      .populate("worker", "username email");

    // Create notification for the worker
    const customerUser = await User.findById(customerId).select("username");
    const customerName = customerUser ? customerUser.username : "A customer";

    const message = `${customerName} has assigned you a new job: ${title}`;

    const notification = await Notification.create({
      recipient: workerId,
      sender: customerId,
      type: "job_posted",
      message,
      jobId: job._id,
    });

    // Send real-time notification
    const sendNotification = req.app.get("sendNotification");
    if (typeof sendNotification === "function") {
      sendNotification(workerId.toString(), notification);
    }

    res.status(201).json({ job: populatedJob, notification });
  } catch (error) {
    console.error("createJob error:", error);
    res.status(500).json({ error: "Server error while creating job" });
  }
};

// Get jobs assigned to the current user (worker)
const getAssignedJobs = async (req, res) => {
  try {
    const workerId = req.user._id;
    const { status } = req.query; // optional filter

    // Validate workerId exists
    if (!workerId) {
      return res.status(400).json({ error: "Worker ID is required" });
    }

    // Build filter object
    const filter = { worker: workerId };
    if (status) {
      // Validate status if provided
      const validStatuses = ["pending", "accepted", "completed", "declined"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      filter.status = status;
    }

    const jobs = await Job.find(filter)
      .populate("customer", "username email")
      .populate("worker", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      jobs,
      count: jobs.length,
      filter: status ? { status } : "all",
    });
  } catch (error) {
    console.error("getAssignedJobs error:", error);
    res
      .status(500)
      .json({ error: "Server error while fetching assigned jobs" });
  }
};

// Get jobs created by the current user (customer)
const getCreatedJobs = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { status } = req.query; // optional filter

    // Validate customerId exists
    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    // Build filter object
    const filter = { customer: customerId };
    if (status) {
      // Validate status if provided
      const validStatuses = ["pending", "accepted", "completed", "declined"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      filter.status = status;
    }

    const jobs = await Job.find(filter)
      .populate("customer", "username email")
      .populate("worker", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      jobs,
      count: jobs.length,
      filter: status ? { status } : "all",
    });
  } catch (error) {
    console.error("getCreatedJobs error:", error);
    res.status(500).json({ error: "Server error while fetching created jobs" });
  }
};

// Worker accepts a job
const acceptJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const workerId = req.user._id;

    // Find job
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only the assigned worker can accept
    if (job.worker.toString() !== workerId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to accept this job" });
    }

    // Only pending jobs can be accepted
    if (job.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending jobs can be accepted" });
    }

    // Update status
    job.status = "accepted";
    await job.save();

    // Build notification message
    const workerUser = await User.findById(workerId).select("username");
    const workerName = workerUser ? workerUser.username : "A worker";
    const message = `${workerName} has accepted your job request: ${job.title}`;

    // Create notification for the customer
    const notification = await Notification.create({
      recipient: job.customer,
      sender: workerId,
      type: "job_accepted",
      message,
      jobId: job._id,
    });

    // Send real-time notification
    const sendNotification = req.app.get("sendNotification");
    if (typeof sendNotification === "function") {
      sendNotification(job.customer.toString(), notification);
    }

    // Return updated job
    const updatedJob = await Job.findById(job._id)
      .populate("customer", "username email")
      .populate("worker", "username email");

    return res.status(200).json({ job: updatedJob, notification });
  } catch (err) {
    console.error("acceptJob error:", err);
    return res.status(500).json({ error: "Server error while accepting job" });
  }
};

// Worker declines a job
const declineJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const workerId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    if (job.worker.toString() !== workerId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to decline this job" });
    }

    if (job.status !== "pending") {
      return res
        .status(400)
        .json({ error: "Only pending jobs can be declined" });
    }

    job.status = "declined";
    await job.save();

    // Build message
    const workerUser = await User.findById(workerId).select("username");
    const workerName = workerUser ? workerUser.username : "A worker";
    const message = `${workerName} has declined your job request: ${job.title}`;

    const notification = await Notification.create({
      recipient: job.customer,
      sender: workerId,
      type: "job_declined",
      message,
      jobId: job._id,
    });

    const sendNotification = req.app.get("sendNotification");
    if (typeof sendNotification === "function") {
      sendNotification(job.customer.toString(), notification);
    }

    const updatedJob = await Job.findById(job._id)
      .populate("customer", "username email")
      .populate("worker", "username email");

    return res.status(200).json({ job: updatedJob, notification });
  } catch (err) {
    console.error("declineJob error:", err);
    return res.status(500).json({ error: "Server error while declining job" });
  }
};

// Get single job by ID
const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    const job = await Job.findById(jobId)
      .populate("customer", "username email")
      .populate("worker", "username email");

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Only allow access to customers and workers involved in the job
    if (
      job.customer._id.toString() !== userId.toString() &&
      job.worker._id.toString() !== userId.toString()
    ) {
      return res.status(403).json({ error: "Not authorized to view this job" });
    }

    res.status(200).json({ job });
  } catch (error) {
    console.error("getJobById error:", error);
    res.status(500).json({ error: "Server error while fetching job" });
  }
};

// Worker marks a job as completed
const completeJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const workerId = req.user._id;

    // Find job
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only assigned worker can mark as completed
    if (job.worker.toString() !== workerId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to complete this job" });
    }

    // Only accepted jobs can be completed
    if (job.status !== "accepted") {
      return res
        .status(400)
        .json({ error: "Only accepted jobs can be marked as completed" });
    }

    // Update status and completion timestamp
    job.status = "completed";
    job.completedAt = new Date();
    await job.save();

    // Build friendly message
    const workerUser = await User.findById(workerId).select("username");
    const workerName = workerUser ? workerUser.username : "A worker";
    const message = `${workerName} has marked your job as completed: ${job.title}`;

    // Create notification for the customer
    const notification = await Notification.create({
      recipient: job.customer,
      sender: workerId,
      type: "job_completed",
      message,
      jobId: job._id,
    });

    // Send real-time notification to the customer
    const sendNotification = req.app.get("sendNotification");
    if (typeof sendNotification === "function") {
      sendNotification(job.customer.toString(), notification);
    }

    // Return updated job (populated)
    const updatedJob = await Job.findById(job._id)
      .populate("customer", "username email")
      .populate("worker", "username email");

    return res.status(200).json({ job: updatedJob, notification });
  } catch (err) {
    console.error("completeJob error:", err);
    return res.status(500).json({ error: "Server error while completing job" });
  }
};

module.exports = {
  createJob,
  getAssignedJobs,
  getCreatedJobs,
  acceptJob,
  declineJob,
  getJobById,
  completeJob,
};

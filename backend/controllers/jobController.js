// backend/controllers/jobController.js
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Create a new job
const createJob = async (req, res) => {
  try {
    const { workerId, title, description, rate, images } = req.body;
    const customerId = req.user._id; // from requireAuth middleware

    // Validate required fields
    if (!workerId || !title || !description) {
      return res.status(400).json({
        error: "Worker ID, title, and description are required",
      });
    }

    // Validate workerId format (optional but recommended)
    if (!workerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        error: "Invalid worker ID format",
      });
    }

    // Validate images if provided
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          error: "images must be an array",
        });
      }

      // Validate each image object
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (
          !img ||
          typeof img !== "object" ||
          typeof img.url !== "string" ||
          typeof img.public_id !== "string" ||
          !img.url.trim() ||
          !img.public_id.trim()
        ) {
          return res.status(400).json({
            error: `Invalid image at index ${i}: each image must have 'url' and 'public_id' as non-empty strings`,
          });
        }

        // Optional: Validate that public_id starts with allowed folder
        if (!img.public_id.startsWith("handi/jobs/")) {
          return res.status(400).json({
            error: `Invalid image at index ${i}: public_id must be from handi/jobs folder`,
          });
        }
      }
    }

    // Check if worker exists
    const worker = await User.findById(workerId);
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    // Prevent users from posting jobs to themselves
    if (workerId === customerId.toString()) {
      return res.status(400).json({
        error: "Cannot post a job to yourself",
      });
    }

    // Build job data
    const jobData = {
      customer: customerId,
      worker: workerId,
      title,
      description,
      status: "pending",
    };

    // Add optional fields if provided
    if (rate !== undefined && rate !== null) {
      const parsedRate = Number(rate);
      if (isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({
          error: "Rate must be a valid non-negative number",
        });
      }
      jobData.rate = parsedRate;
    }

    if (images && images.length > 0) {
      jobData.images = images;
    }

    // Create the job
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

// cancel job function
// New cancelJob controller function for backend/controllers/jobController.js

const cancelJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user._id;

    // Find job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check authorization: user must be customer or worker
    const isCustomer = job.customer.toString() === userId.toString();
    const isWorker = job.worker.toString() === userId.toString();

    if (!isCustomer && !isWorker) {
      return res.status(403).json({
        error: "Not authorized to cancel this job",
      });
    }

    // Check if cancellation is allowed based on status and role
    let canCancel = false;

    if (job.status === "pending") {
      // Only customer can cancel pending jobs
      canCancel = isCustomer;
      if (!canCancel) {
        return res.status(400).json({
          error: "Only the customer can cancel a pending job",
        });
      }
    } else if (job.status === "accepted") {
      // Both customer and worker can cancel accepted jobs
      canCancel = true;
    } else if (
      job.status === "completed" ||
      job.status === "declined" ||
      job.status === "cancelled"
    ) {
      // Cannot cancel completed, declined, or already cancelled jobs
      return res.status(400).json({
        error: `Cannot cancel a job with status: ${job.status}`,
      });
    }

    if (!canCancel) {
      return res.status(400).json({
        error: "This job cannot be cancelled",
      });
    }

    // Update status to cancelled
    job.status = "cancelled";
    await job.save();

    // Determine the other party and build notification message
    const cancellingUser = await User.findById(userId).select("username");
    const cancellerName = cancellingUser ? cancellingUser.username : "A user";
    const recipientId = isCustomer ? job.worker : job.customer;
    const roleText = isCustomer ? "customer" : "worker";

    const message = `${cancellerName} (${roleText}) has cancelled the job: ${job.title}`;

    // Create notification for the other party
    const notification = await Notification.create({
      recipient: recipientId,
      sender: userId,
      type: "job_cancelled",
      message,
      jobId: job._id,
    });

    // Send real-time notification
    const sendNotification = req.app.get("sendNotification");
    if (typeof sendNotification === "function") {
      sendNotification(recipientId.toString(), notification);
    }

    // Return updated job
    const updatedJob = await Job.findById(job._id)
      .populate("customer", "username email")
      .populate("worker", "username email");

    return res.status(200).json({ job: updatedJob, notification });
  } catch (err) {
    console.error("cancelJob error:", err);
    return res.status(500).json({ error: "Server error while cancelling job" });
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
  cancelJob,
};

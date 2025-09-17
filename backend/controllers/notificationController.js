// backend/controllers/notificationController.js
const Notification = require("../models/Notification");
const User = require("../models/User");
const Job = require("../models/Job");

/**
 * GET /api/notifications
 * Query params:
 *  - page (default 1)
 *  - limit (default 20)
 *  - read (optional: "true" or "false")
 *  - type (optional)
 *  - search (optional) - searches in message
 *  - sort (optional, default "-createdAt")
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      page = 1,
      limit = 20,
      read,
      type,
      search,
      sort = "-createdAt",
    } = req.query;

    // Build filter
    const filter = { recipient: userId };
    if (read !== undefined) {
      filter.read = String(read).toLowerCase() === "true";
    }
    if (type) {
      filter.type = type;
    }
    if (search) {
      const re = new RegExp(String(search), "i");
      filter.message = re;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Parallelize queries: total for this filter, unreadCount overall for this user, and the page of notifications
    const [total, unreadCount, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false }),
      Notification.find(filter)
        .populate("sender", "username email", null, { strictPopulate: false })
        .populate("jobId", "title status", null, { strictPopulate: false })
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Add lean() for better performance
    ]);

    return res.status(200).json({
      meta: { total, page: pageNum, limit: limitNum, unreadCount },
      data: notifications,
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    return res.status(500).json({
      error: "Server error while fetching notifications",
      details: err.message,
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read (only recipient can do this)
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const id = req.params.id;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid notification ID format" });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ error: "Not authorized to mark this notification" });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    // return updated notification and current unread count
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    return res.status(200).json({ notification, unreadCount });
  } catch (err) {
    console.error("markAsRead error:", err);
    return res.status(500).json({
      error: "Server error while marking notification as read",
      details: err.message,
    });
  }
};

/**
 * PATCH /api/notifications/read
 * Body: { ids: ["id1", "id2", ...] }
 * Bulk mark as read (only notifications belonging to the user will be updated)
 */
const markMultipleAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { ids } = req.body;

    if (!Array.isArray(ids)) {
      return res
        .status(400)
        .json({ error: "ids must be an array of notification ids" });
    }

    if (ids.length === 0) {
      return res.status(400).json({ error: "ids array cannot be empty" });
    }

    // Validate all IDs are valid ObjectIds
    const invalidIds = ids.filter((id) => !id.match(/^[0-9a-fA-F]{24}$/));
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ error: "Some notification IDs have invalid format" });
    }

    // Only update notifications that belong to the current user
    const result = await Notification.updateMany(
      { _id: { $in: ids }, recipient: userId, read: false },
      { $set: { read: true } }
    );

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("markMultipleAsRead error:", err);
    return res.status(500).json({
      error: "Server error while marking notifications as read",
      details: err.message,
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Returns unread count for convenience
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false,
    });
    return res.status(200).json({ unreadCount });
  } catch (err) {
    console.error("getUnreadCount error:", err);
    return res.status(500).json({
      error: "Server error while fetching unread count",
      details: err.message,
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markMultipleAsRead,
  getUnreadCount,
};

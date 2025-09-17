// backend/routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const requireAuth = require("../middlewares/requireAuth");
const {
  getNotifications,
  markAsRead,
  markMultipleAsRead,
  getUnreadCount,
} = require("../controllers/notificationController");

// Protect all notification routes
router.use(requireAuth);

// IMPORTANT: Put specific routes BEFORE parameterized routes
// GET /api/notifications/unread-count -> shorthand for unread count
router.get("/unread-count", getUnreadCount);

// PATCH /api/notifications/read -> bulk mark as read, body { ids: [...] }
router.patch("/read", markMultipleAsRead);

// GET /api/notifications -> fetch notifications (with pagination & filters)
router.get("/", getNotifications);

// PATCH /api/notifications/:id/read -> mark single notification as read
router.patch("/:id/read", markAsRead);

module.exports = router;

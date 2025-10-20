// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const requireAuth = require("./middlewares/requireAuth");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const jobRoutes = require("./routes/jobRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
require("./models/Review");

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allowed origins for CORS
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:4000",
  process.env.FRONTEND_URL, // We'll set this environment variable on Render later
];

// Remove undefined/null values from allowedOrigins
const validOrigins = allowedOrigins.filter((origin) => origin);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: validOrigins.length > 0 ? validOrigins : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Track connected users (userId -> socketId)
let onlineUsers = {};

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));
    const decoded = jwt.verify(token, process.env.SECRET);
    socket.userId = decoded._id;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

// Socket.io connection handler
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.userId}`);
  onlineUsers[socket.userId] = socket.id;

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.userId}`);
    delete onlineUsers[socket.userId];
  });
});

// Helper to emit notifications
const sendNotification = (userId, notification) => {
  const socketId = onlineUsers[userId];
  if (socketId) {
    io.to(socketId).emit("notification", notification);
  }
};

app.set("io", io);
app.set("sendNotification", sendNotification);

// CORS Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (validOrigins.length === 0) {
        // If no origins configured, allow all (temporary for initial deployment)
        return callback(null, true);
      }

      if (validOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Routes
app.use("/api/user", userRoutes);
app.use("/api/uploads", requireAuth, uploadRoutes);
app.use(
  "/api/profile",
  (req, res, next) => {
    console.log(`Profile route accessed: ${req.method} ${req.url}`);
    next();
  },
  requireAuth,
  profileRoutes
);
app.use("/api/jobs", jobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check route
app.get("/", (req, res) => {
  res.send("Handi backend running...");
});

// DB connection and server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`Server + Socket.io running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(
        `Allowed origins: ${validOrigins.join(", ") || "ALL (temporary)"}`
      );
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

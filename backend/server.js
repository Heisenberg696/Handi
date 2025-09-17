// backend/server.js
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http"); // add this
const { Server } = require("socket.io"); // add this
const jwt = require("jsonwebtoken"); // for socket auth

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
const server = http.createServer(app); // wrap express with http
const io = new Server(server, {
  cors: {
    origin: "*", // adjust in production
    methods: ["GET", "POST"],
  },
});

// Track connected users (userId -> socketId)
let onlineUsers = {};

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

// Middleware
app.use(cors());
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
app.use("./api/reviews");

app.get("/", (req, res) => {
  res.send("Handi backend running...");
});

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(process.env.PORT, () => {
      console.log(`Server + Socket.io running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.error(error);
  });

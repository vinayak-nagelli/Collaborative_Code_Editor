import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import projectRoutes from "./routes/project.routes.js";
import fileRoutes from "./routes/file.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { initSocket } from "./socket/socket.js";
import { flushAllDocs } from "./collaboration/ydocManager.js";

const app = express();
const httpServer = http.createServer(app);

// --- Security & parsing middleware ---
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(mongoSanitize());

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, status: "ok", time: new Date().toISOString() });
});

// --- Admin status: proves data is stored in MongoDB + shows live socket presence ---
app.get("/api/admin/status", async (_req, res) => {
  try {
    const mongoose = await import("mongoose");
    const db = mongoose.default.connection;

    // Dynamic imports to avoid circular deps at top-level
    const { default: User } = await import("./models/User.js");
    const { default: Project } = await import("./models/Project.js");
    const { default: CollaborationSession } = await import("./models/CollaborationSession.js");
    const { roomPresence } = await import("./socket/socket.js");

    const [userCount, projectCount, sessionCount] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      CollaborationSession.countDocuments(),
    ]);

    // Summarize in-memory presence
    const presenceSummary = [];
    for (const [room, participants] of roomPresence.entries()) {
      presenceSummary.push({
        room,
        liveUsers: [...participants.values()].map((u) => ({
          name: u.name,
          activeFile: u.activeFileName || u.activeFileId || null,
        })),
      });
    }

    res.status(200).json({
      success: true,
      dbStatus: db.readyState === 1 ? "connected" : "disconnected",
      mongodb: {
        totalUsers: userCount,
        totalProjects: projectCount,
        totalCollaborationSessions: sessionCount,
      },
      livePresence: presenceSummary,
      activeRooms: presenceSummary.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/files", fileRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

// --- Socket.IO ---
const io = initSocket(httpServer);
app.set("io", io);

const PORT = process.env.PORT || 8000;

async function start() {
  httpServer.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  const tryConnect = async () => {
    try {
      await connectDB();
      console.log(`[server] MongoDB connected successfully.`);
    } catch (err) {
      console.warn(`[mongo] Connection waiting/retrying: ${err.message}`);
      console.warn(`[mongo] TIP: If using MongoDB Atlas, ensure your current IP or 0.0.0.0/0 is added under Network Access at https://cloud.mongodb.com`);
      setTimeout(tryConnect, 10000);
    }
  };

  tryConnect();
}

start();


// --- Graceful shutdown: flush pending autosaves before exiting ---
const shutdown = async (signal) => {
  console.log(`[server] received ${signal}, shutting down gracefully...`);
  await flushAllDocs();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

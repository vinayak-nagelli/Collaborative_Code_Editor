import { Server } from "socket.io";
import { verifyToken } from "../utils/token.js";
import User from "../models/User.js";
import cookie from "cookie";
import registerRoomHandlers from "./room.socket.js";
import registerCollaborationHandlers from "./collaboration.socket.js";
import registerPresenceHandlers from "./presence.socket.js";
import registerTerminalHandlers from "./terminal.socket.js";
import registerTeamCollabHandlers from "./team.socket.js";


// In-memory registry: projectId -> Map(socketId -> { userId, name, color, avatar })
// This is intentionally NOT persisted to Mongo for cursor/selection state —
// only membership snapshots go through CollaborationSession for crash recovery.
export const roomPresence = new Map();

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // --- Authenticate every socket connection before allowing any events ---
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) return next(new Error("Unauthorized: no session cookie"));

      const parsed = cookie.parse(cookieHeader);
      const cookieName = process.env.COOKIE_NAME || "ce_token";
      const token = parsed[cookieName];
      if (!token) return next(new Error("Unauthorized: missing token"));

      const payload = verifyToken(token);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error("Unauthorized: user not found"));

      socket.user = {
        id: user._id.toString(),
        name: user.name,
        avatar: user.avatar,
        color: user.color,
      };
      next();
    } catch (err) {
      next(new Error("Unauthorized: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.user.name} (${socket.id})`);

    registerRoomHandlers(io, socket, roomPresence);
    registerCollaborationHandlers(io, socket);
    registerPresenceHandlers(io, socket, roomPresence);
    registerTerminalHandlers(io, socket);
    registerTeamCollabHandlers(io, socket);


    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.user.name} (${reason})`);
    });
  });

  return io;
}

export default initSocket;

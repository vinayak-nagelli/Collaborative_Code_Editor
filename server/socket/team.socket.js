import Project from "../models/Project.js";

const roomName = (projectId) => `project:${projectId}`;

// projectChatHistory: projectId -> Array<{ id, user, text, fileMention, codeSnippet, timestamp }>
const projectChatHistory = new Map();

// projectCallPresence: projectId -> Map(socketId -> { socketId, userId, name, avatar, color, isMuted, isVideoOff, isScreenSharing, joinedAt })
const projectCallPresence = new Map();

export default function registerTeamCollabHandlers(io, socket) {
  // --- 1. Team Group Chatting ---

  socket.on("chat:join", async ({ projectId }, ack) => {
    try {
      if (!projectId) return ack?.({ ok: false, error: "Missing projectId" });
      const history = projectChatHistory.get(projectId) || [];
      ack?.({ ok: true, history });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("chat:send", async ({ projectId, text, fileMention, codeSnippet }, ack) => {
    try {
      if (!projectId || (!text && !codeSnippet)) {
        return ack?.({ ok: false, error: "Message cannot be empty" });
      }

      const room = roomName(projectId);
      const message = {
        id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        projectId,
        user: {
          id: socket.user.id,
          name: socket.user.name,
          avatar: socket.user.avatar,
          color: socket.user.color,
        },
        text: text ? String(text).trim() : "",
        fileMention: fileMention || null,
        codeSnippet: codeSnippet || null,
        timestamp: new Date().toISOString(),
      };

      const history = projectChatHistory.get(projectId) || [];
      history.push(message);
      if (history.length > 100) history.shift();
      projectChatHistory.set(projectId, history);

      // Broadcast to all participants in this project room
      io.to(room).emit("chat:message", message);
      ack?.({ ok: true, message });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // --- 2. Voice & Video Calling ---

  socket.on("call:join", async ({ projectId, isMuted = false, isVideoOff = true, isScreenSharing = false }, ack) => {
    try {
      if (!projectId) return ack?.({ ok: false, error: "Missing projectId" });

      const room = roomName(projectId);
      const existing = projectCallPresence.get(projectId) || new Map();

      const participant = {
        socketId: socket.id,
        userId: socket.user.id,
        name: socket.user.name,
        avatar: socket.user.avatar,
        color: socket.user.color,
        isMuted: Boolean(isMuted),
        isVideoOff: Boolean(isVideoOff),
        isScreenSharing: Boolean(isScreenSharing),
        joinedAt: new Date().toISOString(),
      };

      existing.set(socket.id, participant);
      projectCallPresence.set(projectId, existing);
      socket.data.activeCallProjectId = projectId;

      const participants = Array.from(existing.values());

      // Broadcast new call state to all workspace members
      io.to(room).emit("call:state", { projectId, participants });
      ack?.({ ok: true, participants });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("call:toggle-media", async ({ projectId, isMuted, isVideoOff, isScreenSharing }) => {
    const existing = projectCallPresence.get(projectId);
    if (!existing || !existing.has(socket.id)) return;

    const p = existing.get(socket.id);
    if (typeof isMuted === "boolean") p.isMuted = isMuted;
    if (typeof isVideoOff === "boolean") p.isVideoOff = isVideoOff;
    if (typeof isScreenSharing === "boolean") p.isScreenSharing = isScreenSharing;

    existing.set(socket.id, p);
    const participants = Array.from(existing.values());
    io.to(roomName(projectId)).emit("call:state", { projectId, participants });
  });

  socket.on("call:leave", async ({ projectId }, ack) => {
    handleCallLeave(io, socket, projectId);
    ack?.({ ok: true });
  });

  // WebRTC Signal Relay for peer-to-peer audio/video streaming
  socket.on("call:signal", ({ targetSocketId, signal, projectId }) => {
    if (!targetSocketId || !signal) return;
    io.to(targetSocketId).emit("call:signal", {
      fromSocketId: socket.id,
      fromUser: socket.user,
      signal,
      projectId,
    });
  });

  socket.on("disconnect", () => {
    const projectId = socket.data.activeCallProjectId;
    if (projectId) {
      handleCallLeave(io, socket, projectId);
    }
  });
}

function handleCallLeave(io, socket, projectId) {
  const existing = projectCallPresence.get(projectId);
  if (!existing) return;

  existing.delete(socket.id);
  if (existing.size === 0) {
    projectCallPresence.delete(projectId);
  }

  delete socket.data.activeCallProjectId;
  const participants = Array.from(existing.values());
  io.to(roomName(projectId)).emit("call:state", { projectId, participants });
}

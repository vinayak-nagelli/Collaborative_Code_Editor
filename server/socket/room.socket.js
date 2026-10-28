import Project from "../models/Project.js";
import CollaborationSession from "../models/CollaborationSession.js";

const roomName = (projectId) => `project:${projectId}`;

export default function registerRoomHandlers(io, socket, roomPresence) {
  // Client emits: join-room { projectId }
  socket.on("join-room", async ({ projectId }, ack) => {
    try {
      const project = await Project.findById(projectId);
      if (!project) return ack?.({ ok: false, error: "Project not found" });
      if (!project.isMember(socket.user.id)) {
        return ack?.({ ok: false, error: "You are not a member of this project" });
      }

      const room = roomName(projectId);
      const existing = roomPresence.get(room) || new Map();

      // Enforce the 4-collaborator cap at the socket layer too (defense in depth —
      // REST join already checks this, but a socket could reconnect independently).
      const alreadyIn = [...existing.values()].some((u) => u.userId === socket.user.id);
      if (!alreadyIn && existing.size >= (project.maxMembers || 4)) {
        return ack?.({
          ok: false,
          error: `This workspace is full. Maximum collaborators: ${project.maxMembers || 4}`,
        });
      }

      socket.join(room);
      socket.data.projectId = projectId;

      existing.set(socket.id, {
        userId: socket.user.id,
        name: socket.user.name,
        color: socket.user.color,
        avatar: socket.user.avatar,
        activeFileId: null,
        cursor: null,
      });
      roomPresence.set(room, existing);

      await CollaborationSession.findOneAndUpdate(
        { projectId },
        {
          $addToSet: {
            activeUsers: { user: socket.user.id, socketId: socket.id, connectedAt: new Date() },
          },
        },
        { upsert: true }
      );

      const participants = [...existing.values()];

      // Tell everyone else in the room a new user joined
      socket.to(room).emit("user-joined", {
        userId: socket.user.id,
        name: socket.user.name,
        color: socket.user.color,
        avatar: socket.user.avatar,
      });

      // Send the joining client the current roster
      ack?.({ ok: true, participants });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("leave-room", async ({ projectId }) => {
    await leaveRoom(io, socket, roomPresence, projectId);
  });

  socket.on("disconnect", async () => {
    const projectId = socket.data.projectId;
    if (projectId) {
      await leaveRoom(io, socket, roomPresence, projectId);
    }
  });
}

async function leaveRoom(io, socket, roomPresence, projectId) {
  const room = roomName(projectId);
  const existing = roomPresence.get(room);

  if (existing) {
    existing.delete(socket.id);
    if (existing.size === 0) roomPresence.delete(room);
  }

  socket.leave(room);

  await CollaborationSession.findOneAndUpdate(
    { projectId },
    { $pull: { activeUsers: { socketId: socket.id } } }
  );

  socket.to(room).emit("user-left", {
    userId: socket.user.id,
    name: socket.user.name,
  });
}

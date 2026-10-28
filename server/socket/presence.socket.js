const roomName = (projectId) => `project:${projectId}`;

// All events here are ephemeral — never written to MongoDB. Cursor position,
// selection ranges, and "which file am I looking at" are ordinary in-memory
// socket state relayed to the other members of the room.
export default function registerPresenceHandlers(io, socket, roomPresence) {
  socket.on("cursor-change", ({ projectId, fileId, position }) => {
    const room = roomName(projectId);
    const participants = roomPresence.get(room);
    const me = participants?.get(socket.id);
    if (!me) return;

    me.cursor = { fileId, position };

    socket.to(room).emit("cursor-change", {
      userId: socket.user.id,
      name: socket.user.name,
      color: socket.user.color,
      fileId,
      position,
    });
  });

  socket.on("selection-change", ({ projectId, fileId, ranges }) => {
    const room = roomName(projectId);
    socket.to(room).emit("selection-change", {
      userId: socket.user.id,
      name: socket.user.name,
      color: socket.user.color,
      fileId,
      ranges,
    });
  });

  socket.on("file-opened", ({ projectId, fileId, fileName }) => {
    const room = roomName(projectId);
    const participants = roomPresence.get(room);
    const me = participants?.get(socket.id);
    if (me) {
      me.activeFileId = fileId;
      me.activeFileName = fileName || fileId;
    }

    socket.to(room).emit("presence-update", {
      userId: socket.user.id,
      name: socket.user.name,
      activeFileId: fileId,
      activeFileName: fileName || fileId,
    });
  });

  socket.on("file-closed", ({ projectId, fileId }) => {
    const room = roomName(projectId);
    const participants = roomPresence.get(room);
    const me = participants?.get(socket.id);
    if (me && me.activeFileId === fileId) me.activeFileId = null;

    socket.to(room).emit("presence-update", {
      userId: socket.user.id,
      name: socket.user.name,
      activeFileId: null,
    });
  });
}

import mongoose from "mongoose";

// Tracks which users are currently connected to a project room.
// This is intentionally lightweight — live cursor positions are NEVER
// persisted here, they are ephemeral in-memory socket state only.
const collaborationSessionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      unique: true,
      index: true,
    },
    activeUsers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        socketId: String,
        connectedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("CollaborationSession", collaborationSessionSchema);

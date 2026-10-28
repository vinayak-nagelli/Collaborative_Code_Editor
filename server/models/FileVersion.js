import mongoose from "mongoose";

// Snapshots are written on debounced autosave, not on every keystroke.
// This backs the "Version History" panel (Phase 16).
const fileVersionSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    content: { type: String, required: true },
    path: { type: String, default: "" }, // snapshot of the file's path at commit time, survives deletion
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    message: { type: String, default: "" }, // set when saved via an explicit "Commit", blank for autosave snapshots
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

fileVersionSchema.index({ fileId: 1, createdAt: -1 });

export default mongoose.model("FileVersion", fileVersionSchema);

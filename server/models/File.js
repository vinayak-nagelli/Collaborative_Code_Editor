import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    parentId: {
      // null = lives at project root
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    type: { type: String, enum: ["file", "folder"], required: true },
    path: { type: String, required: true }, // materialized full path, e.g. "src/components/App.jsx"
    content: { type: String, default: "" }, // unused for folders
    language: { type: String, default: "plaintext" },

    // Incrementing revision, used for optimistic sync / version history pointers
    version: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

fileSchema.index({ projectId: 1, parentId: 1 });
fileSchema.index({ projectId: 1, path: 1 }, { unique: true });

export default mongoose.model("File", fileSchema);

import mongoose from "mongoose";

const criterionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const requirementSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
    type: {
      type: String,
      enum: ["feature", "bugfix", "improvement", "technical"],
      default: "feature",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "active", "implemented", "verified", "closed"],
      default: "draft",
    },
    acceptanceCriteria: {
      type: [criterionSchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    targetRelease: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

requirementSchema.index({ projectId: 1, status: 1 });
requirementSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model("Requirement", requirementSchema);

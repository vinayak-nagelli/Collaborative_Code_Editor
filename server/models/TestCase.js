import mongoose from "mongoose";

const testStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    action: { type: String, required: true, trim: true },
    expectedResult: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const testCaseSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Requirement",
      default: null,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
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
    preconditions: {
      type: String,
      trim: true,
      default: "",
    },
    steps: {
      type: [testStepSchema],
      default: [],
    },
    type: {
      type: String,
      enum: ["manual", "unit", "integration", "e2e", "security"],
      default: "manual",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["draft", "ready", "passed", "failed", "blocked"],
      default: "draft",
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastRunNotes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

testCaseSchema.index({ projectId: 1, status: 1 });
testCaseSchema.index({ projectId: 1, requirementId: 1 });

export default mongoose.model("TestCase", testCaseSchema);

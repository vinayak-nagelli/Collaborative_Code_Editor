import Task from "../models/Task.js";
import Requirement from "../models/Requirement.js";
import File from "../models/File.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper to broadcast socket events to the project room
function emitProjectEvent(req, event, data) {
  const io = req.app.get("io");
  if (io && req.project?._id) {
    io.to(`project:${req.project._id.toString()}`).emit(event, data);
  }
}

// GET /api/projects/:projectId/tasks
export const listTasks = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const { status, requirementId, assignee, priority } = req.query;

  const filter = { projectId };
  if (status) filter.status = status;
  if (requirementId) filter.requirementId = requirementId;
  if (assignee) filter.assignee = assignee;
  if (priority) filter.priority = priority;

  const tasks = await Task.find(filter)
    .sort({ createdAt: -1 })
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status")
    .populate("linkedFiles.fileId", "name path type language")
    .lean();

  res.status(200).json({ success: true, tasks });
});

// GET /api/projects/:projectId/tasks/:taskId
export const getTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  })
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status acceptanceCriteria")
    .populate("linkedFiles.fileId", "name path type language");

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  res.status(200).json({ success: true, task });
});

// POST /api/projects/:projectId/tasks
export const createTask = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    status = "todo",
    priority = "medium",
    requirementId = null,
    assignee = null,
    blockerReason = "",
    dueDate = null,
    linkedFiles = [],
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Task title is required");
  }

  // If requirementId is provided, verify it belongs to this project
  if (requirementId) {
    const reqExists = await Requirement.findOne({
      _id: requirementId,
      projectId: req.project._id,
    });
    if (!reqExists) {
      throw new ApiError(400, "Invalid requirement ID for this project");
    }
  }

  const task = await Task.create({
    projectId: req.project._id,
    requirementId: requirementId || null,
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    assignee: assignee || null,
    blockerReason: blockerReason.trim(),
    dueDate: dueDate ? new Date(dueDate) : null,
    linkedFiles: Array.isArray(linkedFiles) ? linkedFiles : [],
    createdBy: req.user._id,
  });

  const populated = await Task.findById(task._id)
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status")
    .populate("linkedFiles.fileId", "name path type language");

  emitProjectEvent(req, "task:created", populated);

  res.status(201).json({ success: true, task: populated });
});

// PUT /api/projects/:projectId/tasks/:taskId
export const updateTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  const {
    title,
    description,
    status,
    priority,
    requirementId,
    assignee,
    blockerReason,
    dueDate,
    linkedFiles,
  } = req.body;

  if (title !== undefined) task.title = title.trim();
  if (description !== undefined) task.description = description.trim();
  if (status !== undefined) {
    task.status = status;
    // Clear blocker reason if unblocking
    if (status !== "blocked" && blockerReason === undefined) {
      task.blockerReason = "";
    }
  }
  if (priority !== undefined) task.priority = priority;
  if (requirementId !== undefined) task.requirementId = requirementId || null;
  if (assignee !== undefined) task.assignee = assignee || null;
  if (blockerReason !== undefined) task.blockerReason = blockerReason.trim();
  if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
  if (linkedFiles !== undefined && Array.isArray(linkedFiles)) task.linkedFiles = linkedFiles;

  await task.save();

  const populated = await Task.findById(task._id)
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status")
    .populate("linkedFiles.fileId", "name path type language");

  emitProjectEvent(req, "task:updated", populated);

  res.status(200).json({ success: true, task: populated });
});

// POST /api/projects/:projectId/tasks/:taskId/link-file
export const linkFileToTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { fileId, filePath } = req.body;

  if (!fileId || !filePath) {
    throw new ApiError(400, "fileId and filePath are required");
  }

  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  // Prevent duplicate links
  const alreadyLinked = task.linkedFiles.some((f) => f.fileId?.toString() === fileId.toString());
  if (!alreadyLinked) {
    task.linkedFiles.push({ fileId, filePath });
    await task.save();
  }

  const populated = await Task.findById(task._id)
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status")
    .populate("linkedFiles.fileId", "name path type language");

  emitProjectEvent(req, "task:updated", populated);

  res.status(200).json({ success: true, task: populated });
});

// DELETE /api/projects/:projectId/tasks/:taskId/unlink-file/:fileId
export const unlinkFileFromTask = asyncHandler(async (req, res) => {
  const { taskId, fileId } = req.params;

  const task = await Task.findOne({
    _id: taskId,
    projectId: req.project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  task.linkedFiles = task.linkedFiles.filter((f) => f.fileId?.toString() !== fileId.toString());
  await task.save();

  const populated = await Task.findById(task._id)
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .populate("requirementId", "title type priority status")
    .populate("linkedFiles.fileId", "name path type language");

  emitProjectEvent(req, "task:updated", populated);

  res.status(200).json({ success: true, task: populated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
export const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const task = await Task.findOneAndDelete({
    _id: taskId,
    projectId: req.project._id,
  });

  if (!task) {
    throw new ApiError(404, "Task not found");
  }

  emitProjectEvent(req, "task:deleted", { _id: taskId });

  res.status(200).json({ success: true, message: "Task deleted" });
});

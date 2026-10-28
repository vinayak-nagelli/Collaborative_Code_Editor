import { nanoid } from "nanoid";
import Requirement from "../models/Requirement.js";
import Task from "../models/Task.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Helper to broadcast socket events to the project room
function emitProjectEvent(req, event, data) {
  const io = req.app.get("io");
  if (io && req.project?._id) {
    io.to(`project:${req.project._id.toString()}`).emit(event, data);
  }
}

// GET /api/projects/:projectId/requirements
export const listRequirements = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const { status, type, priority } = req.query;

  const filter = { projectId };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (priority) filter.priority = priority;

  const requirements = await Requirement.find(filter)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name email avatar color")
    .populate("assignedTo", "name email avatar color")
    .lean();

  // Attach linked task counts per requirement for quick progress visualization
  const reqIds = requirements.map((r) => r._id);
  const tasks = await Task.find({ requirementId: { $in: reqIds } }, "requirementId status").lean();

  const taskStatsByReq = {};
  for (const t of tasks) {
    const rId = t.requirementId.toString();
    if (!taskStatsByReq[rId]) {
      taskStatsByReq[rId] = { total: 0, done: 0, in_progress: 0, blocked: 0, todo: 0 };
    }
    taskStatsByReq[rId].total += 1;
    taskStatsByReq[rId][t.status] = (taskStatsByReq[rId][t.status] || 0) + 1;
  }

  const enriched = requirements.map((r) => ({
    ...r,
    taskStats: taskStatsByReq[r._id.toString()] || { total: 0, done: 0, in_progress: 0, blocked: 0, todo: 0 },
  }));

  res.status(200).json({ success: true, requirements: enriched });
});

// GET /api/projects/:projectId/requirements/:reqId
export const getRequirement = asyncHandler(async (req, res) => {
  const { reqId } = req.params;
  const requirement = await Requirement.findOne({
    _id: reqId,
    projectId: req.project._id,
  })
    .populate("createdBy", "name email avatar color")
    .populate("assignedTo", "name email avatar color");

  if (!requirement) {
    throw new ApiError(404, "Requirement not found");
  }

  const linkedTasks = await Task.find({ requirementId: reqId })
    .populate("assignee", "name email avatar color")
    .populate("createdBy", "name email avatar color")
    .lean();

  res.status(200).json({
    success: true,
    requirement,
    linkedTasks,
  });
});

// POST /api/projects/:projectId/requirements
export const createRequirement = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    type = "feature",
    priority = "medium",
    status = "draft",
    acceptanceCriteria = [],
    tags = [],
    targetRelease = "",
    assignedTo = null,
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Requirement title is required");
  }

  const criteriaWithIds = (acceptanceCriteria || []).map((c) => ({
    id: c.id || nanoid(6),
    text: typeof c === "string" ? c.trim() : c.text?.trim() || "",
    completed: Boolean(c.completed),
  })).filter((c) => c.text.length > 0);

  const requirement = await Requirement.create({
    projectId: req.project._id,
    title: title.trim(),
    description: description.trim(),
    type,
    priority,
    status,
    acceptanceCriteria: criteriaWithIds,
    tags: Array.isArray(tags) ? tags : [],
    targetRelease: targetRelease.trim(),
    assignedTo: assignedTo || null,
    createdBy: req.user._id,
  });

  const populated = await Requirement.findById(requirement._id)
    .populate("createdBy", "name email avatar color")
    .populate("assignedTo", "name email avatar color");

  emitProjectEvent(req, "requirement:created", populated);

  res.status(201).json({ success: true, requirement: populated });
});

// PUT /api/projects/:projectId/requirements/:reqId
export const updateRequirement = asyncHandler(async (req, res) => {
  const { reqId } = req.params;
  const requirement = await Requirement.findOne({
    _id: reqId,
    projectId: req.project._id,
  });

  if (!requirement) {
    throw new ApiError(404, "Requirement not found");
  }

  const {
    title,
    description,
    type,
    priority,
    status,
    acceptanceCriteria,
    tags,
    targetRelease,
    assignedTo,
  } = req.body;

  if (title !== undefined) requirement.title = title.trim();
  if (description !== undefined) requirement.description = description.trim();
  if (type !== undefined) requirement.type = type;
  if (priority !== undefined) requirement.priority = priority;
  if (status !== undefined) requirement.status = status;
  if (tags !== undefined) requirement.tags = tags;
  if (targetRelease !== undefined) requirement.targetRelease = targetRelease.trim();
  if (assignedTo !== undefined) requirement.assignedTo = assignedTo || null;

  if (acceptanceCriteria !== undefined) {
    requirement.acceptanceCriteria = acceptanceCriteria.map((c) => ({
      id: c.id || nanoid(6),
      text: typeof c === "string" ? c.trim() : c.text?.trim() || "",
      completed: Boolean(c.completed),
    })).filter((c) => c.text.length > 0);
  }

  await requirement.save();

  const populated = await Requirement.findById(requirement._id)
    .populate("createdBy", "name email avatar color")
    .populate("assignedTo", "name email avatar color");

  emitProjectEvent(req, "requirement:updated", populated);

  res.status(200).json({ success: true, requirement: populated });
});

// PATCH /api/projects/:projectId/requirements/:reqId/criteria/:criterionId/toggle
export const toggleCriterion = asyncHandler(async (req, res) => {
  const { reqId, criterionId } = req.params;
  const requirement = await Requirement.findOne({
    _id: reqId,
    projectId: req.project._id,
  });

  if (!requirement) {
    throw new ApiError(404, "Requirement not found");
  }

  const criterion = requirement.acceptanceCriteria.find((c) => c.id === criterionId);
  if (!criterion) {
    throw new ApiError(404, "Criterion not found");
  }

  criterion.completed = !criterion.completed;

  // If all criteria completed and status was draft/active, auto-suggest or keep
  await requirement.save();

  const populated = await Requirement.findById(requirement._id)
    .populate("createdBy", "name email avatar color")
    .populate("assignedTo", "name email avatar color");

  emitProjectEvent(req, "requirement:updated", populated);

  res.status(200).json({ success: true, requirement: populated });
});

// DELETE /api/projects/:projectId/requirements/:reqId
export const deleteRequirement = asyncHandler(async (req, res) => {
  const { reqId } = req.params;
  const requirement = await Requirement.findOneAndDelete({
    _id: reqId,
    projectId: req.project._id,
  });

  if (!requirement) {
    throw new ApiError(404, "Requirement not found");
  }

  // Unlink tasks referencing this requirement
  await Task.updateMany({ requirementId: reqId }, { $set: { requirementId: null } });

  emitProjectEvent(req, "requirement:deleted", { _id: reqId });

  res.status(200).json({ success: true, message: "Requirement deleted" });
});

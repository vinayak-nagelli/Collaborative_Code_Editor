import TestCase from "../models/TestCase.js";
import Bug from "../models/Bug.js";
import Requirement from "../models/Requirement.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

function emitProjectEvent(req, event, data) {
  const io = req.app.get("io");
  if (io && req.project?._id) {
    io.to(`project:${req.project._id.toString()}`).emit(event, data);
  }
}

// ==================== TEST CASES ====================

// GET /api/projects/:projectId/qa/tests
export const listTestCases = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const { status, type, requirementId } = req.query;

  const filter = { projectId };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (requirementId) filter.requirementId = requirementId;

  const testCases = await TestCase.find(filter)
    .sort({ createdAt: -1 })
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("createdBy", "name email avatar color")
    .lean();

  res.status(200).json({ success: true, testCases });
});

// POST /api/projects/:projectId/qa/tests
export const createTestCase = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    preconditions = "",
    steps = [],
    type = "manual",
    priority = "medium",
    requirementId = null,
    taskId = null,
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Test case title is required");
  }

  const cleanSteps = (steps || []).map((s, idx) => ({
    stepNumber: idx + 1,
    action: typeof s === "string" ? s.trim() : s.action?.trim() || "",
    expectedResult: s.expectedResult?.trim() || "",
  })).filter((s) => s.action.length > 0);

  const testCase = await TestCase.create({
    projectId: req.project._id,
    title: title.trim(),
    description: description.trim(),
    preconditions: preconditions.trim(),
    steps: cleanSteps,
    type,
    priority,
    requirementId: requirementId || null,
    taskId: taskId || null,
    createdBy: req.user._id,
  });

  const populated = await TestCase.findById(testCase._id)
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("createdBy", "name email avatar color");

  emitProjectEvent(req, "qa:test-created", populated);

  res.status(201).json({ success: true, testCase: populated });
});

// PUT /api/projects/:projectId/qa/tests/:testId
export const updateTestCase = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const testCase = await TestCase.findOne({
    _id: testId,
    projectId: req.project._id,
  });

  if (!testCase) {
    throw new ApiError(404, "Test case not found");
  }

  const { title, description, preconditions, steps, type, priority, status, requirementId, taskId } = req.body;

  if (title !== undefined) testCase.title = title.trim();
  if (description !== undefined) testCase.description = description.trim();
  if (preconditions !== undefined) testCase.preconditions = preconditions.trim();
  if (type !== undefined) testCase.type = type;
  if (priority !== undefined) testCase.priority = priority;
  if (status !== undefined) testCase.status = status;
  if (requirementId !== undefined) testCase.requirementId = requirementId || null;
  if (taskId !== undefined) testCase.taskId = taskId || null;

  if (steps !== undefined) {
    testCase.steps = steps.map((s, idx) => ({
      stepNumber: idx + 1,
      action: typeof s === "string" ? s.trim() : s.action?.trim() || "",
      expectedResult: s.expectedResult?.trim() || "",
    })).filter((s) => s.action.length > 0);
  }

  await testCase.save();

  const populated = await TestCase.findById(testCase._id)
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("createdBy", "name email avatar color");

  emitProjectEvent(req, "qa:test-updated", populated);

  res.status(200).json({ success: true, testCase: populated });
});

// PATCH /api/projects/:projectId/qa/tests/:testId/run
export const runTestCase = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const { status, notes = "" } = req.body;

  if (!["passed", "failed", "blocked", "ready"].includes(status)) {
    throw new ApiError(400, "Invalid execution status");
  }

  const testCase = await TestCase.findOne({
    _id: testId,
    projectId: req.project._id,
  });

  if (!testCase) {
    throw new ApiError(404, "Test case not found");
  }

  testCase.status = status;
  testCase.lastRunAt = new Date();
  testCase.lastRunNotes = notes.trim();

  await testCase.save();

  const populated = await TestCase.findById(testCase._id)
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("createdBy", "name email avatar color");

  emitProjectEvent(req, "qa:test-updated", populated);

  res.status(200).json({ success: true, testCase: populated });
});

// DELETE /api/projects/:projectId/qa/tests/:testId
export const deleteTestCase = asyncHandler(async (req, res) => {
  const { testId } = req.params;
  const testCase = await TestCase.findOneAndDelete({
    _id: testId,
    projectId: req.project._id,
  });

  if (!testCase) {
    throw new ApiError(404, "Test case not found");
  }

  emitProjectEvent(req, "qa:test-deleted", { _id: testId });

  res.status(200).json({ success: true, message: "Test case deleted" });
});

// ==================== BUGS ====================

// GET /api/projects/:projectId/qa/bugs
export const listBugs = asyncHandler(async (req, res) => {
  const projectId = req.project._id;
  const { status, severity } = req.query;

  const filter = { projectId };
  if (status) filter.status = status;
  if (severity) filter.severity = severity;

  const bugs = await Bug.find(filter)
    .sort({ createdAt: -1 })
    .populate("testCaseId", "title status")
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("assignedTo", "name email avatar color")
    .populate("reportedBy", "name email avatar color")
    .populate("affectedFiles.fileId", "name path type language")
    .lean();

  res.status(200).json({ success: true, bugs });
});

// POST /api/projects/:projectId/qa/bugs
export const createBug = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    stepsToReproduce = "",
    severity = "medium",
    status = "open",
    testCaseId = null,
    requirementId = null,
    taskId = null,
    assignedTo = null,
    affectedFiles = [],
  } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, "Bug title is required");
  }

  const bug = await Bug.create({
    projectId: req.project._id,
    title: title.trim(),
    description: description.trim(),
    stepsToReproduce: stepsToReproduce.trim(),
    severity,
    status,
    testCaseId: testCaseId || null,
    requirementId: requirementId || null,
    taskId: taskId || null,
    assignedTo: assignedTo || null,
    affectedFiles: Array.isArray(affectedFiles) ? affectedFiles : [],
    reportedBy: req.user._id,
  });

  const populated = await Bug.findById(bug._id)
    .populate("testCaseId", "title status")
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("assignedTo", "name email avatar color")
    .populate("reportedBy", "name email avatar color")
    .populate("affectedFiles.fileId", "name path type language");

  emitProjectEvent(req, "qa:bug-created", populated);

  res.status(201).json({ success: true, bug: populated });
});

// PUT /api/projects/:projectId/qa/bugs/:bugId
export const updateBug = asyncHandler(async (req, res) => {
  const { bugId } = req.params;
  const bug = await Bug.findOne({
    _id: bugId,
    projectId: req.project._id,
  });

  if (!bug) {
    throw new ApiError(404, "Bug not found");
  }

  const { title, description, stepsToReproduce, severity, status, assignedTo, affectedFiles } = req.body;

  if (title !== undefined) bug.title = title.trim();
  if (description !== undefined) bug.description = description.trim();
  if (stepsToReproduce !== undefined) bug.stepsToReproduce = stepsToReproduce.trim();
  if (severity !== undefined) bug.severity = severity;
  if (status !== undefined) bug.status = status;
  if (assignedTo !== undefined) bug.assignedTo = assignedTo || null;
  if (affectedFiles !== undefined && Array.isArray(affectedFiles)) bug.affectedFiles = affectedFiles;

  await bug.save();

  const populated = await Bug.findById(bug._id)
    .populate("testCaseId", "title status")
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("assignedTo", "name email avatar color")
    .populate("reportedBy", "name email avatar color")
    .populate("affectedFiles.fileId", "name path type language");

  emitProjectEvent(req, "qa:bug-updated", populated);

  res.status(200).json({ success: true, bug: populated });
});

// POST /api/projects/:projectId/qa/bugs/:bugId/link-file
export const linkFileToBug = asyncHandler(async (req, res) => {
  const { bugId } = req.params;
  const { fileId, filePath } = req.body;

  if (!fileId || !filePath) {
    throw new ApiError(400, "fileId and filePath are required");
  }

  const bug = await Bug.findOne({
    _id: bugId,
    projectId: req.project._id,
  });

  if (!bug) {
    throw new ApiError(404, "Bug not found");
  }

  const exists = bug.affectedFiles.some((f) => f.fileId?.toString() === fileId.toString());
  if (!exists) {
    bug.affectedFiles.push({ fileId, filePath });
    await bug.save();
  }

  const populated = await Bug.findById(bug._id)
    .populate("testCaseId", "title status")
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("assignedTo", "name email avatar color")
    .populate("reportedBy", "name email avatar color")
    .populate("affectedFiles.fileId", "name path type language");

  emitProjectEvent(req, "qa:bug-updated", populated);

  res.status(200).json({ success: true, bug: populated });
});

// DELETE /api/projects/:projectId/qa/bugs/:bugId/unlink-file/:fileId
export const unlinkFileFromBug = asyncHandler(async (req, res) => {
  const { bugId, fileId } = req.params;

  const bug = await Bug.findOne({
    _id: bugId,
    projectId: req.project._id,
  });

  if (!bug) {
    throw new ApiError(404, "Bug not found");
  }

  bug.affectedFiles = bug.affectedFiles.filter((f) => f.fileId?.toString() !== fileId.toString());
  await bug.save();

  const populated = await Bug.findById(bug._id)
    .populate("testCaseId", "title status")
    .populate("requirementId", "title type priority status")
    .populate("taskId", "title status")
    .populate("assignedTo", "name email avatar color")
    .populate("reportedBy", "name email avatar color")
    .populate("affectedFiles.fileId", "name path type language");

  emitProjectEvent(req, "qa:bug-updated", populated);

  res.status(200).json({ success: true, bug: populated });
});

// DELETE /api/projects/:projectId/qa/bugs/:bugId
export const deleteBug = asyncHandler(async (req, res) => {
  const { bugId } = req.params;
  const bug = await Bug.findOneAndDelete({
    _id: bugId,
    projectId: req.project._id,
  });

  if (!bug) {
    throw new ApiError(404, "Bug not found");
  }

  emitProjectEvent(req, "qa:bug-deleted", { _id: bugId });

  res.status(200).json({ success: true, message: "Bug deleted" });
});

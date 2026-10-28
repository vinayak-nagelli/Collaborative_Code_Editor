import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { requireProjectMember, requireEditPermission } from "../middleware/projectAccess.js";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  linkFileToTask,
  unlinkFileFromTask,
  deleteTask,
} from "../controllers/task.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectMember);

router.get("/", listTasks);
router.post("/", requireEditPermission, createTask);
router.get("/:taskId", getTask);
router.put("/:taskId", requireEditPermission, updateTask);
router.post("/:taskId/link-file", requireEditPermission, linkFileToTask);
router.delete("/:taskId/unlink-file/:fileId", requireEditPermission, unlinkFileFromTask);
router.delete("/:taskId", requireEditPermission, deleteTask);

export default router;

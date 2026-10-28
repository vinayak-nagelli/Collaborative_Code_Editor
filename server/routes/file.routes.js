import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import {
  updateFile,
  deleteFile,
  duplicateFile,
  getFileVersions,
  createFileSnapshot,
} from "../controllers/file.controller.js";

const router = Router();

router.use(requireAuth);

router.put("/:id", updateFile);
router.delete("/:id", deleteFile);
router.post("/:id/duplicate", duplicateFile);
router.get("/:id/versions", getFileVersions);
router.post("/:id/snapshot", createFileSnapshot);

export default router;


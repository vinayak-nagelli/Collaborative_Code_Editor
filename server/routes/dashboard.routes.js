import { Router } from "express";
import requireAuth from "../middleware/auth.js";
import { requireProjectMember } from "../middleware/projectAccess.js";
import { getProjectHealth } from "../controllers/dashboard.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireProjectMember);

router.get("/", getProjectHealth);
router.get("/health", getProjectHealth);

export default router;

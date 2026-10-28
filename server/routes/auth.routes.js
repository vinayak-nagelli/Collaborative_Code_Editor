import { Router } from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import requireAuth from "../middleware/auth.js";
import rateLimit from "express-rate-limit";

const router = Router();

// Slow down credential-stuffing / brute-force attempts on auth endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts, please try again later" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;

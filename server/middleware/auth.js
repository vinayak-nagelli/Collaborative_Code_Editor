import { verifyToken } from "../utils/token.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Populates req.user from the JWT stored in the http-only cookie.
// Never trust a userId sent in the request body/query for authorization.
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const cookieName = process.env.COOKIE_NAME || "ce_token";
  const token = req.cookies?.[cookieName];

  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new ApiError(401, "Session expired or invalid, please log in again");
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = user;
  next();
});

export default requireAuth;

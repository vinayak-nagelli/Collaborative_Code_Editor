import jwt from "jsonwebtoken";

export const signToken = (userId) => {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

export const setAuthCookie = (res, token) => {
  const name = process.env.COOKIE_NAME || "ce_token";
  res.cookie(name, token, cookieOptions());
};

export const clearAuthCookie = (res) => {
  const name = process.env.COOKIE_NAME || "ce_token";
  res.clearCookie(name, { ...cookieOptions(), maxAge: 0 });
};

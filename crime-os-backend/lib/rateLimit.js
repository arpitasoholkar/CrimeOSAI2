import rateLimit from "express-rate-limit";

const make = (windowMin, max, message) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

// Brute-forcing passwords: 10 attempts / 15 min / IP.
export const loginLimiter = make(15, 10, "Too many login attempts. Please try again in a few minutes.");
// Spam signups: 5 accounts / hour / IP.
export const registerLimiter = make(60, 5, "Too many sign-up attempts. Please try again later.");
// Google token endpoint + password changes.
export const sensitiveLimiter = make(15, 20, "Too many requests. Please try again in a few minutes.");

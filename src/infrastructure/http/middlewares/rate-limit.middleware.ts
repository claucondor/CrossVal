import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { ERROR_STATUS } from "../../../application/errors";

export const authRateLimit: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(ERROR_STATUS.RATE_LIMITED).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many auth requests; try again later",
      },
    });
  },
});
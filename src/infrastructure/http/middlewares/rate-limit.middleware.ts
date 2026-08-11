import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { ERROR_STATUS } from "../../../application/errors";
import { env } from "../../../config/env";

export interface RateLimitConfig {
  windowMs: number;
  limit: number;
  message: string;
  disabled?: boolean;
}

export function createRateLimit(config: RateLimitConfig): RateLimitRequestHandler {
  const disabled = config.disabled ?? false;
  return rateLimit({
    windowMs: config.windowMs,
    limit: config.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => disabled,
    handler: (_req, res) => {
      res.status(ERROR_STATUS.RATE_LIMITED).json({
        error: {
          code: "RATE_LIMITED",
          message: config.message,
        },
      });
    },
  });
}

export const authRateLimit: RateLimitRequestHandler = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many auth requests; try again later",
});

// Disabled under NODE_ENV==="test" (SDD §4.4) so the integration suite
// isn't throttled by the general limit. authRateLimit is deliberately NOT
// given this bypass — a pre-existing test (tests/integration/error-catalog)
// asserts it returns a real 429 on the 11th /auth/login request.
export const generalRateLimit: RateLimitRequestHandler = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests; try again later",
  disabled: env.NODE_ENV === "test",
});

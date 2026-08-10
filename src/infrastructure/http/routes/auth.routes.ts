import { Router } from "express";
import { asyncHandler } from "../asyncHandler";
import type { AuthController } from "../controllers/auth.controller";
import { authRateLimit } from "../middlewares/rate-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { LoginSchema, SignupSchema } from "../validators/auth.schema";

export function createAuthRouter(controller: AuthController): Router {
  const router = Router();

  router.post(
    "/signup",
    authRateLimit,
    validate("body", SignupSchema),
    asyncHandler(controller.signup),
  );

  router.post(
    "/login",
    authRateLimit,
    validate("body", LoginSchema),
    asyncHandler(controller.login),
  );

  return router;
}

import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authRateLimit } from "../middlewares/rate-limit.middleware";
import { validate } from "../middlewares/validate.middleware";
import { LoginSchema, SignupSchema } from "../validators/auth.schema";

export const authRouter = Router();

authRouter.post(
  "/signup",
  authRateLimit,
  validate("body", SignupSchema),
  (req, res, next) => {
    try {
      authController.signup(req, res);
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/login",
  authRateLimit,
  validate("body", LoginSchema),
  (req, res, next) => {
    try {
      authController.login(req, res);
    } catch (e) {
      next(e);
    }
  },
);
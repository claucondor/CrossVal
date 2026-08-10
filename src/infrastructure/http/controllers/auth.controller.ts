import type { Request, Response } from "express";
import { ERROR_STATUS } from "../../../application/errors";
import type { AuthService } from "../../../application/auth/auth.service.types";

export interface AuthController {
  signup(req: Request, res: Response): Promise<void>;
  login(req: Request, res: Response): Promise<void>;
}

export function createAuthController(authService: AuthService): AuthController {
  return {
    async signup(req, res): Promise<void> {
      const result = await authService.signup(req.body);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(201).json(result.value);
    },

    async login(req, res): Promise<void> {
      const result = await authService.login(req.body);
      if (result.isErr()) {
        res.status(ERROR_STATUS[result.error.code]).json({ error: result.error });
        return;
      }
      res.status(200).json(result.value);
    },
  };
}

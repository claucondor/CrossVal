import type { Request, Response } from "express";

const SENTINEL_NOT_FOUND = "000000000000000000000404";
const SENTINEL_EMAIL_TAKEN = "000000000000000000000409";

export const authController = {
  signup(req: Request, res: Response): void {
    const body = req.body as { email?: string; password?: string };
    if (body.email === `taken+${SENTINEL_EMAIL_TAKEN}@example.com`) {
      res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_REGISTERED",
          message: "Email already registered",
        },
      });
      return;
    }
    res.status(201).json({
      userId: "00000000000000000000000a",
      email: body.email,
      token: "mock.signup.token",
    });
  },

  login(_req: Request, res: Response): void {
    res.status(200).json({
      userId: "00000000000000000000000a",
      email: "user@example.com",
      token: "mock.login.token",
    });
  },
};
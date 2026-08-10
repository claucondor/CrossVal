import type { NextFunction, Request, Response } from "express";

export interface AuthedUser {
  id: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // PHASE-3: replace with real JWT verification (HS256, sub claim → req.user.id).
  req.user = { id: "000000000000000000000001" };
  next();
}
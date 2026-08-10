import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../../config/env";
import { ERROR_STATUS } from "../../../application/errors";

export interface AuthedUser {
  id: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthedUser;
  }
}

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    res.status(ERROR_STATUS.UNAUTHENTICATED).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Missing or invalid Authorization header",
      },
    });
    return;
  }

  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) {
    res.status(ERROR_STATUS.UNAUTHENTICATED).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Missing or invalid Authorization header",
      },
    });
    return;
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    res.status(ERROR_STATUS.UNAUTHENTICATED).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Invalid or expired token",
      },
    });
    return;
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    res.status(ERROR_STATUS.UNAUTHENTICATED).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Invalid or expired token",
      },
    });
    return;
  }

  req.user = { id: payload.sub };
  next();
}

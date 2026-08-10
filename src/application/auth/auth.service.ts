import { err, type Result } from "neverthrow";
import type { AppError } from "../errors";
import type {
  AuthService,
  AuthServiceLoginOk,
  AuthServiceSignupOk,
} from "./auth.service.types";

export const authService: AuthService = {
  signup(_input): Promise<Result<AuthServiceSignupOk, AppError>> {
    return Promise.resolve(
      err({ code: "INTERNAL_ERROR", message: "not implemented" }),
    );
  },
  login(_input): Promise<Result<AuthServiceLoginOk, AppError>> {
    return Promise.resolve(
      err({ code: "INTERNAL_ERROR", message: "not implemented" }),
    );
  },
};

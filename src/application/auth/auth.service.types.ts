import type { Result } from "neverthrow";
import type { AppError } from "../errors";

export interface AuthService {
  signup(input: { email: string; password: string }): Promise<Result<AuthServiceSignupOk, AppError>>;
  login(input: { email: string; password: string }): Promise<Result<AuthServiceLoginOk, AppError>>;
}

export interface AuthServiceSignupOk {
  userId: string;
  email: string;
  token: string;
}

export type AuthServiceLoginOk = AuthServiceSignupOk;

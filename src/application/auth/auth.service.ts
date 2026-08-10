import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { err, ok, type Result } from "neverthrow";
import type { UserRepository } from "../../infrastructure/db/repositories/user.repository";
import type { AppError } from "../errors";
import type {
  AuthService,
  AuthServiceLoginOk,
  AuthServiceSignupOk,
} from "./auth.service.types";

export interface CreateAuthServiceOptions {
  userRepository: UserRepository;
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
}

const INVALID_CREDENTIALS_ERROR: AppError = {
  code: "INVALID_CREDENTIALS",
  message: "Invalid email or password",
};

function signToken(userId: string, secret: string, expiresIn: string): string {
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
}

export function createAuthService(options: CreateAuthServiceOptions): AuthService {
  const { userRepository, jwtSecret, jwtExpiresIn, bcryptRounds } = options;

  return {
    async signup(input): Promise<Result<AuthServiceSignupOk, AppError>> {
      const email = input.email.trim().toLowerCase();
      const existing = await userRepository.findByEmail(email);
      if (existing) {
        return err({
          code: "EMAIL_ALREADY_REGISTERED",
          message: "Email is already registered",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, bcryptRounds);
      const userDoc = await userRepository.create(email, passwordHash);
      const userId = String(userDoc._id);
      const token = signToken(userId, jwtSecret, jwtExpiresIn);

      return ok({ userId, email, token });
    },

    async login(input): Promise<Result<AuthServiceLoginOk, AppError>> {
      const email = input.email.trim().toLowerCase();
      const userDoc = await userRepository.findByEmail(email);

      if (!userDoc || !userDoc.passwordHash) {
        return err(INVALID_CREDENTIALS_ERROR);
      }

      const passwordMatches = await bcrypt.compare(input.password, userDoc.passwordHash);
      if (!passwordMatches) {
        return err(INVALID_CREDENTIALS_ERROR);
      }

      const userId = String(userDoc._id);
      const token = signToken(userId, jwtSecret, jwtExpiresIn);
      return ok({ userId, email, token });
    },
  };
}

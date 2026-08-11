import jwt from "jsonwebtoken";
import { clearMongo, startMongo, stopMongo } from "../../test-utils/mongo";
import { MongoUserRepository } from "../../infrastructure/db/repositories/user.repository";
import { createAuthService } from "./auth.service";
import type { AuthService } from "./auth.service.types";

const JWT_SECRET = "test-secret-32-chars-minimum-xxxxxxx";
const JWT_EXPIRES_IN = "24h";
const BCRYPT_ROUNDS = 4;

let service: AuthService;

beforeAll(async () => {
  await startMongo();
  service = createAuthService({
    userRepository: new MongoUserRepository(),
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    bcryptRounds: BCRYPT_ROUNDS,
  });
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await clearMongo();
});

describe("AuthService.signup", () => {
  test("success: returns userId, normalized email, JWT; no passwordHash in payload", async () => {
    const r = await service.signup({ email: "  Test@Example.COM ", password: "password123" });
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value.email).toBe("test@example.com");
    expect(r.value.userId).toBeTruthy();
    expect(r.value.token).toBeTruthy();
    expect("passwordHash" in r.value).toBe(false);
    expect((r.value as unknown as Record<string, unknown>).passwordHash).toBeUndefined();

    const decoded = jwt.verify(r.value.token, JWT_SECRET) as { sub: string };
    expect(decoded.sub).toBe(r.value.userId);
  });

  test("duplicate email → EMAIL_ALREADY_REGISTERED (case-insensitive match)", async () => {
    const first = await service.signup({ email: "dup@example.com", password: "password123" });
    expect(first.isOk()).toBe(true);

    const second = await service.signup({ email: "  DUP@Example.COM ", password: "password456" });
    expect(second.isErr()).toBe(true);
    if (second.isErr()) expect(second.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });
});

describe("AuthService.login", () => {
  test("success: correct credentials → ok with token", async () => {
    await service.signup({ email: "a@example.com", password: "password123" });
    const r = await service.login({ email: "a@example.com", password: "password123" });
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) return;
    expect(r.value.email).toBe("a@example.com");
    expect(r.value.token).toBeTruthy();
    expect("passwordHash" in r.value).toBe(false);
    expect((r.value as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  test("wrong password → INVALID_CREDENTIALS", async () => {
    await service.signup({ email: "a@example.com", password: "password123" });
    const r = await service.login({ email: "a@example.com", password: "wrong-password" });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) expect(r.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("non-existent user → INVALID_CREDENTIALS (same message, no enumeration)", async () => {
    const r = await service.login({ email: "nobody@example.com", password: "anything" });
    expect(r.isErr()).toBe(true);
    if (r.isErr()) {
      expect(r.error.code).toBe("INVALID_CREDENTIALS");
      expect(r.error.message).toBe("Invalid email or password");
    }
  });

  describe("timing side-channel (existing vs non-existent email)", () => {
    const TIMING_BCRYPT_ROUNDS = 10;
    let timingService: AuthService;

    beforeAll(() => {
      timingService = createAuthService({
        userRepository: new MongoUserRepository(),
        jwtSecret: JWT_SECRET,
        jwtExpiresIn: JWT_EXPIRES_IN,
        bcryptRounds: TIMING_BCRYPT_ROUNDS,
      });
    });

    test("both paths return INVALID_CREDENTIALS with comparable latency (bcrypt.compare runs on both)", async () => {
      await timingService.signup({ email: "timing@example.com", password: "password123" });

      const startExisting = performance.now();
      const rExisting = await timingService.login({
        email: "timing@example.com",
        password: "wrong-password",
      });
      const existingMs = performance.now() - startExisting;

      const startMissing = performance.now();
      const rMissing = await timingService.login({
        email: "does-not-exist@example.com",
        password: "wrong-password",
      });
      const missingMs = performance.now() - startMissing;

      expect(rExisting.isErr()).toBe(true);
      expect(rMissing.isErr()).toBe(true);
      if (rExisting.isErr()) expect(rExisting.error.code).toBe("INVALID_CREDENTIALS");
      if (rMissing.isErr()) expect(rMissing.error.code).toBe("INVALID_CREDENTIALS");

      // Before the fix, the missing-user path skipped bcrypt entirely and
      // returned in ~1.3s less time than the existing-user path. Both paths
      // must now pay the same bcrypt cost, so the gap should be small.
      expect(Math.abs(existingMs - missingMs)).toBeLessThan(300);
    });
  });
});

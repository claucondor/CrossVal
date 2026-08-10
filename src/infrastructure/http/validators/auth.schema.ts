import { z } from "zod";

export const SignupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(8),
  })
  .strict();

export const LoginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1),
  })
  .strict();

export type SignupDto = z.infer<typeof SignupSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
const { z } = require("zod");

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  familyName: z.string().trim().max(100).optional(),
  consentAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "Parental consent acknowledgment is required to create an account" }),
  }),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(), // optional because it may arrive via httpOnly cookie instead
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const parentalGateVerifySchema = z.object({
  challengeToken: z.string().min(1),
  answer: z.number(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  parentalGateVerifySchema,
};

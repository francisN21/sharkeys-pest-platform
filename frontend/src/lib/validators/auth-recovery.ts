import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export type VerifyEmailValues = z.infer<typeof verifyEmailSchema>;
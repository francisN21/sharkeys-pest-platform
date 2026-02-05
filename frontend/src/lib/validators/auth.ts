import { z } from "zod";

export const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name is required")
      .max(50, "First name is too long"),

    lastName: z
      .string()
      .min(2, "Last name is required")
      .max(50, "Last name is too long"),

    email: z.string().email("Enter a valid email"),

    phone: z
      .string()
      .min(7, "Enter a valid phone number")
      .max(20, "Phone number is too long"),

    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long"),

    confirmPassword: z.string().min(8, "Confirm your password"),

    // Optional (used later in booking/onboarding)
    accountType: z.enum(["residential", "business"]).optional(),
    address: z.string().min(5).optional(),

    agree: z.boolean().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;
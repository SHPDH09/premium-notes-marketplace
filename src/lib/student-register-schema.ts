import { z } from "zod";

export const studentRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.preprocess(
    (val) => (typeof val === "string" && !val.trim() ? undefined : val),
    z.string().trim().max(20, "Phone number is too long").optional()
  ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;

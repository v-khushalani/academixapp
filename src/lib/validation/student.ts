/**
 * Student form validation schema
 */

import { z } from "zod";
import { CLASSES, PROGRAMS, STREAMS } from "@/lib/constants";

const phoneRegex = /^[0-9\s\-()]+$/;

export const StudentFormSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  class: z.enum(CLASSES as unknown as [string, ...string[]]),
  school: z.string().optional().default(""),
  program: z.enum(PROGRAMS as unknown as [string, ...string[]], { message: "Select a program" }),
  stream: z.enum(STREAMS as unknown as [string, ...string[]], { message: "Select a stream" }),
  father_name: z.string().min(2, "Father's name is required").max(100),
  father_phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .min(10, "Phone number must be at least 10 digits"),
  mother_name: z.string().min(2, "Mother's name is required").max(100),
  mother_phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .min(10, "Phone number must be at least 10 digits"),
  dob: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  address: z.string().optional().default(""),
  preferred_contact: z.enum(["father", "mother", "self"]),
});

export type StudentFormValues = z.infer<typeof StudentFormSchema>;

/**
 * Validate student form data
 * @param data - Form data to validate
 * @returns Validation result with data or errors
 */
export function validateStudentForm(data: unknown) {
  return StudentFormSchema.safeParse(data);
}

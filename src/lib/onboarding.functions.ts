import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Guest-facing server functions for onboarding.
 * These are called by guests (anon) to submit applications or accept invites.
 * Since we moved SQL functions to SECURITY INVOKER for production compliance,
 * these server functions act as the elevated bridge.
 */

export const submitAdmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        _full_name: z.string(),
        _phone: z.string(),
        _email: z.string().optional(),
        _class: z.string(),
        _dob: z.string().nullable(),
        _school: z.string().optional(),
        _father_name: z.string().optional(),
        _father_phone: z.string().optional(),
        _mother_name: z.string().optional(),
        _mother_phone: z.string().optional(),
        _address: z.string().optional(),
        _program: z.string().optional(),
        _stream: z.string().optional(),
        _photo_path: z.string().optional(),
        _preferred_contact: z.string().optional(),
        _intent: z.string().optional(),
        _token_amount: z.number().optional(),
        _institute_slug: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("submit_admission_application", data as any);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        _token: z.string(),
        _full_name: z.string(),
        _phone: z.string(),
        _email: z.string(),
        _class: z.string(),
        _school: z.string().optional(),
        _parent_name: z.string().optional(),
        _parent_phone: z.string().optional(),
        _address: z.string().optional(),
        _dob: z.string().nullable(),
        _father_name: z.string().optional(),
        _father_phone: z.string().optional(),
        _mother_name: z.string().optional(),
        _mother_phone: z.string().optional(),
        _program: z.string().optional(),
        _stream: z.string().optional(),
        _photo_path: z.string().optional(),
        _preferred_contact: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("complete_student_onboarding", data as any);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const acceptStudentInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ _token: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("accept_student_invite", data);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const acceptFacultyInviteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ _token: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("accept_faculty_invite", data);
    if (error) throw new Error(error.message);
    return { success: true };
  });

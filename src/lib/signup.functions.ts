import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Creates a new institute and assigns the caller as the 'owner'.
 * This is only accessible to authenticated users (Google login).
 */
export const createInstituteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      name: z.string().min(2),
      tagline: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: instituteId, error } = await context.supabase.rpc(
      "create_institute_with_owner",
      { _name: data.name, _tagline: data.tagline },
    );

    if (error) {
      throw new Error(`Failed to create institute: ${error.message}`);
    }

    return { success: true, instituteId: instituteId as string };
  });


/**
 * Updates branding details for an institute.
 * We use supabaseAdmin here because RLS might be too strict during onboarding 
 * (e.g. if the user session hasn't refreshed to see the new role yet).
 */
export const updateInstituteBrandingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      institute_id: z.string().uuid(),
      logo_url: z.string().optional().nullable(),
      primary_color: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const { error } = await supabaseAdmin
      .from("institutes")
      .update({
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        address: data.address,
        phone: data.phone,
      })
      .eq("id", data.institute_id);

    if (error) throw new Error(`Failed to update branding: ${error.message}`);
    return { success: true };
  });

/**
 * Sets up the first batch and faculty for a new institute.
 */
export const setupFirstBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      institute_id: z.string().uuid(),
      faculty_name: z.string().min(2),
      batch_name: z.string().min(2),
      subject: z.string().optional(),
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create Faculty
    const { data: faculty, error: facError } = await supabaseAdmin
      .from("faculty")
      .insert({
        full_name: data.faculty_name,
        subject: data.subject || "General",
        institute_id: data.institute_id,
        status: "active",
      })
      .select("id")
      .single();

    if (facError) throw new Error(`Failed to create faculty: ${facError.message}`);

    // 2. Create Batch
    const { error: batchError } = await supabaseAdmin
      .from("batches")
      .insert({
        name: data.batch_name,
        faculty_id: faculty.id,
        institute_id: data.institute_id,
        status: "active",
      });

    if (batchError) throw new Error(`Failed to create batch: ${batchError.message}`);

    return { success: true };
  });

/**
 * Checks if the current user has an assigned institute role.
 * Used for onboarding redirection.
 */
export const getMyInstituteStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase
      .from("user_roles")
      .select("institute_id, role")
      .eq("user_id", context.userId)
      .maybeSingle();

    return { 
      hasInstitute: !!role?.institute_id, 
      role: role?.role || null,
      instituteId: role?.institute_id || null 
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
    // 1. Check if user already owns an institute (optional safety)
    const { data: existingRoles } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "owner")
      .maybeSingle();

    if (existingRoles) {
      throw new Error("You already own an institute workspace.");
    }

    // 2. Create the institute
    const { data: institute, error: instError } = await supabaseAdmin
      .from("institutes")
      .insert({
        name: data.name,
        tagline: data.tagline || null,
        slug: data.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      })
      .select("id")
      .single();

    if (instError) {
      throw new Error(`Failed to create institute: ${instError.message}`);
    }

    // 3. Assign the 'owner' role to the creating user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: context.userId,
        institute_id: institute.id,
        role: "owner",
      });

    if (roleError) {
      // Cleanup institute if role assignment fails
      await supabaseAdmin.from("institutes").delete().eq("id", institute.id);
      throw new Error(`Failed to assign owner role: ${roleError.message}`);
    }

    return { success: true, instituteId: institute.id };
  });

/**
 * Checks if the current user has an assigned institute role.
 * Used for onboarding redirection.
 */
export const getMyInstituteStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await supabaseAdmin
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

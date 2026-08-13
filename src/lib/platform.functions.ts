import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Lists users who are not linked to any institute.
 */
export const listOrphanedUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // SECURITY: Ensure the caller is a superadmin
    const { data: myRoles } = await context.supabase.rpc("get_my_roles");
    if (!(myRoles ?? []).includes("superadmin")) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    // 1. Get all users who have a role in any institute
    const { data: usersWithRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id");

    const linkedUserIds = new Set(usersWithRoles?.map(r => r.user_id) || []);

    // 2. Get users from profiles (since auth.users isn't directly queryable via select in some setups, we use the public profile as a proxy)
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, created_at");

    // Filter those who don't have roles
    const orphaned = allProfiles?.filter(p => !linkedUserIds.has(p.id)) || [];

    return orphaned;
  });

/**
 * Deletes a user account.
 */
export const deleteUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      user_id: z.string().uuid(),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    // SECURITY: Ensure the caller is a superadmin
    const { data: myRoles } = await context.supabase.rpc("get_my_roles");
    if (!(myRoles ?? []).includes("superadmin")) {
      throw new Error("Unauthorized: Superadmin access required");
    }

    // Note: We should verify they are actually orphaned or the admin explicitly wants to delete them.
    // For trial cleanup, we focus on orphaned ones.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);

    if (error) throw new Error(`Failed to delete user: ${error.message}`);
    return { success: true };
  });

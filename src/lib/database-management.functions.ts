import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Wipes all data from the database and assigns superadmin role to the caller.
 * This is a high-privilege administrative action.
 */
export const wipeDatabaseFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    
    // We check if there are ANY superadmins. If not, the first person to call this becomes superadmin.
    // If there ARE superadmins, only they can call this.
    const { data: existingSuper } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "superadmin" as any)
      .limit(1);

    if (existingSuper && existingSuper.length > 0) {
      // Check if current user is one of them
      const isSuper = existingSuper.some(s => s.user_id === userId);
      // Wait, let's do a direct check for the caller's role to be safe
      const { data: myRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
        
      const callerIsSuper = myRoles?.some(r => r.role === 'superadmin');
      
      if (!callerIsSuper) {
        throw new Error("Unauthorized: Only an existing superadmin can wipe the database.");
      }
    }

    // List of tables to wipe in order (child to parent)
    const tables = [
      "attendance",
      "attendance_devices",
      "audit_logs",
      "fees",
      "homework",
      "parent_students",
      "student_device_ids",
      "student_invites",
      "test_results",
      "tests",
      "syllabus_logs",
      "syllabus_chapters",
      "leads",
      "faculty_invites",
      "students",
      "batches",
      "subjects",
      "rooms",
      "courses",
      "user_roles",
      "profiles",
      "institutes"
    ];

    console.log("Starting database wipe...");

    for (const table of tables) {
      // @ts-ignore
      const { error } = await supabaseAdmin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.error(`Error wiping table ${table}:`, error.message);
      }
    }

    // Now delete all users except the caller
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (!listError && usersData?.users) {
      for (const user of usersData.users) {
        if (user.id !== userId) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
          } catch (e) {
            console.error(`Failed to delete user ${user.id}:`, e);
          }
        }
      }
    }

    // Re-create profile and superadmin role for the caller
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userData?.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        full_name: userData.user.user_metadata?.full_name || userData.user.email,
        updated_at: new Date().toISOString()
      });

      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: "superadmin" as any
      }, { onConflict: 'user_id,role' });
    }

    return { success: true };
  });

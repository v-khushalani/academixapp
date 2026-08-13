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
      "expenses",
      "fee_adjustments",
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
      "timetable_day_plan",
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

    // Disable triggers temporarily if possible, or just delete in order.
    // We use a single query for each table to be efficient.
    for (const table of tables) {
      console.log(`Wiping ${table}...`);
      // @ts-ignore
      const { error } = await supabaseAdmin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) {
        console.error(`Error wiping table ${table}:`, error.message);
        // Fallback for tables that might not have "id" (though most in this schema do)
        // @ts-ignore
        await supabaseAdmin.from(table).delete().or("id.neq.00000000-0000-0000-0000-000000000000,user_id.neq.00000000-0000-0000-0000-000000000000");
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
      const fullName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0] || "Super Admin";
      
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
        id: userId,
        full_name: fullName,
        updated_at: new Date().toISOString()
      });
      
      if (profileError) console.error("Error recreating profile:", profileError.message);

      const { error: roleError } = await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: "superadmin" as any
      }, { onConflict: 'user_id,role' });

      if (roleError) console.error("Error recreating superadmin role:", roleError.message);
    }

    return { success: true };
  });

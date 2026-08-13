import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEMO_PASSWORD = "Password123!";

/**
 * Creates portal accounts for demo students and faculty.
 * This allows the user to log in as a student or teacher to see the portal views.
 */
export const provisionDemoAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ institute_id: z.string().uuid() }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: myRoles } = await context.supabase.rpc("get_my_roles");
    const roles = (myRoles ?? []) as string[];
    const isSuper = roles.includes("superadmin");
    const isOwner = roles.includes("owner");

    if (!isSuper && !isOwner) {
      throw new Error("Only owners or superadmins can provision demo accounts.");
    }

    const { data: students } = await supabaseAdmin
      .from("students")
      .select("id, full_name, admission_no, phone, user_id")
      .eq("institute_id", data.institute_id)
      .limit(2);

    const { data: faculty } = await supabaseAdmin
      .from("faculty")
      .select("id, full_name, user_id")
      .eq("institute_id", data.institute_id)
      .limit(1);

    const results = [];

    // Provision Student Accounts
    for (const student of students || []) {
      if (student.user_id) continue;
      
      const email = `demo.stu.${student.id.slice(0, 5)}@academix.demo`;
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: student.full_name, portal: "student" }
      });

      if (user.user) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: user.user.id,
          role: "student",
          institute_id: data.institute_id
        });
        await supabaseAdmin.from("students").update({ user_id: user.user.id }).eq("id", student.id);
        results.push({ role: "student", email, password: DEMO_PASSWORD });
      }
    }

    // Provision Teacher Account
    for (const teacher of faculty || []) {
      if (teacher.user_id) continue;
      
      const email = `demo.teach.${teacher.id.slice(0, 5)}@academix.demo`;
      const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: teacher.full_name, portal: "teacher" }
      });

      if (user.user) {
        await supabaseAdmin.from("user_roles").insert({
          user_id: user.user.id,
          role: "teacher",
          institute_id: data.institute_id
        });
        await supabaseAdmin.from("faculty").update({ user_id: user.user.id }).eq("id", teacher.id);
        results.push({ role: "teacher", email, password: DEMO_PASSWORD });
      }
    }

    return { success: true, accounts: results };
  });

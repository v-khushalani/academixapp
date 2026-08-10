import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_ROLES = ["owner", "admin", "receptionist"];

function tempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.slice(0, 5) + "-" + out.slice(5);
}

function slug(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
}

export type ProvisionedAccount = {
  kind: "student" | "parent";
  name: string;
  loginId: string;
  password: string | null;
  phone: string | null;
  created: boolean;
};

/**
 * Creates (or reuses) the portal login accounts for an approved student and
 * their monitoring parent. Admin/receptionist only. Returns credentials so the
 * office can forward them over WhatsApp — no email delivery required.
 */
export const provisionPortalAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ student_id: z.string().uuid(), reset: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ accounts: ProvisionedAccount[] }> => {
    // 1. Authenticated staff/admin check
    const { data: myRoles, error: roleError } = await context.supabase.rpc("get_my_roles");
    if (roleError) throw new Error(roleError.message);
    const roles = (myRoles ?? []) as string[];
    const isSuper = roles.includes("superadmin");
    const hasAdmin = roles.some((r) => ADMIN_ROLES.includes(r));

    if (!isSuper && !hasAdmin) {
      throw new Error("Only owners, admins and reception staff can create portal logins.");
    }

    const { data: student, error: studentError } = await context.supabase
      .from("students")
      .select(
        "id, institute_id, full_name, admission_no, email, phone, user_id, preferred_contact, father_name, father_phone, mother_name, mother_phone",
      )
      .eq("id", data.student_id)
      .maybeSingle();
    if (studentError) throw new Error(studentError.message);
    if (!student) throw new Error("Student not found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const accounts: ProvisionedAccount[] = [];

    /** Paged lookup — only used when Auth reports the email already exists. */
    async function findUserIdByEmail(email: string): Promise<string | null> {
      const target = email.toLowerCase();
      for (let page = 1; page <= 20; page++) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users ?? [];
        const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
        if (hit) return hit.id;
        if (users.length < 200) return null;
      }
      return null;
    }

    async function ensureUser(opts: {
      kind: "student" | "parent";
      name: string;
      email: string;
      phone: string | null;
      role: "student" | "parent";
      existingUserId?: string | null;
    }) {
      let userId = opts.existingUserId ?? null;
      let created = false;
      let password: string | null = null;

      if (!userId) {
        // Try to create first — cheap, and Auth tells us when the email already exists.
        password = tempPassword();
        const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: opts.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: opts.name, portal: opts.role },
        });
        if (!error && createdUser.user) {
          userId = createdUser.user.id;
          created = true;
        } else {
          password = null;
          userId = await findUserIdByEmail(opts.email);
          if (!userId) throw new Error(error?.message ?? "Could not create the login");
        }
      }

      if (!created && data.reset) {
        password = tempPassword();
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (error) throw new Error(error.message);
      }

      await supabaseAdmin
        .from("user_roles")
        .upsert(
          { user_id: userId, role: opts.role, institute_id: student!.institute_id },
          { onConflict: "user_id,role" },
        );

      accounts.push({
        kind: opts.kind,
        name: opts.name,
        loginId: opts.email,
        password,
        phone: opts.phone,
        created,
      });
      return userId;
    }

    // --- student account ---
    const studentEmail =
      student.email?.trim() ||
      `stu.${slug(student.admission_no || student.id.slice(0, 8))}@academix.students`;
    const studentUserId = await ensureUser({
      kind: "student",
      name: student.full_name,
      email: studentEmail,
      phone: student.phone,
      role: "student",
      existingUserId: student.user_id,
    });
    if (student.user_id !== studentUserId) {
      await supabaseAdmin.from("students").update({ user_id: studentUserId }).eq("id", student.id);
    }

    // --- monitoring parent account ---
    const useMother = student.preferred_contact === "mother";
    const parentName = (useMother ? student.mother_name : student.father_name) ?? null;
    const parentPhone = (useMother ? student.mother_phone : student.father_phone) ?? null;
    if (parentPhone) {
      const digits = parentPhone.replace(/\D/g, "");
      const parentEmail = `par.${digits}@academix.parents`;
      const parentUserId = await ensureUser({
        kind: "parent",
        name: parentName || `${student.full_name}'s parent`,
        email: parentEmail,
        phone: parentPhone,
        role: "parent",
      });
      await supabaseAdmin.from("parent_students").upsert(
        {
          parent_user_id: parentUserId,
          student_id: student.id,
          institute_id: student.institute_id,
          relation: useMother ? "mother" : "father",
          is_primary: true,
        },
        { onConflict: "parent_user_id,student_id" },
      );
    }

    return { accounts };
  });
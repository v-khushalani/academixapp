
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createMockAccountsFn = createServerFn({ method: "POST" })
  .handler(async () => {
    const email = "xyz@academix.website";
    const password = "Test@1234";
    const roles = ["admin", "teacher", "parent", "student"];
    const results = [];

    // 1. Create a base institute for mock data if none exists
    const { data: inst, error: instErr } = await supabaseAdmin
      .from("institutes")
      .insert({
        name: "Academix Mock Institute",
        slug: "academix-mock",
        status: "active"
      })
      .select("id")
      .single();
    
    const instituteId = inst?.id;
    if (instErr && instErr.code !== '23505') { // 23505 is unique violation (already exists)
       console.error("Institute creation error:", instErr);
    }

    // If it already exists, fetch it
    let finalInstId = instituteId;
    if (!finalInstId) {
       const { data: existing } = await supabaseAdmin.from("institutes").select("id").eq("slug", "academix-mock").single();
       finalInstId = existing?.id;
    }

    if (!finalInstId) throw new Error("Could not find or create mock institute");

    for (const role of roles) {
      const roleEmail = `${role}_${email}`;
      
      // Check if user exists
      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = users?.users.find(u => u.email === roleEmail);

      let userId;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: roleEmail,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: `Mock ${role}` }
        });
        if (createErr) {
          results.push({ role, status: "error", message: createErr.message });
          continue;
        }
        userId = newUser.user.id;
      }

      // Ensure profile exists
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        full_name: `Mock ${role}`
      });

      // Assign role
      const { error: roleErr } = await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        institute_id: finalInstId,
        role: role as any
      }, { onConflict: 'user_id,role,institute_id' });

      results.push({ role, email: roleEmail, status: roleErr ? "error" : "success" });
    }

    // 2. Seed actual mock ERP data (Students, Batches, Fees, etc.)
    const { createDemoData } = await import("./demo-data.functions");
    const demoRes = await createDemoData({ data: { institute_id: finalInstId, force: true }, context });

    return { 
      success: true, 
      results, 
      instituteId: finalInstId,
      demoSummary: demoRes.summary
    };
  });

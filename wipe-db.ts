import { createClient } from "@supabase/supabase-js";
import { wipeDatabaseFn } from "./src/lib/database-management.functions.ts";

async function forceWipe() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing keys");
    process.exit(1);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

  console.log("Starting script-based database wipe...");

  for (const table of tables) {
    console.log(`Wiping ${table}...`);
    const { error } = await supabaseAdmin.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
       // Fallback for tables that might not have "id"
       await supabaseAdmin.from(table).delete().or("id.neq.00000000-0000-0000-0000-000000000000,user_id.neq.00000000-0000-0000-0000-000000000000");
    }
  }

  // Delete all users
  const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (!listError && usersData?.users) {
    for (const user of usersData.users) {
      console.log(`Deleting user ${user.email} (${user.id})...`);
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
  }

  console.log("Database wipe complete.");
}

forceWipe().catch(console.error);

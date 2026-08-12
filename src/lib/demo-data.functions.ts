import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const createDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => 
    z.object({ 
      institute_id: z.string().uuid().optional(),
      force: z.boolean().optional()
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const { data: myRoles } = await context.supabase.rpc("get_my_roles");
    const roles = (myRoles ?? []) as string[];
    const isSuper = roles.includes("superadmin");
    const isOwner = roles.includes("owner");

    if (!isSuper && !isOwner) {
      throw new Error("Only owners or superadmins can seed demo data.");
    }

    const { data: instId } = await context.supabase.rpc("current_institute_id");
    const targetId = data.institute_id || instId;
    if (!targetId) throw new Error("No institute context found.");

    // Check if data already exists
    const { count } = await supabaseAdmin
      .from("batches")
      .select("id", { count: "exact", head: true })
      .eq("institute_id", targetId);

    if (count && count > 0 && !data.force) {
      return { message: "Demo data already exists for this institute.", count };
    }

    // 1. Create Courses
    const courses = [
      { name: "Science Stream", code: "SCI", institute_id: targetId },
      { name: "Commerce Stream", code: "COM", institute_id: targetId }
    ];
    const { data: createdCourses } = await supabaseAdmin.from("courses").insert(courses).select();
    const courseIds = createdCourses?.map(c => c.id) ?? [];

    // 2. Create Rooms
    const rooms = [
      { name: "Room 101", capacity: 30, institute_id: targetId },
      { name: "Room 102", capacity: 30, institute_id: targetId }
    ];
    await supabaseAdmin.from("rooms").insert(rooms);

    // 3. Create Faculty
    const facultyNames = ["Rajesh Kumar", "Anjali Sharma"];
    const faculty = facultyNames.map(name => ({
      full_name: name,
      subject: "Mixed",
      status: "active",
      institute_id: targetId,
      joining_date: new Date().toISOString().split('T')[0]
    }));
    const { data: createdFaculty } = await supabaseAdmin.from("faculty").insert(faculty).select();
    const facultyIds = createdFaculty?.map(f => f.id) ?? [];

    // 4. Create Batches
    const batchNames = ["Morning Batch A", "Evening Batch B"];
    const batches = batchNames.map((name, i) => ({
      name,
      course_id: courseIds[i % courseIds.length],
      faculty_id: facultyIds[i % facultyIds.length],
      institute_id: targetId,
      status: "active" as const,
      default_fee: 5000 + (i * 1000),
      capacity: 30
    }));
    const { data: createdBatches } = await supabaseAdmin.from("batches").insert(batches).select();
    const batchIds = createdBatches?.map(b => b.id) ?? [];

    // 5. Create Subjects & Syllabus for the first batch
    if (batchIds[0]) {
      const subjects = [
        { name: "Mathematics", institute_id: targetId },
        { name: "Physics", institute_id: targetId }
      ];
      const { data: createdSubjects } = await supabaseAdmin.from("subjects").insert(subjects).select();
      if (createdSubjects) {
        // We use batch_id directly in chapters if that's what the schema expects
        const chapters = createdSubjects.flatMap(s => [
          { 
            name: "Chapter 1: Basics", 
            subject_id: s.id, 
            institute_id: targetId, 
            sequence: 1,
            batch_id: batchIds[0] 
          }
        ]);
        // Use a generic insert if the table name is dynamic or slightly different
        await (supabaseAdmin.from("syllabus_chapters" as any) || supabaseAdmin.from("chapters" as any)).insert(chapters);
      }
    }

    // 6. Create Students
    const studentNames = ["Suresh Raina", "Mithali Raj", "Virat Kohli"];
    const students = studentNames.map((name, i) => ({
      full_name: name,
      admission_no: `ADM-00${i + 1}`,
      batch_id: batchIds[i % batchIds.length],
      institute_id: targetId,
      status: "active" as const,
      approval_status: "approved" as const,
      admission_date: new Date().toISOString().split('T')[0],
      phone: `990000000${i}`
    }));
    await supabaseAdmin.from("students").insert(students);

    return { success: true, message: "Demo data created successfully." };
  });

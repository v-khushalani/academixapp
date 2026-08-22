import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Ingest endpoint for RFID / biometric attendance machines.
 *
 * POST /api/public/attendance/punch
 * { "token": "<device token>", "punches": [{ "uid": "0006123456", "at": "2026-08-07T09:12:00+05:30" }] }
 *
 * The device token is the only credential; it identifies the institute. No PII
 * is ever returned — only counts.
 */
const Body = z.object({
  token: z.string().min(16).max(128),
  punches: z
    .array(
      z.object({
        uid: z.string().min(1).max(64),
        at: z.string().min(4).max(40).optional(),
      }),
    )
    .min(1)
    .max(500),
});

const LATE_GRACE_MIN = 10;

export const Route = createFileRoute("/api/public/attendance/punch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid payload" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: device } = await supabaseAdmin
          .from("attendance_devices")
          .select("id, institute_id, is_active")
          .eq("token", parsed.token)
          .maybeSingle();

        if (!device || !device.is_active) {
          return Response.json({ error: "Unknown device" }, { status: 401 });
        }

        const { data: institute } = await supabaseAdmin
          .from("institutes")
          .select("attendance_devices")
          .eq("id", device.institute_id)
          .maybeSingle();
        if (!institute?.attendance_devices) {
          return Response.json({ error: "Attendance machines are not enabled for this plan" }, { status: 403 });
        }

        const uids = Array.from(new Set(parsed.punches.map((p) => p.uid)));
        const { data: maps } = await supabaseAdmin
          .from("student_device_ids")
          .select("uid, student_id")
          .eq("institute_id", device.institute_id)
          .in("uid", uids);

        const byUid = new Map((maps ?? []).map((m) => [m.uid as string, m.student_id as string]));

        const studentIds = Array.from(new Set([...byUid.values()]));
        const { data: students } = await supabaseAdmin
          .from("students")
          .select("id, batch_id")
          .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);
        const batchOf = new Map((students ?? []).map((s) => [s.id as string, s.batch_id as string | null]));

        const { data: slots } = await supabaseAdmin
          .from("timetable_slots")
          .select("batch_id, day_of_week, start_time")
          .eq("institute_id", device.institute_id);

        // earliest slot per batch per weekday
        const firstSlot = new Map<string, string>();
        for (const s of slots ?? []) {
          if (!s.batch_id) continue;
          const key = `${s.batch_id}:${s.day_of_week}`;
          const cur = firstSlot.get(key);
          if (!cur || (s.start_time as string) < cur) firstSlot.set(key, s.start_time as string);
        }

        let matched = 0;
        let unknown = 0;
        const seen = new Set<string>();

        for (const p of parsed.punches) {
          const studentId = byUid.get(p.uid);
          if (!studentId) {
            unknown++;
            continue;
          }
          const when = p.at ? new Date(p.at) : new Date();
          if (Number.isNaN(when.getTime())) {
            unknown++;
            continue;
          }
          const date = when.toISOString().slice(0, 10);
          const key = `${studentId}:${date}`;
          if (seen.has(key)) continue; // first punch of the day wins
          seen.add(key);

          const batchId = batchOf.get(studentId) ?? null;
          let status: "present" | "late" = "present";
          const start = batchId ? firstSlot.get(`${batchId}:${when.getDay()}`) : undefined;
          if (start) {
            const [h, m] = start.split(":").map(Number);
            const cutoff = h * 60 + m + LATE_GRACE_MIN;
            if (when.getHours() * 60 + when.getMinutes() > cutoff) status = "late";
          }

          const { data: existing } = await supabaseAdmin
            .from("attendance")
            .select("id")
            .eq("student_id", studentId)
            .eq("date", date)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from("attendance")
              .update({ status, source: "device" })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin.from("attendance").insert({
              student_id: studentId,
              batch_id: batchId,
              date,
              status,
              source: "device",
              institute_id: device.institute_id,
            });
          }
          matched++;
        }

        await supabaseAdmin
          .from("attendance_devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", device.id);

        return Response.json({ ok: true, matched, unknown });
      },
    },
  },
});
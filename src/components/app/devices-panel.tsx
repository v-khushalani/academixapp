import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field as F } from "@/components/app/field";
import { supabase } from "@/integrations/supabase/client";
import { studentsApi } from "@/lib/api";
import { formatDateTime } from "@/lib/dates";

type Device = {
  id: string;
  name: string;
  location: string | null;
  token: string;
  is_active: boolean;
  last_seen_at: string | null;
};

type Mapping = { id: string; uid: string; student_id: string; label: string | null };

/**
 * RFID / biometric machines. The device posts punches to a public ingest URL
 * with its own secret token; each card UID is mapped to a student here.
 */
export function DevicesPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [uid, setUid] = useState("");
  const [studentId, setStudentId] = useState("");

  const { data: devices = [] } = useQuery({
    queryKey: ["attendance-devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_devices")
        .select("id, name, location, token, is_active, last_seen_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Device[];
    },
  });

  const { data: maps = [] } = useQuery({
    queryKey: ["student-device-ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_device_ids")
        .select("id, uid, student_id, label")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Mapping[];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => studentsApi.list(),
  });

  const nameOf = useMemo(
    () => new Map(students.map((s) => [s.id, s.full_name])),
    [students],
  );

  const addDevice = useMutation({
    mutationFn: async () => {
      const { data: inst, error: instErr } = await supabase.rpc("current_institute_id");
      if (instErr) throw instErr;
      const { error } = await supabase.from("attendance_devices").insert({
        name: name.trim(),
        location: location.trim() || null,
        institute_id: inst as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setLocation("");
      qc.invalidateQueries({ queryKey: ["attendance-devices"] });
      toast.success("Device registered");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance_devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance-devices"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addMap = useMutation({
    mutationFn: async () => {
      const { data: inst, error: instErr } = await supabase.rpc("current_institute_id");
      if (instErr) throw instErr;
      const { error } = await supabase.from("student_device_ids").insert({
        uid: uid.trim(),
        student_id: studentId,
        institute_id: inst as string,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setUid("");
      setStudentId("");
      qc.invalidateQueries({ queryKey: ["student-device-ids"] });
      toast.success("Card linked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMap = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_device_ids").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["student-device-ids"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const ingestUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/api/public/attendance/punch`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Attendance machines</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Works with ESSL, Mantra, Realtime and any machine that can push punches to a URL. Point
          the device at the address below and paste its token.
        </p>
        <div className="mt-3 flex gap-2">
          <Input readOnly value={ingestUrl} className="text-xs" />
          <Button
            size="icon"
            variant="outline"
            title="Copy ingest URL"
            onClick={() => {
              void navigator.clipboard.writeText(ingestUrl);
              toast.success("URL copied");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            addDevice.mutate();
          }}
        >
          <F label="Device name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Front gate reader" />
          </F>
          <F label="Location">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Reception" />
          </F>
          <div className="flex items-end">
            <Button type="submit" size="sm" className="gap-1.5" disabled={addDevice.isPending}>
              <Plus className="h-4 w-4" />
              Register device
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {devices.length === 0 ? (
            <p className="text-xs text-muted-foreground">No machines registered yet.</p>
          ) : (
            devices.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.location || "—"} ·{" "}
                    {d.last_seen_at ? `last seen ${formatDateTime(d.last_seen_at)}` : "never seen"}
                  </p>
                </div>
                <Badge variant="secondary" className={d.is_active ? "bg-success/10 text-success" : ""}>
                  {d.is_active ? "active" : "off"}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    void navigator.clipboard.writeText(d.token);
                    toast.success("Device token copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy token
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeDevice.mutate(d.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Cards & fingerprints</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap a card on the reader, copy the ID it shows, and link it to a student. First punch of
          the day marks present; a punch after the batch starts marks late.
        </p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-3"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (!studentId) return toast.error("Pick a student");
            addMap.mutate();
          }}
        >
          <F label="Card / finger ID">
            <Input value={uid} onChange={(e) => setUid(e.target.value)} required placeholder="0006123456" />
          </F>
          <F label="Student">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </F>
          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={addMap.isPending}>
              Link card
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          {maps.length === 0 ? (
            <p className="text-xs text-muted-foreground">No cards linked yet.</p>
          ) : (
            maps.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
                <span className="font-mono text-xs">{m.uid}</span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {nameOf.get(m.student_id) ?? "Unknown student"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeMap.mutate(m.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
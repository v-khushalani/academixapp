// Institute settings. Source of truth is the `institutes` table; localStorage is a
// synchronous cache so the whole UI can read settings without awaiting a query.

import { supabase } from "@/integrations/supabase/client";
import { WA_TEMPLATES, type WhatsAppTemplateKey } from "./whatsapp";

export type Shift = { start: string; end: string; period: number };
export type Shifts = { morning: Shift; evening: Shift };

export type InstituteSettings = {
  name: string;
  slug: string; // used by the public admission link/QR so submissions land here
  tagline: string;
  address: string;
  phone: string;
  email: string;
  academic_year: string;
  primary_color: string; // hex like #4f46e5
  upi_id: string; // e.g. institute@okhdfcbank — used for fee QR codes
  upi_name: string; // payee name shown in the UPI app
  shifts: Shifts; // timetable morning / evening windows
};

const KEY_INSTITUTE = "vk_institute";
const KEY_TEMPLATES = "vk_wa_templates";

export const DEFAULT_SHIFTS: Shifts = {
  morning: { start: "07:00", end: "11:00", period: 60 },
  evening: { start: "15:00", end: "19:00", period: 60 },
};

const DEFAULT_INSTITUTE: InstituteSettings = {
  name: "Your Institute",
  slug: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  academic_year: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  primary_color: "",
  upi_id: "",
  upi_name: "",
  shifts: DEFAULT_SHIFTS,
};

function safeRead<T>(key: string): Partial<T> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<T>;
  } catch {
    return {};
  }
}

export function getInstitute(): InstituteSettings {
  const stored = safeRead<InstituteSettings>(KEY_INSTITUTE);
  return {
    ...DEFAULT_INSTITUTE,
    ...stored,
    shifts: {
      morning: { ...DEFAULT_SHIFTS.morning, ...(stored.shifts?.morning ?? {}) },
      evening: { ...DEFAULT_SHIFTS.evening, ...(stored.shifts?.evening ?? {}) },
    },
  };
}

function writeCache(s: InstituteSettings) {
  window.localStorage.setItem(KEY_INSTITUTE, JSON.stringify(s));
  applyBranding(s.primary_color);
  window.dispatchEvent(new Event("vk-institute-changed"));
}

/** Persist to the institutes table and refresh the local cache. */
export async function saveInstitute(s: InstituteSettings) {
  writeCache(s);
  const { data: row } = await supabase.from("institutes").select("id").maybeSingle();
  if (!row) return;
  const { error } = await supabase
    .from("institutes")
    .update({
      name: s.name,
      tagline: s.tagline || null,
      address: s.address || null,
      phone: s.phone || null,
      email: s.email || null,
      academic_year: s.academic_year || null,
      primary_color: s.primary_color || null,
      upi_id: s.upi_id || null,
      upi_name: s.upi_name || null,
      shifts: s.shifts ?? DEFAULT_SHIFTS,
    })
    .eq("id", row.id);
  if (error) throw error;
}

/** Pull the signed-in user's institute row into the local cache. */
export async function hydrateInstitute() {
  const { data } = await supabase
    .from("institutes")
    .select(
      "name, slug, tagline, address, phone, email, academic_year, primary_color, upi_id, upi_name, shifts",
    )
    .maybeSingle();
  if (!data) return;
  writeCache({
    ...DEFAULT_INSTITUTE,
    ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== null)),
  } as InstituteSettings);
}

export function getTemplates(): Record<WhatsAppTemplateKey, string> {
  const overrides = safeRead<Record<WhatsAppTemplateKey, string>>(KEY_TEMPLATES);
  return { ...WA_TEMPLATES, ...overrides };
}

export function saveTemplates(t: Record<WhatsAppTemplateKey, string>) {
  window.localStorage.setItem(KEY_TEMPLATES, JSON.stringify(t));
  window.dispatchEvent(new Event("vk-templates-changed"));
}

export function applyBranding(hex: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!hex) {
    root.style.removeProperty("--primary");
    return;
  }
  root.style.setProperty("--primary", hex);
}

// Bootstrap branding on module load (client only)
if (typeof window !== "undefined") {
  applyBranding(getInstitute().primary_color);
}

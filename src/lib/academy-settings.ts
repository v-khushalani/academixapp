// Institute settings. Source of truth is the `institutes` table; localStorage is a
// synchronous cache so the whole UI can read settings without awaiting a query.

import { supabase } from "@/integrations/supabase/client";
import { WA_TEMPLATES, type WhatsAppTemplateKey } from "./whatsapp";

export type InstituteSettings = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  academic_year: string;
  primary_color: string; // hex like #4f46e5
  upi_id: string; // e.g. institute@okhdfcbank — used for fee QR codes
  upi_name: string; // payee name shown in the UPI app
};

const KEY_INSTITUTE = "vk_institute";
const KEY_TEMPLATES = "vk_wa_templates";

const DEFAULT_INSTITUTE: InstituteSettings = {
  name: "Your Institute",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  academic_year: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  primary_color: "",
  upi_id: "",
  upi_name: "",
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
  return { ...DEFAULT_INSTITUTE, ...safeRead<InstituteSettings>(KEY_INSTITUTE) };
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
    })
    .eq("id", row.id);
  if (error) throw error;
}

/** Pull the signed-in user's institute row into the local cache. */
export async function hydrateInstitute() {
  const { data } = await supabase
    .from("institutes")
    .select("name, tagline, address, phone, email, academic_year, primary_color, upi_id, upi_name")
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

// Client-side academy settings persisted in localStorage. No backend needed.

import { WA_TEMPLATES, type WhatsAppTemplateKey } from "./whatsapp";

export type InstituteSettings = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  academic_year: string;
  primary_color: string; // hex like #4f46e5
};

const KEY_INSTITUTE = "vk_institute";
const KEY_TEMPLATES = "vk_wa_templates";

const DEFAULT_INSTITUTE: InstituteSettings = {
  name: "VK Academy",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  academic_year: `${new Date().getFullYear()}-${String((new Date().getFullYear() + 1) % 100).padStart(2, "0")}`,
  primary_color: "",
};

function safeRead<T>(key: string): Partial<T> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Partial<T>; }
  catch { return {}; }
}

export function getInstitute(): InstituteSettings {
  return { ...DEFAULT_INSTITUTE, ...safeRead<InstituteSettings>(KEY_INSTITUTE) };
}

export function saveInstitute(s: InstituteSettings) {
  window.localStorage.setItem(KEY_INSTITUTE, JSON.stringify(s));
  applyBranding(s.primary_color);
  window.dispatchEvent(new Event("vk-institute-changed"));
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
  if (!hex) { root.style.removeProperty("--primary"); return; }
  root.style.setProperty("--primary", hex);
}

// Bootstrap branding on module load (client only)
if (typeof window !== "undefined") {
  applyBranding(getInstitute().primary_color);
}
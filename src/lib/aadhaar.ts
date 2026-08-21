import * as pako from "pako";

/**
 * Aadhaar Secure QR — the free, offline way to verify an applicant.
 *
 * Every Aadhaar card and e-Aadhaar PDF carries a UIDAI-signed QR code. We scan
 * it in the browser, decompress it and read the demographic fields. Nothing
 * leaves the device: we keep only the last 4 digits, a one-way fingerprint used
 * to block duplicate applications, and the fields the applicant edited after
 * auto-fill. The full Aadhaar number and the raw payload are never stored.
 */
export type AadhaarProfile = {
  name: string;
  dob: string; // yyyy-mm-dd
  gender: "M" | "F" | "T" | "";
  address: string;
  /** last 4 digits of the Aadhaar / VID reference on the card */
  last4: string;
  /** photo from the QR, as a data URL — may be empty */
  photo: string;
};

function bytesToString(b: Uint8Array): string {
  return new TextDecoder("iso-8859-1").decode(b);
}

/** UIDAI packs the QR as a big decimal number → bytes → gzip → 0xFF-delimited text. */
function decompress(raw: string): Uint8Array | null {
  const digits = raw.trim();
  if (!/^\d+$/.test(digits)) return null;
  let n = BigInt(digits);
  const out: number[] = [];
  const B = BigInt(256);
  while (n > BigInt(0)) {
    out.unshift(Number(n % B));
    n /= B;
  }
  try {
    return pako.inflate(new Uint8Array(out));
  } catch {
    try {
      return pako.inflateRaw(new Uint8Array(out));
    } catch {
      return null;
    }
  }
}

function toIsoDate(v: string): string {
  const s = v.trim();
  // Aadhaar prints dd-mm-yyyy or yyyy-mm-dd depending on the QR version.
  const dmy = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const year = s.match(/^(\d{4})$/);
  if (year) return `${year[1]}-01-01`;
  return "";
}

/**
 * Parses the payload of an Aadhaar Secure QR (V2 / V3 layouts).
 * Returns null when the QR is not an Aadhaar QR.
 */
export function parseAadhaarQr(raw: string): AadhaarProfile | null {
  const bytes = decompress(raw);
  if (!bytes) return null;
  const text = bytesToString(bytes);
  // fields are separated by byte 255
  const parts = text.split("\xff");
  if (parts.length < 10) return null;

  // V2 layout: [version?] refId, name, dob, gender, careOf, district, landmark,
  // house, location, pincode, postOffice, state, street, subDistrict, vtc, ...
  const offset = /^\d$/.test(parts[0] ?? "") ? 1 : 0;
  const refId = parts[offset] ?? "";
  const name = (parts[offset + 1] ?? "").trim();
  const dob = toIsoDate(parts[offset + 2] ?? "");
  const genderRaw = (parts[offset + 3] ?? "").trim().toUpperCase();
  const gender = (["M", "F", "T"].includes(genderRaw) ? genderRaw : "") as AadhaarProfile["gender"];

  const addressParts = [
    parts[offset + 7], // house
    parts[offset + 12], // street
    parts[offset + 6], // landmark
    parts[offset + 8], // location
    parts[offset + 14], // vtc
    parts[offset + 13], // sub district
    parts[offset + 5], // district
    parts[offset + 11], // state
    parts[offset + 9], // pincode
  ]
    .map((x) => (x ?? "").trim())
    .filter(Boolean);

  if (!name) return null;

  return {
    name,
    dob,
    gender,
    address: addressParts.join(", "),
    last4: refId.slice(0, 4).replace(/\D/g, ""),
    photo: "",
  };
}

/** One-way fingerprint — lets us block duplicates without ever storing Aadhaar. */
export async function aadhaarFingerprint(seed: string): Promise<string> {
  const data = new TextEncoder().encode(`academix:aadhaar:${seed.trim()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Demo payload used by the "Simulate scan" button while auditing. */
export const SAMPLE_AADHAAR: AadhaarProfile = {
  name: "Aarav Sharma",
  dob: "2010-06-14",
  gender: "M",
  address: "12, MG Road, Shivaji Nagar, Pune, Maharashtra, 411005",
  last4: "4821",
  photo: "",
};

# Academix reliability, plan controls, print kit, and marketing pass

## Goal
Fix Aadhaar QR scanning in the real admission journey, simplify institute Settings, make paid attendance-machine access enforceable, complete Super Admin plan controls, add professional counter-ready QR/receipt printing, and strengthen the public site with conversion essentials.

## What is verified today
- The Aadhaar camera opens, but decoding depends on `qr-scanner` reading a dense UIDAI Secure QR from the full video frame; there is no visible scan guide/state diagnosis and the parser only supports one delimiter-based payload layout.
- Settings currently exposes nine top-level tabs, including Attendance machines for every plan.
- Attendance-device access is not feature-gated in the UI, data policies, or public punch endpoint.
- Super Admin already has a hidden-in-practice **Plans & pricing** tab, but its editor omits batch, office-login, and teacher-login limits even though those fields exist in the live catalog and sync to institutes.
- Admission and enquiry QRs are display-only; there is no branded poster download or print action.
- Receipts have three designs and previews, but paper size is hard-coded by template (A5 or half-A5) and there is no explicit print-ready action/settings flow.
- Public marketing has a landing page, feature page, pricing, signup, and login, but no product screenshots, trust/privacy proof, direct sales/WhatsApp CTA, or focused demo conversion section.

## Build plan

### 1. Fix Aadhaar scanning end to end
- Replace the fragile single-path decode flow with a reliable scan pipeline for both live camera frames and uploaded/captured images, with bounded retries and clear states: starting, scanning, detected, unreadable, and permission failure.
- Use a centered scan region that preserves source resolution, rear-camera focus/zoom capabilities when available, and an image preprocessing fallback for low contrast or oversized frames.
- Harden Aadhaar Secure QR parsing for supported UIDAI payload variants and validate the decoded payload before auto-fill.
- Keep privacy-safe storage: auto-fill name, DOB, gender/address where available; persist only last four digits, the duplicate-prevention fingerprint, verification timestamp, and edited-field audit—not the full Aadhaar number or raw QR payload.
- Remove the production-facing “Simulate scan” control; retain manual form entry and photo upload as fallbacks.
- Validate camera lifecycle, repeated open/close, upload scan, failure feedback, and admission submission on phone-sized and desktop browsers. Physical Aadhaar validation will be documented as the one check requiring a real card/device.

### 2. Simplify Settings and enforce paid hardware access
- Reorganize nine tabs into five clearer groups: **Institute**, **Academics**, **Team & access**, **Communication**, and **Brand & print**.
- Place rooms/timings and fee defaults under Academics; roles, plan usage, and hardware under Team & access; WhatsApp templates under Communication; branding, receipt style, paper settings, and print assets under Brand & print.
- Add an explicit plan entitlement for attendance machines, editable by Super Admin per plan.
- Hide/lock the hardware controls for non-entitled plans with an upgrade/contact state.
- Enforce the same entitlement server-side in the attendance punch endpoint and database write rules so a free institute cannot bypass the UI.

### 3. Complete Super Admin plan management
- Expand **Plans & pricing** to edit every enforced limit: students, classrooms, batches, office logins, and teacher logins, plus visibility/highlight/contact-only/CTA.
- Add plan feature toggles for operational entitlements, beginning with attendance machines and custom branding, while keeping the concise public comparison rows independently editable.
- Add clear save feedback, validation, and a compact mobile-friendly editor instead of requiring a wide table.
- Keep catalog-to-institute propagation, then verify an update changes both the public pricing display and the affected institute limits/feature access.
- Remove the institute-side plan selector currently exposed inside Classroom settings; only Team Academix may change plans.

### 4. Add a branded Counter Print Kit
- Turn Admissions → QR into a print-assets workspace with separate **Enquiry** and **Admission** posters.
- Generate downloadable, high-resolution A4 PDFs/PNGs with a large scannable QR, short headline, institute/Academix branding according to plan entitlement, and a human-readable fallback URL.
- Add one-tap **Download PDF**, **Download image**, and **Print** actions, plus a combined two-poster pack.
- Use only Academix branding for Free; Growth/Campus/Chain include institute logo/name plus “Powered by Academix.”
- Verify the downloaded QR by decoding the generated asset and opening the correct institute-scoped form.

### 5. Make receipts truly ready to print
- Separate receipt visual template from paper format: support A5, A4 two-up, and thermal-friendly sizing where the chosen layout can fit safely.
- Add paper-size controls and live preview under Brand & print, persist the selection, and apply it consistently to downloads and shares.
- Add a direct **Print receipt** action after payment, while preserving PDF download and WhatsApp share.
- Add print margins, safe areas, stable page breaks, and a printable test sheet so staff can verify their printer before collecting fees.
- Verify each template/size combination by generating PDFs and checking page dimensions, branding entitlement, current-payment amount, mode, student/class/batch, and no clipping.

### 6. Marketing conversion essentials
- Add a direct WhatsApp sales CTA alongside email, using one verified Academix sales number consistently.
- Add an honest product preview section using real app screens (dashboard, mobile attendance, fee collection) rather than invented testimonials or metrics.
- Add a short trust/privacy section covering tenant isolation, Aadhaar privacy, data export, and no fee commission.
- Add a crisp “See it in action” journey and role-based outcomes for owner, teacher, and parent/student, linked to signup/pricing.
- Keep the landing page minimal: no long feature dump, fabricated claims, or oversized comparison table.

## Technical and security notes
- Database changes will add plan-level feature entitlements and a persisted receipt paper setting, with grants and tenant-safe RLS maintained.
- Paid access will be checked both in the UI and at the server/database boundary; client-side hiding alone is insufficient.
- Super Admin updates remain protected by `is_superadmin()` and plan/billing columns remain locked to institute users.
- Aadhaar handling will not store the full number, raw QR, or Aadhaar portrait. Storing those would create unnecessary identity-data risk and is not required for duplicate prevention or form auto-fill.
- Public sales links and form inputs will be validated/encoded; no unverified marketing claims will be added.

## Verification before completion
- Run focused automated tests for Aadhaar parsing, plan entitlement checks, QR generation, and receipt dimensions.
- Use Playwright on mobile (primary), tablet, and desktop for Settings, Super Admin plan editing, Admissions QR downloads, public apply forms, and post-payment receipt actions.
- Test the live database propagation from a plan edit to an institute and confirm free-plan hardware requests are rejected.
- Decode generated QR assets as part of testing and confirm both enquiry and admission URLs open correctly.
- Report any physical-device-only validation still required, especially a real Aadhaar Secure QR under Android/iPhone camera conditions.

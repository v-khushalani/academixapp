# Aadhaar camera scan fix + a real pricing page

Two things: make the live camera read the Aadhaar QR as reliably as an uploaded photo, and turn the pricing page into something that sells, driven entirely by the super admin panel.

## 1. Why camera scanning fails today (and the fix)

A gallery photo is an 8–12 megapixel still. The live camera preview the scanner reads from is a video stream, usually 1280x720 or lower after the browser downscales it. Aadhaar's secure QR is one of the densest codes in use — at video resolution the tiny squares blur into each other, so nothing decodes, no matter how steady the hand.

Fix, in order:

- **Take a real photo, not a video frame.** On "Capture", ask the camera for a full-resolution still (the same quality as a gallery photo) instead of grabbing the preview frame. This alone is what makes upload work.
- **Use the phone's built-in code reader** where available (most Android Chrome phones) — it is dramatically better on dense codes than the JavaScript reader — and fall back to the current reader otherwise.
- **Decode the framed square, upscaled.** Instead of the whole wide frame, crop to the on-screen guide box and try several sizes and contrast levels, the same multi-pass trick that already rescues uploaded photos.
- **Sharper preview:** request the highest stream the camera offers, start at no zoom (today it starts zoomed in ~20%, which can cut off a corner), add tap-to-focus, and keep the torch button.
- **Honest feedback:** show the live resolution and a "hold still / move closer / too dark" hint, and after a few failed seconds surface a one-tap "Take a photo instead" button that opens the phone's own camera app at full resolution — a guaranteed path that always works.
- Keep the existing typed-number and no-Aadhaar paths untouched.

Verification: run the admission form on a real phone-sized viewport, confirm the still-capture path, and confirm decode of a sample dense QR.

## 2. Pricing page

### Problems now
Three boxes reading "Free" / "Custom pricing" / "Custom pricing" tell a visitor nothing, and the comparison table only shows the extra rows an admin typed — the module ticks the super admin sets per plan are invisible to the public.

### What the market charges (India, coaching/school ERP)

| | Entry price | Setup fee | Notes |
| --- | --- | --- | --- |
| Teachmint | Free app, paid quote | — | Attendance, fees, parent comms and reports are paid |
| Classplus | ~₹2,000/mo + commission | ₹15,000–20,000 | Takes a cut of your fees |
| MyClassCampus | ₹80–150/student/yr | ₹10,000–25,000 | Mobile app and modules charged separately |
| Fedena | ₹80–150/student/yr | ₹5,000–10,000 | Add-on modules |
| Budget players | ₹58/student/yr | — | Bare bones |

Everyone charges per student and charges to start. Our wedge: flat price, zero setup, zero commission, and the daily work free forever.

### Recommended structure — flat yearly, discounted for longer terms

| Plan | Who it's for | 1 year | 3 years | 5 years |
| --- | --- | --- | --- | --- |
| Free forever | Up to 50 students, 1 classroom | ₹0 | ₹0 | ₹0 |
| Growth | One centre, unlimited students | ₹5,990 | ₹14,990 (₹4,997/yr, save 17%) | ₹22,990 (₹4,598/yr, save 23%) |
| Campus | Multi-branch | ₹14,990 | ₹37,990 (₹12,663/yr) | ₹56,990 (₹11,398/yr) — 5+ branches on a call |

Framing on the page: "Plans start at ₹0 a year" as the headline, each card showing "₹499/month, billed yearly" alongside the yearly figure so it reads cheap, plus a per-student line ("at 300 students that's ₹20 per student a year — competitors charge ₹80–150"). No true monthly billing: it invites churn after one exam season.

Term perks shown on the cards: 3-year locks the price for the term and includes free data migration; 5-year adds priority WhatsApp support and every new module released during the term. Founding offer: first 100 institutes keep their rate for life.

All numbers above are defaults the super admin can change at any time — nothing is hard-coded.

### Page changes
- 1 / 3 / 5-year term selector; cards show the term price, the per-year equivalent, the monthly equivalent, and a savings badge.
- "Starting at ₹0" hero line; remove the repeated "Custom pricing" wording. A plan marked sales-led still shows "from ₹X" with a walkthrough button.
- Comparison table becomes the single source of truth: it renders **both** the module ticks the super admin sets per plan **and** the extra rows typed in the panel, grouped exactly as in the panel. Anything toggled in the super admin panel appears here immediately.

### Super admin panel changes
- New price fields per plan: 1-year, 3-year, 5-year, and an optional short price note.
- A "show prices publicly" switch per plan, so a plan can still be sales-led.
- Remove the "prices stay internal" note; savings percentages are computed and previewed as the visitor will see them.

## Technical notes
- `plan_catalog` gains `price_1y`, `price_3y`, `price_5y`, `price_note`, `show_price` (migration with grants preserved); `price_yearly` stays as the fallback/sync source so institute limit propagation and `platform_push_plan` are untouched.
- `src/routes/pricing.tsx`: term state, new card layout, merged module + custom feature table sourced from `plan_catalog.features` and `plan_features`.
- `src/components/app/pricing-admin.tsx`: new price rows and the publish switch.
- `src/lib/plans.ts` fallback constants updated to match.
- `src/components/app/aadhaar-scan.tsx`: still-photo capture, native detector path, crop-and-upscale decode passes, tap-to-focus, resolution/quality hints, native-camera fallback button. No change to what we store — still only the last four digits.

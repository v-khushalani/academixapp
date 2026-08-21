# Pricing v4, branches, live site, and cleanup

## 1. What Academix should charge (India, coaching/tuition segment)

Market position today (rates seen in the segment):

| Competitor | Entry cost | What they gate |
| --- | --- | --- |
| Teachmint | Free app, quote for ERP | Attendance, fees, parent comms, reports, branding |
| Classplus | ~Rs 15-20k setup + Rs 2k+/mo + commission | Everything, plus a cut of fee collection |
| MyClassCampus | Rs 80-150/student/yr + Rs 10-25k setup | Mobile app, modules sold separately |
| Fedena | Rs 80-150/student/yr + Rs 5-10k setup | Add-on modules |
| Budget players | ~Rs 58/student/yr | Thin feature set |

Academix wins on: no setup fee, no commission, whole daily operation free.

Recommended plans (yearly only, 3-yr save 20%, 5-yr save 30%):

| Plan | Students | Classrooms | Batches | Office logins | Teacher logins | 1 year |
| --- | --- | --- | --- | --- | --- | --- |
| Free forever | 100 | 3 | 5 | 2 | 5 | Rs 0 |
| Growth | 500 | 10 | unlimited | 6 | 25 | Rs 5,990 |
| Campus | 1,500 | 30 | unlimited | 20 | unlimited | Rs 14,990 |
| Chain (multi-branch) | unlimited | unlimited | unlimited | unlimited | unlimited | Talk to us |

Why these numbers: Growth at 500 students works out to about Rs 12/student/year against Rs 80-150 for Fedena/MyClassCampus, so the price never becomes the objection. The current Rs 4,990 / Rs 12,990 is left slightly low for the value; a small lift keeps the story ("cheaper than one month of one staff salary") intact while improving revenue per institute. Prices stay hidden on the public page ("Talk to us") as decided earlier; the numbers live in the super-admin catalog.

Feature gating (unchanged principle - give the daily work away, charge for scale, automation, accountability):
- Free: admissions QR + approval, enquiries, students, batches, attendance, fees + receipts + UPI QR, tests, syllabus, timetable, all three portals, manual WhatsApp, CSV export.
- Growth adds: automated WhatsApp reminders/absent alerts, RFID/biometric attendance, full reports, PDF report cards, bulk messaging, branded documents, custom fee heads and instalments.
- Campus adds: granular role permissions, audit log, teacher performance dashboard, analytics with trends, custom fields, API/webhook, priority support, assisted migration.
- Chain adds: branches, branch-wise rollup, cross-branch transfer, consolidated finance, dedicated manager, custom domain.

All of this is edited in the super-admin pricing console and already propagates to real enforced limits, so the change is data plus the feature rows in the compare table.

## 2. Single academy with multiple branches - simplest approach

Keep one institute row per branch and link them with the existing `parent_institute_id` column. Nothing about data isolation changes, so no risk to existing institutes.

```text
VK International (parent, "head office")
 |- VK Kandivali   (branch institute)
 |- VK Borivali    (branch institute)
```

- Each branch keeps its own students, batches, fees, staff - exactly as a standalone institute does today.
- The owner's account gets access to the parent and all its branches; a branch switcher in the top bar changes the active branch.
- A "Group overview" screen on the parent shows students, collection, dues and attendance per branch plus a total.
- Branches are only available on the Chain plan; super admin attaches a branch to a parent from the platform console.

This is the least invasive option: no schema rewrite, no shared-table redesign, and single-branch institutes see no change at all.

## 3. academix.website not showing changes

The site is published, but a published site is a frozen snapshot - preview changes only appear on academix.website after a new publish. Nothing is broken. Action: publish again after these changes land, and publish each time you want the live site updated.

## 4. Cleanup of unused code

Confirmed dead or duplicated:
- `src/components/marketing/portal-picker.tsx` - not imported anywhere (left over from the three-portal login era).
- `src/lib/plans.ts` - now duplicates the database catalog; keep only the fallback used by `usage.ts`/`app.settings.tsx` and drop the hardcoded price/term/feature lists that the pricing page no longer reads.
- Stale plan-related copy in `for-institutes.tsx` / `guide-content.ts` that still describes old plan limits gets aligned with the catalog numbers.

Anything else flagged during the pass gets removed only if a repo-wide search shows zero imports.

## Technical notes

- Pricing: update `plan_catalog` and `plan_features` rows via migration (visible in the super-admin console afterwards); triggers already push limits to `institutes`.
- Branches: add branch selection to the platform console (`platform_update_institute` already accepts `_parent_institute_id`), extend `my_institute_ids()` so a parent owner also gets branch ids, add a top-bar branch switcher and a group overview page. RLS stays `institute_id`-scoped.
- Cleanup: delete unused files, prune `src/lib/plans.ts` to the fallback shape, keep `planFor()` for legacy keys.

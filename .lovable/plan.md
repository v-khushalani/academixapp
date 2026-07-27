## Aapka model — sahi hai, thoda extend karna padega

Aapne 3 logins bole. Classplus-style platform me actually **4 audiences** hote hain, kyunki student aur parent alag log hain (parent ke paas apna phone, aur ek se zyada bachche ho sakte hain):

```text
Academix (platform)
  └── Institute (tenant, e.g. aapki academy)
        ├── Admin / Staff login   → sab kuch manage
        ├── Teacher login         → sirf attendance + marks
        ├── Student login         → apni progress
        └── Parent login          → apne bachchon ki progress
```

Aapke paas roles pehle se hain (owner, admin, faculty, receptionist, counsellor, accountant, student, parent) aur module-level RBAC bhi hai. Jo missing hai: **student/parent ke liye koi portal UI nahi hai**, sab log ek hi `/login` par jaate hain, aur database me parent ka user account student se link karne ka koi table nahi hai.

---

## Kya banega

### 1. Teen alag login pages
- `/login/student` — student ya parent dono yahin se (tab switch: "Main student hoon" / "Main parent hoon"), phone/email + password
- `/login/teacher` — teachers ke liye, sign-in ke baad seedha Attendance par land
- `/login/admin` — staff/admin ke liye (aaj wala `/login` yahan redirect ho jaayega)

Teeno ka backend same Supabase auth hai — sirf branding, copy aur post-login destination alag. Galat portal se login karne par saaf message: "Ye teacher login hai, aap student portal use karein" + sahi link.

### 2. Student/Parent portal (naya `/portal`)
Alag, halka layout — app ka bhaari sidebar nahi, mobile-first bottom nav:
- **Home** — attendance %, pichhle test ka score, pending fees, aaj ki classes — ek nazar me
- **Attendance** — month calendar, present/absent/late days, absent dates ki list
- **Progress** — har test ka score, max marks, batch average se comparison, trend chart
- **Fees** — paid/pending, due date, receipt list
- **Timetable** — apne batch ka weekly schedule
- **Homework & Material** — assignments aur downloads

Parent login me upar **child switcher** — ek se zyada bachche ho to switch karke dono ka data dekh sake. Sab data read-only.

### 3. Auto account on approval
Jab admin admission **approve** karta hai:
- Student ka auth account ban jaata hai (phone/email se), `student` role assign
- Monitoring parent (jo aapne "who monitors studies" me select kiya) ka account ban jaata hai, `parent` role
- Dono ko WhatsApp deep-link jaata hai: "Aapka Academix login ready hai — yahan password set karein"
- Same parent ke doosre bachche ho to naya account nahi banta, wahi account se dono bachche link ho jaate hain

Approve karne wale ke liye Students page par "Resend login link" bhi rahega.

### 4. Teacher portal tighten
Faculty pehle se sirf Dashboard/Attendance/Tests/Timetable dekhta hai. Isko finish karenge: faculty sirf **apne assigned batches** ke students dekhe (abhi sabhi dikhte hain), aur teacher login ke baad landing page Attendance ho.

---

## Technical section

**Database migration**
- `parent_students` table: `parent_user_id` → `auth.users`, `student_id` → `students`, `relation`, `is_primary`; unique (parent_user_id, student_id). GRANTs + RLS.
- `students.user_id` already exists — student auth account isi me link hoga.
- Security-definer helpers: `public.is_my_student(_student_id uuid)` — true agar `students.user_id = auth.uid()` ya `parent_students` me row hai.
- Read-only RLS policies for `student`/`parent` roles on: `students` (own row), `attendance`, `test_results`, `fees`, `fee_payments`, `homework`, `study_material`, `timetable_slots` (own batch), all gated by `is_my_student()`.
- `set_student_approval` RPC extend: approve par account provisioning trigger karega.

**Account provisioning** — server function (`createServerFn`) with `supabaseAdmin` loaded inside handler: `auth.admin.createUser` (email confirm off, random password), role insert into `user_roles`, `parent_students` row, aur password-setup link generate karna. Admin-only, caller ka role `context.supabase` se verify hoga admin client use karne se pehle.

**Routes**
- `src/routes/login.student.tsx`, `login.teacher.tsx`, `login.admin.tsx`; existing `/login` → `/login/admin` redirect
- `src/routes/portal.tsx` (layout + guard, `ssr: false`) with `portal.index.tsx`, `portal.attendance.tsx`, `portal.progress.tsx`, `portal.fees.tsx`, `portal.timetable.tsx`, `portal.homework.tsx`
- `src/routes/app.tsx` guard: `student`/`parent` role wale user ko `/portal` par bhej dega; portal guard staff ko `/app` par

**Reusable pieces** — `PortalShell` (header + bottom nav), `ChildSwitcher` (context for selected student), `StatTile`, `ScoreTrendChart` (recharts), aur `portalApi` in `src/lib/api/` — sab reads existing tables se, koi mock data nahi.

**Sequence** — (1) migration, (2) provisioning server fn + approval hook, (3) three login pages + redirects, (4) portal layout + 6 pages, (5) faculty scoping + teacher landing, (6) mobile pass + Playwright verify with a real approved student.

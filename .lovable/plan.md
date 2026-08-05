# Academix go-live checklist (step by step)

Everything below is done in a browser, in dashboards. No coding. Do them in order.

## Before you start — one thing I need from you

The sign-in logs show people arriving from **academix.website**, but the app is also published by Lovable at **academixapp.lovable.app**, and you mentioned Vercel. Tell me which one you want to be the real address for teachers/parents:

- A) academix.website (your own domain) — recommended
- B) academixapp.lovable.app (the Lovable address)

Wherever the answer differs below, I mark it as **(A)** or **(B)**. If you're unsure, do both — adding extra addresses is harmless.

---

## Step 1 — Fix the Google sign-in redirect (this is the bug you hit)

1. Open the Supabase dashboard link at the bottom of this plan (**Authentication → URL Configuration**).
2. In the box called **Site URL**, put exactly one address:
   - (A) `https://academix.website`
   - (B) `https://academixapp.lovable.app`
3. In **Redirect URLs**, click "Add URL" and add each of these on its own line (add all of them, even the ones you don't use daily):
   - `https://academix.website/**`
   - `http://academix.website/**`
   - `https://www.academix.website/**`
   - `https://academixapp.lovable.app/**`
   - `https://id-preview--16835a18-300a-469b-8bf2-6c7cc98982e8.lovable.app/**`
   - your Vercel address, if the app runs there too, e.g. `https://academix.vercel.app/**`
4. Click **Save**.

The `/**` at the end matters — it means "any page on this site". Without it Supabase throws everyone back to the home page, which is exactly what happened to your teacher.

## Step 2 — Match the same addresses in Google Cloud

In the Google Cloud project where you made the Client ID and Secret, open **APIs & Services → Credentials → your OAuth 2.0 Client ID**:

1. **Authorised JavaScript origins** — add (no trailing slash):
   - `https://academix.website`
   - `https://academixapp.lovable.app`
2. **Authorised redirect URIs** — add exactly this one line:
   - `https://jjqdcdwvcxmeplmuhvha.supabase.co/auth/v1/callback`
3. Save. Google can take a few minutes to apply changes.

Also, on the **OAuth consent screen** page: if it says "Testing", click **Publish app** → confirm. If it stays in Testing, only the emails you personally listed can sign in — every other teacher gets blocked.

## Step 3 — Confirm the Google provider is on in Supabase

Authentication → Providers → Google: toggle **Enabled**, Client ID and Client Secret filled in, Save.

## Step 4 — Decide where the app actually runs (Vercel vs Lovable)

Running the same app in two places causes exactly the kind of "it worked yesterday" confusion you want to avoid before launch.

- If you keep **Lovable hosting**: connect academix.website in Project Settings → Domains, and remove/park the Vercel deployment.
- If you keep **Vercel**: make sure the Vercel project has these two environment variables set (Settings → Environment Variables), then redeploy:
  - `VITE_SUPABASE_URL` = `https://jjqdcdwvcxmeplmuhvha.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = the anon key from Supabase → Settings → API

Pick one. I'd recommend Lovable hosting so publishing from here is the single source of truth.

## Step 5 — Publish the current build

Click Publish in Lovable. The redirect fixes I already made to the code only go live after this.

## Step 6 — Test it yourself, in this order (10 minutes)

Use your phone, not the laptop you're logged in on — or an incognito window.

1. Open the live address → landing page loads.
2. Owner login → you reach the admin dashboard.
3. Create a faculty invite → send yourself the WhatsApp link.
4. Open that link on the phone → **Continue with Google** with a Gmail that has never used Academix → you should land on the **teacher** dashboard, not the landing page.
5. As that teacher: mark attendance for one batch, enter one test mark, update one syllabus chapter.
6. As owner: add a student, assign a batch, check the fee auto-appeared, collect a part payment, send a WhatsApp fee reminder.
7. Student/parent login → check attendance, fees, timetable pages open.

If step 4 lands you on the landing page again, Step 1 wasn't saved correctly — send me a screenshot of the URL Configuration page.

## Step 7 — Clean up before real families arrive

- Delete the `@academix.website` test accounts (Supabase → Authentication → Users) once testing passes, or keep 1 for support.
- Change the owner password from `Test@1234` to a real one.
- Confirm no leftover demo students/batches in the admin lists.

---

## Do NOT do these

- Don't change the Supabase project, keys, or the `.env` values by hand.
- Don't delete rows directly in Supabase table editor once real admissions start — use the app, so fees and attendance stay consistent.
- Don't share the super-admin login with institute staff; give each person their own role.
- Don't put a trailing slash on Google "Authorised JavaScript origins" — Google rejects it.
- Don't leave the Google consent screen in "Testing" mode.

## What I'll do after you finish Steps 1-3

Tell me "done" and I'll run the full end-to-end browser check (owner, teacher, student, parent) against the live site plus the automated test suite, and fix anything that breaks — before you send a single invite to a real teacher.

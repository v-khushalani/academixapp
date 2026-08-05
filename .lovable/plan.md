# Which URLs to put where (academix.website on Vercel)

You host on Vercel, the domain is academix.website, and the code also sits in Lovable + GitHub. Below is exactly what to paste in each box. Copy them literally.

## Decide one "real" address first

Public address for teachers/parents: **https://academix.website**

Everything else (Vercel's auto URLs, the Lovable preview) exists only for you and testing. Keep them allowed for testing, but never send them to teachers.

## 1. Supabase → Authentication → URL Configuration

**Site URL** (only one allowed):
```
https://academix.website
```

**Redirect URLs** (add each on its own line, the `/**` matters):
```
https://academix.website/**
https://www.academix.website/**
https://academixapp.lovable.app/**
https://id-preview--16835a18-300a-469b-8bf2-6c7cc98982e8.lovable.app/**
http://localhost:8080/**
```
Optionally also your Vercel URLs if you test on them:
```
https://<your-project>.vercel.app/**
```

Do NOT add: `http://academix.website` (plain http), bare URLs without `/**`, or the Supabase URL itself.

## 2. Google Cloud → Credentials → your OAuth Client ID

**Authorised JavaScript origins** (no trailing slash, no `/**`):
```
https://academix.website
https://www.academix.website
https://academixapp.lovable.app
```

**Authorised redirect URIs** — exactly one line, nothing else:
```
https://jjqdcdwvcxmeplmuhvha.supabase.co/auth/v1/callback
```
This is the single most-mistaken box: it is the *Supabase* callback, never your own domain.

Also on **OAuth consent screen**: if it says "Testing", click **Publish app**. Otherwise only emails you listed can sign in.

## 3. Vercel

- Domains: `academix.website` as primary, `www.academix.website` redirecting to it.
- Environment Variables (Production + Preview), then redeploy:
  - `VITE_SUPABASE_URL` = `https://jjqdcdwvcxmeplmuhvha.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key from Supabase → Settings → API
- Nothing else is needed; no service-role key on Vercel.

## 4. Lovable

Since Vercel serves the real traffic, do not connect academix.website in Lovable too — one domain cannot point at two hosts. Keep `academixapp.lovable.app` as a staging copy only.

## 5. Test (10 minutes, incognito or phone)

1. Open https://academix.website → landing page loads.
2. Owner login → admin dashboard.
3. Create a faculty invite → open the WhatsApp link on a phone.
4. **Continue with Google** with a fresh Gmail → must land on the teacher dashboard, not the landing page.
5. Teacher: mark attendance, enter a mark, update a chapter.
6. Student/parent login → attendance, fees, timetable open.

If step 4 dumps you on the landing page, Supabase Site URL / Redirect URLs weren't saved — screenshot that page and send it.

## Do not

- Don't put your own domain in Google's "Authorised redirect URIs".
- Don't leave off the `/**` in Supabase redirect URLs.
- Don't run the app on Vercel and Lovable custom domain at the same time.
- Don't leave the Google consent screen in Testing.
- Don't change `.env` values by hand in the repo.

## Technical notes

No code changes are needed for this — `src/components/auth/google-button.tsx` already sends `redirectTo: ${window.location.origin}/auth/callback`, so it works on whichever host serves the page, as long as that origin is in the Supabase allow-list. `src/routes/auth.callback.tsx` plus the `PostAuthGate` on the landing page handle invite claiming and portal routing.

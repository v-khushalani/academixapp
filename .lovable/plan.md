# Academix logo, wordmark, loading mark and "Add to home screen"

Your uploaded artwork becomes the one official Academix identity: the mark (dashboard panel + orange X), the wordmark "ACADEMIX" with the enhanced X, and the tagline "SMARTER SYSTEM. EXTRA IMPACT."

## 1. Brand assets from your artwork

From the uploaded image, prepare three clean pieces:

- **App mark** — the square symbol (panel + X), white background removed, exported at 512 / 192 / 180 / 64 px.
- **Full lockup** — mark + ACADEMIX wordmark + tagline, for the landing page hero and login card.
- **Wordmark only** — for headers and footers where space is tight.

These are stored as CDN assets (pointer files in the repo, not heavy binaries), except the favicon, which must be a real file in `public/`.

## 2. Where the logo appears

- Marketing header/footer, login card, signup, guide, pricing, apply/onboarding pages, and the Academix side of the admin shell.
- Browser tab icon (replaces the current default favicon) and the iOS/Android home-screen icon.
- Anywhere the word "Academix" is written as a brand label, it uses the wordmark styling: `ACADEMI` in the dark navy plus the orange enhanced `X`, all caps, matching your artwork. Plain body text mentioning Academix stays normal text.
- Institute branding is untouched: institutes with their own logo switched on still show their own mark; the Academix identity only replaces the Academix-side branding and the "Powered by Academix" credit.

## 3. Loading indicator

Replace the generic spinners/blank loading states across the app with an Academix loader: the logo mark with a subtle pulse and the X drawing in, sized small (inline) and large (full-page). One shared component used by route loading states, dialogs and table skeletons.

## 4. Add to home screen (installable app)

- Add a web app manifest with the Academix name, short name "Academix", theme/background colours from the logo (navy + orange), `display: standalone`, and the icon set from step 1, so Android and iPhone can pin Academix to the home screen.
- Add an **"Install Academix"** option:
  - Android/Chrome: a button that triggers the native install prompt when the browser offers it.
  - iPhone/Safari: the same button opens a short sheet showing Share → "Add to Home Screen" with the icon preview (iOS has no programmatic prompt).
  - The button hides automatically when the app is already installed/running standalone.
- Placement: in the login page footer and in the app/portal profile menu, so admins, teachers, students and parents all see it.
- No offline mode / service worker — you did not ask for offline, and adding one risks stale screens after updates. Home-screen install works without it.

## Technical notes

- Assets: `magick` crops/pads the upload; `lovable-assets create` publishes them; favicon and `apple-touch-icon` are written as real files under `public/` and referenced from `head().links` in `src/routes/__root.tsx`. The template's `public/favicon.ico` is removed.
- New `src/components/brand.tsx` exports: `AcademixLogo` (mark | lockup | wordmark variants), `AcademixWordmark` (styled ACADEMI + accent X), and `AcademixLoader`.
- Accent colour: the orange from the logo is added to `src/styles.css` as a semantic token (`--accent-brand`) so no hardcoded hex ends up in components.
- Manifest: `public/manifest.webmanifest` + `head()` links and `theme-color`; install logic in a small `useInstallPrompt` hook (`beforeinstallprompt`, `display-mode: standalone` detection, iOS fallback copy). No `vite-plugin-pwa`, no service worker.

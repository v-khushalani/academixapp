import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/institute-controls";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — Academix" },
      {
        name: "description",
        content:
          "How Academix collects, stores and protects institute, student and parent data, and how to request a copy or deletion.",
      },
      { property: "og:title", content: "Privacy policy — Academix" },
      {
        property: "og:description",
        content:
          "How Academix collects, stores and protects institute, student and parent data, and how to request a copy or deletion.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://academixapp.lovable.app/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://academixapp.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Privacy policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated 8 August 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">Who we are</h2>
            <p className="mt-2">
              Academix is software used by coaching institutes to run admissions, attendance, fees,
              tests and timetables. Each institute is the owner of the data it enters. Academix
              stores and processes that data on the institute&apos;s behalf.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">What we store</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Student details entered at admission — name, date of birth, class, school, photo.</li>
              <li>Parent or guardian name and phone number, used for fee and attendance updates.</li>
              <li>Attendance, marks, syllabus progress and fee records created during daily use.</li>
              <li>Login details of institute staff and teachers (email and an encrypted password).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">How the data is used</h2>
            <p className="mt-2">
              Only to run the institute&apos;s own operations. We do not sell data, we do not share
              it with advertisers, and we do not use one institute&apos;s data to serve another.
              Messages to parents are sent from the institute&apos;s own WhatsApp — Academix simply
              prepares the message.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Separation between institutes</h2>
            <p className="mt-2">
              Every record is tagged to one institute and access rules are enforced in the database,
              not just in the app. Staff of one institute cannot read another institute&apos;s
              records.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Storage and security</h2>
            <p className="mt-2">
              Data is stored on managed cloud infrastructure with encryption in transit and at rest.
              Student photos and documents sit in a private store that only signed-in staff of the
              same institute can open. Passwords are never stored in readable form.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Retention and deletion</h2>
            <p className="mt-2">
              Records stay for as long as the institute keeps its account. If an institute leaves,
              we export its data on request and delete it within 30 days. A parent or student can
              ask their institute for a copy of their record or for it to be removed; the institute
              can action this directly, or contact us for help.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Children&apos;s data</h2>
            <p className="mt-2">
              Records of students under 18 are entered by the institute with parental consent taken
              at admission. Parent portal access is given only to the contact the institute marks as
              the guardian.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              For any privacy request, call Academix on{" "}
              <a className="text-primary hover:underline" href={`tel:${SUPPORT_PHONE_TEL}`}>
                {SUPPORT_PHONE}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </MarketingShell>
  );
}
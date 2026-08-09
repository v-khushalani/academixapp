import { createFileRoute } from "@tanstack/react-router";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/lib/institute-controls";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — Academix" },
      {
        name: "description",
        content:
          "Terms for using Academix: plans and limits, payments, cancellation and refunds, acceptable use and support.",
      },
      { property: "og:title", content: "Terms of service — Academix" },
      {
        property: "og:description",
        content:
          "Terms for using Academix: plans and limits, payments, cancellation and refunds, acceptable use and support.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://academixapp.lovable.app/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://academixapp.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Terms of service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated 8 August 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">The agreement</h2>
            <p className="mt-2">
              These terms apply to any institute that creates an account on Academix and to the
              staff, teachers, students and parents who use it. Creating an account means you accept
              them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Your account</h2>
            <p className="mt-2">
              The institute is responsible for who it invites and what those logins can see. Keep
              credentials private and tell us if a login should be removed. You confirm you have the
              right to enter the student and parent details you upload.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Plans and limits</h2>
            <p className="mt-2">
              Each institute is allocated limits — students, classrooms, batches, faculty and the
              number of office and teacher logins — along with the modules switched on for it. These
              limits are enforced by the system. To raise a limit or switch on a module, call
              Academix on{" "}
              <a className="text-primary hover:underline" href={`tel:${SUPPORT_PHONE_TEL}`}>
                {SUPPORT_PHONE}
              </a>
              . There is no self-serve upgrade.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Payments</h2>
            <p className="mt-2">
              Paid plans are billed yearly in advance in Indian rupees, at the amount agreed on the
              call. Taxes are extra where applicable. Access continues for the full period paid for.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Cancellation and refunds</h2>
            <p className="mt-2">
              You may cancel at any time by calling us. If you cancel within 14 days of a fresh
              yearly payment and have not migrated live student data, we refund that payment in
              full. After 14 days the year already paid for is non-refundable, and the account stays
              active until the end of that period. We will export your data for you on the way out.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Acceptable use</h2>
            <p className="mt-2">
              Do not use Academix to send unsolicited marketing to parents, to store data you have
              no right to hold, or to attempt to access another institute&apos;s records. We may
              suspend an account that does.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Availability and support</h2>
            <p className="mt-2">
              We aim to keep Academix available at all times but cannot promise uninterrupted
              service; planned maintenance is done outside institute hours where possible. Support
              is over phone and WhatsApp on {SUPPORT_PHONE}.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Liability</h2>
            <p className="mt-2">
              Academix is a record-keeping tool. The institute remains responsible for its fee
              collection, its statutory records and the messages it sends. Our total liability in
              any claim is limited to the fees paid for the preceding twelve months.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">Changes</h2>
            <p className="mt-2">
              We may update these terms; material changes are told to institute owners before they
              take effect. Indian law applies and courts in India have jurisdiction.
            </p>
          </section>
        </div>
      </article>
    </MarketingShell>
  );
}
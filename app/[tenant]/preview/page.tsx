import { notFound } from "next/navigation";
import {
  Banner, Field, PropertyCard, StepIndicator, UploadControl, buttonClass, describedBy, inputClass, type UploadState,
} from "@/components/ui";
import { AA_NORMAL_TEXT, contrastRatio } from "@/lib/contrast";
import { resolveTenant } from "@/lib/tenant";

// Proves an operator renders correctly from data alone and exposes an illegible theme. No applicant data.
export default async function ThemePreview({ params }: PageProps<"/[tenant]/preview">) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  const { color_primary, color_primary_contrast, color_accent } = tenant.theme;

  const pair = contrastRatio(color_primary_contrast, color_primary);
  const accentOnWhite = contrastRatio(color_accent, "#FFFFFF");
  const passes = pair >= AA_NORMAL_TEXT;
  const property = tenant.properties[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Theme preview for {tenant.displayName}</h1>
        <p className="text-muted">This page shows this operator&apos;s colors and components. Check it in both light and dark mode.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Operator colors</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["Primary", "--color-primary", color_primary],
            ["Primary contrast", "--color-primary-contrast", color_primary_contrast],
            ["Accent", "--color-accent", color_accent],
          ].map(([label, token, value]) => (
            <li key={token} className="flex items-center gap-3 rounded-md border border-divider bg-surface-raised p-3">
              <span className="h-10 w-10 shrink-0 rounded-md border border-border" style={{ background: value }} aria-hidden="true" />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block font-mono text-sm" data-token={token}>{value}</span>
              </span>
            </li>
          ))}
        </ul>
        <div data-testid="contrast-result">
          {passes ? (
            <Banner tone="success" title={`${pair.toFixed(2)}:1, passes (minimum ${AA_NORMAL_TEXT}:1)`}>
              Primary contrast text on the primary color.
            </Banner>
          ) : (
            <Banner tone="danger" title={`Fails: ${pair.toFixed(2)}:1, minimum ${AA_NORMAL_TEXT}:1`}>
              Text on this operator&apos;s primary color is not readable.
            </Banner>
          )}
        </div>
        <p className="text-sm text-muted">
          Accent on white: {accentOnWhite.toFixed(2)}:1. Accent is decoration only and never carries text.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonClass.primary}>Primary</button>
          <button type="button" className={buttonClass.secondary}>Secondary</button>
          <button type="button" className={buttonClass.quiet}>Quiet</button>
          <button type="button" className={buttonClass.primary} aria-busy="true" disabled>Saving…</button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Inputs</h2>
        <Field id="preview_hint" label="With a hint" hint="Hint text sits between the label and the control.">
          <input id="preview_hint" className={inputClass()} aria-describedby={describedBy("preview_hint", "hint")} />
        </Field>
        <Field id="preview_error" label="With an error" error="This is what an error looks like.">
          <input id="preview_error" className={inputClass(true)} aria-invalid="true"
                 aria-describedby={describedBy("preview_error", undefined, "error")} />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Step indicator</h2>
        <StepIndicator
          current="income"
          steps={[
            { slug: "household", title: "Household", state: "complete", href: "#" },
            { slug: "income", title: "Income", state: "in_progress", href: "#" },
            { slug: "assets", title: "Assets", state: "not_started" },
            { slug: "documents", title: "Documents", state: "not_started" },
            { slug: "review", title: "Review", state: "not_started" },
          ]}
        />
      </section>

      {property && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Property card</h2>
          <PropertyCard name={property.name} address={`${property.addressLine1}, ${property.city}`}
                        units={property.totalUnits} programs={property.programs.map((p) => p.name)} href="#" />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Banners</h2>
        <Banner tone="success" title="Saved">Success banner.</Banner>
        <Banner tone="info" title="Check this">Information banner.</Banner>
        <Banner tone="warning" title="Check this">Warning banner.</Banner>
        <Banner tone="danger" title="Something went wrong">Error banner.</Banner>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Upload control</h2>
        {(["empty", "uploading", "uploaded", "error"] as UploadState[]).map((s) => <UploadControl key={s} state={s} />)}
      </section>
    </div>
  );
}

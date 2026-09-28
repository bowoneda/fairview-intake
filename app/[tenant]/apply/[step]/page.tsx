import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, Field, StepIndicator, UploadControl, buttonClass, inputClass } from "@/components/ui";
import { accessFor } from "@/lib/guard";
import { STEPS, isStep, loadApplication, stepList, type StepSlug } from "@/lib/intake";
import { resolveTenant } from "@/lib/tenant";
import { HouseholdForm } from "./household-form";

const RELATIONSHIP_LABEL: Record<string, string> = {
  head: "Head of household", spouse: "Spouse", co_head: "Co head", dependent: "Dependent", other_adult: "Other adult",
};

export default async function IntakeStep({ params, searchParams }: PageProps<"/[tenant]/apply/[step]">) {
  const { tenant: slug, step } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant || !isStep(step)) notFound();

  const access = await accessFor(tenant);
  if (access.kind === "mismatch") return null; // the layout shows the mismatch page; load nothing
  if (access.kind !== "applicant") redirect(`/${tenant.slug}/apply`);
  const app = await loadApplication();
  if (!app) redirect(`/${tenant.slug}?notice=choose-property`);

  const base = `/${tenant.slug}`;
  const index = STEPS.findIndex((s) => s.slug === step);
  const title = STEPS[index].title;
  const prev = index > 0 ? `${base}/apply/${STEPS[index - 1].slug}` : `${base}/apply`;
  const next = index < STEPS.length - 1 ? `${base}/apply/${STEPS[index + 1].slug}` : `${base}/apply`;
  const saved = (await searchParams).saved === "1";

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator steps={stepList(app, base)} current={step} />
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {saved && <Banner tone="success" title="Saved" />}
      <StepBody step={step} tenantSlug={tenant.slug} household={app.household} />
      {step !== "household" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={prev} className={buttonClass.quiet}>Back</Link>
          <Link href={next} className={buttonClass.primary}>Continue</Link>
          <Link href={`${base}/apply`} className={buttonClass.quiet}>Finish later</Link>
        </div>
      )}
    </div>
  );
}

function Later({ children }: { children: React.ReactNode }) {
  return <Banner tone="info" title="Coming in a later release">{children}</Banner>;
}

function StepBody({ step, tenantSlug, household }: {
  step: StepSlug; tenantSlug: string; household: { id: string; fullName: string; relationship: string; dateOfBirth: string | null }[];
}) {
  switch (step) {
    case "household":
      return (
        <div className="flex flex-col gap-6">
          <p>Add everyone who will live in the home, starting with the head of household.</p>
          {household.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label="People added so far">
              {household.map((m) => (
                <li key={m.id} className="rounded-md border border-divider bg-surface-raised p-3">
                  <p className="font-semibold">{m.fullName}</p>
                  <p className="text-sm text-muted">
                    {RELATIONSHIP_LABEL[m.relationship] ?? m.relationship}{m.dateOfBirth ? `, born ${m.dateOfBirth}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h2 className="text-xl font-semibold">{household.length === 0 ? "Head of household" : "Add another person"}</h2>
          <HouseholdForm tenant={tenantSlug} hasHead={household.some((m) => m.relationship === "head")} />
        </div>
      );
    case "income":
      return (
        <div className="flex flex-col gap-4">
          <p>For each person, tell us about any income they receive.</p>
          <Field id="income_type" label="Income source type" hint="Job, self employment, benefits, regular payments from a person or app, or other.">
            <select id="income_type" disabled className={inputClass()}><option>Job</option></select>
          </Field>
          <Later>Connect your payroll or bank, or upload paystubs and tax forms.</Later>
        </div>
      );
    case "assets":
      return (
        <div className="flex flex-col gap-4">
          <p>List bank accounts and other assets. You never need to type a full account number here.</p>
          <Field id="asset_institution" label="Institution name">
            <input id="asset_institution" disabled className={inputClass()} />
          </Field>
          <Later>Connecting your bank fills in balances and interest for you.</Later>
        </div>
      );
    case "documents":
      return (
        <div className="flex flex-col gap-4">
          <p>Upload paystubs, benefit letters, or tax forms if you cannot connect an account.</p>
          <UploadControl state="empty" />
        </div>
      );
    case "review":
      return (
        <div className="flex flex-col gap-4">
          <section className="rounded-md border border-divider bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Household</h2>
              <Link href={`/${tenantSlug}/apply/household`} className="underline">Change</Link>
            </div>
            <p>{household.length} {household.length === 1 ? "person" : "people"}</p>
          </section>
          <Later>Your income determination and electronic signature appear here.</Later>
        </div>
      );
  }
}

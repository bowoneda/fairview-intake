import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, StepIndicator, buttonClass } from "@/components/ui";
import { accessFor } from "@/lib/guard";
import { BankConnect } from "@/components/ingestion/bank-connect";
import { DocumentUploader } from "@/components/ingestion/document-uploader";
import { TransferQuestion } from "@/components/ingestion/transfer-question";
import { STEPS, isStep, loadApplication, loadIngestionView, stepList, type IngestionView, type StepSlug } from "@/lib/intake";
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
      <StepBody step={step} tenantSlug={tenant.slug} household={app.household}
                view={["income", "assets", "documents"].includes(step) ? await loadIngestionView(app.id) : null} />
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

const CONNECTION_TEXT: Record<string, string> = {
  link_started: "Not finished", exchanged: "Connected, reading data", awaiting_data: "Connected, waiting for your bank",
  ingested: "Connected", reauth_required: "Needs you to sign in to your bank again", error: "Could not read this account", revoked: "Disconnected",
};
const DOC_KIND_TEXT: Record<string, string> = { paystub: "Pay stub", w2: "W-2", schedule_c: "Schedule C", benefit_letter: "Benefit letter", other: "Other document" };
const DOC_STATUS_TEXT: Record<string, string> = {
  uploaded: "Uploaded", processing: "Reading", extracted: "Read", needs_review: "Read; a reviewer will check it", failed: "Could not be read",
};
const SOURCE_TEXT: Record<string, string> = { employment: "Job", self_employment: "Self employment", benefit: "Benefit", recurring_transfer: "Regular payments", other: "Other" };
const money = (n: number | null) => (n === null ? "" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

function StepBody({ step, tenantSlug, household, view }: {
  step: StepSlug; tenantSlug: string; household: { id: string; fullName: string; relationship: string; dateOfBirth: string | null }[];
  view: IngestionView | null;
}) {
  const members = household.map((m) => ({ id: m.id, name: m.fullName }));
  const nameOf = (id: string) => household.find((m) => m.id === id)?.fullName ?? "Household member";
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
    case "income": {
      const awaiting = view!.sources.filter((x) => x.status === "awaiting_family_statement");
      const others = view!.sources.filter((x) => x.status !== "awaiting_family_statement");
      return (
        <div className="flex flex-col gap-6">
          <p>Connect a bank account, or upload pay stubs and tax forms in the Documents step. We read the figures for you.</p>
          {awaiting.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold">Questions about deposits we found</h2>
              {awaiting.map((src) => <TransferQuestion key={src.id} tenant={tenantSlug} source={src} />)}
            </section>
          )}
          {others.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Income we have so far</h2>
              <ul className="flex flex-col gap-2">
                {others.map((src) => (
                  <li key={src.id} className="rounded-md border border-divider bg-surface-raised p-3">
                    <p className="font-semibold">{SOURCE_TEXT[src.sourceType] ?? src.sourceType}{src.employerName ? `: ${src.employerName}` : ""}</p>
                    <p className="text-sm text-muted">
                      {nameOf(src.memberId)}{src.grossPay !== null ? ` · ${money(src.grossPay)}${src.payFrequency ? ` ${src.payFrequency.replace("_", " ")}` : ""}` : ""}
                      {src.status === "awaiting_review" ? " · Your answer is saved; a reviewer will confirm it" : ""}
                      {src.needsReview && src.status !== "awaiting_review" ? " · A reviewer will check this" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Connect your bank</h2>
            {view!.connections.length > 0 && (
              <ul className="flex flex-col gap-1">
                {view!.connections.map((c) => <li key={c.id} className="text-sm">{nameOf(c.memberId)}: {CONNECTION_TEXT[c.status] ?? c.status}</li>)}
              </ul>
            )}
            <BankConnect tenant={tenantSlug} members={members} />
          </section>
          <Later>Connecting your payroll directly is coming in a later release. Until then, upload pay stubs in the Documents step.</Later>
        </div>
      );
    }
    case "assets":
      return (
        <div className="flex flex-col gap-4">
          <p>Accounts from a connected bank appear here with their balances. You never need to type a full account number.</p>
          {view!.assets.length === 0 ? (
            <Banner tone="info" title="No accounts yet">Connect a bank in the Income step and your accounts will appear here.</Banner>
          ) : (
            <ul className="flex flex-col gap-2">
              {view!.assets.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-divider bg-surface-raised p-3">
                  <span>
                    <span className="block font-semibold">{a.institution ?? "Account"}</span>
                    <span className="block text-sm text-muted">{a.type}{a.lastFour ? ` ending ${a.lastFour}` : ""}</span>
                  </span>
                  <span className="font-semibold">{money(a.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "documents":
      return (
        <div className="flex flex-col gap-6">
          <p>Upload pay stubs, W-2s, Schedule C, or a benefit letter if you cannot connect an account.</p>
          <DocumentUploader tenant={tenantSlug} members={members} />
          {view!.documents.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Your documents</h2>
              <ul className="flex flex-col gap-2">
                {view!.documents.map((d) => (
                  <li key={d.id} className="rounded-md border border-divider bg-surface-raised p-3">
                    <p className="font-semibold">{DOC_KIND_TEXT[d.kind] ?? d.kind} · {nameOf(d.memberId)}</p>
                    <p className={`text-sm ${d.status === "failed" ? "text-danger" : "text-muted"}`}>{DOC_STATUS_TEXT[d.status] ?? d.status}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
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

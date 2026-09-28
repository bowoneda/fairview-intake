import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, StepIndicator, buttonClass } from "@/components/ui";
import { accessFor } from "@/lib/guard";
import { STATUS_LABEL, loadApplication, stepList } from "@/lib/intake";
import { findProperty, resolveTenant } from "@/lib/tenant";
import { startApplication } from "./actions";

export default async function ApplicationOverview({ params, searchParams }: PageProps<"/[tenant]/apply">) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  const query = await searchParams;
  const requested = findProperty(tenant, query.property);

  const access = await accessFor(tenant);
  if (access.kind === "mismatch") return null; // the layout shows the mismatch page; load nothing
  if (access.kind === "signed_out") {
    redirect(requested ? `/${tenant.slug}/sign-in?property=${requested.slug}` : `/${tenant.slug}?notice=choose-property`);
  }
  if (access.kind === "staff") {
    return (
      <Banner tone="info" title="You are signed in as staff">
        The reviewer dashboard arrives in a later release. The applicant flow is for applicants.
      </Banner>
    );
  }

  const app = await loadApplication();
  if (!app) {
    if (!requested) redirect(`/${tenant.slug}?notice=choose-property`);
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">Start your application for {requested.name}</h1>
        <form action={startApplication}>
          <input type="hidden" name="tenant" value={tenant.slug} />
          <input type="hidden" name="property" value={requested.slug} />
          <button type="submit" className={`${buttonClass.primary} w-full sm:w-auto`}>Start application</button>
        </form>
      </div>
    );
  }

  const property = tenant.properties.find((p) => p.id === app.propertyId);
  const steps = stepList(app, `/${tenant.slug}`);
  const next = steps.find((s) => s.state !== "complete");

  return (
    <div className="flex flex-col gap-6">
      {query.saved === "1" && <Banner tone="success" title="Saved">Your progress is saved. You can come back on any device.</Banner>}
      {requested && property && requested.id !== property.id && (
        <Banner tone="info" title={`Your application is for ${property.name}`}>
          One application at a time. Continue your application for {property.name} below.
        </Banner>
      )}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Your application for {property?.name ?? "your property"}</h1>
        <p>Status: {STATUS_LABEL[app.status] ?? app.status}</p>
      </div>
      <StepIndicator steps={steps} />
      {next?.href && (
        <Link href={next.href} className={`${buttonClass.primary} w-full sm:w-auto sm:self-start`}>
          Continue where you left off
        </Link>
      )}
    </div>
  );
}

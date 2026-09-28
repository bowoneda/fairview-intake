import { notFound, redirect } from "next/navigation";
import { currentClaims } from "@/lib/supabase/server";
import { findProperty, resolveTenant } from "@/lib/tenant";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ params, searchParams }: PageProps<"/[tenant]/sign-in">) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  // Missing, unknown, inactive, or another operator's property: back to this operator's list.
  const property = findProperty(tenant, (await searchParams).property);
  if (!property) redirect(`/${tenant.slug}?notice=choose-property`);

  // Already signed in: go straight to the application.
  if (await currentClaims()) redirect(`/${tenant.slug}/apply?property=${property.slug}`);

  return (
    <div className="flex w-full flex-col gap-4">
      <SignInForm tenant={tenant.slug} property={property.slug} propertyName={property.name} />
    </div>
  );
}

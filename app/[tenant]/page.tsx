import { notFound } from "next/navigation";
import { Banner, PropertyCard } from "@/components/ui";
import { resolveTenant } from "@/lib/tenant";

export default async function OperatorLanding({ params, searchParams }: PageProps<"/[tenant]">) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();
  const { notice } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Apply for a home with {tenant.displayName}</h1>
        <p>Choose the property you are applying to. You can save your application and finish it later on any device.</p>
      </div>

      {notice === "choose-property" && <Banner tone="info" title="Choose a property to apply to." />}

      {tenant.properties.length === 0 ? (
        <Banner tone="info" title="No properties are accepting applications right now." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {tenant.properties.map((p) => (
            <li key={p.id} className="flex">
              <PropertyCard
                name={p.name}
                address={`${p.addressLine1}, ${p.city}, ${p.state} ${p.postalCode}`}
                units={p.totalUnits}
                programs={p.programs.map((prog) => prog.name)}
                href={`/${tenant.slug}/sign-in?property=${p.slug}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

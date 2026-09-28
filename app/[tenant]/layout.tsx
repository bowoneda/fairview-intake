import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui";
import { currentClaims } from "@/lib/supabase/server";
import { resolveTenant, themeCss } from "@/lib/tenant";
import { signOut } from "./sign-in/actions";

// Tenant data is read on every request; nothing about an operator is baked in at build time, so a new
// operator inserted into the database renders at its slug with no rebuild and no redeploy.
export const dynamic = "force-dynamic";

export default async function TenantLayout({ children, params }: LayoutProps<"/[tenant]">) {
  const { tenant: slug } = await params;
  const tenant = await resolveTenant(slug);
  if (!tenant) notFound();

  const claims = await currentClaims();
  // A session from another operator (or with no operator at all) never sees this operator's pages.
  const mismatch = claims !== null && claims.tenantId !== tenant.id;

  const signOutForm = (
    <form action={signOut}>
      <input type="hidden" name="tenant" value={tenant.slug} />
      <button type="submit" className={mismatch ? buttonClass.primary : "min-h-11 px-2 text-primary-contrast hover:underline"}>
        Sign out
      </button>
    </form>
  );

  return (
    <>
      {/* Validated hex values only (database check plus Zod), so this cannot carry anything but colors. */}
      <style>{themeCss(tenant.theme)}</style>
      <header className="bg-primary text-primary-contrast">
        <div className="mx-auto flex w-full max-w-[40rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={`/${tenant.slug}`} className="inline-flex min-h-11 items-center gap-3 font-semibold">
            {tenant.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- tenant logos come from storage at runtime
              <img src={tenant.logoUrl} alt={tenant.displayName} className="max-h-10 w-auto" />
            )}
            <span>{tenant.displayName}</span>
          </Link>
          {claims && !mismatch && signOutForm}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col px-4 py-6 sm:px-6">
        {mismatch ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold sm:text-3xl">You are signed in to a different property manager</h1>
            <p>
              This page belongs to {tenant.displayName}, but you signed in through another property manager. Sign out
              to continue here.
            </p>
            {signOutForm}
          </div>
        ) : children}
      </main>
      <footer className="border-t border-divider">
        <div className="mx-auto w-full max-w-[40rem] px-4 py-4 text-sm text-muted sm:px-6">
          <p>{tenant.theme.form_footer_text}</p>
          <p>Your information is encrypted and shared only with the property manager and the program&apos;s regulator.</p>
        </div>
      </footer>
    </>
  );
}

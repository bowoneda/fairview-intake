import "server-only";
import { cache } from "react";
import { z } from "zod";
import { publicClient } from "@/lib/supabase/server";

// Second layer on the database's own check: nothing but a six digit hex color can reach the stylesheet.
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const themeSchema = z.object({
  color_primary: hex,
  color_primary_contrast: hex,
  color_accent: hex,
  form_footer_text: z.string(),
  logo_path: z.string().nullable(),
});

export type Theme = z.infer<typeof themeSchema>;

export interface PropertyProgram {
  code: string;
  name: string;
}

export interface Property {
  id: string;
  slug: string;
  name: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  totalUnits: number;
  programs: PropertyProgram[];
}

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  theme: Theme;
  /** Public URL of the logo in the tenant-branding bucket, when one is set. */
  logoUrl: string | null;
  properties: Property[];
}

/**
 * Resolve an operator from its URL slug, with its theme and active properties. Public tables only, read
 * with the publishable key. Cached per request, never across requests, so a tenant inserted into the
 * database renders on its next request with no rebuild.
 */
export const resolveTenant = cache(async (slug: string): Promise<Tenant | null> => {
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return null;
  const db = publicClient();

  const { data: tenant, error } = await db
    .from("tenants")
    .select("id, slug, display_name, theme_configs(color_primary, color_primary_contrast, color_accent, form_footer_text, logo_path)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`Tenant lookup failed: ${error.message}`);
  if (!tenant) return null;

  const themeRow = Array.isArray(tenant.theme_configs) ? tenant.theme_configs[0] : tenant.theme_configs;
  const theme = themeSchema.safeParse(themeRow);
  if (!theme.success) throw new Error(`Tenant ${slug} has no valid theme configuration.`);

  const { data: props, error: propError } = await db
    .from("properties")
    .select("id, slug, name, address_line1, address_city, address_state, address_postal_code, total_units, property_programs(active, programs(code, name))")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("name");
  if (propError) throw new Error(`Property lookup failed: ${propError.message}`);

  const properties: Property[] = (props ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    addressLine1: p.address_line1,
    city: p.address_city,
    state: p.address_state,
    postalCode: p.address_postal_code,
    totalUnits: p.total_units,
    programs: (p.property_programs ?? [])
      .filter((pp: { active: boolean }) => pp.active)
      .flatMap((pp: { programs: PropertyProgram | PropertyProgram[] | null }) =>
        Array.isArray(pp.programs) ? pp.programs : pp.programs ? [pp.programs] : []),
  }));

  const logoUrl = theme.data.logo_path
    ? db.storage.from("tenant-branding").getPublicUrl(theme.data.logo_path).data.publicUrl
    : null;

  return { id: tenant.id, slug: tenant.slug, displayName: tenant.display_name, theme: theme.data, logoUrl, properties };
});

/** The tenant's property for a ?property= slug, or null when missing, unknown, or inactive. */
export function findProperty(tenant: Tenant, propertySlug: string | string[] | undefined): Property | null {
  if (typeof propertySlug !== "string") return null;
  return tenant.properties.find((p) => p.slug === propertySlug) ?? null;
}

/** CSS custom properties for the tenant theme, injected on :root. Values are validated hex only. */
export function themeCss(theme: Theme): string {
  return `:root{--color-primary:${theme.color_primary};--color-primary-contrast:${theme.color_primary_contrast};--color-accent:${theme.color_accent};}`;
}

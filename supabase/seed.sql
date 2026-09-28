-- Reference data and the one configured operator. See PHASE-1-SPEC.md, SEED DATA.
-- Idempotent. Contains no people and no second tenant: the dummy operator is inserted only at test time.

insert into public.programs (code, name, regulator, program_type, required_documents) values
  ('FHA-AHP', 'FHA-Meridian Affordable Housing Program', 'FHA-Meridian', 'affordable_housing', '{FTIC}'),
  ('ACA-PTR', 'Ashland County Affordable Housing Assessment Relief', 'Ashland County Assessor', 'property_tax_relief', '{ACAEF}'),
  ('FAIRVIEW-IZ', 'City of Fairview Inclusionary Zoning', 'City of Fairview', 'inclusionary_zoning', '{FTIC}')
on conflict (code) do nothing;

insert into public.program_rule_sets
  (program_id, effective_from, asset_imputation_threshold, passbook_rate, variance_threshold, tier_percentages, basis_note)
select p.id, date '2026-01-01', 50000.00, 0.00400, 0.1000, '{30,50,60,80}',
       'CALC-SPEC-1.md values under the current HOTMA rule. Provisional until the Phase 3 compliance '
       'confirmation of the effective year and of this program''s tier set (MASTER-SPEC-1.md, open decisions).'
from public.programs p
where p.code in ('FHA-AHP', 'ACA-PTR', 'FAIRVIEW-IZ')
  and not exists (select 1 from public.program_rule_sets r where r.program_id = p.id);

-- CALC-SPEC-1.md Part Five. Sizes 7 and 8 are not defined there, so they are not seeded.
insert into public.ami_schedules (jurisdiction, effective_year, household_size, area_median_income) values
  ('Ashland County', 2026, 1, 61600.00),
  ('Ashland County', 2026, 2, 70400.00),
  ('Ashland County', 2026, 3, 79200.00),
  ('Ashland County', 2026, 4, 88000.00),
  ('Ashland County', 2026, 5, 95040.00),
  ('Ashland County', 2026, 6, 102080.00)
on conflict (jurisdiction, effective_year, household_size) do nothing;

insert into public.tenants (slug, display_name) values ('cedar-row', 'Cedar Row Residential')
on conflict (slug) do nothing;

insert into public.theme_configs (tenant_id, color_primary, color_primary_contrast, color_accent, form_footer_text)
select t.id, '#1F4E5A', '#FFFFFF', '#C9822B',
       'Cedar Row Residential, City of Fairview, Ashland County, State of Meridian'
from public.tenants t where t.slug = 'cedar-row'
on conflict (tenant_id) do nothing;

insert into public.properties
  (tenant_id, slug, name, address_line1, address_city, address_state, address_postal_code, total_units)
select t.id, v.slug, v.name, v.line1, 'Fairview', 'Meridian', v.zip, v.units
from public.tenants t
cross join (values
  ('maple-court', 'Maple Court', '410 Maple Court', '00410', 48),
  ('linden-terrace', 'Linden Terrace', '1200 Linden Terrace', '00412', 120)
) as v(slug, name, line1, zip, units)
where t.slug = 'cedar-row'
on conflict (tenant_id, slug) do nothing;

insert into public.property_programs (tenant_id, property_id, program_id, set_aside_units)
select pr.tenant_id, pr.id, pg.id, v.set_aside::jsonb
from (values
  ('maple-court', 'FHA-AHP', '{"50": 5, "60": 10}'),
  ('maple-court', 'ACA-PTR', '{"80": 10}'),
  ('linden-terrace', 'FAIRVIEW-IZ', '{"60": 12, "80": 12}')
) as v(property_slug, program_code, set_aside)
join public.properties pr on pr.slug = v.property_slug
join public.tenants t on t.id = pr.tenant_id and t.slug = 'cedar-row'
join public.programs pg on pg.code = v.program_code
on conflict (property_id, program_id) do nothing;

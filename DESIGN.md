# DESIGN.md — Project 1: Fairview Compliance Intake Platform

Status: Phase 1 complete for the applicant side. The architecture and data model sections are carried from MASTER-SPEC-1.md. The visual design system and the intake flow screen specifications below are the UX and Interface Skill's Phase 1 deliverable, written 2026-09-28. The reviewer dashboard design is Phase 4 work and is not yet produced.

## ARCHITECTURE SUMMARY

Single Supabase project. Single shared schema. Tenant isolation enforced through Postgres Row Level Security keyed on a tenant_id column present on every tenant scoped table, not through separate schemas or separate databases per tenant, and not through application layer checks alone. Full reasoning is in MASTER-SPEC-1.md. The short version: this is how a real multi tenant SaaS of this kind is actually operated, and demonstrating RLS enforced isolation correctly is one of the more valuable things this project can show.

A tenant is an operator, a multifamily developer or property manager, not the housing authority. The regulators (FHA-Meridian and the Ashland County Assessor) define programs and receive filings. The operator is resolved from the first URL path segment, for example /cedar-row, not a subdomain. The property being applied to is a query parameter, for example /cedar-row/apply?property=maple-court. A theme configuration table keyed by tenant_id supplies the brand colors and logo, injected server side as CSS custom properties. Building parameters (property name, address, units, programs) come from the properties table. Only Cedar Row Residential is actually configured, but a second operator must be addable without a code change, since an unexercised claim of multi tenancy is not a real demonstration of it.

## DATA MODEL

Carried from MASTER-SPEC-1.md, which holds the column level definitions and is authoritative if the two disagree. Platform reference tables, shared by all tenants and read only to clients: tenants, programs, program_rule_sets, ami_schedules. Tenant scoped tables, each with its own tenant_id and RLS policies: theme_configs, properties, property_programs, users, applicants, household_members, income_sources, income_records, asset_records, calculated_determinations, generated_documents, workflow_state, audit_log. Social security numbers (household_members) and full account numbers (asset_records) are encrypted at the field level. Determination status is one of draft, pending_review, approved.

The calculated_determinations table's calculation trace field is the single most important field in the schema from a compliance standpoint. It must store every intermediate value the engine used, not only the final annual income figure: the program rule set applied, the annualized run rate, the YTD extrapolation if one was computed, which figure was used and why, the actual asset income, the imputed asset income if the threshold was crossed and which portion of assets that imputation applied to, and the AMI tier boundary the household landed inside. A determination that cannot be independently re-derived from its own stored trace is not an auditable determination, and independent re-derivation is exactly what the Regulatory Compliance Verification Skill's Phase 3 job requires.

## CALCULATION LOGIC, POINTER

The full income determination methodology, with real HUD Part 5 and HOTMA sourced rules and nine worked numeric examples with expected outputs, lives in CALC-SPEC-1.md. Do not restate or re-derive that logic here. Reference it. If this file and CALC-SPEC-1.md ever disagree, CALC-SPEC-1.md is authoritative, since it was produced by the Regulatory Compliance Verification Skill specifically to be the source of truth for this logic.

## VISUAL DESIGN SYSTEM

Produced by the UX and Interface Skill, Phase 1. The applicant intake flow is used once or twice by a person who may be anxious, on a phone, and unfamiliar with compliance vocabulary. The design is calm, plain, and legible before it is branded. Tenant branding is applied through three colors and a logo, never through layout or component changes, so a second operator gets a correct interface from data alone.

Mobile first. Every screen is designed at 360 pixels wide first and widens to a single centered column with a maximum content width of 40rem. The intake flow never uses multiple columns. The operator landing page may show property cards in two columns from 48rem upward.

### Token principle

There are two kinds of token. Tenant tokens come from theme_configs and change per operator. Platform tokens are fixed in app/globals.css and never change per operator. A component may use a tenant token only in the roles listed below; everything else, including all body text, borders, focus rings, and semantic states, uses platform tokens. This is what makes an arbitrary operator theme safe: the only tenant colors that ever carry text are the primary and its contrast pair, and that pair is checked.

### Tenant tokens

Exactly the three theme_configs color columns, injected by app/[tenant]/layout.tsx as CSS custom properties on :root. There is no fallback to a hardcoded brand color; the platform root page, which has no tenant, uses the neutral platform tokens instead.

    --color-primary            from theme_configs.color_primary
    --color-primary-contrast   from theme_configs.color_primary_contrast
    --color-accent             from theme_configs.color_accent

Allowed roles:

--color-primary: fill of the primary button, fill of the active step marker in the progress indicator, the top header band behind the logo and operator name, and the fill of the selected state on choice controls. Always paired with --color-primary-contrast for anything drawn on top of it. It may be used as a text or link color only on the light theme surfaces (--color-surface and --color-surface-raised in light mode). It is never used as a text color in dark mode, because tenant primaries are typically dark and fail on dark surfaces (see the ratios below).

--color-primary-contrast: text and icons drawn on --color-primary, and nowhere else.

--color-accent: decoration only. Permitted as the completed portion of the progress bar, a 4 pixel top border on property cards, and small icons that sit next to text that already carries the meaning. Never as text, never as a button fill carrying text, never as the only signal of a state, and never as a focus ring. The reason is measured, not stylistic: both seeded accents fail 4.5:1 as text on white.

### Contrast rule and formula

color_primary_contrast on color_primary must reach at least 4.5:1, the WCAG AA threshold for normal text. The theming preview page computes and displays this ratio for the current tenant, so an illegible theme is visible rather than silent.

Formula, WCAG 2 relative luminance. For each 8 bit channel value v of a hex color, let c = v / 255; the linear value is c / 12.92 when c is at most 0.03928, otherwise ((c + 0.055) / 1.055) raised to the power 2.4. Relative luminance L = 0.2126 R + 0.7152 G + 0.0722 B using the linear values. Contrast ratio = (L1 + 0.05) / (L2 + 0.05), where L1 is the lighter of the two luminances. Report to two decimal places. The ratio is symmetric, so it does not matter which color is foreground.

Measured ratios for the two tenants that exist in this build:

Cedar Row Residential (primary #1F4E5A, contrast #FFFFFF, accent #C9822B):
- contrast on primary: 9.15:1. Passes AA and AAA.
- accent on white #FFFFFF: 3.13:1. Fails as text. Passes the 3:1 threshold for non text graphics on white only.
- accent on light surface #F7F7F5: 2.92:1. Fails even the 3:1 graphics threshold, so accent decoration sits on white (--color-surface-raised), not on the page background.
- accent on primary: 2.92:1. Accent must never be drawn on the primary band.
- primary as text on white: 9.15:1. On #F7F7F5: 8.53:1. Both pass.
- primary on dark surface #15171A: 1.96:1. Fails, hence the rule against primary text in dark mode.

Harbor Point Communities, the dummy test operator (primary #6B2D5C, contrast #FFFFFF, accent #2E8B57):
- contrast on primary: 9.74:1. Passes AA and AAA.
- accent on white: 4.25:1. Fails as normal text (below 4.5), passes the 3:1 graphics threshold.
- accent on light surface #F7F7F5: 3.96:1. Passes 3:1 for graphics.
- accent on primary: 2.30:1. Never draw accent on the primary band.
- primary as text on white: 9.74:1. Passes.
- primary on dark surface #15171A: 1.84:1. Fails.

Proposed additions (needs a migration): none required for Phase 1. If a future operator's primary is light enough that white text fails, the check above catches it on the preview page; a database check constraint computing the ratio at insert time is a candidate for Phase 4 hardening, not added now.

### Platform tokens

Paste into the @theme block in app/globals.css. Neutral and semantic colors have light and dark values; the dark values apply under prefers-color-scheme: dark. Every text pairing below was measured against its surface.

Neutrals, light:

    --color-bg              #F7F7F5   page background
    --color-surface         #F7F7F5   same as bg; sections sit directly on it
    --color-surface-raised  #FFFFFF   cards, inputs, dialogs
    --color-text            #1A1A1A   17.40:1 on raised, 16.23:1 on bg
    --color-muted           #5C5F66   secondary text; 6.40:1 on raised, 5.96:1 on bg
    --color-border          #8A8F98   input and control borders; 3.25:1 on raised, 3.03:1 on bg
    --color-divider         #C8CCD2   decorative rules only (1.61:1, never a control boundary)

Neutrals, dark:

    --color-bg              #15171A
    --color-surface         #15171A
    --color-surface-raised  #1E2125
    --color-text            #EDEDED   15.34:1 on bg, 13.80:1 on raised
    --color-muted           #A8ADB5   7.96:1 on bg, 7.16:1 on raised
    --color-border          #7C828C   4.64:1 on bg, 4.18:1 on raised
    --color-divider         #33373D   decorative only

Semantic, light (text on white or on the matching tint):

    --color-success         #1A7F37   5.08:1 on white, 4.73:1 on bg
    --color-warning         #9A6700   4.87:1 on white, 4.54:1 on bg
    --color-danger          #B42318   6.57:1 on white, 6.13:1 on bg
    --color-success-tint    #E6F4EA   banner fill; body text on it 15.33:1
    --color-warning-tint    #FDF3D8   banner fill; body text on it 15.74:1
    --color-danger-tint     #FDECEA   banner fill; body text on it 15.22:1

Semantic, dark:

    --color-success         #4ADE80   10.31:1 on bg
    --color-warning         #FBBF24   10.76:1 on bg
    --color-danger          #F87171   6.49:1 on bg
    --color-success-tint    #12301D   body text on it 12.23:1
    --color-warning-tint    #3A2A06   body text on it 11.85:1
    --color-danger-tint     #3D1512   body text on it 13.65:1

Focus ring, both modes:

    --focus-ring-color      var(--color-text)
    --focus-ring            2px solid var(--focus-ring-color), offset 2px

The focus ring is deliberately not a tenant color. It uses the text color, which clears 15:1 in both modes, so no operator theme can make focus invisible.

Typography. One system font stack, no web font in Phase 1, which avoids a network dependency and a layout shift on slow connections, the likely conditions for many applicants:

    --font-sans  ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
    --font-mono  ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace

Type scale, rem with a 16 pixel root. Body text is never smaller than 1rem, so mobile browsers do not zoom on input focus.

    --text-sm    0.875rem / line height 1.25rem   hints, captions, metadata
    --text-base  1rem     / 1.5rem                body, inputs, buttons
    --text-lg    1.125rem / 1.75rem               card titles, step titles on mobile
    --text-xl    1.25rem  / 1.75rem               page section headings
    --text-2xl   1.5rem   / 2rem                  page titles on mobile
    --text-3xl   1.875rem / 2.25rem               page titles from 48rem up

Weights: 400 body, 600 headings, labels, and buttons. No other weights.

Spacing scale, rem:

    --space-1  0.25rem   --space-2  0.5rem   --space-3  0.75rem   --space-4  1rem
    --space-6  1.5rem    --space-8  2rem     --space-12 3rem      --space-16 4rem

Page gutter is --space-4 on mobile and --space-6 from 48rem. Vertical rhythm between form fields is --space-6; between a label and its control, --space-2.

Radii:

    --radius-sm  0.25rem   small tags
    --radius-md  0.5rem    inputs, buttons, banners
    --radius-lg  0.75rem   cards, the upload drop area

Minimum touch target: 44 by 44 CSS pixels for every interactive element, including the hit area of checkboxes and radio buttons, not only their visible box.

### Components

Button. Height at least 44 pixels, horizontal padding --space-4, --text-base, weight 600, --radius-md, full width on mobile for the primary action of a screen.
- Primary: --color-primary fill, --color-primary-contrast text. One per screen.
- Secondary: --color-surface-raised fill, --color-text text, 1 pixel --color-border border.
- Quiet: no fill, no border, --color-text text with underline on hover. Used for back and cancel.
- States: hover darkens by an overlay of 8 percent black (light) or lightens 8 percent white (dark), never by changing the tenant color itself. Focus shows --focus-ring. Disabled uses 50 percent opacity with cursor not-allowed and the disabled attribute, and is used sparingly; prefer allowing the press and explaining what is missing. Busy replaces the label with the same label plus a spinner, keeps the width, sets aria-busy="true", and blocks double submission.
- Always a real button or a link element, never a div with a click handler.

Text input and select. A visible label above the control, always; placeholders are never a substitute for a label. Control height at least 44 pixels, --color-surface-raised fill, 1 pixel --color-border border, --radius-md, --text-base.
- Hint: --text-sm --color-muted text between label and control, linked with aria-describedby.
- Error: --color-danger 2 pixel border, an error message below the control in --color-danger --text-sm starting with the word "Error:" in visually hidden text, aria-invalid="true", and the message id added to aria-describedby. Errors appear after the field is left or on submit, never while the person is still typing.
- Required fields are marked "(required)" in the label text, not with a bare asterisk.
- Inputs use the correct type and autocomplete: email with autocomplete="email", the one time code with inputmode="numeric" and autocomplete="one-time-code", dates with type="date".
- Select uses the native select element in Phase 1, styled to match; no custom listbox.

Choice controls (radio and checkbox). Native inputs with custom visuals, the whole row is the label and the 44 pixel hit area. Checked state uses --color-primary fill with --color-primary-contrast mark. Radio groups are wrapped in a fieldset with a legend.

Step progress indicator. Shows the five intake steps: Household, Income, Assets, Documents, Review. On mobile it collapses to a single line, "Step 2 of 5: Income", plus a thin progress bar whose completed portion uses --color-accent on a --color-divider track, 4 pixels tall; the text carries the meaning, the bar is decoration. From 48rem it shows all five steps as a horizontal list. Each step shows one of three states, each with a text label as well as a visual marker: Not started, In progress, Complete. The current step marker uses --color-primary fill; complete steps show a check icon in --color-success. The list is an ol element; the current step has aria-current="step". Completed and in progress steps are links, so a person can go back; not started steps after the first incomplete one are plain text.

Property card. On the operator landing page. --color-surface-raised fill, --radius-lg, 1 pixel --color-divider border, a 4 pixel --color-accent top border (decoration). Content, in this order: property name (--text-lg, 600), street address and city (--color-muted), total units ("48 units"), the programs the property participates in as small tags (--radius-sm, 1 pixel --color-border, --text-sm, program name in full, not the code), and a primary button "Apply for Maple Court" that links to /[tenant]/sign-in?property=[slug]. The button label names the property, so a screen reader list of buttons is unambiguous. The whole card is not a link; only the button is.

Alert or banner. Full width within the content column, --radius-md, the matching tint fill, a 4 pixel left border in the matching semantic color, an icon plus a text heading ("Saved", "Check this", "Something went wrong"), and body text in --color-text. Info banners use --color-surface-raised with a --color-border left border. Banners that appear in response to an action are placed in a region with role="status" (success, info) or role="alert" (errors), so they are announced. Banners never disappear on a timer.

File and photo upload. A drop area on desktop, a pair of buttons on mobile: "Take a photo", which uses an input with accept="image/*" and capture="environment", and "Choose a file", which accepts image/jpeg, image/png, image/heic, and application/pdf. Maximum size stated up front in the hint, "Photos or PDFs, up to 10 MB each". States:
- Empty: dashed 2 pixel --color-border, --radius-lg, the two buttons and the hint.
- Uploading: the file name, a determinate progress bar with its percentage in text, and a quiet "Cancel" button. The region has aria-live="polite".
- Uploaded: the file name, its size, a thumbnail for images or a document icon for PDFs, a success check with the text "Uploaded", and a quiet "Remove" button naming the file ("Remove paystub-march.jpg").
- Error: --color-danger border and message saying what happened and what to do ("This file is 14 MB. Files must be 10 MB or smaller. Try a photo instead of a scan."), with "Try again". The previous good file, if any, is kept.
Uploads are real only from Phase 2, when storage and the Textract pipeline exist. In Phase 1 the control is built and rendered in the documents step with its states, but not wired to storage.

Header. A band in --color-primary with the operator logo (maximum 40 pixels tall, alt text is the operator display name) and the operator display name in --color-primary-contrast. When signed in, a quiet "Sign out" control on the right, in --color-primary-contrast. No navigation menu in the applicant flow.

Footer. --text-sm --color-muted, the theme_configs form_footer_text, and a line "Your information is encrypted and shared only with the property manager and the program's regulator."

## SCREEN LEVEL SPECIFICATIONS

Every screen below is a single column on mobile with the header band at the top and the footer at the bottom. Page titles are h1, one per page. Every screen works with keyboard only, at 200 percent zoom, and in both color schemes.

### Operator landing, /[tenant]

Purpose: let an applicant find the property they are applying to. Unauthenticated.
- Header band with logo and operator name.
- h1: "Apply for a home with [operator display name]".
- One sentence of plain guidance: "Choose the property you are applying to. You can save your application and finish it later on any device."
- Property cards for every active property of this operator, read from properties and property_programs. Never another operator's properties.
- If the operator has no active properties: an info banner, "No properties are accepting applications right now."
- Footer.

### Sign in, /[tenant]/sign-in?property=[slug]

Purpose: email one time code, which both signs in a returning applicant and signs up a new one. The property name is shown so the person knows what they are applying to.
- If the property parameter is missing, unknown, inactive, or belongs to another operator, redirect to /[tenant] with an info banner "Choose a property to apply to."
- State 1, enter email: h1 "Apply for [property name]". Email input (label "Email address (required)", hint "We will send you a 6 digit code. No password needed."). Primary button "Send code".
- State 2, enter code: h1 "Check your email". Text "We sent a code to [email]." Code input (label "6 digit code (required)"). Primary button "Continue". Quiet buttons "Send a new code" (disabled with a visible countdown for 60 seconds after sending) and "Use a different email".
- Errors: invalid email format, wrong or expired code ("That code did not work. Codes expire after 1 hour. Send a new code."), rate limited ("Too many attempts. Wait a minute and try again.").
- On success, go to /[tenant]/apply?property=[slug].

### Application overview, /[tenant]/apply?property=[slug]

Purpose: the home of an application, the resume point on any device. Signed in.
- h1: "Your application for [property name]".
- Status line from applicants.application_status in plain words: "In progress", "Submitted", "Under review", "Decision made", "Closed".
- The five steps as a vertical list (the step progress indicator's full form, on every width), each with its state and a link: "Start", "Continue", or "Review". Primary button "Continue where you left off" goes to the first step that is not complete.
- A success banner "Saved" appears here after returning from a step.
- On first visit, the applicants row is created for this property, owned by the signed in person.

### Intake steps, /[tenant]/apply/[step]

Each step page: the step progress indicator, an h1 with the step name, the step's fields, then a button row with a quiet "Back" and a primary "Save and continue". A quiet "Save and finish later" link returns to the overview. Phase 1 builds every step as scaffolding (the page, the heading, the indicator, the placeholder fields listed as Phase 1 below, and working save and resume); the fields marked later arrive with the phase that owns their data.

Household (Phase 1 fields are real and saved to household_members): for each person, full name, relationship to the head of household (radio group: Head of household, Spouse, Co head, Dependent, Other adult), and date of birth. "Add another person" and "Remove" per person, with the head of household first and not removable. Social security numbers are later (Phase 2 onward, through the encrypted path only); Phase 1 does not show an SSN field at all.

Income (Phase 1 scaffold): per household member, "Does this person have income?" and income source type (Job, Self employment, Benefits, Regular payments from a person or app, Other). Later, Phase 2: "Connect your payroll" (Argyle), "Connect your bank" (Plaid), and "Upload paystubs or tax forms" (the upload control), with connection status per source.

Assets (Phase 1 scaffold): asset type and institution name per account, current balance. Later, Phase 2: bank connection populates balances and income; full account numbers are never typed or shown here.

Documents (Phase 1 scaffold): the upload control rendered in its empty state with the hint text, not wired. Later, Phase 2: real uploads, with a checklist of what is still needed.

Review (Phase 1 scaffold): a read only summary of each step with "Change" links back to that step. Later, Phase 3: the determination summary and the e-signature step, which embeds the signing session.

### Different property manager, shown on any /[tenant] route

When the signed in session belongs to a different operator than the URL: h1 "You are signed in to a different property manager". Text: "This page belongs to [operator display name], but you signed in through another property manager. Sign out to continue here." Primary button "Sign out". No application data is loaded or shown, and the other operator's name is not revealed.

### Unknown operator, 404

For an unknown slug under /[tenant]: platform neutral styling (no tenant colors, since there is no tenant), h1 "We could not find that page", text "Check the link you were given by your property manager." No list of operators is ever shown.

### Theming preview, /[tenant]/preview

Purpose: prove a new operator renders correctly from data alone, and expose an illegible theme. Unauthenticated, no applicant data.
- The header band as applicants see it.
- Swatches for --color-primary, --color-primary-contrast, and --color-accent, each with its hex value.
- The measured ratio of --color-primary-contrast on --color-primary, computed with the formula above, shown as "9.15:1, passes (minimum 4.5:1)" or, when it fails, a danger banner "Fails: 3.10:1, minimum 4.5:1. Text on this operator's primary color is not readable."
- Also shown for information: accent on white, with the rule "Accent is decoration only".
- One of each component in its main states: primary, secondary, and quiet buttons, including focus and busy; an input with hint and with error; the step indicator; a property card using the operator's first property; each banner type; the upload control in all four states (static).
- Rendered in whichever color scheme the browser is in; a note tells the reviewer to check the other scheme too.

## SAVE AND RESUME, AS THE APPLICANT SEES IT

Progress is saved to the database, never only in the browser, so it follows the person to any device.
- "Save and continue" saves the step, then moves to the next step. "Save and finish later" saves and returns to the overview.
- Leaving a step with unsaved changes by the Back button or a step link prompts "You have unsaved changes. Save them before leaving?" with "Save" and "Leave without saving".
- On return, signing in on any device with the same email lands on the overview for their application, with each step's state shown and "Continue where you left off" pointing to the first incomplete step.
- A step's state is Complete when its required fields are saved and valid, In progress when anything is saved, Not started otherwise.
- The overview's "Saved" banner confirms a save happened; there is no silent autosave in Phase 1.

## REVIEWER DASHBOARD

Phase 4 deliverable of the UX and Interface Skill. Not yet designed.

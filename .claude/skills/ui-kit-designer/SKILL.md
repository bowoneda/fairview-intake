---
name: ui-kit-designer
description: Generate premium, designer-quality UI demonstrations as single HTML files. Use this skill whenever the user asks to create a dashboard UI, app UI kit, design system demo, UI mockup, SaaS interface prototype, admin panel design, mobile app screen mockups, landing pages, marketing pages, product pages, or any visual interface showcase. Also trigger when the user mentions "UI kit", "design system", "dashboard design", "app mockup", "interface design", "screen design", "landing page", "hero section", "marketing page", or asks to create something that looks like a Dribbble/Behance shot. This skill produces a DESIGN BRIEF first (mood, hierarchy, layout rationale, reference shots) and waits for user approval before writing any HTML. Final output is a self-contained HTML file using React + Babel standalone. Handles BOTH multi-page app interfaces AND single-page landing pages with equal quality.
---

# UI Kit Designer

Generate premium-quality UI — but never blindly. Every build starts with a design brief the user approves before a single line of HTML is written.

**The workflow is always:**
1. Read reference files (Phase 0)
2. Load companion skills (see below)
3. Understand the request
4. Produce and present the Design Brief — **HARD STOP**
5. Wait for user approval or revision requests
6. Build the HTML using the approved brief as the blueprint

---

## Companion Skills (Load These Alongside ui-kit-designer)

These skills live in `.claude/skills/` and complement this one. Load them at Phase 0 alongside the reference files:

| Skill | When to Load | What It Adds |
|---|---|---|
| `frontend-design` | Every build | Bold aesthetic direction, anti-AI-slop typography, color, motion rules |
| `web-design-guidelines` | Every build | 100+ quality gate rules — accessibility, mobile-first, performance, forms |
| `ui-ux-pro-max-adapted` | Every design decision | Product-type UX patterns, font pairings, color systems for Nigerian tech brands |
| `mockup-workflow` | Every build | Full workflow enforcement: screenshots, mobile verification, done criteria |
| `theme-factory` | Quick theming / client presentations | 10 pre-built professional theme palettes to apply instantly |
| `web-artifacts-builder` | Complex React + shadcn/ui components | React+Tailwind+shadcn artifact bundler for sophisticated interactive UIs |
| `canvas-design` | Poster / brand asset creation | PDF/PNG design philosophy + craftsmanship approach for print assets |

**How to load:** These are available as `/[skill-name]` commands or will be auto-suggested by Claude Code. Invoke explicitly when starting a design session.

---

## PHASE 0: Read Reference Files

Read ALL of these before doing anything else:

- `references/design-system.md` — spacing grid, typography scale, component dimensions
- `references/anti-patterns.md` — 15 mistakes to avoid + quality checklist
- `references/award-winning-breakdowns.md` — 27 real Dribbble/Awwwards shots with exact layout math, palettes, and motion timing
- `references/brand-identity.md` — emotional color theory, brand archetypes, CTA hierarchy
- `references/typography-premium.md` — Lusion, Fantasy, Instrument agency type systems with exact px/weight/tracking
- `references/dashboard-patterns.md` — KPI cards, chart patterns, nav patterns, layout archetypes (when building dashboards)
- `references/themes.md` — 8 pre-built premium palettes
- `references/landing-pages.md` — landing page section patterns and composition rules (when building landing pages)
- `references/gemini-image-gen.md` — Imagen 4.0 API, prompt templates, base64 embed workflow
- `references/svg-illustrations.md` — domain-specific inline SVG illustration components (edtech, fintech, SaaS), empty states, hero decoratives, animated SVG patterns, illustration-vs-photo decision rules
- `references/micro-interactions.md` — custom cursor (3 variants), magnetic buttons, advanced scroll systems (parallax, scroll-linked interpolation, counter-on-scroll, sticky content-swap), smooth page transitions (cross-fade, slide, clip-path), hover micro-interactions (card tilt, shimmer, underline grow)
- `references/user-design-references.md` — 37 real designs collected by the user, cataloged by category (edtech x14, agency x7, SaaS x5, health x3, fintech x2, e-commerce x2, NGO x1, event x2). Contains H-Tech-specific design direction in Part 3 and a quick-reference pattern lookup table in Part 4. READ THIS when the project is H-Tech or any edtech/African brand — it has direct palette + layout recommendations.

---

## PHASE 1: Understand the Request

Before producing the brief, establish:

1. **Domain** — What industry? (edtech, fintech, health, SaaS, e-commerce, agency, etc.)
   Cross-reference `references/brand-identity.md` for the matching brand archetype.
2. **Output type** — Multi-page dashboard app, or single-page landing page?
3. **Pages** — Which pages? (if not specified, default: Dashboard + 3 feature pages + Settings)
4. **Theme mood** — Any direction on dark vs light? Energetic vs calm? Bold vs minimal?
5. **Reference images** — If provided, extract exact color palette, grid structure, typography, and distinctive elements. Never glance — study carefully.
6. **Brand assets** — Name, tagline, colors, fonts (if specified). These override generic choices.
7. **Visual language** — Illustrations or photos? Motion-rich or restrained? Custom cursor? These questions are answered during the Design Brief phase using the brand archetype — but flag any explicit user preferences here.

If critical information is missing (e.g., no domain or brand context), ask ONE question before proceeding. Do not ask multiple questions.

---

## PHASE 2: The Design Brief

**This is mandatory. Do NOT skip. Do NOT proceed to code without completing this phase.**

After reading the reference files and understanding the request, produce the design brief using the template below. Present it in full, then end with the approval prompt. Do not write any HTML, any JSX, any Python, or any code during this phase.

---

### DESIGN BRIEF TEMPLATE

Output the brief in this exact structure. Each section must contain real decisions with real rationale — not placeholders, not "TBD", not vague statements.

```
## Design Brief — [Project Name]

---

### 1. Project Identity
**Platform:** [name]
**Tagline:** [tagline or "none specified"]
**Audience:** [who will use this — age, role, context]
**Core emotional intent:** [The single feeling this design must create. Examples: "confident trust for first-time investors", "energetic motivation for tech students", "calm clarity for busy managers"]

---

### 2. Brand Archetype
**Archetype:** [one of: Trusted Authority | Energetic Challenger | Premium Minimal | Creative Innovator]
**Why this fits:** [2-3 sentences on why this archetype matches the brand, audience, and product domain]
**Design behavior this triggers:**
- Motion: [slow/deliberate or quick/punchy or fluid/cinematic]
- Spacing: [generous/breathing or tight/dense or asymmetric/editorial]
- Typography weight: [conservative 400-600 range or bold 700-900 dominant or dramatic contrast]
- Photography/imagery: [editorial professional or people in action or abstract/generative or product-focused]

---

### 3. Color System
**Dominant (60%):** [hex] — [name]
**Secondary (30%):** [hex] — [name]
**Accent (10%):** [hex] — [name]
**Semantic colors:** success [hex], warning [hex], error [hex]

**Emotional rationale:** [Why these specific colors? What feeling does each create? How do they work together as a temperature pairing — warm/cool contrast? What brand signal do they send?]

**Reference:** Shot [#] ([designer name]) uses a similar [warm/cool/high-contrast/monochrome] palette. The key difference in this design is [one specific adaptation].

---

### 4. Typography System
**Font family:** [name] — [why this font over alternatives]
**Heading scale:**
  - Display/Hero: [px], weight [w], tracking [-x.xxem], line-height [x.xx]
  - H1 (page title): [px], weight [w], tracking [-x.xxem]
  - H2 (section): [px], weight [w], tracking [-x.xxem]
  - H3 (card): [px], weight [w]
**Body:** [px], weight [w], line-height [x.xx]
**Label/Caption:** [px], weight [w], tracking [+x.xxem], uppercase: [yes/no]

**Typography rationale:** [Which agency system (Lusion/Fantasy/Instrument) is this closest to? What typographic move creates the premium feel — size extremes, weight contrast, mixed serif/sans, negative tracking?]

---

### 5. Layout Architecture
**Layout type:** [Three-zone sidebar app | Full-width landing | Mobile app | Split-screen hero | Bento grid]
**Grid:** [column count, gutter, max-width, sidebar width if applicable]
**Spacing rhythm:** [section gap, card gap, internal card padding — 3 numbers]

**Pages / Sections:**
| Page/Section | Primary focus | Layout pattern | Reference shot |
|---|---|---|---|
| [page 1] | [what draws the eye first] | [specific pattern from breakdowns.md] | Shot [#] |
| [page 2] | ... | ... | Shot [#] |
| [page 3] | ... | ... | Shot [#] |
| [page 4] | ... | ... | Shot [#] |
| [page 5] | ... | ... | Shot [#] |

---

### 6. Hierarchy Map
For each page, define the three-level attention hierarchy:

**[Page 1 name]**
- Primary: [what the eye hits first — the largest, most saturated, most prominent element]
- Secondary: [supporting data or content that gets read next]
- Tertiary: [navigation, labels, helper text — functional but quiet]

**[Page 2 name]**
- Primary: [...]
- Secondary: [...]
- Tertiary: [...]

[repeat for each page]

---

### 7. Motion Philosophy
**Load sequence:** [Total duration, key elements in order with timing — reference a specific System from award-winning-breakdowns.md Section 6]
**Hover style:** [translateY lift amount, shadow change, transition duration, easing function]
**Scroll reveal:** [threshold, translateY amount, duration, stagger delay]
**Signature motion:** [one distinctive animation that makes this design memorable — e.g., "KPI numbers count up on first view", "hero image scales in with spring easing", "cards float in from alternating sides"]

---

### 8. Visual Assets & Motion System

**Visual language:** [Illustrations, photos, hybrid, or mockup-forward? Describe the dominant visual style.]

**Gemini Imagen asset plan:**
| Visual slot | Asset type | Prompt summary | Model | Ratio |
|---|---|---|---|---|
| [e.g., Hero] | [Real human model] | [Nigerian female student, laptop, golden light] | ultra | 16:9 |
| [e.g., Hero bg layer] | [Decorative blob shape] | [Organic yellow blob, flat solid #FFD740, white bg] | standard | 1:1 |
| [e.g., Product showcase] | [Device mockup] | [MacBook showing dashboard, white desk, 45° angle] | ultra | 16:9 |
| [e.g., Course thumb 1] | [Domain scene] | [Data center server racks, blue lighting] | standard | 4:3 |
| [e.g., Instructor avatars] | [Headshots] | [Nigerian instructor, clean bg — loop x3] | standard | 1:1 |
| [e.g., Brand mockup] | [Business card flat lay] | [Navy cards on marble, yellow logo] | ultra | 4:3 |
| [e.g., Feature icon] | [Custom icon] | [3D graduation cap, gold + navy] | standard | 1:1 |

**Reference-matched visuals:** [Which user-design-references.md patterns require generated images? E.g., "REF-03 yellow blob behind hero — generate organic blob shape", "REF-05 arched headshots — generate portraits on solid colored bgs"]

**SVG illustrations used:**
| Location | Illustration component | Rationale |
|---|---|---|
| [e.g., Hero bg] | [e.g., HeroBlob + DotGrid] | [why this component fits here] |
| [e.g., Feature icons] | [e.g., GraduationCap, LightBulb, Rocket] | [...] |
| [e.g., Empty states] | [e.g., EmptyStateCourses] | [...] |

**Custom cursor:** [Which variant from micro-interactions.md? Dual-ring / Glow blob / Text reveal label / None — with rationale]

**Magnetic buttons:** [Which CTAs get magnetic behavior? How many? Radius + strength settings]

**Scroll animation system:** [Which systems from micro-interactions.md Part 3? e.g., "System 1 (reveal) on all sections + System 4 (counter) on stats + System 2 (parallax) on hero background only"]

**Page transitions:** [Cross-fade / Slide / Clip-path — with rationale]

**Animation budget:** [Landing page (full budget) / App dashboard (reduced) / Data-heavy (minimal) — reference micro-interactions.md Part 6 usage rules]

### 9. Reference Shots
| Shot | Designer | URL | What is borrowed |
|---|---|---|---|
| Shot [#] — [title] | [designer] | [url] | [specific element: card anatomy, motion system, palette logic, layout split, etc.] |
| Shot [#] — [title] | [designer] | [url] | [specific element] |
| Shot [#] — [title] | [designer] | [url] | [specific element] |

---

### 10. Key Differentiators
**What makes this premium:**
[2-3 specific, concrete design decisions that elevate this above a generic template. Not "good design" — name the actual moves. Example: "Purple sidebar against light content area (Sneat semi-dark pattern) creates instant depth without full dark mode", or "Category color system assigns each course a unique hue so the course catalog has an editorial personality rather than uniform cards"]

**What makes this specific to this brand:**
[2-3 design decisions that are particular to THIS brand/client, not reusable for any project. Example: "Navy + gold palette directly reflects H-Tech's Nigerian tech institution identity — navy for credibility, gold for aspiration", or "Outfit typeface was chosen over Space Grotesk because H-Tech's messaging is warm and accessible, not cold and technical"]

---

### 11. What Was Considered and Rejected
[2-3 directions that were explored and rejected, with honest reasoning. Example: "Rejected full dark mode — H-Tech's audience includes non-technical enrollees and parents; dark mode signals elite technical brand, not accessible learning community", or "Rejected purple dominant palette — while popular in edtech (Shot 7, 26), H-Tech's existing brand colors are navy+yellow and changing the dominant hue would break brand recognition"]

---

**→ Does this direction match your vision? Any changes before I begin building?**
**→ Approve or tell me what to adjust.**
```

---

### Brief Quality Rules

A brief is REJECTED (rewrite it) if any of these are true:
- Any section contains "TBD", "to be determined", placeholder text, or empty values
- The emotional rationale in Section 3 says only what the colors ARE, not what they DO emotionally
- The hierarchy map says "balanced" or "all elements equally important" — hierarchy always has a #1
- The reference shots table cites shots without naming the specific element being borrowed
- The typography rationale says only which font was chosen, not WHY it was chosen over alternatives
- Section 11 is skipped or contains only one rejected direction
- Section 8 (Illustration & Motion) has 'None' or 'TBD' without rationale — every design has a visual language choice
- The approval prompt is missing from the end

---

## PHASE 3: Build (After Approval)

Only begin this phase after the user has responded to the brief and approved (or after you have revised and re-presented based on their feedback).

The approved brief is now the blueprint. Every decision made in the brief must be reflected in the code. If the brief says Outfit 800 at -0.03em for headlines, that is what gets built. If the brief says Shot 26's weekly calendar pattern, that is the component that gets built.

### SVG Illustrations
Read `references/svg-illustrations.md`. Before generating any Gemini images, determine what each visual slot needs:
- Abstract concept / decorative / empty state / feature icon → use SVG illustration component from the file
- Real person / place / course thumbnail / testimonial avatar → use Gemini Imagen

For hero sections: use the HYBRID approach — SVG blob/dot-grid as background layer + Gemini photo as mid layer + SVG FloatingBadge as top layer.

Copy the relevant SVG components from `references/svg-illustrations.md` directly into the JSX. Remap all colors to the `C` palette constant — never leave hardcoded hex in SVGs.

### Micro-Interactions
Read `references/micro-interactions.md`. Apply the systems approved in the Design Brief Section 8:

**Custom cursor** (if approved): Add the cursor component as the FIRST child of the App root div. Set `document.body.style.cursor = 'none'` in its useEffect.

**Magnetic buttons** (if approved): Wrap ONLY the primary hero CTA(s) — 1-2 maximum per page. Do NOT apply to nav items, form buttons, or table actions.

**Scroll animations**: Wrap each page section in a `useReveal` container with `data-reveal` on children. Apply parallax only to hero background layers. Apply counter animation to stats sections.

**Page transitions**: Wrap the active page render in the approved transition component (`PageTransition`, `SlideTransition`, or `ClipTransition`).

**Performance**: Add `willChange: 'transform'` to all animated elements. Never animate layout properties (width, height, top, left, margin). Disable parallax at mobile widths (< 768px).

### Visual Asset Production (Gemini Imagen 4.0)
Read `references/gemini-image-gen.md` — it is the complete asset pipeline, not just a photo tool.

**Before writing a single line of HTML, produce a full asset plan:**
1. List every visual slot in the design (hero, thumbnails, avatars, icons, shapes, mockups, brand assets)
2. Classify each slot using the Imagen vs SVG decision table in `gemini-image-gen.md` Part 4
3. Generate all Imagen assets first — use `__PLACEHOLDER__` tokens in the HTML template, then `.replace()` after generation

**Asset types to generate (not just hero photos):**
- **Real human models** — Nigerian/African students, instructors, professionals with correct demographic prompts. Never use generic Western-default people for African brands.
- **Brand model shots** — people wearing brand-colored clothing, holding branded items, in brand-relevant environments
- **Device mockups** — MacBook/iPhone/iPad showing the actual product UI. For landing pages that showcase the product, a device mockup is required, not optional.
- **UI/UX kit visuals** — rendered images of product dashboards, app screens, feature flows, or onboarding steps shown as clean visual assets (not just coded components)
- **Decorative shapes** — organic blob shapes, gradient mesh backgrounds, textured overlays, arch/pill frame bg colors — all generated in the exact brief-approved palette colors
- **Custom icons** — rich 3D-style or illustrated-style domain icons where flat SVG would feel generic (graduation cap in 3D gold, glowing circuit board, etc.)
- **Brand identity mockups** — business cards, branded merch, logo-in-context scenes
- **Reference-matched visuals** — when the brief cites a reference from `user-design-references.md`, generate images that MATCH that reference's visual style (see Part 5 of gemini-image-gen.md for exact prompt patterns per reference)

**Quality rules:**
- Use `imagen-4.0-ultra-generate-001` for hero images, brand models, device mockups
- Use `imagen-4.0-generate-001` for thumbnails, avatars, icons, shapes
- Always specify nationality/ethnicity in person prompts when the brand has cultural context
- Always include a relevant Unsplash fallback URL in every `gen_img` call
- Never prompt for text in images — all typography is always HTML/CSS on top

### CRITICAL: Write via Python
ALWAYS write the HTML file using Python — never heredoc, never shell echo:
```python
python3 << 'PYEOF'
html = r'''...entire HTML...'''
html = html.replace('<\/script>', '</script>')
with open('<output folder>/filename.html', 'w', encoding='utf-8') as f:
    f.write(html)
PYEOF
```
**Output path:** Always `<output folder>/` — Git Bash on Windows, NOT `/mnt/user-data/outputs/`

### 21st.dev Magic MCP
When `mcp__magic__21st_magic_component_builder` is in your tool list, use it for: navbars, hero sections, feature grids, pricing tables, complex interactive components. Extract the design quality bar from the returned code, then adapt to inline JSX styles.

### File Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[App Name] — [Subtitle]</title>
  <!-- React 18 + Babel standalone CDN -->
  <!-- Google Fonts CDN (single font or pair) -->
  <style>/* Global resets, scrollbar, @keyframes ONLY */</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    // All React components + rendering
  </script>
</body>
</html>
```

### Component Build Order
Before coding, identify layout patterns from `references/award-winning-breakdowns.md` that match the brief. Use exact spacing and motion numbers from those shots.

1. **Palette constant** — ALL colors in one `const C = {}` object. Never hardcode a hex twice.
2. **SVG Icons** — inline `<svg>` functions, 18-22px, strokeWidth 1.8
3. **Chart components** — area, bar, donut — pure SVG only (no Recharts/Chart.js)
   - Bezier curves (not polylines) for area/line
   - Gradient fills fading to transparent
   - Glow filter on active data points
4. **Reusable components** — Avatar, KPI Card, Glass Card, Progress Ring
5. **Data constants** — realistic 7-12 data points per chart
6. **Page components** — one per page, no required props
7. **Sidebar / Nav** — active state highlighting
8. **App root** — page state, renders nav + active page

### Per-Page Requirements
Every page must have:
- Header: title (24-28px, 800-900w) + subtitle + action buttons
- At least 3 distinct content sections
- Mixed component types (cards + charts + lists)
- One "hero" element that is visually dominant
- Hover states on ALL interactive elements (200ms transition)
- Staggered entrance animations (50-100ms delay per element)

### Minimum Pages
Dashboard app: 4+ navigable pages. Landing page: 6+ sections. No exceptions.

---

## PHASE 4: Quality Check

Before writing the file, verify against `references/anti-patterns.md` and this checklist:

**Spacing** — All values are multiples of 4. Internal padding < gap between components < section spacing.

**Typography** — Max 4-5 font sizes. 3-level weight hierarchy. Negative tracking on headlines. Positive tracking on uppercase labels. Transparent rgba() for muted text, never fixed gray hex.

**Color** — 60-30-10 ratio. Accent used in ≤10% of surface area. Colored box-shadow on accent elements. Semantic colors (green/red/amber) consistent across all pages.

**Layout** — At least one asymmetric grid per page (60/40 or 70/30). Mixed card heights. No two adjacent bento cells same height + same background.

**Polish** — Hover: translateY(-3 to -4px) + shadow intensification, 200-220ms ease. Entrance: staggered opacity+translateY, max 400ms total delay. Consistent border-radius system throughout.

---

## PHASE 5: Output

1. Write file to `<output folder>/[project-name].html`
2. Show the file path
3. One-sentence summary of what was built — not a component inventory

---

## Landing Page Mode

When building a landing page (not a dashboard), the brief still applies but Phase 3 uses these rules instead of the three-zone sidebar layout:

**Section sequence:**
```
[Nav — sticky, transparent → frosted on scroll]
[Hero — 80-100vh, headline + image + CTAs]
[Social Proof — stats row or logos strip]
[Features — 3-4 cards or alternating rows]
[Detail Section — split layout, text + visual]
[Testimonials — 3-column quote cards]
[CTA Section — full-width, conversion block]
[Footer — dark multi-column]
```

**Typography:** Hero headline 56-80px, weight 800-900, -0.03em. Mix serif + sans for premium feel. Accent color on key words.

**Background:** Never plain white. Colored (sage/peach/lavender/navy), gradient, or dark.

**Three-Layer Image Composition (required):**
- Layer 1 (back): Decorative shapes — circles, blobs, gradient sections
- Layer 2 (mid): Gemini-generated images as base64 data URLs
- Layer 3 (front): Floating glass cards, badges, stat overlays

---

## Critical Mistakes to Avoid

1. **Skipping the design brief** — Never jump straight to code. The brief is not optional or a courtesy — it is Phase 2.
2. **Shell heredoc for JSX** — Always use Python. Output to `<output folder>/`
3. **External chart libraries** — Recharts/Chart.js fail in standalone HTML. Custom SVG only.
4. **Gradient shapes instead of images** — Every `<img>` slot must use a Gemini-generated data URL or Unsplash fallback.
5. **Brief with empty rationale** — "I chose navy because it fits" is not a rationale. Name the emotional signal, the brand archetype behavior, and the reference shot.
6. **Too few pages** — 4+ navigable pages for dashboards. 6+ sections for landing pages.
7. **Uniform spacing** — 8px within groups, 16-20px between components, 32-48px between sections, 80-120px between page sections.
8. **Flat lifeless cards** — Every card: hover state + shadow + radius. No exceptions.
9. **Missing data** — Charts need 7-12 data points. KPI cards need trend indicators. Tables need 5+ rows.
10. **Generic palette** — Never default to gray-and-blue. Brief-approved palette overrides any default.
11. **Gradient rectangles instead of illustrations** — Every decorative visual slot must use either an SVG illustration component or a Gemini image. A `<div>` with `background: linear-gradient(...)` is never a valid substitute for actual visual content.
12. **Animating layout properties** — Never animate `width`, `height`, `top`, `left`, `margin`, or `padding`. Animate `transform` and `opacity` only. Layout animations cause reflow and jank.
13. **Magnetic buttons everywhere** — Maximum 2 magnetic CTAs per page, hero area only. Applying magnetic behavior to nav links, table rows, or form buttons breaks usability.
14. **No page transitions** — Hard state-swap between pages with zero transition is 2015 SPA behavior. Always wrap page content in at least the cross-fade `PageTransition` component.
15. **Treating Imagen as "hero photo only"** — Imagen generates the full visual asset set: human models, brand models in branded clothing, device mockups, UI/UX kit renders, custom icons, decorative blob shapes, brand identity mockups, and reference-matched visuals. Using it only for one hero image wastes 90% of its value.
16. **Generic Western-default people** — When the brand has a cultural identity (Nigerian, African, etc.), every human model prompt MUST specify the correct nationality/ethnicity. A generic prompt produces a generic face that breaks brand authenticity.
17. **No device mockup on a product landing page** — Any landing page showcasing a digital product (app, dashboard, SaaS tool) requires at least one photorealistic device mockup (MacBook, iPhone, or multi-device) showing the actual product UI. A coded component is not a substitute — it must look like a real product photograph.
18. **Skipping the Imagen asset plan in the brief** — Section 8 of the Design Brief must include a complete Imagen asset table (slot, type, prompt summary, model, ratio) before any approval. "Will generate images later" is not a plan.

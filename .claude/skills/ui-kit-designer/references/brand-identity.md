# Brand Identity & Emotional Color Usage

Color tokens tell you WHAT a color is. Brand identity tells you HOW and WHY it is used. This file bridges the gap between a hex code and a feeling.

---

## PART 1: COLOR PSYCHOLOGY IN UI

### The Emotional Spectrum of Hues

**Blue family (navy, cobalt, sky)**
- Emotion: trust, stability, competence, calm authority
- Industries: finance, healthcare, enterprise SaaS, legal, government
- Usage pattern: dominant background or surface color. Blue does NOT need help — it holds attention without competing.
- Mistake to avoid: Using blue as an accent on a blue background. Blue-on-blue flattens. Use warm accent (gold, orange) to create tension.
- Premium signal: Dark navy (#090F2B, #0A1628) reads as "established institution." Bright blue (#1D4ED8) reads as "startup tech."

**Purple family (violet, indigo, lavender)**
- Emotion: creativity, ambition, mystery, premium/luxury
- Industries: fintech, AI/ML, creative tools, music, beauty
- Usage pattern: gradient partner (purple + blue = "intelligent depth"), accent color on dark bg
- Premium signal: Indigo (#4F46E5) = modern SaaS. Deep violet (#5B21B6) = luxury brand.

**Yellow / Gold**
- Emotion: energy, optimism, urgency (yellow), achievement/wealth (gold)
- Industries: edtech, food/beverage, fintech highlights, alerts
- Usage pattern: ALWAYS accent only (10% rule). Yellow at full saturation (#FFDB43) on dark bg = high contrast, high energy. Muted gold (#D4A853) on cream = refinement.
- Mistake to avoid: Yellow text on white — nearly illegible. Yellow used as a surface/background color without text contrast testing.

**Green family**
- Emotion: growth, success, health, nature, money (finance)
- Industries: fintech (positive), health/fitness, sustainability, productivity
- Usage pattern: semantic color (success states), accent on light themes, dominant bg in health/eco brands
- Premium signal: Dark forest green (#166534) = premium sustainability. Bright lime (#BEFF64) = performance/energy brand.

**Red / Orange**
- Emotion: urgency (red), creativity/warmth (orange), appetite/action
- Industries: food, entertainment, alerts, retail
- Usage pattern: sparingly — semantic (errors/warnings), CTA emphasis, sale badges
- Rule: Never more than 5% of total screen color. Red draws the eye immediately — anything red must deserve that attention.

**Black / Near-Black**
- Emotion: sophistication, editorial, luxury, authority
- Usage: dominant surface in premium dark themes, headline color in light themes
- Premium signal: Pure black (#000000) = fashion/editorial. Near-black with hue (#0A0A0F, #0F0A1E, #090F2B) = tech premium.

**White / Off-White**
- Pure white (#FFFFFF): clinical, minimal, sterile — works for medical/tech, feels cold for lifestyle brands
- Warm off-white (#FAF8F5, #FDF6EE, #FFFBF5): premium, organic, welcoming — editorial and lifestyle brands
- Cool off-white (#F8F9FB, #F0F4FF): neutral-tech — SaaS, productivity apps

---

## PART 2: COLOR RELATIONSHIPS (NOT JUST INDIVIDUAL COLORS)

### The 60-30-10 Rule Applied Emotionally

The RATIO determines the mood, not just the hue:

**60% navy + 30% dark surface + 10% yellow**
= Professional Nigerian tech education brand (H-Tech pattern)
= Reads as: "serious institution but accessible and energetic"

**60% white + 30% light gray + 10% indigo**
= Modern SaaS product
= Reads as: "clean, efficient, trustworthy"

**60% black + 30% dark gray + 10% lime**
= Premium performance/fintech
= Reads as: "elite, aggressive, results-focused"

**60% warm cream + 30% white cards + 10% terracotta**
= Lifestyle/wellness brand
= Reads as: "organic, warm, premium craftsmanship"

### Temperature Contrast (The Most Underused Tool)
Pairing warm and cool creates visual energy:
- Cool dominant + warm accent = productive tension (most premium SaaS)
- Warm dominant + cool accent = grounded with precision
- Both warm = cozy, slow-paced, artisanal
- Both cool = sterile, clinical, logical

**Example**: Navy (#090F2B, cool) + Yellow (#FFDB43, warm) = High contrast, high energy, memorable. This is why it works for H-Tech — education should be energetic, not lethargic.

### Saturation Hierarchy
Premium brands use saturation to signal importance:
- Background: low saturation (near-neutral)
- Surfaces/cards: slight saturation step up
- Interactive elements: medium saturation
- Primary CTA: full saturation of brand color
- Accent/highlight: MAXIMUM saturation — reserved for the single most important thing on screen

---

## PART 3: COLOR USAGE RULES BY CONTEXT

### CTA Hierarchy — Color as Intent Signaler
```
Primary CTA: full brand accent color, white text
  Message: "This is THE action we want"
  Never use more than 1 primary CTA per viewport

Secondary CTA: outlined/ghost (accent border + transparent bg, accent text)
  Message: "An acceptable alternative"

Tertiary CTA: text only, accent color, small arrow
  Message: "If you want more details"

Destructive action: red, but only revealed after intent (not shown by default)
```

### Navigation Color Signals
- Active state: accent color text + low-opacity accent background (8-12%)
  Signal: "You are here"
- Hover state: slight bg (white 4%, black 4%)
  Signal: "This is clickable"
- Inactive: muted text (50-60% opacity)
  Signal: "Available but not current priority"

### Error / Success / Warning — Never Mix With Brand Colors
```
Success: #22C55E (green) — never use brand green for success if brand is green
Warning: #F59E0B (amber)
Error: #EF4444 (red)
Info: #3B82F6 (blue)

These semantic colors must be consistent across the ENTIRE interface.
If your brand color is one of these hues, shift the semantic color:
- Brand is green: use teal (#14B8A6) for success instead
- Brand is red: use orange (#F97316) for warning
```

### Badge / Tag Color System
Badges communicate category — don't randomize colors:
```
Predefined palette of 6-8 badge colors, consistently mapped to categories:
  Tech/Engineering: blue bg (rgba(59,130,246,0.12)), blue text (#3B82F6)
  Creative/Design: purple bg (rgba(139,92,246,0.12)), purple text (#8B5CF6)
  Business/Finance: green bg (rgba(34,197,94,0.12)), green text (#16A34A)
  Data/Analytics: orange bg (rgba(249,115,22,0.12)), orange text (#EA580C)
  Health/Wellness: teal bg (rgba(20,184,166,0.12)), teal text (#0D9488)
  Free/Featured: yellow bg (rgba(255,219,67,0.12)), yellow text (#B45309)
```

---

## PART 4: EMOTIONAL DESIGN PATTERNS BY BRAND ARCHETYPE

### Archetype 1 — The Trusted Authority (Banks, hospitals, enterprise)
**Color**: Navy dominant, white surfaces, minimal accent usage
**Typography**: Traditional weights, subtle hierarchy
**Motion**: Slow, deliberate — nothing jumps or bounces
**Spacing**: Generous — nothing feels cramped or rushed
**Imagery**: Professional, documentary, human faces showing competence
**Message through design**: "We have been here a long time and will still be here."

### Archetype 2 — The Energetic Challenger (H-Tech, edtech startups, fitness apps)
**Color**: Dark dominant with BRIGHT accent (yellow, lime, coral)
**Typography**: Bold, large headlines — weight 800+ everywhere
**Motion**: Quick, punchy reveals. Energetic hover states.
**Spacing**: Tighter than Archetype 1 — density signals activity
**Imagery**: Real people in action, learning, achieving
**Message through design**: "Join the movement. Don't be left behind."

### Archetype 3 — The Premium Minimal (Luxury, high-end SaaS, design tools)
**Color**: Near-monochrome (black/white/one accent) or warm neutrals
**Typography**: Large headlines, lots of whitespace, one typeface
**Motion**: Slow fades, parallax, nothing abrupt
**Spacing**: Extreme generosity — padding that feels "wasteful" to non-designers
**Imagery**: Full-bleed photography, editorial quality, minimal text on images
**Message through design**: "We don't need to shout. You already know."

### Archetype 4 — The Creative Innovator (AI tools, agencies, creative platforms)
**Color**: Unexpected combinations — gradient-heavy, color shifts on scroll
**Typography**: Mixed typefaces, size extremes (4px caption next to 120px headline)
**Motion**: Everything moves — cursor effects, hover distortions, scroll-linked animations
**Spacing**: Asymmetric, intentionally "wrong" by conventional rules
**Imagery**: Abstract, generative, or conceptual — not stock photography
**Message through design**: "The rules don't apply to us. Neither should they to you."

---

## PART 5: APPLYING BRAND COLOR TO H-TECH SPECIFICALLY

**Brand colors**: Navy #090F2B (dominant), Yellow #FFDB43 (accent), Purple #5a18c2 (tertiary)

**Emotional read**: The combination signals "ambitious African tech institution" — navy provides credibility, yellow provides optimism and energy (also culturally resonant), purple adds a layer of innovation/creativity.

**Application rules**:
1. Navy fills 60%+ of the dark theme: background, sidebar, large blocks
2. Yellow is reserved for: primary CTAs, active nav items, course category badges, key stat highlights, hero word emphasis
3. Purple is for: featured content, premium/advanced course indicators, gradient accents, decorative elements
4. Never put yellow text on purple or purple text on yellow — both are mid-brightness, insufficient contrast
5. White text on navy: AA accessible. Yellow text on navy: AAA. Purple on navy: check contrast (5a18c2 on 090F2B may fail — use lighter variant)
6. For light sections (testimonials, social proof): warm white bg (#FAFAF8) with navy text — yellow accent for underlines, bullet points, icons only

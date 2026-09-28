# Premium Agency Typography — Hierarchy Examples

Typographic patterns extracted from studying Lusion, Fantasy, Instrument, and 8 other top creative agencies. These are the specific decisions that separate "AI template" typography from award-winning typography.

---

## PART 1: LUSION.CO TYPOGRAPHY SYSTEM

Lusion is consistently rated among the top interactive studios. Their type system is deceptively simple: one typeface, extreme size contrast, obsessive letter-spacing control.

### Core Principles
- **One typeface rule**: Never more than 2 typefaces. Lusion uses 1.
- **Size extremes**: The gap between largest and smallest text is 10x+ (e.g., 120px headline, 12px label)
- **Weight as hierarchy**: 300 (light) vs 700 (bold) is the only weight pair needed
- **Letter-spacing rules**: Large text gets negative tracking. Small text gets positive tracking.

### Lusion-Inspired Type Scale (for dark premium themes)
```javascript
// Typeface: "Helvetica Neue", "Arial", sans-serif — system stack, no CDN needed
// Or load: "DM Sans" or "Plus Jakarta Sans" for warmer feel

const T = {
  // Display — landing page hero, massive numbers
  display: {
    fontSize: 112,
    fontWeight: 300,    // LIGHT weight — counterintuitive, creates elegance
    letterSpacing: '-0.04em',
    lineHeight: 0.9,
  },

  // Hero H1 — primary page title
  h1: {
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: '-0.035em',
    lineHeight: 1.0,
  },

  // Section heading
  h2: {
    fontSize: 48,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    lineHeight: 1.1,
  },

  // Sub-section heading
  h3: {
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.015em',
    lineHeight: 1.2,
  },

  // Card title / widget heading
  h4: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
  },

  // Body text
  body: {
    fontSize: 16,
    fontWeight: 400,
    letterSpacing: '0em',
    lineHeight: 1.65,
  },

  // Small body / secondary text
  bodySmall: {
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: '0em',
    lineHeight: 1.55,
  },

  // Overline / category label
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.10em',
    lineHeight: 1.4,
    textTransform: 'uppercase',
  },

  // Caption / timestamp
  caption: {
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: '0.01em',
    lineHeight: 1.4,
  },
};
```

### Lusion Contrast Move — Light Weight + Dark Background
```jsx
// The signature Lusion headline: light weight + huge size + tight tracking
<h1 style={{
  fontSize: 96,
  fontWeight: 300,          // Light, not bold
  letterSpacing: '-0.04em',
  lineHeight: 0.92,
  color: 'rgba(255,255,255,0.92)',
}}>
  We build things<br/>
  <span style={{ fontWeight: 700, color: '#BEFF64' }}>that matter.</span>
</h1>
// Note: ONE word or phrase in bold accent color. Everything else thin.
// This contrast is the signature move.
```

---

## PART 2: FANTASY.CO TYPOGRAPHY SYSTEM

Fantasy (fantasy.co) is the agency behind many top-tier creative executions. Their type system is editorial — they mix serif and sans-serif within the same headline, and they break grid conventions intentionally.

### Core Principles
- **Mixed serif/sans within headlines**: Bold sans-serif word + italic serif word = editorial premium
- **Size hierarchy is extreme**: 80px headline next to 13px body with NO intermediate sizes
- **Tracking by emotional role**: Headlines get -0.03em to -0.04em. Run-of-text paragraphs get 0. Labels get +0.06em to +0.12em.
- **The "punctuation as accent" move**: Large quotation marks, em dashes, and asterisks in accent color

### Fantasy-Inspired Type Scale
```javascript
// Primary: "Fraunces" (serif, variable) + "DM Sans" (sans-serif)
// Load via Google Fonts: Fraunces:wght@300;400;700;900,ital@1 + DM Sans:wght@400;500;700

const mixedHeadline = (
  <h1 style={{ fontSize: 72, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900 }}>
      Build what{' '}
    </span>
    <span style={{
      fontFamily: "'Fraunces', serif",
      fontWeight: 400,
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.7)',  // slightly de-emphasized serif
    }}>
      students
    </span>
    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 900 }}>
      {' '}love.
    </span>
  </h1>
);
```

### Fantasy Editorial Pattern — Pull Quote
```jsx
// Large decorative quotation mark + quote text + attribution
<div style={{ position: 'relative', paddingLeft: 48 }}>
  {/* Giant decorative quote mark */}
  <span style={{
    position: 'absolute', left: 0, top: -16,
    fontSize: 120, fontWeight: 900, lineHeight: 1,
    color: 'rgba(accentColor, 0.15)',
    fontFamily: 'Georgia, serif',
  }}>"</span>

  <p style={{ fontSize: 24, fontWeight: 400, fontStyle: 'italic', lineHeight: 1.5,
    fontFamily: "'Fraunces', serif" }}>
    The best investment I've ever made in my career.
  </p>

  <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
    — AMARA OKAFOR, Cloud Engineer
  </div>
</div>
```

---

## PART 3: INSTRUMENT (FIGMA AGENCY) TYPE SYSTEM

Instrument (instrument.com) builds for major tech products. Their system is structured, geometric, and grid-faithful — the opposite of Fantasy's editorial warmth.

### Core Principles
- **One geometric sans-serif**: "Plus Jakarta Sans", "Outfit", "Space Grotesk", or "Geist"
- **Weight contrast is narrow**: 400 and 700 only. Never 300, rarely 800.
- **Tight baseline grid**: 4px base unit. All line-heights snap to multiples of 4px (e.g., 24px body text / 16px font = 1.5 line-height = exactly 24px per line)
- **Restraint in size range**: Max 4 type sizes on any one screen. Dashboard: 32px, 18px, 14px, 12px.

### Instrument-Inspired Dashboard Type Scale
```javascript
// Typeface: 'Plus Jakarta Sans', sans-serif (load 400, 500, 600, 700, 800 weights)

const DASH_TYPE = {
  pageTitle: {
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.02em',
    lineHeight: '32px',  // Snaps to 4px grid: 32px
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: '24px',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0em',
    lineHeight: '20px',
  },
  kpiValue: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: '-0.025em',
    lineHeight: '40px',
  },
  body: {
    fontSize: 14,
    fontWeight: 400,
    letterSpacing: '0em',
    lineHeight: '20px',  // 1.43 — crisp for data
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.01em',
    lineHeight: '16px',
  },
  overline: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: '16px',
  },
};
```

### Instrument Table Typography (often overlooked)
```javascript
// Table headers: different from body text, creates clear separation
header: {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',  // muted — data is the hero, not labels
  lineHeight: '16px',
  paddingBottom: 8,
  borderBottom: '1px solid rgba(255,255,255,0.06)',
}

// Table cells
cell: {
  fontSize: 14,
  fontWeight: 400,
  color: 'rgba(255,255,255,0.87)',
  lineHeight: '20px',
  padding: '16px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
}

// Primary cell (e.g., name/title column)
cellPrimary: {
  fontWeight: 500,
  color: 'rgba(255,255,255,0.92)',
}
```

---

## PART 4: CROSS-AGENCY RULES THAT ALL THREE SHARE

### Rule 1 — Negative Letter-Spacing Scales with Font Size
```
< 14px: letterSpacing 0 to +0.02em (positive or zero)
14-24px: letterSpacing 0 to -0.01em
24-48px: letterSpacing -0.01em to -0.025em
48-72px: letterSpacing -0.025em to -0.035em
72px+:   letterSpacing -0.035em to -0.05em
```
Large type at default tracking looks "digital." Negative tracking makes it feel designed.

### Rule 2 — Weight Contrast Creates Hierarchy Without Size Change
Instead of changing size, change weight within the same size:
```jsx
// Same 14px, different weight = clear hierarchy
<div style={{ fontSize: 14 }}>
  <span style={{ fontWeight: 600, color: '#fff' }}>Cloud Engineering</span>
  <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}> · 12 weeks · Free</span>
</div>
```

### Rule 3 — Muted Text Is NOT Gray — It Is Transparent
Do NOT use a gray hex (#888888). Use transparency on the primary color:
```javascript
// WRONG:
color: '#888888'  // Fixed gray — looks off in different bg contexts

// RIGHT:
color: 'rgba(255,255,255,0.55)'  // Transparent white — always correct relative to bg
color: 'rgba(255,255,255,0.35)'  // More muted
color: 'rgba(255,255,255,0.20)'  // Disabled / placeholder
```

### Rule 4 — Uppercase Labels Are ALWAYS Tracked Out
```javascript
// Uppercase + no letter-spacing = cramped, illegible
// WRONG:
{ textTransform: 'uppercase', letterSpacing: 0 }

// RIGHT:
{ textTransform: 'uppercase', letterSpacing: '0.08em' }  // minimum
{ textTransform: 'uppercase', letterSpacing: '0.12em' }  // comfortable
```

### Rule 5 — Line Length Control
Maximum readable line length is 65-75 characters. In CSS: `maxWidth: 620px` for 16px body.
For different sizes:
```
12px body: maxWidth ~480px
14px body: maxWidth ~560px
16px body: maxWidth ~640px
18px body: maxWidth ~720px
```
Headings have no maxWidth constraint — they can go full container width.

### Rule 6 — Headline Line-Height Below 1.2
For headlines above 32px, line-height should be ≤ 1.2. For display sizes (64px+), go to 0.9-1.0.
```javascript
// dashboard H1 (28px): lineHeight: 1.2
// landing H1 (64px): lineHeight: 1.0
// display (96px+): lineHeight: 0.9
```
Generous line-height on large text makes it look like a word processor, not a design.

---

## PART 5: FONT PAIRING SYSTEM (8 PREMIUM PAIRS)

| Pair | Heading | Body | Mood | Best For |
|------|---------|------|------|----------|
| 1 | Space Grotesk 700 | DM Sans 400 | Technical premium | AI, Dev tools, fintech |
| 2 | Fraunces 900 | Source Sans 3 400 | Editorial warm | Edtech, lifestyle |
| 3 | Plus Jakarta Sans 800 | Plus Jakarta Sans 400 | Clean modern | SaaS, productivity |
| 4 | Outfit 800 | Outfit 400 | Friendly tech | Edtech, health, apps |
| 5 | Playfair Display 700 italic | Manrope 400 | Luxury editorial | Finance, legal, fashion |
| 6 | Geist 800 | Geist 400 | Developer-first | Dev tools, CLI apps |
| 7 | Syne 800 | Inter 400 | Avant-garde | Design agencies, art |
| 8 | Libre Baskerville 700 | Karla 400 | Established trust | Healthcare, education |

### Google Fonts CDN Strings
```html
<!-- Pair 1: Space Grotesk + DM Sans -->
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- Pair 2: Fraunces + Source Sans 3 -->
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;0,900;1,400&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">

<!-- Pair 3: Plus Jakarta Sans -->
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Pair 4: Outfit -->
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## PART 6: TYPOGRAPHY FOR H-TECH SPECIFICALLY

**Recommended pair**: Outfit 800 (headlines) + Outfit 400/500 (body) — single family, friendly-tech mood, African tech brand feel.

**Alternative**: Space Grotesk 700 + DM Sans 400 — more serious, premium tech institution.

**Specific values for H-Tech UI**:
```javascript
// Hero headline (homepage)
heroH1: { fontSize: 64, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, fontFamily: 'Outfit' }

// Section headline
sectionH2: { fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }

// Course card title
courseTitle: { fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.35 }

// Body text
body: { fontSize: 15, fontWeight: 400, lineHeight: 1.65, letterSpacing: 0 }

// Course category badge
badge: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }

// Stat numbers (hero section)
statNumber: { fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', color: '#FFDB43' }
statLabel: { fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.55)' }
```

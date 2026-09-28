# Design System Reference — Complete Token Specification

This document contains the exact spacing, typography, color, shadow, and component specifications extracted from 20+ production design systems (Untitled UI, Shadcn/ui, Ant Design, Material Design 3, Chakra UI, Radix) and codified from principles taught by Erik D. Kennedy, Steve Schoger (Refactoring UI), and top Dribbble agencies.

---

## 1. Spacing System (8px Grid)

### The Scale
All spacing values MUST be from this set. No arbitrary numbers.

| Token | px | Use |
|-------|-----|-----|
| xs | 4 | Icon-to-label gaps, helper text offset, micro adjustments |
| sm | 8 | Tightly coupled elements: heading-to-subtitle, avatar-to-name |
| md | 12 | Compact internal padding, small card padding, input internal padding |
| base | 16 | Standard internal padding, paragraph spacing, button horizontal padding |
| lg | 20 | Comfortable internal padding |
| xl | 24 | Card padding (standard), grid gutters, section sub-spacing |
| 2xl | 32 | Section spacing within a page |
| 3xl | 48 | Major section dividers |
| 4xl | 64 | Page-level spacing, hero section padding |

### The Proximity Rule (Gestalt)
**Internal padding ≤ external spacing between groups.** A card with 24px inner padding needs ≥24px gaps between cards. This creates clear visual grouping.

### Component Dimensions

| Element | Standard | Range |
|---------|----------|-------|
| Sidebar expanded | 240px | 220-280px |
| Sidebar collapsed | 64px | 48-80px |
| Top header height | 64px | 48-80px |
| Card padding | 24px | 16-32px |
| Card gap (grid) | 16-24px | 12-28px |
| Card border-radius | 12-20px | 8-24px |
| Page content padding | 24-32px | 16-48px |
| Right panel width | 280-360px | 260-400px |
| Mobile bottom nav | 56-66px | 49-72px |
| Mobile phone frame | 320-340px wide | 640-720px tall |

### Button & Input Sizing

| Size | Height | H-padding | Font | Radius |
|------|--------|-----------|------|--------|
| SM | 36px | 12px | 13px | 8px |
| MD | 40px | 16px | 14px | 10px |
| LG | 48px | 20px | 15px | 12px |

---

## 2. Typography System

### The Major Third Scale (1.25 ratio from 16px base)

Use this for most dashboards and applications:

| Level | Size | Weight | Line-height | Letter-spacing | Use |
|-------|------|--------|-------------|---------------|-----|
| Display | 48px | 800-900 | 1.1 | -0.02em | Hero numbers, marketing |
| H1 | 28-32px | 800-900 | 1.2 | -0.02em | Page titles |
| H2 | 20-24px | 700-800 | 1.25 | -0.01em | Section headings |
| H3 | 16-18px | 600-700 | 1.3 | -0.005em | Card/widget titles |
| Body | 14-16px | 400 | 1.5 | 0 | Standard text |
| Body small | 12-13px | 400-500 | 1.5 | 0 | Secondary text, table cells |
| Caption | 11-12px | 500 | 1.4 | 0 to +0.01em | Labels, timestamps |
| Overline | 10-11px | 600-700 | 1.4 | +0.05em to +0.08em | Category tags (uppercase) |

### The Three-Level Emphasis System

DON'T create hierarchy through font size alone. Use weight + color:

**Primary (high emphasis)**: Near-black (#1A1A2E / #0F172A) or near-white (#F8FAFC), weight 600-800. For headings, KPI values, names.

**Secondary (medium emphasis)**: Gray (#64748B / #6B7085 / rgba(255,255,255,0.55)), weight 400-500. For descriptions, subtitles, body text.

**Tertiary (low emphasis)**: Light gray (#94A3B8 / #A09DAF / rgba(255,255,255,0.3)), weight 400. For timestamps, helper text, disabled content.

**Rule**: Bold the data, not the label. In "$48,293 Monthly Revenue" — the dollar amount is 28px weight 800, the label is 12px weight 500 muted.

### Font Pairing Recommendations

**Single family (safest approach — one font, vary weight):**
- DM Sans (300-700) — clean geometric, excellent at all sizes
- Plus Jakarta Sans (400-800) — modern startup feel
- Outfit (300-900) — contemporary with wide weight range
- Manrope (400-800) — refined geometric with character

**Dual family (heading + body):**
- Playfair Display (headings) + DM Sans (body) — premium editorial
- Space Grotesk (headings) + Inter (body) — tech-forward
- Fraunces (headings) + Source Sans 3 (body) — distinctive editorial
- Sora (headings) + DM Sans (body) — modern geometric

**Import via Google Fonts CDN:**
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## 3. Color System

### The 60-30-10 Distribution Rule

- **60%** dominant: Page background, content areas, card bodies
- **30%** secondary: Sidebar, navigation, card headers, borders
- **10%** accent: Buttons, active states, links, chart highlights

### Building a Palette

Start with ONE accent color in HSL. Build 9 shades by:
1. Lightest (50): works as tinted badge/alert background
2. Base (500): works as button background
3. Darkest (900): works as text on light backgrounds
4. Fill intermediates. Rotate hue 5-15° across range for richness.
5. Increase saturation at both extremes (prevents washed-out appearance).

### Semantic Colors (use consistently everywhere)

| Semantic | Color | Light BG | Dark BG |
|----------|-------|----------|---------|
| Success | #10B981 / #34D399 | #ECFDF5 / #D1FAE5 | rgba(52,211,153,0.1) |
| Error | #EF4444 / #F87171 | #FEF2F2 / #FEE2E2 | rgba(248,113,113,0.1) |
| Warning | #F59E0B / #FBBF24 | #FFFBEB / #FEF3C7 | rgba(251,191,36,0.1) |
| Info | #3B82F6 / #60A5FA | #EFF6FF / #DBEAFE | rgba(96,165,250,0.1) |

### Chart Colors (categorical — high differentiation)

```javascript
const chartColors = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];
```

Max 5-7 distinct hues per chart. Same color = same meaning across all charts.

### Accessibility Minimums

- Normal text on background: 4.5:1 contrast ratio (WCAG AA)
- Large text (≥18px or ≥14px bold): 3:1 contrast ratio
- UI components and focus indicators: 3:1
- Never use color alone to convey meaning — pair with icons or labels

---

## 4. Shadow System

### The Tailwind Standard Scale (industry default)

```css
shadow-xs:  0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-sm:  0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

Usage: `xs` for cards at rest. `sm` for subtle elevation. `md` for hover states and dropdowns. `lg` for modals. `xl` for large overlays.

### Colored Shadows (premium technique)

Instead of gray shadows, tint with the element's or background's hue:
```css
/* Accent button */
box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
/* Success card */
box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
/* On colored background */
box-shadow: 0 4px 12px hsla(250, 50%, 50%, 0.08);
```

### Layered Shadows (Josh Comeau technique — maximum realism)

```css
box-shadow:
  0 1px 1px hsl(0deg 0% 0% / 0.075),
  0 2px 2px hsl(0deg 0% 0% / 0.075),
  0 4px 4px hsl(0deg 0% 0% / 0.075),
  0 8px 8px hsl(0deg 0% 0% / 0.075),
  0 16px 16px hsl(0deg 0% 0% / 0.075);
```

---

## 5. Dark Theme Engineering

### Surface Hierarchy (NEVER use pure black #000)

| Level | Hex | Purpose |
|-------|-----|---------|
| Base BG | #0B0B0F to #0F172A | Page background |
| Surface 1 | #141419 to #1E293B | Cards, panels |
| Surface 2 | #1E1E26 to #334155 | Elevated cards, dropdowns |
| Surface 3 | #2A2A35 to #475569 | Hover states |
| Border | rgba(255,255,255,0.06-0.12) | Subtle dividers |

### Dark Theme Text

- High emphasis: rgba(255,255,255,0.87) ≈ #DEDEDE
- Medium emphasis: rgba(255,255,255,0.55-0.60)
- Low emphasis: rgba(255,255,255,0.30-0.38)

### Dark Theme Color Adjustments

Desaturate accent colors. Use 200-300 range shades instead of 500-600. Pure saturated colors on dark backgrounds cause eye strain. Example: Indigo primary goes from #4F46E5 (light mode) to #818CF8 (dark mode).

Tint your dark grays with brand hue for cohesion (Spotify tints with green, Twitter with blue).

---

## 6. Light Colored Background Technique

Instead of pure white page backgrounds, use very low saturation tints:

```
Lavender:  hsl(250, 100%, 97%) → #EDE9FE or #F5F3FF
Cool blue:  hsl(210, 100%, 97%) → #F0F4FF
Warm cream: hsl(30, 100%, 98%)  → #FFFBF5
Mint:       hsl(150, 60%, 97%)  → #F0FDF4
Blush:      hsl(350, 80%, 97%) → #FFF1F2
```

White cards (#FFFFFF) on colored backgrounds create natural elevation without shadows. Borders should be a slightly darker tint of the background, not gray.

---

## 7. SVG Chart Specifications

### Area Chart
- Canvas: viewBox="0 0 [w] [h]", width="100%"
- Grid lines: 4-5 horizontal, rgba stroke at 0.04-0.06 opacity
- Curve: Cubic bezier paths (C command), NOT straight line segments
- Fill: linearGradient from accent at 0.2 opacity to 0 opacity
- Active point: Animated circle with pulse (r oscillating 4-8px)
- X-axis labels: 10-11px, muted color, centered under data points

### Bar Chart
- Bar width: 40-50% of slot width
- Bar radius: 5-6px top corners
- Highlight bar: Full accent color with gradient
- Non-highlight: 10-15% opacity of accent
- Value label on tallest bar only

### Donut Chart
- Size: 140-180px
- Stroke width: 18-24px
- Gap between segments: 4-6px (via strokeDasharray math)
- Center text: Total value (20-24px bold) + label (10px muted)
- Segment glow: filter drop-shadow matching segment color

---

## 8. Animation Specifications

### Entrance Animation
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.10s; }
.delay-3 { animation-delay: 0.15s; }
/* Continue in 50ms increments */
```

### Hover Transitions
```css
transition: all 0.2s ease;
/* Cards: translateY(-3px to -4px) + shadow increase */
/* Buttons: translateY(-2px) or scale(1.02) + shadow */
/* Nav items: background-color change */
/* List rows: background-color change */
```

### Timing Rules
- Hover: 150-250ms (sweet spot: 200ms)
- Page transitions: 300-500ms
- Only animate `transform` and `opacity` (GPU-accelerated)
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for spring-like entrances
- Never exceed 500ms for micro-interactions

---

## 9. Component Patterns

### KPI Card Anatomy
```
┌──────────────────────────────────┐
│ [Icon 48px]          [Badge ▲12%]│  ← icon in tinted bg + trend badge
│                                  │
│ $184,632                         │  ← 28-32px, weight 800-900
│ Total Revenue                    │  ← 12-13px, weight 500, muted
│ vs last month                    │  ← 11px, tertiary (optional)
└──────────────────────────────────┘
```
- Decorative circle in top-right corner (accent at 0.04-0.06 opacity)
- Max 4 KPI cards in a row (desktop), 2 on tablet, 1 on mobile
- Trend badge: green bg + green text for up, red bg + red text for down

### Navigation Sidebar
- Active item: accent background (8-12% opacity) + accent text + weight 600 + optional left border
- Inactive: muted text + weight 400
- Hover: subtle bg change (3-6% opacity)
- Item height: 40-48px
- Icon-to-text gap: 12px
- Section headers: 10-11px uppercase, letter-spacing +1-2px, tertiary color
- Badge/count: pill shape, accent bg, white/dark text, 9-10px font

### Transaction/Activity List
```
┌──────────────────────────────────────────┐
│ [Icon 40-44px]  Name          -$2,450.00 │
│                 Category      2 min ago   │
└──────────────────────────────────────────┘
```
- Icon in tinted background (category color at 10-15% opacity)
- Amount: weight 700, negative=primary text, positive=green
- Timestamp: tertiary text
- Hover: subtle bg highlight
- Divider: 1px border-top OR spacing only (no heavy lines)

### Credit Card Visual
```
┌────────────────────────────────┐
│ BRAND                [Chip]    │  ← gradient background
│                                │
│ •••• •••• •••• 4829           │  ← letter-spacing 3-4px
│                                │
│ HOLDER        EXPIRES          │
│ David Chen    09/28            │
└────────────────────────────────┘
```
- Background: dark gradient (135deg, 2-3 colors)
- Border-radius: 18-22px
- Decorative circles (accent at 0.06-0.08 opacity)

### Progress Ring (Circular)
```javascript
const Ring = ({pct, size=44, thick=4, color}) => {
  const r = (size - thick) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke="rgba(0,0,0,0.06)" strokeWidth={thick}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={thick}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct/100)}
        strokeLinecap="round"
        style={{transform:'rotate(-90deg)', transformOrigin:'center'}}/>
      <text x="50%" y="50%" textAnchor="middle" dy=".35em"
        fontSize="10" fontWeight="700">{pct}%</text>
    </svg>
  );
};
```

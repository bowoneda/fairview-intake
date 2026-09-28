# Anti-Patterns & Quality Checklist

The 15 specific mistakes that make AI-generated UI look cheap, plus the professional design quality checklist to run before finalizing any output. Sourced from Nielsen Norman Group research, Refactoring UI (Schoger & Wathan), Erik D. Kennedy, and analysis of 20+ top Figma community kits.

---

## The 15 AI-Generated UI Anti-Patterns

### 1. Uniform Whitespace
**Problem**: Equal padding/margins everywhere (16px on everything). Creates visual monotony — the eye has no rhythm to follow.
**Fix**: Vary spacing intentionally. Use the proximity principle:
- 4-8px between tightly coupled elements (icon + label)
- 12-16px between related items within a component
- 24-32px between components or card groups
- 48-64px between major page sections

### 2. Predictable Symmetrical Layouts
**Problem**: Perfect 50/50 splits, everything centered, equal column widths. Looks automated.
**Fix**: Use asymmetric splits. `grid-template-columns: 2fr 1fr` or `1.2fr 1fr` or `3fr 2fr`. Make one element clearly dominant. A 60/40 chart-to-sidebar split is more interesting than 50/50.

### 3. Boring Safe Color Choices
**Problem**: Lots of gray, one blue accent, white background. The "React admin template" look.
**Fix**: Use unexpected accent colors (coral #F97066, amber #F59E0B, violet #8B5CF6, lime #C8F560). Add tinted backgrounds instead of pure white. Use colored shadows. Try dark sidebar on light content, or dark theme with a vivid accent.

### 4. Default Font Syndrome
**Problem**: Inter or Roboto with one weight and one color. Instantly recognizable as AI output.
**Fix**: If using a common font, compensate with excellent weight hierarchy (400/500/600/700/800), letter-spacing variation (-0.02em on headlines, +0.05em on uppercase labels), and three levels of color emphasis. Better: choose a distinctive font (DM Sans, Outfit, Manrope, Plus Jakarta Sans).

### 5. Too Many Elements
**Problem**: AI generates every possible widget to fill space. Dashboard becomes cluttered.
**Fix**: Apply progressive disclosure. Show only essential content. Each page should have ONE clear purpose and ONE hero element. Use tabs/toggles to hide secondary content. Less is almost always more.

### 6. Wrong Visual Hierarchy
**Problem**: All elements compete equally for attention. Every card is the same size, same weight, same prominence.
**Fix**: Establish clear hierarchy through:
- Size: Hero KPI card is 2x the visual weight of secondary cards
- Color: Primary action uses accent color; everything else is neutral
- Position: Most important data in top-left (F-pattern scanning)
- Space: More whitespace around important elements creates emphasis

### 7. Borders Everywhere
**Problem**: Thick borders (2px+) around every card, input, and container. Creates visual noise.
**Fix**: Replace borders with spacing, background color differences, and shadows. If using borders: 1px only, very light color (#E2E8F0 for light mode, rgba(255,255,255,0.06) for dark). Prefer `border: none` with `box-shadow: shadow-xs` for cards.

### 8. Cookie-Cutter Card Sizes
**Problem**: All cards identical height and width in a grid. Looks like a spreadsheet.
**Fix**: Use mixed-height bento grids. Feature card spans 2 columns. One tall card spans 2 rows. Vary card importance through physical size. Use `grid-template-rows: auto` to let content determine height.

### 9. Generic Gradients
**Problem**: Linear gradient from blue to purple slapped on backgrounds. The #1 AI design cliché.
**Fix**: Use solid colors with subtle tints. If using gradients, make them very muted (2-5% opacity) or limit to small accent elements (sidebar CTA, credit card visual). Radial gradients as decorative overlays work better than linear background gradients.

### 10. Missing Component States
**Problem**: No hover, focus, active, disabled, loading, or error states. Interface feels dead.
**Fix**: Every interactive element needs:
- **Hover**: translateY(-2px to -3px), shadow increase, border-color change, bg-color shift. 200ms transition.
- **Active/pressed**: Slightly darker than hover, scale(0.98)
- **Focus-visible**: 2px ring in accent color, 2px offset
- **Disabled**: opacity 0.5, cursor: not-allowed

### 11. Inconsistent Icon Style
**Problem**: Mixing outlined and filled icons, different stroke weights, different sizes in the same context.
**Fix**: Choose ONE icon style (outlined preferred for dashboard nav). ALL icons in the same context must be the same size (18-20px for sidebar, 14-16px for inline). Same strokeWidth throughout (1.5-2.0). Active nav items can switch from outlined to filled as the only exception.

### 12. Pure Black and Pure White
**Problem**: Using #000000 for text and #FFFFFF for everything else. Creates harsh contrast that feels cheap.
**Fix**: 
- Instead of #000: Use #0F172A (Slate-900) or #1E1B2E (with slight hue tint)
- Instead of #FFF: Use #F8FAFC (Slate-50) or a subtle tinted off-white
- Dark mode bg: #0B0B0F to #0F172A, NOT #000000

### 13. Flat Lifeless Surfaces
**Problem**: No shadow variation, no elevation hierarchy. Everything sits on the same plane.
**Fix**: Create at least 3 elevation levels:
- Level 0: Page background (no shadow)
- Level 1: Cards at rest (shadow-xs or 1px border)
- Level 2: Hover state / dropdowns (shadow-md)
- Level 3: Modals / floating panels (shadow-lg to shadow-xl)
Use background color lightness steps in dark mode instead of shadows.

### 14. No Visual "Wow" Element
**Problem**: Everything is equally mundane. Nothing catches the eye. Forgettable.
**Fix**: Every page needs ONE distinctive element:
- An oversized hero number (48-52px)
- A gradient-background credit card or feature card
- Decorative radial gradient circles behind content
- An animated chart with a glowing active point
- A glassmorphic overlay card
- A bold colored section break

### 15. Template-Recognizable Layout
**Problem**: Sidebar + top bar + 4 equal KPI cards + one chart. The layout every template uses.
**Fix**: Break expectations:
- Start with a large welcome/summary card instead of KPI row
- Use an asymmetric bento grid instead of equal columns
- Put the chart as a background element behind KPI cards
- Use a horizontal scrolling card row for secondary content
- Mix card heights: tall + short in the same row

---

## Design Quality Checklist

Run through this BEFORE finalizing any HTML output.

### Spacing
- [ ] ALL padding/margin values are from the 8px grid: 4, 8, 12, 16, 20, 24, 32, 48, 64
- [ ] Internal card padding ≤ gaps between cards
- [ ] Section spacing (32-48px) > component spacing (12-24px) > element spacing (4-12px)
- [ ] No two adjacent elements have the exact same spacing on all sides
- [ ] Page has breathing room: 24-32px content padding from edges

### Typography
- [ ] Maximum 4-5 distinct font sizes across entire interface
- [ ] Three emphasis levels used: primary (dark, bold), secondary (muted, medium), tertiary (light, regular)
- [ ] Hero numbers/KPIs are 2-3x larger than body text
- [ ] Labels are lighter/smaller than the values they describe
- [ ] Headlines use negative letter-spacing (-0.5px to -1px at 24px+)
- [ ] No text is the same size AND same weight AND same color as adjacent text

### Color
- [ ] 60-30-10 distribution is visible (dominant bg, secondary surface, accent pops)
- [ ] Accent color appears in ≤5 places per page view
- [ ] Status colors are consistent (green=success, red=error, amber=warning everywhere)
- [ ] No pure #000000 as text color
- [ ] No pure #FFFFFF as only background (use tinted or off-white)
- [ ] Charts use a differentiated palette with max 5-7 hues

### Layout
- [ ] At least one grid uses asymmetric proportions (not all 1fr)
- [ ] Cards are NOT all the same height — at least one is taller/wider
- [ ] One element per page section is clearly the "hero" (2x visual weight)
- [ ] Sidebar navigation has clear active state with color/weight/background change
- [ ] Page has visual flow: eye moves top-left → right → down naturally

### Interactivity
- [ ] Every card has hover state (translateY + shadow change, 200ms)
- [ ] Every button has hover state (color/shadow change)
- [ ] Navigation items have hover and active states
- [ ] All transitions use 200ms ease or similar (not instant)
- [ ] Entrance animations with staggered delays (0ms, 50ms, 100ms, 150ms...)

### Polish (the final 10%)
- [ ] Border-radius is consistent: one value for cards, one for buttons, one for pills
- [ ] Shadows are consistent: same shadow style on all cards at the same level
- [ ] Decorative elements exist: at least one radial gradient, glow, or accent shape
- [ ] Icon sizes are consistent within each context
- [ ] Avatar/badge system is consistent (same sizes, same border treatment)
- [ ] Scrollbar is styled (thin, subtle track)
- [ ] Active nav item uses the accent color as text, bg, or left border

---

## Premium Execution Patterns (from analyzed references)

### Decorative Radial Gradients
Add behind content areas for depth:
```javascript
<div style={{
  position: 'absolute', top: -30, right: -30,
  width: 120, height: 120, borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(accent, 0.08), transparent)',
  pointerEvents: 'none'
}} />
```

### Glassmorphism Cards
Use over gradient or colored backgrounds:
```javascript
{
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 20
}
```

### Dramatic Type Scale
The "Dribbble shot" look uses extreme contrast:
- Hero number: 48-56px, weight 900
- Label underneath: 10-12px, weight 500, muted
- This creates a 4-5x size ratio that reads as intentional, not accidental

### Color-Tinted Backgrounds per Category
Instead of all gray icon backgrounds, tint each category:
```javascript
const categories = [
  { bg: 'rgba(99,102,241,0.08)', color: '#6366F1' },   // purple
  { bg: 'rgba(16,185,129,0.08)', color: '#10B981' },   // green
  { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B' },   // amber
  { bg: 'rgba(239,68,68,0.08)', color: '#EF4444' },     // red
];
```

### Staggered Animation Classes
Define once in CSS, reuse everywhere:
```css
.fu { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }
.d1 { animation-delay: 0.05s; }
.d2 { animation-delay: 0.10s; }
.d3 { animation-delay: 0.15s; }
.d4 { animation-delay: 0.20s; }
.d5 { animation-delay: 0.25s; }
.d6 { animation-delay: 0.30s; }
```

### The "One Bold Move" Principle
Every page should have exactly ONE element that breaks the pattern:
- A full-width gradient card among white cards
- A dark sidebar on a light layout
- A lime green accent in a purple scheme
- An oversized avatar or illustration
- A card with a glowing animated border

This single bold element is what makes the difference between "competent" and "memorable."

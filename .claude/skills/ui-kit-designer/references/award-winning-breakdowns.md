# Real Dribbble & Awwwards Design Breakdowns — 27 Referenced Shots

Each entry is a real, named shot from a specific designer or studio. Colors, layouts, typography, and patterns are extracted from the actual designs. Use these as direct reference when building UIs — cite the shot number when applying a specific pattern.

---

## CATEGORY 1: DARK DASHBOARD UI (Shots 1–5)

---

### SHOT 1 — Ramotion: Dark Mode Admin Dashboard Analytics
**URL:** https://dribbble.com/shots/21481414-Dark-Mode-Admin-Dashboard-Analytics-UX-UI
**Designer:** Ramotion Inc.
**Engagement:** 778 likes / 289,000+ views — community benchmark

**Palette:**
```
bg:        #0D0F14  (near-black with slight cool tint)
surface:   #12151C  (card backgrounds)
accent:    #7B5EA7 -> #A16FE8  (purple-violet gradient)
text1:     #F5F5F5  (primary)
text2:     #9EA3B0  (secondary)
success:   #22C55E
danger:    #EF4444
border:    rgba(255,255,255,0.08)  (1px card borders)
```

**Layout (1440px viewport):**
- Sidebar: 240px, same bg as page, no border — depth created by content contrast alone
- Header: 64px, icon + global search (280px wide) + notification bell + avatar cluster
- Content padding: 28px all sides
- KPI row: `repeat(4,1fr)` gap 20px, card height 120px
- Chart section: `3fr 2fr` split, gap 20px, height 340px
  - Left: area chart, gradient fill purple→transparent, bezier curves (no polylines)
  - Right: donut ring chart, stroke-width 18px, gap between segments 3px
- Bottom: data table `2fr 1fr`, row height 52px
- Table alternating rows: `rgba(255,255,255,0.02)` — barely visible, essential for scannability

**Typography:**
- Font: Inter or geometric sans, weights 400/500/700
- KPI values: 32–40px, weight 700–800, letter-spacing -0.02em
- KPI labels: 12px, weight 500, +0.02em, uppercase, opacity 0.5
- Table headers: 11px, weight 600, +0.08em, uppercase, opacity 0.4
- Table cells: 13px, weight 400

**The Ramotion Signature Move:**
Purple gradient is applied IDENTICALLY across chart fills, badge backgrounds, active sidebar states, and button backgrounds. Total palette coherence — not just one accent color, but one accent system. Replicate by deriving all accent tints from `rgba(139,92,246,X)` where X varies: 1.0 (primary), 0.15 (badge bg), 0.08 (surface tint), 0.04 (hover).

**Motion:**
- Area chart: SVG path `stroke-dashoffset` animation, 800ms ease-out on mount
- KPI numbers: count-up animation, 1200ms easeOutQuart
- Row hover: `background rgba(255,255,255,0.03)`, 100ms transition

---

### SHOT 2 — Ramotion: Financial Investment Admin Dashboard
**URL:** https://dribbble.com/shots/21588047-Financial-Investment-Admin-Dashboard-Analytics-UX-UI
**Designer:** Ramotion Inc.

**Palette:**
```
bg:        #0E1320  (deep navy, warmer than Shot 1)
surface:   #1A1F2E  (charcoal cards)
accent:    #3ECFCF  (cyan/teal — fintech "up" color)
alert:     #F97316  (orange — for loss indicators)
text1:     #FFFFFF
text2:     rgba(255,255,255,0.6)
border:    rgba(255,255,255,0.10)
glass:     rgba(255,255,255,0.06) + backdrop-filter blur(12px)
```

**Layout:**
- Portfolio hero card: `width: 100%`, padding 32px, bg = subtle glassmorphism (`rgba(255,255,255,0.06)` + `backdrop-filter blur(12px)`)
  - Balance display: 48px, weight 800, centered
  - Below balance: 24h change in large pill badge (green or red)
- Full-width line chart below hero: height 280px, cyan stroke, gradient area fill
- Asset list table: columns = [icon+name, price, 24h%, holdings, mini-sparkline]
  - Sparklines: 48px wide × 28px tall, inline SVG polyline, green/red based on trend
  - Price change pills: `borderRadius 99px`, `padding 2px 8px`, green bg `rgba(52,211,153,0.15)`
- Right rail (280px): pie chart (donut, 140px diameter) + recent transactions feed

**Key Pattern — Crypto Coin Row:**
```
Row: height 56px, padding 0 16px
  Left: circular coin icon 32px + coin name 14px 600w + ticker 12px muted (stacked)
  Mid: price 14px 600w
  Change: pill badge, 11px 600w, green/red
  Holdings: 14px 400w right-aligned
  Sparkline: 48x28px SVG, absolute right edge
```

**Glassmorphism Rules (from this shot):**
- Only apply to the 1–2 hero/focal cards, never to ALL cards
- Background: `rgba(255,255,255,0.06)` on dark bg, or `rgba(0,0,0,0.12)` on light
- Always pair with `backdrop-filter: blur(12px) saturate(150%)`
- Border: `1px solid rgba(255,255,255,0.12)` — slightly brighter than regular card borders

---

### SHOT 3 — Eclipse: Figma Dashboard UI Kit (Alien Pixels / Setproduct)
**URL:** https://dribbble.com/shots/23758485-Eclipse-Figma-dashboard-UI-kit-for-data-design-web-apps
**Designer:** Alien Pixels for Setproduct
**Font:** ABC Favorit (premium editorial geometric sans — used by Stripe, Linear, Vercel)

**Palette:**
```
accent:     #2126C4  (deep royal blue — strong, not pastel)
bg-dark:    #0F1117  (near-black cool)
surface:    #1C2032  (slate card)
bg-light:   #FFFFFF  (light theme)
chart-series: #2126C4 (primary), #2ECAA0 (teal), #F59E0B (amber), #EF4444 (red)
```

**What Eclipse Does Differently:**
- ABC Favorit typeface: heavier optical weight than Inter at the same px — text reads "more designed" without size increase
- 10 dashboard verticals in one system (Analytics, Kanban, Crypto, Banking, Budget, Streaming) — each vertical has a distinct chart style:
  - Analytics: area charts with gradient fill
  - Kanban: color-coded column status bars
  - Crypto: candlestick + line combo charts
  - Budget: stacked bar + donut combination
- Dark theme blue (#2126C4) reads as "institutional confidence" not "startup blue" — deeper saturation signals maturity

**Typography Scale (ABC Favorit applied):**
- Dashboard H1: 24px, weight 700, -0.02em
- Widget title: 15px, weight 600, -0.01em
- KPI value: 36px, weight 700, -0.025em
- Table header: 11px, weight 600, +0.06em, uppercase
- Body: 13px, weight 400, 0em

---

### SHOT 4 — Salesline: Analytics Dashboard UI Kit (Uxerflow)
**URL:** https://dribbble.com/shots/18740845-Salesline-Analytics-Dashboard-UI-Kit
**Designer:** Uxerflow UI/UX

**Palette (Light Theme):**
```
bg:         #F4F6FA
surface:    #FFFFFF
accent:     #4F46E5  (indigo — corporate but modern)
text1:      #1E293B
text2:      #64748B
border:     #E2E8F0
success:    #22C55E
warning:    #F59E0B
danger:     #EF4444
```

**Palette (Dark Theme):**
```
bg:         #131721
surface:    #1C2333
accent:     #818CF8  (lighter indigo for dark — same hue, higher brightness)
border:     rgba(255,255,255,0.06)
```

**Layout — Sales Dashboard Specific:**
- KPI strip: 4 cards, `repeat(4,1fr)`, gap 20px
  - Each card has: trend icon (up/down arrow) + % change value in color-coded pill
  - Card highlight: left border accent — `borderLeft: '3px solid #4F46E5'` (or semantic color)
- Time-series chart: full-width, 320px tall, date range picker top-right (30D / 90D / 1Y / Custom)
- Geographic map widget: SVG world/regional map, country fills colored by sales intensity
- Orders table: columns = [order ID, customer avatar+name, product, status badge, amount, date]
  - Status badges: `borderRadius 99px`, `fontSize 11px`, `fontWeight 600`, `padding 3px 10px`
  - Status colors: Delivered (green), Processing (blue), Cancelled (red), Pending (amber)

**The Date Range Picker Pattern:**
```jsx
// Pill group — active state stands out, others fade
<div style={{ display:'flex', background: surface2, borderRadius: 99, padding: 3 }}>
  {['7D','30D','90D','1Y'].map(range => (
    <button style={{
      padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: active === range ? '#FFFFFF' : 'transparent',
      color: active === range ? accent : text2,
      boxShadow: active === range ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
      border: 'none', cursor: 'pointer', transition: 'all 150ms ease'
    }}>{range}</button>
  ))}
</div>
```

---

### SHOT 5 — Jon Sandmann: Power BI Dark Theme Dashboard
**URL:** https://dribbble.com/shots/24145172-Power-BI-Dark-Theme-Dashboard-Power-UI
**Designer:** Jon Sandmann (250+ component system)

**Palette:**
```
bg:         #0B0F1A  (deepest navy)
surface:    #151B2A  (card backgrounds)
accent:     #3B82F6  (electric blue)
accent2:    #2563EB  (deeper blue for hover/active)
gradient-bg: linear-gradient(135deg, #0B0F1A 0%, #1A1040 100%)  (gradient variant)
text1:      #F8FAFC
text2:      #94A3B8
border:     rgba(255,255,255,0.06)
```

**Layout (Power BI Canvas 1280x720):**
- No sidebar — top navigation bar (Power BI convention)
- KPI card row: 5 cards across, shorter than standard dashboards (80px tall), `padding 16px`
- Central chart zone: 2-column `3fr 2fr`, bar charts side by side
- Lower row: gauge charts (semicircle) + donut rings + matrix table
- Gradient dark variant: sweeping `linear-gradient(135deg, #0B0F1A, #1A1040)` fills entire bg

**Jon Sandmann's 250-Component Token Rule:**
Every color is a variable. Change `--brand-blue` once → 250 components update simultaneously. This is the professional standard. In JSX: define one `const C = { accent: '#3B82F6' }` object and reference only `C.accent` — never hardcode `'#3B82F6'` twice.

---

## CATEGORY 2: EDTECH LANDING PAGES (Shots 6–9)

---

### SHOT 6 — ProCreator: Oxford Advantage EdTech Landing Page
**URL:** https://dribbble.com/shots/23669378-Edtech-Landing-Page-UI
**Designer:** ProCreator (Global UI/UX Design Agency, India)

**Palette:**
```
primary:    #002147  (Oxford navy — deepest institutional blue)
secondary:  #C59D3F  (Oxford gold — heraldic, not bright yellow)
bg-light:   #F8F7F3  (warm off-white — academic, not corporate)
surface:    #FFFFFF
text1:      #1A1A2E
text2:      #6B7280
accent-cta: #002147  (button = primary brand color, not a third accent)
```

**Layout:**
- Hero: left-aligned content (55% width), right: device mockup (laptop/tablet at 15° tilt)
  - Device shows actual platform UI inside — meta-design (platform within landing page)
  - CTA button: `background #002147`, `color #C59D3F` — navy+gold in the button itself
- Trust strip: partner institution logos, `filter: grayscale(100%)` on default, color on hover
- Features: 3 columns, icon cards, icon color = Oxford gold `#C59D3F`
- Course showcase: horizontal scroll with `overflow-x auto`, `scrollbar-width none`
  - Course cards: instructor photo (circular, 56px), rating stars, enrolled count
- Testimonials: 2-column, `borderLeft: '3px solid #C59D3F'` — gold left-border on quote cards

**Oxford Brand Lesson:**
Using two authoritative colors (deep navy + aged gold) creates instant premium credibility. Both are historically established, never trendy. Avoid bright yellow if the brand targets prestige — use aged/muted gold instead.

---

### SHOT 7 — Musemind: Monach EdTech Landing Page
**URL:** https://dribbble.com/shots/19052386-Edtech-Landing-Page
**Designer:** Musemind UI/UX Agency

**Palette:**
```
primary:    #7B3FE4  (vivid violet — young, ambitious)
primary2:   #5C2D91  (deeper violet for hover/active)
secondary:  #FF7043  (warm orange — energy contrast to cool purple)
hero-bg:    radial-gradient(ellipse at 30% 50%, #7B3FE4 0%, #4A1D8B 60%, #1A0533 100%)
footer-bg:  #1A0533  (dark purple — keeps brand color at page end)
text1:      #FFFFFF  (on dark sections)
text1-alt:  #1A1A2E  (on white sections)
text2:      rgba(255,255,255,0.7)
```

**Layout:**
- Hero: full-width gradient bg (radial, color-story), left content, right = illustrated character
  - Hero H1: 56–64px, weight 800, white, 2-line max
  - Dual CTA: `background #FF7043` (orange primary) + `border: 2px solid white` (ghost secondary)
  - Orange CTA on purple hero = maximum contrast energy — psychologically motivating
- Category pill filter: `display flex, flexWrap wrap, gap 8px` below hero
  - Pills: `padding 8px 20px`, `borderRadius 99px`, `border 1px solid rgba(255,255,255,0.3)`, `fontSize 13px`
- Course cards (3-col): thumbnail 100% width, rounded corners on thumbnail only (top: 12px)
- Stats banner: full-width, `background #1A0533`, 3 large numbers side by side
  - Dividers between stats: `1px solid rgba(255,255,255,0.1)`, vertical
  - Stat number: 40px, weight 800, `color #FF7043`

**Purple + Orange Psychology:**
Purple = intellect, creativity, ambition. Orange = energy, action, urgency. Together they create the "smart and motivated" brand feeling perfect for educational platforms targeting young professionals.

---

### SHOT 8 — DroitLab: EdTech Platform Landing Page
**URL:** https://dribbble.com/shots/20361165-Edtech-Platform-Landing-Page
**Designer:** Md. Shahadat Hussain for DroitLab

**Palette:**
```
hero-bg:    linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)
section-bg: #F5F3FF  (lavender — keeps brand hue in light sections)
surface:    #FFFFFF
footer-bg:  #0F0A2E  (deep indigo-black)
text-dark:  #1E1B4B  (indigo-black — brand-tinted dark)
text2:      #6B7280
accent:     #4F46E5
stars:      #F59E0B  (amber — universal rating color)
```

**Layout:**
- Hero: gradient bg (indigo→violet), centered layout
  - Search bar prominent in hero: `height 56px`, `borderRadius 99px`, `background rgba(255,255,255,0.15)`
  - Search bar placeholder: `color rgba(255,255,255,0.6)`
  - Search icon + "Search" CTA button inside the bar (right side)
  - Stats row below search: 3 numbers inline — "10K+ Students · 500+ Courses · 200+ Instructors"
    - Stats format: `fontSize 24px, fontWeight 800, color white` + `fontSize 13px, color rgba(255,255,255,0.7)` below
- "How it works" section: 3-step horizontal with connector line
  - Step circles: numbered 01/02/03, `width 48px, height 48px, borderRadius 50%`
  - Connector: `height 2px, flex 1, background rgba(79,70,229,0.3)` (dashed style)
- Instructor cards: photo top (rounded circle, 80px) + name + subject + rating below

**Hero Search Bar Pattern (high conversion):**
```jsx
<div style={{
  display: 'flex', alignItems: 'center', height: 56,
  background: 'rgba(255,255,255,0.15)', borderRadius: 99,
  padding: '0 8px 0 20px', backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.25)', maxWidth: 520,
}}>
  <span style={{ fontSize: 18, marginRight: 12, opacity: 0.7 }}>🔍</span>
  <input placeholder="What do you want to learn?" style={{
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: '#fff', fontSize: 15, '::placeholder': { color: 'rgba(255,255,255,0.6)' }
  }} />
  <button style={{
    background: '#FFFFFF', color: '#4F46E5', borderRadius: 99, padding: '8px 20px',
    fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer'
  }}>Search</button>
</div>
```

---

### SHOT 9 — Phenomenon Studio: EduNova Educational Platform
**URL:** https://dribbble.com/shots/22696959-EduNova-Website-design-for-Educational-platform
**Designer:** Phenomenon Studio

**Palette:**
```
hero-bg:    linear-gradient(180deg, #080E23 0%, #0D1535 100%)
accent:     #1BE8C8  (electric teal — gen-Z energy)
accent2:    #CBFF4D  (lime — youth/energy secondary)
purple:     #8B5CF6  (category distinction)
text1:      #FFFFFF
text2:      rgba(255,255,255,0.65)
section-alt: #0A1128  (slightly lighter dark for alternating sections)
```

**Layout:**
- Hero typography scale: H1 = 72–80px, weight 900, line-height 0.95 — dramatic
- Background: animated geometric shapes (SVG circles/polygons with `animation: float 6s ease-in-out infinite`)
- Subject grid: `repeat(3,1fr)` icon cards, icon = 32px emoji or SVG in colored circle
- Course carousel: `display flex, overflowX: auto, gap 24px, scrollSnapType: 'x mandatory'`
  - Each card: `scrollSnapAlign: start`, `minWidth: 280px`
- Dark/bright section alternation: dark hero → bright section (`#F0FFF9`) → dark → bright
  - The alternation creates visual rhythm without using borders or dividers

**Teen-Targeted UX Patterns:**
- Gamification progress bars (XP earned, level up indicators)
- Community tab: `borderRadius 12px` chat-bubble style cards
- Electric teal + lime = "coding bootcamp energy" — signals modern tech education not stuffy academia
- Animated background shapes signal interactivity before a click is made

**Motion — Floating Background Shapes:**
```javascript
// SVG circles in hero bg
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  33%       { transform: translateY(-20px) rotate(5deg); }
  66%       { transform: translateY(10px) rotate(-3deg); }
}
// Each shape: different duration (5s, 7s, 9s) + delay (0s, 2s, 4s) = organic, non-synchronized
```

---

## CATEGORY 3: SAAS APP UI KITS (Shots 10–13)

---

### SHOT 10 — Shafayat Hossain: SaaS Dashboard UI KIT
**URL:** https://dribbble.com/shots/24905762-SaaS-Dashboard-UI-KIT
**Designer:** Shafayat Hossain (Senior UX, also on UI8)

**Palette (Light):**
```
bg:         #F4F6FA  (cool light gray — not white, prevents glare)
surface:    #FFFFFF
accent:     #4F46E5  (indigo — B2B enterprise standard)
text1:      #1E293B
text2:      #64748B
border:     #E2E8F0
success:    #22C55E
warning:    #F59E0B
error:      #EF4444
info:       #3B82F6
```

**Senior UX Spacing System (4px base grid):**
- Component internal: 8px (icon+label), 16px (card padding-small), 24px (card padding-standard)
- Between same-level components: 16-20px
- Between sections: 32-48px
- Page padding: 24-32px
- This is NOT arbitrary — every value is divisible by 4. Enforce strictly.

**B2B SaaS Page Set (what makes it production-grade):**
- Dashboard overview (standard)
- Data table with: sort arrows, filter dropdowns, search, pagination, bulk select checkboxes
- Form pages: label+input+helper text+error state all designed
- Settings: toggle switches, radio groups, select dropdowns — all states
- User management: avatar+name+role table with status badges
- Empty states: illustration + headline + CTA (not just blank space)

---

### SHOT 11 — Figr Design: SaaS Dashboard UI Kit (2025)
**URL:** https://dribbble.com/shots/25679842-Saas-Dashboard-UI-Kit
**Designer:** Figr Design
**Font:** InterVar (variable, 100–900 weight range from one font file)

**The Figr Method — Real-World Pattern Extraction:**
Figr reverse-engineered these real product UIs and codified their patterns:
- **Spotify dashboard**: Left sidebar = playlists. Main = now-playing large + queue list. Stats: play counts as bar chart.
- **Duolingo progress dashboard**: Streak counter (flame icon, large number). Skills XP bar. League/rank card. Daily goal ring chart.
- **Netflix content dashboard**: Hero banner full-width. Below: horizontal scroll rows by genre. Card hover = brief expand with synopsis.
- **Gumroad store dashboard**: Revenue chart (area, 30D). Product list with thumbnail + sales count + revenue. Payout status card.

**Apply This Pattern:** When building an edtech platform (H-Tech), extract from Duolingo's pattern:
- Streak counter: display number large (48px) + "Day Streak" label below + flame emoji left
- Progress rings per course: circular SVG, `strokeDasharray` based on % complete, accent color stroke
- League/rank card: user rank in community (gold/silver/bronze badge)

---

### SHOT 12 — Illiyin Studio: Estatery Real Estate SaaS Dashboard
**URL:** https://dribbble.com/shots/19481168-Estatery-Real-Estate-SaaS-Dashboard-UI-Kit
**Designer:** Illiyin Studio
**Canvas:** 1440×990px

**Palette:**
```
accent:     #10B981  (emerald green — trust/growth in property)
bg:         #F9FAFB
surface:    #FFFFFF
text1:      #111827
text2:      #6B7280
border:     #E5E7EB
available:  #10B981  (green badge)
rented:     #F97316  (orange badge)
sold:       #EF4444  (red badge)
price:      #111827  (dark — money is primary info)
price-hi:   #F97316  (orange for price highlights / special deals)
```

**Property Card (reusable cross-domain pattern):**
```jsx
// Works for: real estate, jobs, products, courses — anything with status + price
<div style={{ borderRadius: 16, overflow:'hidden', background: '#FFFFFF',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)' }}>
  {/* Image zone */}
  <div style={{ position:'relative', height: 200, overflow:'hidden' }}>
    <img src={photo} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    <span style={{ position:'absolute', top: 12, left: 12,
      background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
      color:'#fff', fontSize: 11, fontWeight: 600, borderRadius: 99, padding: '3px 10px' }}>
      {category}
    </span>
    <span style={{ position:'absolute', top: 12, right: 12,
      background: statusColors[status], color:'#fff',
      fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px' }}>
      {status}
    </span>
  </div>
  {/* Content zone */}
  <div style={{ padding: 20 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{title}</div>
    <div style={{ fontSize: 13, color:'#6B7280', marginTop: 4 }}>{subtitle}</div>
    <div style={{ display:'flex', justifyContent:'space-between', marginTop: 16 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color:'#111827' }}>{price}</span>
      <span style={{ fontSize: 12, color:'#6B7280' }}>{meta}</span>
    </div>
  </div>
</div>
```

---

### SHOT 13 — ThemeSelection: Sneat Admin Dashboard
**URL:** https://dribbble.com/shots/20168764-Sneat-Figma-Admin-Dashboard-Builder-UI-Kit
**Designer:** ThemeSelection
**Signature accent:** #696CFF (Sneat purple — ownable, distinctive)

**Palette:**
```
accent:     #696CFF  (Sneat's signature — slightly blue-shifted purple)
bg-dark:    #25293C  (desaturated navy — warmer than pure near-black)
surface:    #2F3349  (card surface in dark)
bg-light:   #F5F5F9  (light variant)
text1:      #EAEAFF  (slightly purple-tinted white — brand-coherent)
text2:      rgba(234,234,255,0.55)
success:    #72E128  (bright lime green — more vivid than #22C55E)
warning:    #FDB528
error:      #FF4C51
info:       #26C6F9
border:     rgba(234,234,255,0.12)
```

**Sneat Layout Modes:**
1. **Default**: white surface, `#696CFF` accent sidebar
2. **Bordered**: same as default but cards have `border: 1px solid #E5E7EB` instead of shadow
3. **Semi-Dark**: sidebar dark `#25293C`, main area light `#F5F5F9`
4. **Full Dark**: both sidebar and main dark

**The Sneat Semi-Dark Pattern (most visually distinctive):**
```jsx
// Sidebar: dark
sidebarStyle = { background: '#25293C', borderRight: '1px solid rgba(234,234,255,0.08)' }
// Main area: light
mainStyle = { background: '#F5F5F9' }
// Creates contrast without full dark mode — content pops on light bg, nav recedes on dark
// Active nav item: background rgba(105,108,255,0.16), color #696CFF
```

---

## CATEGORY 4: MOBILE EDTECH APP UI (Shots 14–17)

---

### SHOT 14 — Shahriar Sultan: EdTech Mobile App UI Design
**URL:** https://dribbble.com/shots/24692339--EdTech-Mobile-App-UI-Design
**Designer:** Shahriar Sultan (EdTech/FinTech specialist)

**Palette:**
```
orange:     #FF6B35  (energy, action — primary interaction color)
teal:       #00BFA5  (growth, learning — progress indicators)
purple:     #7C3AED  (creativity — category accents)
bg:         #F5F7FF  (cool white — bright, not sterile)
surface:    #FFFFFF
text1:      #1A1A2E
text2:      #6B7280
progress-bg: rgba(0,191,165,0.12)  (teal at 12% for progress track)
```

**Mobile Screen Patterns:**
- **Welcome header**: `paddingTop: 52px` (safe area), firstName greeting in 22px bold, subtext 14px muted, notification bell top-right (24px with badge dot)
- **Enrolled courses carousel**: `scrollSnapType: 'x mandatory'`, card `minWidth: calc(100% - 48px)`, gap 16px
  - Course card: progress bar bottom, `height 4px, borderRadius 99px`
- **Continue Learning CTA**: sticky at bottom, `height 52px, borderRadius 12px`, full-width, orange bg
- **Profile screen**: circular progress rings (SVG) per subject, stacked vertically with label + % right-aligned
- **Course catalog**: 2-column card grid, `gap 16px`, `padding 0 16px`

**Mobile-Specific Typography:**
- Welcome: 22px, weight 700 (slightly smaller than desktop H1 — thumb-zone safe)
- Section labels: 16px, weight 700 (bigger than desktop equivalent — screen density)
- Card titles: 14px, weight 600 (desktop equivalent: 16px)
- Caption/meta: 12px, weight 400

---

### SHOT 15 — Dezzlab / Shahriar Sultan: ATRIUM EdTech Platform
**URL:** https://dribbble.com/shots/18479473-ATRIUM-EdTech-Platform-UI-UX-Design
**Designer:** Shahriar Sultan for Dezzlab

**Palette:**
```
primary:    #1DB17A  (growth green — dual teacher/student meaning)
dark:       #0D1117  (teacher dashboard bg — authoritative, professional)
bg-light:   #FFFFFF  (student facing — welcoming)
amber:      #F59E0B  (gamification rewards)
purple:     #8B5CF6  (community/social features)
text-dark:  rgba(255,255,255,0.87)  (on dark)
```

**Dual-Persona Design Pattern:**
- Teacher side: dark bg `#0D1117`, green accent — signals authority, control, oversight
- Student side: light bg `#FFFFFF`, green accent — same brand color, different emotional context
- The green accent unifies both personas under one brand while dark/light backgrounds split the experience

**Gamification UI Components:**
```jsx
// XP progress bar
<div style={{ background:'rgba(245,158,11,0.12)', borderRadius: 99, height: 8 }}>
  <div style={{ width: `${xpPercent}%`, height:'100%', borderRadius: 99,
    background:'linear-gradient(90deg, #F59E0B, #FBBF24)' }} />
</div>

// Achievement badge
<div style={{ width: 56, height: 56, borderRadius: '50%',
  background:'linear-gradient(135deg, #F59E0B, #FBBF24)',
  display:'flex', alignItems:'center', justifyContent:'center',
  boxShadow:'0 4px 16px rgba(245,158,11,0.4)' }}>
  <span style={{ fontSize: 24 }}>🏆</span>
</div>

// Leaderboard row
<div style={{ display:'flex', alignItems:'center', gap: 12, padding:'12px 0',
  borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
  <span style={{ fontSize: 13, fontWeight: 700, color:'rgba(255,255,255,0.4)', width: 20 }}>
    {rank}
  </span>
  <img src={avatar} style={{ width: 36, height: 36, borderRadius:'50%', objectFit:'cover' }} />
  <span style={{ flex:1, fontSize: 14, fontWeight: 600 }}>{name}</span>
  <span style={{ fontSize: 14, fontWeight: 700, color:'#F59E0B' }}>{xp} XP</span>
</div>
```

---

### SHOT 16 — Awsmd / Sam Halpert: EdTech Platform UI
**URL:** https://dribbble.com/shots/22324469-EdTech-Platform-UI
**Designer:** Sam Halpert for Awsmd

**Palette:**
```
accent:     #2563EB  (vivid blue — Awsmd signature clean blue)
bg:         #F8FAFC  (barely-tinted white — premium cleanliness)
surface:    #FFFFFF
lavender:   #EEF2FF  (section tint — brand-colored backgrounds for variety)
text1:      #0F172A  (slate-black — not pure black, has blue undertone)
text2:      #64748B
green:      #22C55E  (completion/success)
streak:     #F97316  (orange — habit/streak indicator, Duolingo-inspired)
```

**Awsmd Design Language:**
- Minimal chrome — navigation is always understated, content always dominant
- Learning streak component (Duolingo-inspired): flame icon `🔥` + `fontSize: 48, fontWeight: 800` day count + "day streak" label
- Progress bars: `height: 6px` (slightly thicker than standard 4px for visibility), `borderRadius: 99px`
- Course card hover: no translateY lift — instead `boxShadow` intensifies: `0 4px 6px -1px rgba(0,0,0,0.07)` → `0 10px 15px -3px rgba(0,0,0,0.1)` (Awsmd restraint)
- Certificate cards: `border: 2px solid #F59E0B` (gold border), `background: #FFFBEB` (cream tint)

---

### SHOT 17 — Shakuro: Online Course Educational Mobile App
**URL:** https://dribbble.com/shots/21739954-Online-Course-Educational-Mobile-App
**Designer:** Shakuro

**Palette:**
```
accent:     #F97316  (Shakuro edtech signature orange)
bg:         #FFFFFF
bg-alt:     #F5F5F5
text1:      #212121
text2:      #757575
success:    #4CAF50
badge-bg:   rgba(249,115,22,0.10)  (orange at 10% for category badges)
```

**Shakuro Design Philosophy (explicitly stated):**
"The video lesson is the main source of information. All other data is secondary and should be hidden under drop-down lists and tabs so the UI is not overloaded."

**Applying Shakuro's Philosophy:**
- Course detail page: video player = top 40-50% of screen, everything else scrolls below
- Curriculum: accordion — only current chapter expanded, rest collapsed
- Tabs for secondary info: `Curriculum | Q&A | Notes | Resources` — default on Curriculum
- Video player controls: minimal, disappear after 2s of no interaction
- Orange: ONLY on functional elements (category badges, CTA buttons, active tabs) — never decorative

**Onboarding Personalization Flow:**
```
Screen 1: Welcome + "What do you want to learn?"
Screen 2: Interest selection — topic cards in 3x3 grid (tap to select, accent border on selected)
Screen 3: Level selection — Beginner / Intermediate / Advanced (single-select cards)
Screen 4: Daily goal — 10min / 20min / 30min / 1hr (4 pill options)
Screen 5: Personalized feed ready
```

---

## CATEGORY 5: FINTECH & BANKING APP UI (Shots 18–21)

---

### SHOT 18 — Justin Comstock: Fintech Mobile Banking App
**URL:** https://dribbble.com/shots/23144973-Fintech-Mobile-Banking-App-UI
**Designer:** Justin Comstock

**Palette:**
```
bg:         #0A0E27  (midnight navy — deep trust, anti-anxiety)
surface:    #151C3D  (dark blue-purple card)
gradient:   linear-gradient(135deg, #6366F1, #8B5CF6)  (indigo→purple)
glass:      rgba(255,255,255,0.06) + backdrop-filter blur(12px)
text1:      #FFFFFF
text2:      rgba(255,255,255,0.6)
success:    #10B981  (emerald — positive balance)
danger:     #EF4444
border:     rgba(255,255,255,0.12)
```

**Mobile Banking Layout Sequence:**
1. **Balance screen**: gradient pill card (top), `background: linear-gradient(135deg, #6366F1, #8B5CF6)`, balance in 48px extrabold centered, 24h change pill below
2. **Quick actions row**: 4 circular icon buttons — Send, Receive, Pay, Top Up
   - Button: `width: 56px, height: 56px, borderRadius: 50%, background: rgba(255,255,255,0.08)`
   - Icon: 22px, white
   - Label: 11px, weight 500, below icon, rgba(255,255,255,0.7)
3. **Recent transactions**: merchant icon (24px circular) + merchant name + category tag + amount right-aligned
   - Debit amounts: `color: '#EF4444'` with minus prefix
   - Credit amounts: `color: '#10B981'` with plus prefix
4. **Analytics**: spending category donut + category list below

**Card Gradient Rule:**
Physical-card representation should always use a gradient (not flat color) — it signals premium and distinguishes from flat UI elements. Use brand gradient, never gray.

---

### SHOT 19 — Awsmd / Sam Halpert: WayStars Fintech Platform
**URL:** https://dribbble.com/shots/23418111-WayStars-Fintech-Platform
**Designer:** Sam Halpert for Awsmd

**Palette:**
```
bg:         #0D1526  (darkest navy — financial seriousness)
surface:    #111827
accent:     #00E676  (electric green — market "up" universal language)
gold:       #F59E0B  (secondary — wealth, premium)
text1:      #F9FAFB
text2:      #9CA3AF
red:        #EF4444  (market "down")
border:     rgba(255,255,255,0.06)
```

**Portfolio Area Chart (WayStars pattern):**
```jsx
// Time range selector (top-right of chart)
['1D','1W','1M','3M','1Y','All'].map(range =>
  <button style={{
    padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600,
    background: active === range ? 'rgba(0,230,118,0.12)' : 'transparent',
    color: active === range ? '#00E676' : 'rgba(255,255,255,0.5)',
    border: 'none', cursor:'pointer'
  }}>{range}</button>
)
// Chart gradient fill: start at line, fade to transparent at bottom
// stroke: '#00E676', strokeWidth: 2
// fill: linear-gradient(180deg, rgba(0,230,118,0.20) 0%, rgba(0,230,118,0) 100%)
```

**Holdings List Pattern:**
```
Row: height 60px, border-bottom rgba(255,255,255,0.04)
  Left: asset icon (24px circular) + ticker (14px 700w) + full name (12px muted, below)
  Right: current value (14px 700w right-align) + daily change pill (11px, green/red, below)
  Mid: inline sparkline (64px × 28px, SVG polyline, green/red based on trend)
```

---

### SHOT 20 — Awsmd / Sam Halpert: TapX Fintech App
**URL:** https://dribbble.com/shots/23487876-TapX-Fintech-App
**Designer:** Sam Halpert for Awsmd

**Palette:**
```
accent:     #7C3AED  (deep purple — differentiator from blue fintech)
bg:         #F5F3FF  (light lavender — softer than sterile white)
surface:    #FFFFFF
text1:      #1E1B4B  (deep indigo — brand-tinted, not pure black)
text2:      #6B7280
success:    #10B981
border:     #E9E3FF  (lavender-tinted border)
card-face:  linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)
```

**Virtual Card Component:**
```jsx
<div style={{
  background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
  borderRadius: 20, padding: '28px 24px', color: '#fff',
  aspectRatio: '1.586 / 1',  // Standard card ratio (85.6mm × 54mm)
  boxShadow: '0 20px 60px rgba(124,58,237,0.4)',  // Colored shadow matches card
  position: 'relative', overflow: 'hidden'
}}>
  {/* Chip */}
  <div style={{ width: 36, height: 28, borderRadius: 6,
    background:'linear-gradient(135deg, #FFD700, #FFA500)', marginBottom: 20 }} />
  {/* Masked number */}
  <div style={{ fontSize: 16, letterSpacing: '0.15em', fontFamily:'monospace' }}>
    •••• •••• •••• {last4}
  </div>
  <div style={{ display:'flex', justifyContent:'space-between', marginTop: 16 }}>
    <div>
      <div style={{ fontSize: 10, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.08em' }}>Card Holder</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{holderName}</div>
    </div>
    <div style={{ textAlign:'right' }}>
      <div style={{ fontSize: 10, opacity:0.7, textTransform:'uppercase', letterSpacing:'0.08em' }}>Expires</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{expiry}</div>
    </div>
  </div>
  {/* Decorative circle */}
  <div style={{ position:'absolute', right:-40, top:-40,
    width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
</div>
```

---

### SHOT 21 — Arobix Design: Fintech Digital Banking App
**URL:** https://dribbble.com/shots/22827918-Fintech-Digital-Banking-App-UI
**Designer:** MD. Azbin Islam for Arobix Design

**Palette:**
```
card-gradient: linear-gradient(135deg, #1E40AF 0%, #312E81 100%)  (blue→deep purple)
bg:           #FFFFFF
bg-alt:       #F8FAFF  (barely blue-tinted white)
text1:        #111827
text2:        #6B7280
gold:         #D97706  (premium card elements)
green:        #059669  (credit amounts)
red:          #DC2626  (debit amounts)
```

**Arobix Minimalist Discipline:**
One design point of view: the card is the hero. Everything else recedes.
- Card: `boxShadow: '0 24px 80px rgba(30,64,175,0.35)'` — shadow matches card gradient
- Balance below card: not in the card — separate on white bg below, `fontSize: 32, fontWeight: 800`
- Pie chart: simple, 3-category only (Housing/Food/Transport), no legend text — just color + % in center
- Transactions: clean list, no borders between rows — only padding creates separation

---

## CATEGORY 6: AWWWARDS EDUCATION SITES (Shots 22–24)

---

### SHOT 22 — Alternatives NYC: Women in Data Science (WiDS)
**Award:** Awwwards Site of the Day — June 25, 2024
**URL:** https://www.awwwards.com/sites/women-in-data-science-wids | **Live:** https://www.widsworldwide.org/

**Palette (extracted from actual CSS):**
```
bg:         #F8F8F8  (neutral warm gray)
surface:    #FFFFFF
text1:      #222222
orange:     #FA5D29  (primary accent — editorial, warm)
blue:       #49B3FC  (secondary accent)
mint:       #AAEEC4  (tertiary — soft success/positive)
```

**Technical Specs (from actual CSS):**
- Max-width: **1816px** (unusually wide — magazine-grade on 4K monitors)
- Inner padding: **52px** horizontal (not the typical 80px)
- Typography: **Inter Tight** (not plain Inter — tighter optical spacing at large sizes)
- Font scaling: `clamp()` throughout — fluid from 576px to 1600px+
- Breakpoints: 576px / 768px / 1024px / 1270px (4 standard)
- Carousel: Swiper.js implementation

**Why Inter Tight Beats Inter:**
At 48px+, Inter Tight's tighter letter-spacing reads as more designed. Same as applying -0.02em tracking to Inter but built into the font metrics — more consistent across weights. Use for any display text above 32px.

---

### SHOT 23 — Peak Education (Awwwards Nominee 2024)
**URL:** https://www.awwwards.com/sites/peak-education-1

**Palette (extracted from actual CSS):**
```
bg:         #F8F8F8
text:       #222222
cta-orange: #FA5D29
blue:       #49B3FC
category-learn:   #FFF083  (sunshine yellow)
category-inspire: #AAEEC4  (mint green)
category-awards:  #502BD8  (deep purple)
category-read:    #C0AB3C  (antique gold)
category-jobs:    #74BCFF  (sky blue)
dark-sections:    #222222
```

**The Categorical Color System (Peak's Signature Pattern):**
Each content type has its own color identity, used consistently across the entire site:
- Navigation filter active state = category color
- Card border-top = category color (3px solid)
- Category badge bg = category color at 15% opacity
- Category badge text = category color at 100%
- Hero section background = category color at 8%

**Apply to H-Tech Courses:**
```javascript
const COURSE_COLORS = {
  'Cloud Engineering':    '#3B82F6',  // blue
  'Data Engineering':     '#8B5CF6',  // purple
  'Software Engineering': '#10B981',  // green
  'AI & ML':             '#F59E0B',  // amber
  'UX/UI Design':        '#EC4899',  // pink
  'Data Science':        '#06B6D4',  // cyan
  'Mobile App Dev':      '#F97316',  // orange
  'Web Dev':             '#6366F1',  // indigo
}
// Each course card border-top, badge, and icon uses its course color
```

**Typography Extremes:**
- Hero display: **170px** (largest confirmed) — creates powerful editorial statement
- Fine print: **11px** (minimum)
- Ratio of largest to smallest: 15.4× — far beyond conventional 4–5× ratios

---

### SHOT 24 — Redbility Studio: IE University
**Award:** Awwwards Honorable Mention
**URL:** https://www.awwwards.com/sites/ie-university
**Designers:** Daniel Martinez, Mario Sanchez G, Maria Renilla

**Palette:**
```
primary:    #2779A7  (academic medium blue — not dark navy, not electric blue)
text:       #222222  or #333333
bg:         #FFFFFF
section-bg: #F4F4F4  (light gray section dividers)
```

**Institutional Design Principles (from Redbility / IE University):**
1. **Flat design** — no gradients, no shadows. Flatness signals stability and trustworthiness for institutions.
2. **Photography over illustration** — real people, real campus, real outcomes
3. **Accessibility first** — WCAG AA minimum on all text/background combinations
4. **Navigation clarity** — mega-menus for complex program catalogs, not hamburger menus
5. **#2779A7 blue** is the institutional sweet spot: neither too dark (heavy, oppressive) nor too bright (startup-ish). It reads as "established and accessible."

---

## CATEGORY 7: COURSE PLATFORM UI (Shots 25–27)

---

### SHOT 25 — Shakuro: Creative Mind Courses Platform
**URL:** https://dribbble.com/shots/22689218-Creative-Mind-Courses-Platform-Website
**Engagement:** 700+ likes
**Designer:** Shakuro UI/UX

**Palette:**
```
bg:         #FFFFFF  (pure white — learning deserves full clarity)
accent:     #FF5722  (orange — functional only, never decorative)
bg-subtle:  #FAFAFA  (barely-gray alternating sections)
text1:      #212121
text2:      #424242
text3:      #757575
green:      #4CAF50  (completion)
```

**Shakuro's Orange Usage Rule:**
Orange appears ONLY on: category badges, CTA buttons, active tab indicators, price highlights, and interactive hover states. Never on: decorative shapes, background sections, dividers, or illustrations. This discipline makes orange feel earned — the eye knows "orange means action."

**Course Detail Page Layout:**
```
Main area (65% width):
  Video player: 16:9, border-radius 12px, shadow below
  Below player: Tabs — [Overview | Curriculum | Q&A | Resources]
  Curriculum: accordion list, each item = play icon + title + duration (right)

Right panel (35% width, sticky top: 80px):
  Course card: price (large, 28px bold) + "Enroll Now" button (full width, orange, 48px)
  Instructor: avatar (48px) + name + rating
  Includes list: 6-8 bullet points with icons
  Share row: social icons
```

**Video Player Controls:**
```jsx
// Controls overlay (fade out after 2s of no mouse movement)
<div style={{
  position:'absolute', bottom: 0, left: 0, right: 0,
  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
  padding: '32px 16px 12px', borderRadius: '0 0 12px 12px',
  opacity: controlsVisible ? 1 : 0, transition: 'opacity 300ms ease'
}}>
  {/* Progress bar, play button, volume, time, fullscreen */}
</div>
```

---

### SHOT 26 — Faster Than Light: Studdy EdTech Dashboard (April 2024)
**URL:** https://dribbble.com/shots/24030163-Studdy-Dashboard-UI-UX-Design-for-Edtech-Platform
**Designer:** Faster Than Light studio

**Palette:**
```
accent:     #7C3AED  (purple — focus, productivity, study mode)
bg:         #F5F3FF  (lavender — keeps brand hue in light sections)
surface:    #FFFFFF
green:      #10B981  (attendance, completion — positive outcomes)
amber:      #F59E0B  (upcoming deadlines — urgency without alarm)
text1:      #1E1B4B  (deep indigo-black)
text2:      #6B7280
badge-bg:   rgba(124,58,237,0.10)  (purple at 10% for active course badges)
```

**Student Dashboard KPI Layout:**
```
KPI row: repeat(4, 1fr), gap 20px
  KPI 1: Attendance Rate     — green accent, ring chart mini 40px
  KPI 2: Homework Completion — amber accent, progress bar mini
  KPI 3: Studying Progress   — purple accent, flame/streak icon
  KPI 4: Upcoming Events     — calendar icon, count badge red

Below KPI row: 2-column, 60/40 split, gap 20px
  Left (60%): Weekly timetable
    Day labels: Mon–Sun, 32px width each
    Time slots: grid, each slot 44px tall
    Today's date: highlighted with purple circle
    Events/classes: colored pill in time slot
  Right (40%): Per-subject progress
    Subject: name + progress bar (8px h, purple fill) + % right-aligned
    GPA card below: large number (40px bold) + "Grade Point Average" label
```

**Weekly Calendar Grid:**
```jsx
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const hours = ['8AM','9AM','10AM','11AM','12PM','1PM','2PM']
// Grid: 7 columns (days) × N rows (hours)
// Class pill: background=subject color at 15%, text=subject color, borderLeft=3px solid subject color
// Today column: slightly tinted bg rgba(124,58,237,0.04)
```

---

### SHOT 27 — Odama / Yoga Satria: WiseLearn Online Course Platform (2024)
**URL:** https://dribbble.com/shots/24167003-WiseLearn-Online-Course-Platform
**Designer:** Yoga Satria for Odama Studio

**Palette:**
```
primary:    #4338CA  (deep indigo — serious, trustworthy)
primary2:   #3730A3  (darker for hover/active)
bg:         #EEF2FF  (light indigo bg — brand hue in light form)
surface:    #FFFFFF
text1:      #1E1B4B
text2:      #6B7280
green:      #22C55E  (completion)
orange:     #F97316  (rating stars, highlights)
```

**Course Browse Page (Filter + Grid Pattern):**
```
Left filter sidebar (260px):
  Section: Categories (checkbox list, 12 items, "Show more" toggle)
  Section: Level (Beginner / Intermediate / Advanced — radio)
  Section: Rating (star rating filter, 4+ / 3+ / any)
  Section: Price (Free / Paid slider)
  "Apply Filters" button at bottom: full-width, primary bg

Main content (remaining width):
  Sort bar: "Showing 248 results" + Sort dropdown (Most Popular / Newest / Rating)
  Course grid: repeat(3,1fr), gap 20px
    [Course card × 9 visible, lazy load below]
```

**Social Proof on Course Cards:**
```jsx
// Student count creates FOMO + trust simultaneously
<div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 8 }}>
  {/* Stacked avatars */}
  <div style={{ display:'flex' }}>
    {avatars.slice(0,3).map((av,i) => (
      <img key={i} src={av} style={{
        width: 20, height: 20, borderRadius:'50%', objectFit:'cover',
        border:'2px solid #fff', marginLeft: i > 0 ? -8 : 0
      }} />
    ))}
  </div>
  <span style={{ fontSize: 12, color:'#6B7280' }}>
    <strong style={{ color:'#1E1B4B' }}>12,400</strong> students enrolled
  </span>
</div>
```

---

## CROSS-SHOT PATTERN INDEX

### Patterns That Appear Across 3+ Shots (validated conventions)
| Pattern | Shots | Key Value |
|---------|-------|-----------|
| Purple as edtech/fintech accent | 7, 13, 15, 20, 26 | Distinctive from default blue |
| Orange for energy/action | 6, 17, 25, (also in 8 as secondary) | High contrast on dark and light |
| Electric green for financial "up" | 2, 18, 19 | Bloomberg/Robinhood standard |
| Glassmorphism on hero cards ONLY | 2, 18, 20 | Glass only on focal element |
| Duolingo-style streak mechanic | 15, 16, 17 | Behavioral retention loop |
| Category color system | 12, 23, 26 | Wayfinding through color |
| Video-is-hero philosophy | 17, 25 | Shakuro articulated, others follow |
| InterVar / Inter Tight over plain Inter | 11, 22 | Typographic elevation |
| Social proof (student counts) on cards | 7, 8, 27 | Conversion psychology |
| Dark nav + light content | 13 (Sneat semi-dark) | Content/nav separation |

### Color Palette Frequency
| Color | Shots | Signal |
|-------|-------|--------|
| Indigo/violet #4F46E5–#7C3AED | 4, 7, 8, 10, 20, 26 | Modern edtech/SaaS standard |
| Deep navy bg #0A0A15–#0E1320 | 1, 2, 5, 18, 19 | Premium dark dashboard |
| Orange accent #FF5722–#F97316 | 6, 8, 17, 25 | Energy, action, learning platforms |
| Electric green #00E676–#22C55E | 2, 19, 15, 16 | Growth, success, progress |
| ABC Favorit / Inter Tight | 3, 22 | Typographic premium signal |

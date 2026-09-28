# Pre-Built Premium Theme Palettes

8 ready-to-use color systems for different moods and industries. Each theme includes background, surface, text, accent, and semantic colors — everything needed to build a complete UI. When the user doesn't specify a color direction, pick the theme that best matches their domain. NEVER default to Theme 1 every time — rotate and surprise.

---

## Theme 1: Obsidian Night (Dark + Lime)
**Mood**: Premium, sophisticated, fintech/crypto
**Font pairing**: Space Grotesk + Inter, or Outfit

```javascript
const C = {
  bg: '#0B0B0F',        // Page background
  surface1: '#141419',   // Cards
  surface2: '#1E1E26',   // Elevated cards
  surface3: '#2A2A35',   // Hover states
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  t1: 'rgba(255,255,255,0.87)',  // Primary text
  t2: 'rgba(255,255,255,0.55)',  // Secondary
  t3: 'rgba(255,255,255,0.30)',  // Tertiary
  accent: '#BEFF64',      // Lime
  accentDark: '#9BD44E',
  accentBg: 'rgba(190,255,100,0.08)',
  accentText: '#3D5A00',  // Text on accent bg
  purple: '#8B5CF6',
  purpleBg: 'rgba(139,92,246,0.10)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.10)',
  pink: '#F472B6',
  pinkBg: 'rgba(244,114,182,0.10)',
  orange: '#FBBF24',
  orangeBg: 'rgba(251,191,36,0.10)',
  green: '#34D399',
  greenBg: 'rgba(52,211,153,0.10)',
  red: '#F87171',
  redBg: 'rgba(248,113,113,0.10)',
};
```
**Sidebar**: #0E0E14. Active nav: lime text + lime bg at 10%.

---

## Theme 2: Lavender Dream (Light Colored + Dark Sidebar)
**Mood**: Friendly, educational, creative
**Font pairing**: DM Sans, or Plus Jakarta Sans

```javascript
const C = {
  bg: '#EDE9FE',         // Lavender page background
  surface1: '#FFFFFF',    // White cards
  surface2: '#F5F3FF',    // Slightly tinted cards
  border: '#E0DCEF',
  borderHover: '#D4CFE6',
  t1: '#1E1B2E',         // Primary text (dark purple-black)
  t2: '#6B6880',         // Secondary
  t3: '#A09DAF',         // Tertiary
  sidebar: '#1E1B2E',    // Dark sidebar
  sidebarHover: 'rgba(255,255,255,0.06)',
  accent: '#C8F560',     // Lime
  accentDark: '#A8D940',
  accentText: '#3D5A00',
  accentBg: 'rgba(200,245,96,0.12)',
  purple: '#8B5CF6',
  purpleBg: 'rgba(139,92,246,0.08)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.10)',
  pink: '#F472B6',
  pinkBg: 'rgba(244,114,182,0.10)',
  orange: '#FBBF24',
  orangeBg: 'rgba(251,191,36,0.10)',
  green: '#34D399',
  greenBg: 'rgba(52,211,153,0.10)',
  red: '#F87171',
  redBg: 'rgba(248,113,113,0.10)',
};
```
**Sidebar**: #1E1B2E rounded (28px). Active nav: lime bg (#C8F560).

---

## Theme 3: Arctic Indigo (Clean Light + Indigo Accent)
**Mood**: Professional, SaaS, analytics
**Font pairing**: Manrope + Inter, or Geist Sans

```javascript
const C = {
  bg: '#F8FAFC',          // Cool off-white
  surface1: '#FFFFFF',     // Cards
  surface2: '#F1F5F9',     // Secondary surface
  border: '#E2E8F0',
  borderHover: '#CBD5E1',
  t1: '#0F172A',          // Slate-900
  t2: '#64748B',          // Slate-500
  t3: '#94A3B8',          // Slate-400
  accent: '#4F46E5',      // Indigo-600
  accentHover: '#4338CA',  // Indigo-700
  accentLight: '#EEF2FF',  // Indigo-50
  accentText: '#FFFFFF',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  green: '#059669',
  greenBg: '#ECFDF5',
  orange: '#D97706',
  orangeBg: '#FFFBEB',
  red: '#DC2626',
  redBg: '#FEF2F2',
};
```
**Sidebar**: White with indigo active state (text + left border). Or dark #0F172A with indigo accent.

---

## Theme 4: Midnight Coral (Dark + Warm Accent)
**Mood**: Bold, startup, health/fitness
**Font pairing**: Plus Jakarta Sans, or Sora

```javascript
const C = {
  bg: '#0F1117',
  surface1: '#1A1D27',
  surface2: '#252836',
  surface3: '#2F3345',
  border: 'rgba(255,255,255,0.07)',
  t1: '#F1F0F5',
  t2: 'rgba(241,240,245,0.55)',
  t3: 'rgba(241,240,245,0.30)',
  accent: '#FF6B6B',       // Coral
  accentDark: '#E85555',
  accentBg: 'rgba(255,107,107,0.10)',
  accentText: '#FFFFFF',
  teal: '#2DD4BF',
  tealBg: 'rgba(45,212,191,0.10)',
  amber: '#FBBF24',
  amberBg: 'rgba(251,191,36,0.10)',
  violet: '#A78BFA',
  violetBg: 'rgba(167,139,250,0.10)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.10)',
  green: '#4ADE80',
  greenBg: 'rgba(74,222,128,0.10)',
  red: '#FB7185',
  redBg: 'rgba(251,113,133,0.10)',
};
```
**Sidebar**: #13151F. Active nav: coral text + coral bg at 10%.

---

## Theme 5: Forest Sage (Light + Green Accent)
**Mood**: Natural, wellness, sustainability, health
**Font pairing**: Nunito + DM Sans, or Quicksand

```javascript
const C = {
  bg: '#F5F7F2',           // Warm sage off-white
  surface1: '#FFFFFF',
  surface2: '#EFF2EC',
  border: '#DDE2D6',
  borderHover: '#C8CFBF',
  t1: '#1A2E1A',           // Deep forest green-black
  t2: '#5A6B5A',
  t3: '#8A9B8A',
  accent: '#2D8B47',        // Forest green
  accentHover: '#247039',
  accentLight: '#E8F5E9',
  accentText: '#FFFFFF',
  brown: '#A67C52',
  brownBg: '#FFF8F0',
  teal: '#0D9488',
  tealBg: '#F0FDFA',
  amber: '#B45309',
  amberBg: '#FFFBEB',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  red: '#DC2626',
  redBg: '#FEF2F2',
};
```
**Sidebar**: White or #1A2E1A dark green. Active nav: green accent.

---

## Theme 6: Electric Violet (Dark + Purple Accent)
**Mood**: AI tools, Web3, developer, futuristic
**Font pairing**: Space Grotesk + JetBrains Mono (for data), or Satoshi

```javascript
const C = {
  bg: '#09090F',
  surface1: '#12121C',
  surface2: '#1C1C2E',
  surface3: '#262640',
  border: 'rgba(139,92,246,0.08)',
  borderHover: 'rgba(139,92,246,0.16)',
  t1: '#EDEDF5',
  t2: 'rgba(237,237,245,0.55)',
  t3: 'rgba(237,237,245,0.30)',
  accent: '#8B5CF6',       // Violet-500
  accentBright: '#A78BFA',  // Violet-400 (for dark mode readability)
  accentBg: 'rgba(139,92,246,0.10)',
  accentText: '#FFFFFF',
  cyan: '#22D3EE',
  cyanBg: 'rgba(34,211,238,0.10)',
  pink: '#F472B6',
  pinkBg: 'rgba(244,114,182,0.10)',
  lime: '#A3E635',
  limeBg: 'rgba(163,230,53,0.10)',
  amber: '#FBBF24',
  amberBg: 'rgba(251,191,36,0.10)',
  green: '#4ADE80',
  greenBg: 'rgba(74,222,128,0.10)',
  red: '#FB7185',
  redBg: 'rgba(251,113,133,0.10)',
};
```
**Sidebar**: #0D0D16 with violet glow on active. Purple-tinted borders throughout.

---

## Theme 7: Sand & Slate (Warm Light + Amber Accent)
**Mood**: Premium, editorial, real estate, luxury
**Font pairing**: Fraunces (headings) + Source Sans 3 (body), or Libre Baskerville + Karla

```javascript
const C = {
  bg: '#FAF8F5',           // Warm cream
  surface1: '#FFFFFF',
  surface2: '#F5F0EB',
  border: '#E8E0D8',
  borderHover: '#D4C9BD',
  t1: '#1C1917',           // Stone-900
  t2: '#78716C',           // Stone-500
  t3: '#A8A29E',           // Stone-400
  accent: '#D97706',       // Amber-600
  accentHover: '#B45309',
  accentLight: '#FFFBEB',
  accentText: '#FFFFFF',
  navy: '#1E3A5F',
  navyBg: '#EFF6FF',
  green: '#15803D',
  greenBg: '#F0FDF4',
  rose: '#BE123C',
  roseBg: '#FFF1F2',
  slate: '#475569',
  slateBg: '#F1F5F9',
};
```
**Sidebar**: #1C1917 dark warm. Active nav: amber accent. Serif headings add premium feel.

---

## Theme 8: Ocean Blue (Light + Sky/Teal Accent)
**Mood**: Calm, trustworthy, education, finance
**Font pairing**: Outfit + DM Sans, or Poppins

```javascript
const C = {
  bg: '#F0F7FF',           // Soft blue tint
  surface1: '#FFFFFF',
  surface2: '#E8F1FC',
  border: '#D0DEF0',
  borderHover: '#B0C8E8',
  t1: '#0C1E3A',           // Deep navy
  t2: '#4A6B8A',
  t3: '#8AA4BD',
  accent: '#0EA5E9',       // Sky-500
  accentHover: '#0284C7',
  accentLight: '#F0F9FF',
  accentText: '#FFFFFF',
  teal: '#0D9488',
  tealBg: '#F0FDFA',
  indigo: '#4F46E5',
  indigoBg: '#EEF2FF',
  amber: '#D97706',
  amberBg: '#FFFBEB',
  green: '#059669',
  greenBg: '#ECFDF5',
  red: '#DC2626',
  redBg: '#FEF2F2',
};
```
**Sidebar**: White with sky blue active state, or #0C1E3A dark navy. Clean and trustworthy.

---

## Theme Selection Guide

| Domain | Recommended Themes | Why |
|--------|-------------------|-----|
| Fintech / Crypto | 1 (Obsidian), 4 (Midnight), 3 (Arctic) | Dark = premium, data-dense |
| Education | 2 (Lavender), 8 (Ocean), 5 (Forest) | Friendly, approachable |
| Health / Fitness | 4 (Midnight), 5 (Forest), 8 (Ocean) | Energetic or calming |
| SaaS / Analytics | 3 (Arctic), 6 (Electric), 1 (Obsidian) | Professional, data-focused |
| Real Estate / Luxury | 7 (Sand), 3 (Arctic), 1 (Obsidian) | Premium, editorial feel |
| AI / Developer Tools | 6 (Electric), 1 (Obsidian), 4 (Midnight) | Tech-forward, futuristic |
| Project Management | 3 (Arctic), 2 (Lavender), 8 (Ocean) | Clean, organized |
| Social / Community | 2 (Lavender), 4 (Midnight), 8 (Ocean) | Warm, engaging |

**Rule**: Never use the same theme twice in a row for different requests. Rotate to show range. If the user doesn't specify a mood, pick the theme that best fits their domain AND that differs from the last one used.

# SVG Illustration System — Domain-Specific Components

Custom inline SVG illustrations for premium UI. NOT stock Unsplash photos — these are scalable, brand-colored, animatable vector components embedded directly in JSX.

---

## PART 1: ILLUSTRATION VS. PHOTO — WHEN TO USE WHICH

### Use SVG Illustrations for:
- Hero section decoratives and supporting visuals
- Empty state screens ("No courses yet", "No transactions")
- Feature section icons and conceptual art
- Onboarding screens and explainer sections
- Abstract concepts (data, AI, cloud, growth)
- Background decorative elements

### Photos
No image generation on this project (CLAUDE.md): every visual slot is an inline SVG component or a CSS treatment. Slots that would hold a photo elsewhere use an SVG illustration here.

---

## PART 2: ILLUSTRATION COLOR RULES

All SVG illustrations reference the palette constant `C` — never hardcode colors in SVGs.

```jsx
// Standard color mapping for illustrations:
const illoColors = {
  primary:    C.accent,                    // Main shape fills
  secondary:  C.accentDark || C.surface2,  // Shadow/depth fills
  surface:    C.surface1,                  // Light fill shapes
  stroke:     C.t2,                        // Outline strokes
  glow:       `${C.accent}30`,            // Glow effects (30% opacity)
  muted:      `${C.accent}15`,            // Background shapes (15% opacity)
};

// Stroke width system (choose one per illustration family):
// Thin: strokeWidth 1.5 (editorial, minimal)
// Medium: strokeWidth 2 (standard, versatile)
// Thick: strokeWidth 2.5 (bold, friendly edtech)
```

---

## PART 3: EDTECH DOMAIN ILLUSTRATIONS

### Illustration: Graduation Cap
```jsx
function GraduationCap({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Board (diamond) */}
      <path d="M40 12 L68 26 L40 40 L12 26 Z"
        fill={`${color}20`} stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      {/* Top highlight on board */}
      <path d="M40 12 L68 26 L40 40 L12 26 Z"
        fill={`${color}10`}/>
      {/* Hat base (cap) */}
      <path d="M22 32 L22 50 Q22 58 40 58 Q58 58 58 50 L58 32"
        fill={`${color}15`} stroke={color} strokeWidth="2"/>
      {/* Tassel string */}
      <line x1="68" y1="26" x2="68" y2="44" stroke={color} strokeWidth="2"/>
      {/* Tassel ball */}
      <circle cx="68" cy="48" r="4" fill={color}/>
      {/* Tassel fringe */}
      <line x1="66" y1="52" x2="64" y2="60" stroke={color} strokeWidth="1.5"/>
      <line x1="68" y1="52" x2="68" y2="61" stroke={color} strokeWidth="1.5"/>
      <line x1="70" y1="52" x2="72" y2="60" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}
```

### Illustration: Open Book
```jsx
function OpenBook({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Left page */}
      <path d="M8 20 Q8 16 12 16 Q26 16 40 22 L40 64 Q26 58 12 58 Q8 58 8 54 Z"
        fill={`${color}15`} stroke={color} strokeWidth="2"/>
      {/* Right page */}
      <path d="M72 20 Q72 16 68 16 Q54 16 40 22 L40 64 Q54 58 68 58 Q72 58 72 54 Z"
        fill={`${color}20`} stroke={color} strokeWidth="2"/>
      {/* Spine line */}
      <line x1="40" y1="22" x2="40" y2="64" stroke={color} strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Left page lines */}
      <line x1="16" y1="30" x2="36" y2="28" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="16" y1="37" x2="36" y2="35" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="16" y1="44" x2="36" y2="42" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Right page lines */}
      <line x1="44" y1="28" x2="64" y2="30" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="44" y1="35" x2="64" y2="37" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      <line x1="44" y1="42" x2="64" y2="44" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
    </svg>
  );
}
```

### Illustration: Laptop + Code
```jsx
function LaptopCode({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Screen */}
      <rect x="12" y="14" width="56" height="38" rx="4"
        fill={`${color}10`} stroke={color} strokeWidth="2"/>
      {/* Screen inner */}
      <rect x="16" y="18" width="48" height="30" rx="2" fill={C.bg || '#0A0A0F'}/>
      {/* Code lines on screen */}
      <rect x="20" y="23" width="20" height="3" rx="1.5" fill={color}/>
      <rect x="24" y="29" width="28" height="3" rx="1.5" fill={`${color}60`}/>
      <rect x="24" y="35" width="16" height="3" rx="1.5" fill={`${color}60`}/>
      <rect x="20" y="41" width="24" height="3" rx="1.5" fill={`${color}40`}/>
      {/* Cursor blink */}
      <rect x="44" y="41" width="2" height="3" rx="1" fill={color}>
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
      </rect>
      {/* Base */}
      <path d="M4 52 L76 52 L72 60 L8 60 Z"
        fill={`${color}15`} stroke={color} strokeWidth="2"/>
      {/* Hinge */}
      <line x1="12" y1="52" x2="12" y2="52" stroke={color} strokeWidth="2"/>
      <rect x="32" y="53" width="16" height="3" rx="1.5" fill={`${color}30`}/>
    </svg>
  );
}
```

### Illustration: Certificate / Award
```jsx
function Certificate({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Paper */}
      <rect x="10" y="8" width="48" height="60" rx="4"
        fill={`${color}10`} stroke={color} strokeWidth="2"/>
      {/* Header decoration */}
      <rect x="18" y="16" width="32" height="4" rx="2" fill={`${color}40`}/>
      {/* Lines */}
      <rect x="18" y="26" width="28" height="2.5" rx="1.25" fill={`${color}25`}/>
      <rect x="18" y="32" width="24" height="2.5" rx="1.25" fill={`${color}25`}/>
      <rect x="18" y="38" width="26" height="2.5" rx="1.25" fill={`${color}25`}/>
      {/* Signature line */}
      <line x1="18" y1="56" x2="46" y2="56" stroke={color} strokeWidth="1.5"/>
      {/* Medal/seal */}
      <circle cx="62" cy="58" r="14" fill={`${color}20`} stroke={color} strokeWidth="2"/>
      <circle cx="62" cy="58" r="9" fill={`${color}30`}/>
      {/* Star in medal */}
      <path d="M62 50 L63.8 55.5 L69.5 55.5 L65 59 L66.8 64.5 L62 61 L57.2 64.5 L59 59 L54.5 55.5 L60.2 55.5 Z"
        fill={color}/>
    </svg>
  );
}
```

### Illustration: Light Bulb (Ideas / Learning)
```jsx
function LightBulb({ size = 80, color = C.accent, animated = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Glow ring */}
      <circle cx="40" cy="34" r="22" fill={`${color}08`}>
        {animated && <animate attributeName="r" values="22;26;22" dur="2s" repeatCount="indefinite"/>}
        {animated && <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>}
      </circle>
      {/* Bulb body */}
      <path d="M28 34 Q28 22 40 22 Q52 22 52 34 Q52 42 46 46 L46 52 L34 52 L34 46 Q28 42 28 34 Z"
        fill={`${color}25`} stroke={color} strokeWidth="2"/>
      {/* Filament / inner glow */}
      <path d="M34 46 Q34 42 40 40 Q46 42 46 46" fill={`${color}30`}/>
      <path d="M36 36 Q38 32 40 36 Q42 32 44 36" stroke={color} strokeWidth="1.5" fill="none"/>
      {/* Base rings */}
      <rect x="34" y="52" width="12" height="4" rx="1" fill={`${color}40`} stroke={color} strokeWidth="1.5"/>
      <rect x="35" y="56" width="10" height="4" rx="1" fill={`${color}30`} stroke={color} strokeWidth="1.5"/>
      {/* Cap */}
      <rect x="36" y="60" width="8" height="4" rx="2" fill={color}/>
      {/* Rays */}
      {animated && <>
        <line x1="40" y1="10" x2="40" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="56" y1="18" x2="59" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="62" y1="34" x2="66" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="24" y1="18" x2="21" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
        <line x1="18" y1="34" x2="14" y2="34" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      </>}
    </svg>
  );
}
```

---

## PART 4: FINTECH DOMAIN ILLUSTRATIONS

### Illustration: Growth Chart (Trend Up)
```jsx
function TrendChart({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Grid lines */}
      <line x1="12" y1="60" x2="68" y2="60" stroke={`${color}20`} strokeWidth="1"/>
      <line x1="12" y1="46" x2="68" y2="46" stroke={`${color}20`} strokeWidth="1"/>
      <line x1="12" y1="32" x2="68" y2="32" stroke={`${color}20`} strokeWidth="1"/>
      <line x1="12" y1="18" x2="68" y2="18" stroke={`${color}20`} strokeWidth="1"/>
      {/* Area fill */}
      <path d="M12 52 L24 46 L36 40 L48 28 L60 20 L68 16 L68 60 L12 60 Z"
        fill={`${color}15`}/>
      {/* Line */}
      <path d="M12 52 L24 46 L36 40 L48 28 L60 20 L68 16"
        stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <animate attributeName="stroke-dashoffset"
          from="200" to="0" dur="1.2s" fill="freeze"
          calcMode="spline" keySplines="0.16 1 0.3 1"/>
      </path>
      {/* Data points */}
      {[[12,52],[24,46],[36,40],[48,28],[60,20],[68,16]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i === 5 ? 5 : 3}
          fill={i === 5 ? color : `${color}60`}
          stroke={i === 5 ? C.bg : 'none'} strokeWidth="2"/>
      ))}
      {/* Glow on last point */}
      <circle cx="68" cy="16" r="10" fill={`${color}15`}>
        <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
      </circle>
      {/* Y-axis */}
      <line x1="12" y1="12" x2="12" y2="60" stroke={`${color}30`} strokeWidth="1"/>
      {/* X-axis */}
      <line x1="12" y1="60" x2="68" y2="60" stroke={`${color}30`} strokeWidth="1"/>
    </svg>
  );
}
```

### Illustration: Coin / Currency
```jsx
function Coin({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Shadow coin (depth) */}
      <ellipse cx="42" cy="54" rx="24" ry="8" fill={`${color}20`}/>
      {/* Coin body */}
      <circle cx="40" cy="38" r="24" fill={`${color}25`} stroke={color} strokeWidth="2"/>
      {/* Inner ring */}
      <circle cx="40" cy="38" r="18" fill={`${color}15`} stroke={color} strokeWidth="1" strokeOpacity="0.5"/>
      {/* Currency symbol */}
      <text x="40" y="45" textAnchor="middle" fontSize="22" fontWeight="800"
        fill={color} fontFamily="sans-serif">₦</text>
      {/* Shine */}
      <ellipse cx="32" cy="28" rx="6" ry="4" fill="rgba(255,255,255,0.15)"
        transform="rotate(-30 32 28)"/>
    </svg>
  );
}
```

### Illustration: Shield (Security)
```jsx
function Shield({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Shield body */}
      <path d="M40 10 L64 20 L64 44 Q64 62 40 72 Q16 62 16 44 L16 20 Z"
        fill={`${color}20`} stroke={color} strokeWidth="2"/>
      {/* Inner shield */}
      <path d="M40 18 L58 26 L58 44 Q58 56 40 64 Q22 56 22 44 L22 26 Z"
        fill={`${color}15`}/>
      {/* Checkmark */}
      <path d="M30 40 L37 47 L52 32"
        stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
```

### Illustration: Wallet
```jsx
function Wallet({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Wallet body */}
      <rect x="8" y="24" width="64" height="44" rx="8"
        fill={`${color}15`} stroke={color} strokeWidth="2"/>
      {/* Card slot */}
      <rect x="44" y="36" width="20" height="20" rx="6"
        fill={`${color}25`} stroke={color} strokeWidth="1.5"/>
      {/* Coin in slot */}
      <circle cx="54" cy="46" r="5" fill={color}/>
      {/* Strap */}
      <path d="M8 36 L72 36" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Cards peeking out */}
      <rect x="14" y="18" width="44" height="12" rx="4"
        fill={`${color}20`} stroke={color} strokeWidth="1.5"/>
      <rect x="18" y="13" width="36" height="10" rx="4"
        fill={`${color}15`} stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}
```

---

## PART 5: SAAS / ANALYTICS DOMAIN ILLUSTRATIONS

### Illustration: Rocket Launch (Growth / Launch)
```jsx
function Rocket({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Exhaust flame */}
      <path d="M34 62 Q36 72 40 68 Q44 72 46 62 Q44 66 40 64 Q36 66 34 62 Z"
        fill={`${color}60`}>
        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="0.6s" repeatCount="indefinite"/>
      </path>
      <path d="M36 64 Q38 70 40 68 Q42 70 44 64 Q42 67 40 66 Q38 67 36 64 Z"
        fill={color}>
        <animate attributeName="opacity" values="1;0.6;1" dur="0.6s" repeatCount="indefinite"/>
      </path>
      {/* Rocket body */}
      <path d="M40 10 Q56 24 56 44 L56 56 Q56 60 52 60 L28 60 Q24 60 24 56 L24 44 Q24 24 40 10 Z"
        fill={`${color}25`} stroke={color} strokeWidth="2"/>
      {/* Window */}
      <circle cx="40" cy="38" r="8" fill={`${color}30`} stroke={color} strokeWidth="1.5"/>
      <circle cx="40" cy="38" r="4" fill={`${color}50`}/>
      {/* Fins */}
      <path d="M24 52 L14 64 L24 58 Z" fill={`${color}40`} stroke={color} strokeWidth="1.5"/>
      <path d="M56 52 L66 64 L56 58 Z" fill={`${color}40`} stroke={color} strokeWidth="1.5"/>
      {/* Stars */}
      <circle cx="16" cy="22" r="2" fill={color} opacity="0.6"/>
      <circle cx="64" cy="18" r="1.5" fill={color} opacity="0.4"/>
      <circle cx="20" cy="40" r="1" fill={color} opacity="0.5"/>
    </svg>
  );
}
```

### Illustration: Database / Cloud
```jsx
function CloudDatabase({ size = 80, color = C.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {/* Cloud shape */}
      <path d="M24 50 Q14 50 14 40 Q14 30 24 30 Q24 20 36 20 Q46 20 48 28 Q58 28 58 38 Q58 50 46 50 Z"
        fill={`${color}20`} stroke={color} strokeWidth="2"/>
      {/* Database cylinders */}
      <ellipse cx="40" cy="56" rx="16" ry="5" fill={`${color}30`} stroke={color} strokeWidth="1.5"/>
      <rect x="24" y="56" width="32" height="12" fill={`${color}20`}/>
      <ellipse cx="40" cy="68" rx="16" ry="5" fill={`${color}25`} stroke={color} strokeWidth="1.5"/>
      {/* Horizontal bands on cylinder */}
      <line x1="24" y1="61" x2="56" y2="61" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="24" y1="65" x2="56" y2="65" stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
      {/* Upload arrow */}
      <path d="M40 44 L40 32 M34 38 L40 32 L46 38"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
```

### Illustration: Team / People
```jsx
function TeamPeople({ size = 80, color = C.accent }) {
  const persons = [
    { cx: 20, cy: 28, head: 8, body: 20 },
    { cx: 40, cy: 24, head: 10, body: 22 },  // center, taller
    { cx: 60, cy: 28, head: 8, body: 20 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      {persons.map((p, i) => (
        <g key={i} opacity={i === 1 ? 1 : 0.6}>
          {/* Head */}
          <circle cx={p.cx} cy={p.cy} r={p.head}
            fill={`${color}${i === 1 ? '30' : '20'}`}
            stroke={color} strokeWidth="1.5"/>
          {/* Body */}
          <path d={`M${p.cx - p.body/2} 72 Q${p.cx - p.body/2} ${p.cy + p.head + 8} ${p.cx} ${p.cy + p.head + 6} Q${p.cx + p.body/2} ${p.cy + p.head + 8} ${p.cx + p.body/2} 72 Z`}
            fill={`${color}${i === 1 ? '25' : '15'}`}
            stroke={color} strokeWidth="1.5"/>
        </g>
      ))}
      {/* Connection lines between people */}
      <line x1="28" y1="44" x2="30" y2="44" stroke={color} strokeWidth="1.5" strokeOpacity="0.4"/>
      <line x1="50" y1="44" x2="52" y2="44" stroke={color} strokeWidth="1.5" strokeOpacity="0.4"/>
    </svg>
  );
}
```

---

## PART 6: EMPTY STATE ILLUSTRATIONS

### Empty State: No Courses Yet
```jsx
function EmptyStateCourses({ color = C.accent }) {
  return (
    <div style={{ textAlign:'center', padding: '48px 24px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" style={{ marginBottom: 24 }}>
        {/* Book stack */}
        <rect x="20" y="70" width="80" height="16" rx="4" fill={`${color}15`} stroke={color} strokeWidth="2"/>
        <rect x="26" y="56" width="68" height="16" rx="4" fill={`${color}20`} stroke={color} strokeWidth="2"/>
        <rect x="32" y="42" width="56" height="16" rx="4" fill={`${color}25`} stroke={color} strokeWidth="2"/>
        {/* Plus icon hovering above */}
        <circle cx="60" cy="24" r="14" fill={`${color}20`} stroke={color} strokeWidth="2"/>
        <line x1="60" y1="18" x2="60" y2="30" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="54" y1="24" x2="66" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>
        No courses yet
      </div>
      <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, maxWidth: 240, margin:'0 auto 24px' }}>
        Enroll in your first course to start your learning journey
      </div>
      <button style={{ background: C.accent, color: C.bg, border:'none', borderRadius: 99,
        padding:'12px 28px', fontSize: 14, fontWeight: 700, cursor:'pointer' }}>
        Browse Courses
      </button>
    </div>
  );
}
```

### Empty State: No Transactions
```jsx
function EmptyStateTransactions({ color = C.accent }) {
  return (
    <div style={{ textAlign:'center', padding: '48px 24px' }}>
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" style={{ marginBottom: 24 }}>
        {/* Receipt */}
        <path d="M30 10 L90 10 L90 80 L80 72 L70 80 L60 72 L50 80 L40 72 L30 80 Z"
          fill={`${color}15`} stroke={color} strokeWidth="2"/>
        {/* Lines on receipt */}
        <line x1="40" y1="25" x2="80" y2="25" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
        <line x1="40" y1="35" x2="70" y2="35" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
        <line x1="40" y1="45" x2="75" y2="45" stroke={color} strokeWidth="1.5" strokeOpacity="0.5"/>
        {/* Amount line */}
        <line x1="40" y1="58" x2="80" y2="58" stroke={color} strokeWidth="2"/>
        <circle cx="95" cy="20" r="12" fill={`${color}20`} stroke={color} strokeWidth="2"/>
        <text x="95" y="25" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>?</text>
      </svg>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>
        No transactions
      </div>
      <div style={{ fontSize: 14, color: C.t2, lineHeight: 1.6, maxWidth: 240, margin:'0 auto' }}>
        Your transaction history will appear here
      </div>
    </div>
  );
}
```

---

## PART 7: HERO DECORATIVE ILLUSTRATION SYSTEM

### Hero Blob Background
Large abstract shape for hero section — sits behind all content, provides visual interest without competing.

```jsx
function HeroBlob({ color = C.accent, width = 600, opacity = 0.12 }) {
  return (
    <svg width={width} height={width * 0.8} viewBox="0 0 600 480" fill="none"
      style={{ position:'absolute', zIndex: 0, pointerEvents:'none' }}>
      <path d="M480 60 Q540 160 520 280 Q500 400 380 440 Q260 480 160 420 Q60 360 40 240 Q20 120 120 60 Q220 0 340 20 Q460 40 480 60 Z"
        fill={color} opacity={opacity}/>
      {/* Inner lighter blob */}
      <path d="M440 100 Q490 180 470 280 Q450 380 350 410 Q250 440 160 380 Q70 320 80 220 Q90 120 180 90 Q270 60 360 80 Q450 100 440 100 Z"
        fill={color} opacity={opacity * 0.6}/>
    </svg>
  );
}
```

### Floating Dot Grid
Decorative dot pattern — subtle background texture common in premium landing pages.

```jsx
function DotGrid({ cols = 12, rows = 8, size = 3, gap = 24, color = C.accent, opacity = 0.15 }) {
  const dots = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dots.push({ x: c * gap + size, y: r * gap + size });
    }
  }
  return (
    <svg width={cols * gap} height={rows * gap} style={{ pointerEvents:'none' }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={size / 2} fill={color} opacity={opacity}/>
      ))}
    </svg>
  );
}
```

### Floating Stats Badge (overlay on hero images)
```jsx
function FloatingBadge({ value, label, icon, color = C.accent }) {
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap: 10,
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: 16, padding: '12px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10,
        background: `${color}25`, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: 18 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color:'#fff', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color:'rgba(255,255,255,0.65)', marginTop: 1 }}>{label}</div>
      </div>
    </div>
  );
}
// Usage: <FloatingBadge value="12,400+" label="Students Enrolled" icon="🎓" />
```

---

## PART 8: ANIMATED SVG ILLUSTRATION — FULL EXAMPLE

### Edtech Hero Illustration (animated, complete)
Laptop with floating elements — suitable for H-Tech hero section.

```jsx
function EdtechHeroIllustration({ size = 360 }) {
  const c = C.accent;  // #FFDB43 for H-Tech
  const navy = C.bg;   // #090F2B

  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 360 270" fill="none">
      {/* Background glow */}
      <ellipse cx="180" cy="180" rx="140" ry="80" fill={`${c}08`}/>

      {/* Laptop base */}
      <path d="M40 180 L320 180 L300 210 L60 210 Z" fill={`${c}20`} stroke={c} strokeWidth="2"/>
      {/* Touchpad */}
      <rect x="155" y="185" width="50" height="16" rx="4" fill={`${c}30`}/>

      {/* Laptop screen */}
      <rect x="70" y="60" width="220" height="120" rx="8" fill={navy} stroke={c} strokeWidth="2"/>
      {/* Screen inner */}
      <rect x="76" y="66" width="208" height="108" rx="4" fill={`${navy}EE`}/>
      {/* Hinge */}
      <line x1="70" y1="180" x2="70" y2="180" />
      <rect x="70" y="176" width="220" height="6" rx="3" fill={`${c}30`}/>

      {/* Code on screen */}
      <rect x="86" y="76" width="60" height="5" rx="2.5" fill={`${c}80`}/>
      <rect x="92" y="86" width="80" height="5" rx="2.5" fill={`${c}50`}/>
      <rect x="92" y="96" width="50" height="5" rx="2.5" fill={`${c}50`}/>
      <rect x="86" y="106" width="70" height="5" rx="2.5" fill={`${c}30`}/>
      <rect x="86" y="116" width="90" height="5" rx="2.5" fill={`${c}40`}/>
      <rect x="92" y="126" width="40" height="5" rx="2.5" fill={`${c}50`}/>
      <rect x="92" y="136" width="60" height="5" rx="2.5" fill={`${c}50`}/>
      {/* Cursor */}
      <rect x="153" y="136" width="2" height="10" rx="1" fill={c}>
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"/>
      </rect>

      {/* Floating badge 1 — Courses */}
      <g transform="translate(270, 70)">
        <rect width="72" height="44" rx="10" fill="rgba(255,255,255,0.1)"
          stroke={`${c}50`} strokeWidth="1.5"/>
        <text x="36" y="18" textAnchor="middle" fontSize="14" fontWeight="800" fill={c}>13</text>
        <text x="36" y="34" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)">COURSES</text>
        <animateTransform attributeName="transform" type="translate"
          values="270,70;270,62;270,70" dur="3s" repeatCount="indefinite"/>
      </g>

      {/* Floating badge 2 — Students */}
      <g transform="translate(10, 90)">
        <rect width="72" height="44" rx="10" fill="rgba(255,255,255,0.1)"
          stroke={`${c}50`} strokeWidth="1.5"/>
        <text x="36" y="18" textAnchor="middle" fontSize="14" fontWeight="800" fill={c}>5K+</text>
        <text x="36" y="34" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.6)">STUDENTS</text>
        <animateTransform attributeName="transform" type="translate"
          values="10,90;10,98;10,90" dur="4s" repeatCount="indefinite"/>
      </g>

      {/* Stars decoration */}
      <circle cx="50" cy="50" r="3" fill={c} opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="310" cy="40" r="2" fill={c} opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="3.2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="330" cy="150" r="4" fill={c} opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.8s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}
```

---

## PART 9: USAGE IN SKILL WORKFLOW

### Where illustrations are used (vs photos)
| Location | Use |
|----------|-----|
| Hero section main visual | HYBRID — SVG illustration as background/decorative + SVG illustration in foreground |
| Feature section icons | SVG illustration (GraduationCap, LightBulb, etc.) — 48-64px |
| Empty states | SVG illustration — 100-120px + CTA button |
| Hero background | HeroBlob + DotGrid |
| Hero floating elements | FloatingBadge + SVG stat components |
| Course thumbnails | SVG illustration |
| Instructor photos | SVG illustration |
| Testimonial avatars | SVG illustration |
| About page hero | SVG illustration |
| 404 / error pages | SVG illustration |

### Animation — when to animate SVGs
- Animate: cursor blink, floating badges (subtle translateY), glow pulse, count-up paths
- Don't animate: structural shapes (makes design feel unstable), color fills (expensive)
- Maximum: 3 animated elements per SVG. More = visual noise.
- Use `repeatCount="indefinite"` only for subtle effects (glow, cursor blink, floating). One-shot animations use `fill="freeze"`.

# Dashboard Design Patterns — Extracted from 13 Premium References

Patterns extracted from real Dribbble/Behance dashboard shots across project management, fintech, logistics, fitness, weather, analytics, and productivity apps. These are the SPECIFIC patterns that make premium dashboards look expensive — not generic rules.

---

## 1. Layout Archetypes (4 Distinct Patterns Observed)

### Pattern A: Sidebar + Main + Right Panel (classic three-zone)
**Used by**: Chaart (project mgmt), Yoga dashboard, Dappr (fintech), ShipMates (logistics)
```
[Sidebar 200-240px] [Main Content fluid] [Right Panel 260-320px]
```
- Sidebar: white or dark, contains nav + user profile
- Main: greeting header + KPI row + charts/lists
- Right panel: calendar, profile card, to-do list, meeting card

### Pattern B: Top Nav Tabs + Full-Width Content
**Used by**: Tasklyn, Optiboost, Onyx, FocusFlow
```
[Logo] [Tab1 Tab2 Tab3 Tab4] [Search] [Avatar]
[Page Title + Subtitle]
[Bento grid of cards/charts filling full width]
```
- Navigation as horizontal pill tabs at top (NOT sidebar)
- Active tab: solid dark/accent background, white text, rounded-full
- Content fills full viewport width below tabs
- More spacious feel, better for data-rich views

### Pattern C: Collapsed Icon Sidebar + Full Content
**Used by**: Dappr (icon-only sidebar), Weather dashboard
```
[Icon bar 48-64px] [Full-width content area]
```
- Sidebar shows only icons, no text labels
- Active icon: accent color or filled variant
- Maximizes content area for dense layouts

### Pattern D: Mobile App Layout (3 screens side-by-side in presentation)
**Used by**: Fitness app
```
[Onboarding] [Home Dashboard] [Detail View]
```
- Phone frame: 340-360px wide, 720-740px tall, border-radius 40-48px
- Status bar: 9:41 time, signal/wifi/battery icons
- Bottom tab bar: 56-66px, 4-5 icons, floating dark pill style

---

## 2. Welcome/Greeting Headers

Nearly ALL dashboards (11/13) start with a personalized greeting. This is the #1 most consistent pattern.

### Greeting Formats Observed
- "Hello, Sara" + "Today is Monday, 20 October 2021"
- "Good morning, James!" (standalone, large)
- "Hello Jane" + "Today it's great day to be fit!"
- "Hello, Sajibur Rahman" (with avatar)
- "Hello Andrew!" + "Here's your overview of your business!"
- "Onyx web design project" + "Dashboard design for Onyx Agency"

### Implementation
```javascript
// Standard greeting header
<div style={{marginBottom:24}}>
  <h1 style={{fontSize:28, fontWeight:800, letterSpacing:'-0.5px'}}>
    Hello, {userName}!
  </h1>
  <p style={{fontSize:14, color:C.t2, marginTop:4}}>
    Here's your overview for today
  </p>
</div>

// With date + actions
<div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
  <div>
    <h1 style={{fontSize:28, fontWeight:800}}>Good morning, James!</h1>
  </div>
  <div style={{display:'flex', alignItems:'center', gap:12}}>
    <button style={searchBtnStyle}>🔍</button>
    <button style={primaryBtnStyle}>+ Add New Project</button>
  </div>
</div>
```

---

## 3. KPI Card Variations (6 Distinct Styles)

### Style A: Icon + Value + Label + Trend (most common)
```
┌──────────────────────────────┐
│ [Icon 40px]           [•••]  │
│ $143,624                     │  ← 24-28px, weight 800
│ Your bank balance            │  ← 12px, muted
│ ↑ +4.3% from last month     │  ← 12px, green/red
└──────────────────────────────┘
```
**Seen in**: Dappr, ShipMates, FocusFlow

### Style B: Colored Background Card
```
┌──────────────────────────────┐  ← bg: accent gradient
│ [Avatars]              [•••] │
│ Web Development              │  ← 16px, weight 700, white
│ 10 tasks | 96%               │  ← 12px, white/80%
│ [━━━━━━━━━━━░░]              │  ← progress bar
└──────────────────────────────┘
```
**Seen in**: Chaart (coral, teal, peach colored cards)

### Style C: Large Number + Sparkline
```
┌──────────────────────────────┐
│ ♡ Heart Rate    +12%         │  ← icon + label + trend
│ 75 BPM                       │  ← 28px, weight 800
│ [mini sparkline ~24px high]  │  ← inline mini chart
└──────────────────────────────┘
```
**Seen in**: Yoga dashboard (heart rate, energy, swimming)

### Style D: Donut Center Number
```
┌──────────────────────────────┐
│ Project Completed            │
│                              │
│     ╭──────╮                 │
│     │ 72%  │    16 done      │
│     ╰──────╯    33 progress  │
│                  42 waiting  │
└──────────────────────────────┘
```
**Seen in**: Onyx, Tasklyn

### Style E: Simple Stat Row (no card borders)
```
Overdue          Due next month       Avg time to pay
$31,211.00       $172,560.00          12 days
```
**Seen in**: Salesforce invoice dashboard — stats in a single row without individual card borders, separated by spacing only

### Style F: Status KPI with Progress
```
┌──────────────────────────────┐  ← dark bg card
│ Formation status             │
│ In progress                  │
│ [━━━━━━━░░░░░░]  40%        │  ← accent colored bar
│ Estimated 4-5 business days  │
│ [View status]                │  ← ghost button
└──────────────────────────────┘
```
**Seen in**: Dappr (dark CTA-style card in right panel)

---

## 4. Chart Patterns Observed

### Bar Chart with Data Labels (most popular — 5/13 references)
```
         +12%  +16%  +31%↑  +5%   +11%
          ▌     ▌     ▌▌    ▌     ▌
          ▌     ▌     ▌▌    ▌     ▌
          ▌     ▌     ▌▌    ▌     ▌
         Mon   Tue   Wed   Thu   Fri
```
- Bars: 40-50% slot width, radius-top 4-6px
- Highlighted bar: full accent color, others at 15-25% opacity
- Percentage labels above each bar
- Tooltip on hover/highlighted bar with detailed data

### Dual-Line Area Chart (revenue comparison)
```
    ── Current period (solid accent)
    -- Previous period (dashed gray)
```
- Two overlapping curves with bezier smoothing
- Current: solid stroke + gradient fill
- Previous: dashed stroke, no fill
- Highlighted data point with tooltip card
- X-axis: date labels, Y-axis: value abbreviations ($10K, $15K)

### Stacked/Grouped Bar Chart
```
     ▌▌    ▌▌    ▌▌    ▌▌    ▌▌
     ▌▌    ▌▌    ▌▌    ▌▌    ▌▌
    Mon   Tue   Wed   Thu   Fri
    ● Focus Session  ● Break Session
```
- Two colors per group, rounded tops
- Legend below or inline with header

### Donut Chart (project/allocation)
- Size: 140-200px diameter
- Stroke width: 20-28px
- Center: large percentage or total value
- Legend: side-by-side or below with color dots
- 3-4 segments maximum for clarity

### Weekly Activity Bars (vertical progress)
```
  M   T   W   T   F   S   S
  ▌   ▌   ▌   ▌   ▌   ▌   ▌    ← filled portion
  │   │   │   │   │   │   │    ← empty portion (bg track)
```
- Thin vertical bars (6-10px wide)
- Filled: accent color, unfilled: light gray
- Current day: different color or highlighted

---

## 5. Calendar Widget Patterns

### Compact Week Row (fitness app)
```
S    T    Q    Q    S    S    D
9   10   11   12   13   14   15
              ◉              
```
- Day abbreviations on top, dates below
- Current day: filled circle or accent background
- 7 columns, fixed width per day

### Full Month Mini Calendar
```
December 2023
Su  Mo  Tu  We  Th  Fr  Sa
         1   2   3   4   5
 6   7   8   9  10  11  12
13  14  15  ●16  17  18  19
```
- Current day: accent-colored circle
- Days with events: dot below number or highlighted range
- Month/year header with prev/next arrows
- Legend below: colored dots for task categories

### Implementation
```javascript
const Calendar = ({month, year}) => {
  const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const today = 15; // highlighted
  const dates = Array.from({length:31}, (_,i) => i+1);
  return (
    <div style={{padding:20}}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:16}}>
        <span style={{fontWeight:700}}>{month} {year}</span>
        <div style={{display:'flex', gap:8}}>
          <button style={arrowBtn}>‹</button>
          <button style={arrowBtn}>›</button>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:4, textAlign:'center'}}>
        {days.map(d => <div key={d} style={{fontSize:11, color:C.t3, padding:4}}>{d}</div>)}
        {dates.map(d => (
          <div key={d} style={{
            fontSize:13, padding:6, borderRadius:8,
            background: d===today ? C.accent : 'transparent',
            color: d===today ? '#fff' : C.t1,
            fontWeight: d===today ? 700 : 400
          }}>{d}</div>
        ))}
      </div>
    </div>
  );
};
```

---

## 6. Task/Todo List Patterns

### Checkbox List (most common — 4/13 references)
```
┌────────────────────────────────────────┐
│ [colored bar 4px] [icon] Task name  ○  │  ← circle checkbox
│                          Subtitle      │
├────────────────────────────────────────┤
│ [colored bar 4px] [icon] Task name  ●  │  ← filled = done
│                          Subtitle      │
└────────────────────────────────────────┘
```
- Left color bar: 3-4px wide accent strip indicating category
- Checkbox: unfilled circle (24px) for pending, filled circle with checkmark for done
- Task name: 14-15px, weight 600
- Subtitle: 12px, muted
- Hover: subtle background tint

### Timeline List (schedule/calendar)
```
Oct 20, 2021                    [•••]
10:00    │  Dribbble shot
         │  Facebook Brand
13:20    │  Design
         │  Task Management
```
- Date header: 12px, weight 600, muted
- Time column: 14px, weight 600
- Vertical line: 1-2px, accent or muted
- Event: name (14px, weight 600) + category (12px, muted)

---

## 7. Colored Card Backgrounds (from Chaart & Tasklyn)

Task/project cards with COLORED backgrounds are a distinctive premium pattern:

```javascript
const projectColors = [
  { bg: '#FF6B6B', hover: '#E85555' },   // Coral/red
  { bg: '#51C4A9', hover: '#3DAF94' },   // Teal
  { bg: '#F4A261', hover: '#E09050' },   // Peach/amber
  { bg: '#7C83FD', hover: '#6B72E8' },   // Periwinkle
  { bg: '#E8A0BF', hover: '#D48AAB' },   // Pink
  { bg: '#95D1CC', hover: '#7FC0BA' },   // Mint
];
```

Cards with colored backgrounds use:
- White text (weight 600-700 for titles, 400 for labels)
- White/80% opacity for secondary text
- Avatar stack in top-right corner
- Progress bar at bottom (white track at 20% opacity, filled at 100% white)
- Task count + completion percentage

---

## 8. Pill Tab Navigation (Top Bar Style)

Observed in 6/13 references as an alternative to sidebar navigation:

```javascript
const TabNav = ({tabs, active, onSelect}) => (
  <div style={{
    display:'flex', alignItems:'center', gap:4,
    background:'rgba(0,0,0,0.04)', padding:4, borderRadius:99
  }}>
    {tabs.map((tab, i) => (
      <button key={i} onClick={() => onSelect(i)} style={{
        padding:'8px 18px', borderRadius:99,
        background: i===active ? '#1A1A2E' : 'transparent',
        color: i===active ? '#FFFFFF' : '#666',
        fontSize:13, fontWeight: i===active ? 600 : 400,
        display:'flex', alignItems:'center', gap:6,
        transition:'all 0.2s', cursor:'pointer', border:'none'
      }}>
        {tab.icon && <span style={{fontSize:14}}>{tab.icon}</span>}
        {tab.label}
      </button>
    ))}
  </div>
);
```

Key details:
- Container: pill-shaped with subtle background (4-6% opacity)
- Active tab: dark solid background + white text
- Inactive: transparent background + gray text
- Tabs include icon + label (icon optional)
- Container padding: 4px (creates even border around active pill)

---

## 9. Split-Panel Detail View (Master-Detail)

Observed in Salesforce invoice dashboard — a powerful pattern for data-heavy apps:

```
┌─────────────────┬──────────────────────────────┐
│ [Tab filters]   │  Invoice #427-012            │
│                 │  Company: BlueRock            │
│ #404-002  $80K  │  Customer: Maria Jones        │
│ #426-001  $27K  │                               │
│ #427-012● $53K  │  ┌──────┬──────┬──────┐      │
│ #424-112  $61K  │  │$10.6K│$31.8K│$10.6K│      │
│ #417-020  $7.3K │  └──────┴──────┴──────┘      │
│                 │                               │
│                 │  Total: $53,154.00            │
│                 │  [Pay out now]                │
└─────────────────┴──────────────────────────────┘
```
- Left: scrollable list with selected item highlighted
- Right: full detail view of selected item
- Selected item: accent border-left or background highlight
- Tabs above list for filtering (All / Draft / Unpaid)

---

## 10. CTA/Upgrade Cards (Embedded Promotional)

5/13 dashboards include a promotional or upgrade card within the dashboard:

### Dark CTA Card
```javascript
<div style={{
  background:'#1A1A2E', borderRadius:16, padding:24,
  color:'#fff', position:'relative', overflow:'hidden'
}}>
  {/* Decorative gradient blob */}
  <div style={{position:'absolute', top:-20, right:-20,
    width:100, height:100, borderRadius:'50%',
    background:'radial-gradient(circle, rgba(accent,0.3), transparent)'}}/>
  <h3 style={{fontSize:16, fontWeight:700, marginBottom:8}}>
    Call meeting today
  </h3>
  <p style={{fontSize:13, color:'rgba(255,255,255,0.6)', marginBottom:16}}>
    Ulrich Nielsen
  </p>
  <button style={{padding:'10px 20px', borderRadius:99,
    background:C.accent, color:'#fff', fontWeight:600}}>
    Join meeting now →
  </button>
</div>
```

### Gradient CTA Card
```javascript
<div style={{
  background:'linear-gradient(135deg, #6366F1, #818CF8)',
  borderRadius:16, padding:24, color:'#fff'
}}>
  <h3 style={{fontSize:16, fontWeight:700}}>Upgrade pro plan!</h3>
  <p style={{fontSize:13, opacity:0.8}}>Explore new features</p>
  <button style={{marginTop:12, padding:'8px 20px', borderRadius:8,
    background:'rgba(255,255,255,0.2)', backdropFilter:'blur(10px)',
    color:'#fff', border:'1px solid rgba(255,255,255,0.3)'}}>
    Get Access
  </button>
</div>
```

---

## 11. Shipment/Route Tracker Card (Logistics Pattern)

```javascript
// Route visualization
<div style={{display:'flex', alignItems:'center', gap:0, padding:'16px 0'}}>
  <div style={{width:40, height:40, borderRadius:'50%',
    background:'rgba(16,185,129,0.1)', display:'flex',
    alignItems:'center', justifyContent:'center'}}>📦</div>
  <div style={{flex:1, height:2, background:'#E2E8F0', position:'relative'}}>
    <div style={{position:'absolute', top:-3, left:'60%',
      width:8, height:8, borderRadius:'50%', background:C.accent}}/>
    {/* Dashed line effect */}
  </div>
  <div style={{width:40, height:40, borderRadius:'50%',
    background:'rgba(99,102,241,0.1)', display:'flex',
    alignItems:'center', justifyContent:'center'}}>📍</div>
</div>
<div style={{display:'flex', justifyContent:'space-between'}}>
  <div style={{fontSize:12, color:C.t2}}>Lember, Indonesia</div>
  <div style={{fontSize:12, color:C.t2}}>Malaga, Spain</div>
</div>
```

---

## 12. Stock Images in Dashboards

Dashboards use real images for avatars, user profiles, product thumbnails, activity illustrations, header backgrounds, and CTA cards. Always use Unsplash with contextually relevant keywords.

### Avatar Images (use across ALL dashboards)
Pre-select 6-8 diverse avatar URLs and rotate them for team members, user profiles, and contact lists:
```javascript
const avatars = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
];
```

### Image Pattern A: Abstract Art Header Background
**Seen in**: n1 fintech dashboard — bold abstract painting as the header/greeting area background with white text overlaid.
```javascript
// Hero/header area with art background
<div style={{position:'relative', borderRadius:20, overflow:'hidden', padding:'32px 40px', marginBottom:24}}>
  <img src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&h=400&fit=crop"
    alt="" style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}} />
  <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.3)'}} />
  <div style={{position:'relative', zIndex:1, color:'#fff'}}>
    <h1 style={{fontSize:28, fontWeight:800}}>Overview for this month</h1>
  </div>
</div>
```
Use abstract/texture images (paint strokes, marble, gradients) — NOT photos of people or scenes.

### Image Pattern B: Professional Portrait in Feature Area
**Seen in**: CyberClinic — doctor portrait (not just a small avatar, but a 200-300px portrait) as a primary visual element in the top right of a healthcare dashboard.
```javascript
// Professional portrait card
<div style={{position:'relative', width:200, height:240, borderRadius:20, overflow:'hidden'}}>
  <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=400&fit=crop&crop=face"
    alt="Dr. Sandra McEwan"
    style={{width:'100%', height:'100%', objectFit:'cover'}} />
  <div style={{position:'absolute', bottom:0, left:0, right:0, padding:16,
    background:'linear-gradient(transparent, rgba(0,0,0,0.6))'}}>
    <div style={{fontSize:14, fontWeight:700, color:'#fff'}}>Sandra R. McEwan</div>
    <div style={{fontSize:11, color:'rgba(255,255,255,0.7)'}}>Doctor, USA</div>
  </div>
</div>
```
Match the portrait to the domain: doctor for health, financial advisor for fintech, teacher for edtech.

### Image Pattern C: Nature/Lifestyle Photo in CTA Cards
**Seen in**: NextPay upgrade card, AeuxGlobal community card — close-up nature/leaf photo as CTA card background.
```javascript
// Upgrade CTA card with background image
<div style={{position:'relative', borderRadius:20, overflow:'hidden', padding:28}}>
  <img src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=600&h=400&fit=crop"
    alt="" style={{position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover'}} />
  <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.45)'}} />
  <div style={{position:'relative', zIndex:1, color:'#fff'}}>
    <div style={{fontSize:28, fontWeight:900}}>$8<span style={{fontSize:14}}>/Month</span></div>
    <div style={{fontSize:18, fontWeight:700, marginTop:8}}>Upgrade Your Card Today</div>
    <button style={{marginTop:16, padding:'10px 24px', borderRadius:12,
      background:accentColor, color:'#fff', border:'none', fontWeight:600}}>Upgrade!</button>
  </div>
</div>
```

### Image Pattern D: Brand/Company Logos in Transaction Tables
**Seen in**: NextPay, Quixotic — payment history tables showing real brand icons (Spotify, Google, Netflix, Amazon).
```javascript
// Brand icon in table row — use first letter + brand color as fallback since we can't load logos
const BrandIcon = ({name, color}) => (
  <div style={{width:32, height:32, borderRadius:8, background:color,
    display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:12, fontWeight:800, color:'#fff'}}>
    {name[0]}
  </div>
);
// Use: <BrandIcon name="Spotify" color="#1DB954" />
```

### Card/Product Images
For project cards, course cards, or product thumbnails, use domain-relevant Unsplash images:
```javascript
// Search by domain keyword: ?w=400&h=250&fit=crop
// Fitness: photo-1571019614242-c5c5dee9f50b (gym equipment)
// Education: photo-1523050854058-8df90110c8f1 (students studying)
// Food: photo-1504674900247-0877df9cc836 (prepared meal)
// Tech: photo-1531297484001-80022131f5a1 (laptop workspace)
```

### User Profile Card (sidebar or right panel)
```javascript
<div style={{textAlign:'center', padding:24}}>
  <img src={avatars[0]}
    style={{width:80, height:80, borderRadius:'50%', objectFit:'cover',
    border:'3px solid ' + C.accent}} />
  <h3 style={{fontSize:16, fontWeight:700, marginTop:12}}>Sarah Connor</h3>
  <p style={{fontSize:12, color:C.t2}}>Product Manager</p>
</div>
```

### Image Pattern E: Profile Portrait Inside Progress Ring
**Seen in**: Kristin Watson dashboard — large portrait (~120px) wrapped in a circular progress ring/donut, not just a plain avatar. Creates a "gamified" profile feel.
```javascript
<div style={{position:'relative', width:140, height:140, margin:'0 auto'}}>
  {/* Progress ring SVG behind portrait */}
  <svg style={{position:'absolute', inset:0, transform:'rotate(-90deg)'}} viewBox="0 0 140 140">
    <circle cx="70" cy="70" r="62" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="5"/>
    <circle cx="70" cy="70" r="62" fill="none" stroke={accentColor} strokeWidth="5"
      strokeDasharray={`${0.83 * 390} ${390}`} strokeLinecap="round"/>
  </svg>
  {/* Portrait photo */}
  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face"
    alt="Profile" style={{position:'absolute', top:10, left:10, width:120, height:120,
    borderRadius:'50%', objectFit:'cover', border:'3px solid #fff'}} />
  {/* Badge on ring */}
  <div style={{position:'absolute', bottom:8, right:8, width:28, height:28, borderRadius:'50%',
    background:accentColor, border:'3px solid #fff', display:'flex', alignItems:'center',
    justifyContent:'center', zIndex:2}}>
    <span style={{fontSize:12, color:'#fff'}}>★</span>
  </div>
</div>
```

### Image Pattern F: Domain Equipment as Primary Visual
**Seen in**: Truck&Co — the actual truck/equipment image IS the main visual in an industry dashboard. The data grid overlays or sits beside the equipment photo. This pattern works for logistics, manufacturing, construction, automotive, and any domain where the physical asset is central.
```javascript
// Equipment hero in dashboard
<div style={{position:'relative', borderRadius:20, overflow:'hidden', marginBottom:24}}>
  <img src="https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1200&h=500&fit=crop"
    alt="Freight truck"
    style={{width:'100%', height:400, objectFit:'cover'}} />
  {/* Data overlay on the equipment image */}
  <div style={{position:'absolute', top:24, left:24, display:'flex', gap:24}}>
    {[{l:'Weight',v:'7,340kg',t:'+33%'},{l:'Pallets',v:'120',t:'+15%'}].map((s,i) => (
      <div key={i} style={{background:'rgba(255,255,255,0.95)', borderRadius:12, padding:'12px 20px'}}>
        <div style={{fontSize:11, color:'#888'}}>{s.l}</div>
        <div style={{fontSize:22, fontWeight:800}}>{s.v}</div>
      </div>
    ))}
  </div>
</div>
```
Match equipment to domain: truck for logistics, factory floor for manufacturing, farm for agritech, hospital room for healthcare.

### Image Pattern G: Video Player with Instructor/Content
**Seen in**: Education syllabus app — video player occupying 50-60% of the dashboard showing a teacher/instructor lecturing. The video frame has playback controls overlaid.
```javascript
// Video player area with instructor
<div style={{position:'relative', borderRadius:20, overflow:'hidden', aspectRatio:'16/9'}}>
  <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=450&fit=crop"
    alt="Instructor lecturing"
    style={{width:'100%', height:'100%', objectFit:'cover'}} />
  {/* Playback controls overlay */}
  <div style={{position:'absolute', bottom:0, left:0, right:0, padding:'12px 16px',
    background:'linear-gradient(transparent, rgba(0,0,0,0.6))',
    display:'flex', alignItems:'center', gap:12}}>
    <button style={{width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.2)',
      border:'none', display:'flex', alignItems:'center', justifyContent:'center'}}>▶</button>
    <div style={{flex:1, height:3, borderRadius:2, background:'rgba(255,255,255,0.3)'}}>
      <div style={{width:'23%', height:'100%', borderRadius:2, background:'#fff'}}/>
    </div>
    <span style={{fontSize:11, color:'rgba(255,255,255,0.7)'}}>5:23 / 23:28</span>
  </div>
  {/* Title overlay at top */}
  <div style={{position:'absolute', top:16, left:16}}>
    <div style={{fontSize:16, fontWeight:700, color:'#fff'}}>Perspective Basics</div>
    <div style={{fontSize:11, color:'rgba(255,255,255,0.6)'}}>Lecture 1 • Video 2</div>
  </div>
</div>
```

### Gradient Glass KPI Cards (Premium Pattern)
**Seen in**: Kristin Watson dashboard — KPI cards with soft pastel gradients (pink-to-coral, teal-to-cyan) and glassmorphic feel, instead of plain white cards with colored accents.
```javascript
const gradientKPIs = [
  { bg:'linear-gradient(135deg, #FDE7E7, #FCA5A5, #FECACA)', label:'Prioritized tasks', val:'83%' },
  { bg:'linear-gradient(135deg, #DBEAFE, #93C5FD, #BFDBFE)', label:'Additional tasks', val:'56%' },
];
// Each card: gradient bg, large percentage center, subtle white icon top-right
```

### MANDATORY Dashboard Image Placements
1. **User avatar** in top nav bar (REQUIRED — 32-40px circular)
2. **User profile photo** in sidebar if sidebar has profile section (REQUIRED — 64-80px)
3. **Avatar stack** in team/contacts cards (REQUIRED where people are listed)
4. **CTA/upgrade card** should use a background photo with overlay, not just a gradient (RECOMMENDED)
5. **Table rows** showing people should have avatar thumbnails (REQUIRED)

---

## 14. Advanced Component Patterns (from 11 additional references)

### Credit Card UI Component
**Seen in**: NextPay, Quixotic, OripioFin — a stylized credit/debit card rendered as a UI component. Used in fintech dashboards for "My Card" or "Payment Goal" sections.
```javascript
const CreditCard = ({name, last4, exp, brand='VISA', gradient}) => (
  <div style={{
    width:'100%', aspectRatio:'1.586/1', borderRadius:16, padding:24,
    background: gradient || 'linear-gradient(135deg, #0D9488, #065F46)',
    color:'#fff', position:'relative', overflow:'hidden',
    display:'flex', flexDirection:'column', justifyContent:'space-between'
  }}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
      <span style={{fontSize:14, fontWeight:800, letterSpacing:'0.08em'}}>{brand}</span>
      <span style={{fontSize:16}}>))))</span>
    </div>
    <div style={{fontSize:15, fontWeight:600, letterSpacing:'0.12em'}}>
      •••• •••• •••• {last4}
    </div>
    <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
      <span style={{fontWeight:600, textTransform:'uppercase'}}>{name}</span>
      <span>EXP {exp}</span>
    </div>
  </div>
);
```
Gradient colors by context: green for fintech, dark navy for premium, purple for crypto, coral for personal.

### AI Assistant / Chat Widget
**Seen in**: CashPanel — embedded AI chat panel within the dashboard. Becoming standard for data-heavy dashboards.
```javascript
<div style={{background:'#fff', borderRadius:20, padding:24, border:'1px solid #E5E7EB'}}>
  <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
    <span style={{fontSize:14}}>✨</span>
    <span style={{fontSize:15, fontWeight:700}}>AI Assistant</span>
  </div>
  {/* User question bubble */}
  <div style={{background:'#F3F4F6', borderRadius:12, padding:12, marginBottom:12,
    fontSize:13, maxWidth:'80%', marginLeft:'auto'}}>
    Where should I focus trading?
  </div>
  {/* AI response */}
  <div style={{fontSize:13, color:'#666', marginBottom:16, lineHeight:1.6}}>
    Trade Focus: Buy & watch SOL, LINK (short-term swing)...
  </div>
  {/* Model selector pills */}
  <div style={{display:'flex', gap:6, marginBottom:16, flexWrap:'wrap'}}>
    {['GPT-4o','Financial AI','Document AI'].map((m,i) => (
      <span key={i} style={{fontSize:11, padding:'4px 12px', borderRadius:20,
        background: i===0 ? '#1A1A2E' : '#F3F4F6', color: i===0 ? '#fff' : '#666',
        fontWeight:500}}>{m}</span>
    ))}
  </div>
  {/* Input */}
  <div style={{display:'flex', gap:8, alignItems:'center'}}>
    <input placeholder="Enter Task for AI Assistant" style={{flex:1, padding:'10px 14px',
      borderRadius:12, border:'1px solid #E5E7EB', fontSize:13, outline:'none'}} />
    <button style={{width:40, height:40, borderRadius:'50%', background:'#3B82F6',
      border:'none', color:'#fff', fontSize:16, cursor:'pointer'}}>↑</button>
  </div>
</div>
```

### Candlestick Chart (Trading/Crypto)
**Seen in**: CashPanel portfolio — red/green candlestick chart for trading dashboards. Each candle shows open-high-low-close.
```javascript
// SVG candlestick implementation
const Candle = ({x, open, close, high, low, width=12}) => {
  const isUp = close > open;
  const color = isUp ? '#10B981' : '#EF4444';
  const bodyTop = Math.min(open, close);
  const bodyHeight = Math.abs(close - open);
  return (
    <g>
      {/* Wick */}
      <line x1={x+width/2} y1={high} x2={x+width/2} y2={low}
        stroke={color} strokeWidth={1.5}/>
      {/* Body */}
      <rect x={x} y={bodyTop} width={width} height={Math.max(bodyHeight, 2)}
        fill={isUp ? color : color} rx={2}/>
    </g>
  );
};
```

### Multi-Currency Wallet Grid
**Seen in**: OripioFin — wallet cards showing flag + currency code + balance + limit + status in a 2x2 grid.
```javascript
const currencies = [
  {flag:'🇺🇸', code:'USD', balance:'$22,678.00', limit:'$10k/mo', active:true},
  {flag:'🇪🇺', code:'EUR', balance:'€18,345.00', limit:'€8k/mo', active:true},
  {flag:'🇳🇬', code:'NGN', balance:'₦1,22,678.00', limit:'₦10M/mo', active:true},
  {flag:'🇬🇧', code:'GBP', balance:'£15,000.00', limit:'£7.5k/mo', active:false},
];
// Each card: flag icon (24px) + code (14px bold) + balance (18px 800) + limit (11px muted) + status pill + ••• menu
```

### Gauge / Semi-Circular Meter
**Seen in**: Advertising stats ("Site efficiency 66%") — a half-circle gauge with percentage in center. Good for scores, efficiency, completion rates.
```javascript
const Gauge = ({value=66, color='#10B981', size=120}) => {
  const circumference = Math.PI * (size * 0.42); // half-circle arc length
  const filled = (value / 100) * circumference;
  return (
    <div style={{textAlign:'center'}}>
      <svg viewBox={`0 0 ${size} ${size*0.6}`} width={size}>
        <path d={`M ${size*0.08} ${size*0.55} A ${size*0.42} ${size*0.42} 0 0 1 ${size*0.92} ${size*0.55}`}
          fill="none" stroke="#E5E7EB" strokeWidth={size*0.07} strokeLinecap="round"/>
        <path d={`M ${size*0.08} ${size*0.55} A ${size*0.42} ${size*0.42} 0 0 1 ${size*0.92} ${size*0.55}`}
          fill="none" stroke={color} strokeWidth={size*0.07} strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}/>
        <text x={size/2} y={size*0.5} textAnchor="middle" fontSize={size*0.18}
          fontWeight="800" fill="#1A1A2E">{value}%</text>
      </svg>
    </div>
  );
};
```

### Sparkline Mini-Charts (Inline)
**Seen in**: Advertising stats (session duration, bounce rate) — tiny wavy line (~24-40px tall) beside a stat value. Visual trend indicator, not a full chart.
```javascript
const Sparkline = ({color='#94A3B8', width=80, height=24}) => (
  <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
    <path d={`M0,${height*0.75} C${width*0.1},${height*0.65} ${width*0.15},${height*0.33} ${width*0.25},${height*0.5} C${width*0.35},${height*0.65} ${width*0.4},${height*0.17} ${width*0.5},${height*0.33} C${width*0.6},${height*0.5} ${width*0.65},${height*0.25} ${width*0.75},${height*0.42} C${width*0.85},${height*0.58} ${width*0.9},${height*0.33} ${width},${height*0.5}`}
      fill="none" stroke={color} strokeWidth="1.5"/>
  </svg>
);
// Usage: <div style={{display:'flex', alignItems:'center', gap:12}}>
//   <span style={{fontSize:28, fontWeight:800}}>2:31</span>
//   <Sparkline />
// </div>
```

### Status Tag Pills in Tables
**Seen in**: NextPay, OripioFin, Mindscope — colored pill badges for row status in activity/transaction tables.
```javascript
const StatusPill = ({status}) => {
  const colors = {
    Completed: {bg:'#D1FAE5', color:'#065F46'},
    Pending: {bg:'#FEF3C7', color:'#92400E'},
    Delayed: {bg:'#FEE2E2', color:'#991B1B'},
    Active: {bg:'#DBEAFE', color:'#1E40AF'},
    Premium: {bg:'#EDE9FE', color:'#5B21B6'},
    Basic: {bg:'#F3F4F6', color:'#374151'},
  };
  const c = colors[status] || colors.Basic;
  return <span style={{fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
    background:c.bg, color:c.color}}>{status}</span>;
};
```

### Colored Bento Card Backgrounds
**Seen in**: Mindscope (education), productivity dashboard — individual bento cards have distinct soft pastel backgrounds instead of all being white. Creates visual variety.
```javascript
const bentoColors = [
  '#F0FDF4', // mint green — progress/completion cards
  '#FFF7ED', // warm peach — upcoming/schedule cards
  '#FDF2F8', // soft pink — popular/trending content
  '#EFF6FF', // light blue — stats/analytics cards
  '#ECFDF5', // teal tint — consultation/CTA cards
  '#1A1A2E', // dark — featured/premium cards (white text)
];
```
Rule: Use colored backgrounds on **30-40% of bento cards maximum**. The rest stay white. This breaks monotony without creating chaos.

### Team / Contact List with Avatars
**Seen in**: Advertising stats right panel — "Your team" list with real avatar photos, name, message preview, online indicator dot, and optional unread badge count.
```javascript
// Team member row
<div style={{display:'flex', alignItems:'center', gap:12, padding:'10px 0',
  borderBottom:'1px solid rgba(0,0,0,0.04)'}}>
  <div style={{position:'relative'}}>
    <img src={avatarUrl} style={{width:44, height:44, borderRadius:'50%', objectFit:'cover'}} />
    {online && <div style={{position:'absolute', bottom:0, right:0, width:12, height:12,
      borderRadius:'50%', background:'#10B981', border:'2px solid #fff'}} />}
    {badge > 0 && <div style={{position:'absolute', top:-4, right:-4, width:18, height:18,
      borderRadius:'50%', background:'#EF4444', color:'#fff', fontSize:9, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center'}}>{badge}</div>}
  </div>
  <div style={{flex:1, minWidth:0}}>
    <div style={{fontSize:14, fontWeight:600, color:'#1A1A2E'}}>{name}</div>
    <div style={{fontSize:12, color:'#94A3B8', whiteSpace:'nowrap', overflow:'hidden',
      textOverflow:'ellipsis'}}>{lastMessage}</div>
  </div>
</div>
```

### Illustration-Based Feature/Onboarding Cards
**Seen in**: Productivity dashboard — line-art/vector style illustrations inside feature intro cards (like "Stay organized", "Sync your notes", "Collaborate and share"). When using illustrations instead of photos, use a consistent illustration style with the dashboard's accent color.
```javascript
// Feature card with illustration area
<div style={{background:'#fff', borderRadius:16, padding:0, overflow:'hidden',
  border:'1px solid rgba(0,0,0,0.06)', textAlign:'center'}}>
  {/* Illustration area — use a soft gradient bg as canvas */}
  <div style={{height:120, background:'linear-gradient(180deg, #EEF2FF 0%, #E0E7FF 100%)',
    display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
    {/* SVG illustration or icon composition here */}
    <div style={{fontSize:48}}>📋</div>
  </div>
  <div style={{padding:'16px 20px'}}>
    <div style={{fontSize:14, fontWeight:700, marginBottom:4}}>Stay organized</div>
    <div style={{fontSize:12, color:'#94A3B8'}}>A clear structure for your notes</div>
  </div>
</div>
```

---

## 15. Key Patterns Summary (Priority Order for Implementation)

When building any dashboard, include these in priority order:

1. **Greeting header** with user name + date/subtitle (most common pattern across all references)
2. **4 KPI cards** across the top row with icon + value + trend badge
3. **One main chart** (bar, area, or candlestick for trading) taking 50-60% of the middle row
4. **One secondary widget** (calendar, donut, gauge, or AI assistant) beside the chart
5. **One list** (tasks, transactions with status pills, or team contacts with avatars) below the charts
6. **One CTA/upgrade card** or meeting/status card (use background photo with overlay)
7. **Navigation** (sidebar or top pills depending on layout choice)
8. **Domain-specific components** where relevant: credit card (fintech), video player (education), equipment photo (logistics), wallet grid (multi-currency)
9. **Colored bento backgrounds** on 30-40% of cards for visual variety

### The "Bento Grid" Dashboard Layout
Most premium dashboards use an ASYMMETRIC bento grid, NOT equal columns:
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 16px;
}
/* KPI cards: 4 across (each 1fr in a 4-col sub-grid or flex row) */
/* Main chart: spans 2 columns */
/* Calendar/donut: spans 1 column */
/* Task list: spans 1-2 columns */
/* CTA card: spans 1 column */
```

The critical difference between amateur and premium: **not all cards are the same size**. The chart card is 2x wider. The KPI cards are shorter. The CTA card has a dark/gradient background that breaks the pattern.

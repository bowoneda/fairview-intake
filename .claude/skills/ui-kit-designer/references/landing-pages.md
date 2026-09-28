# Landing Page Design Patterns

Extracted from 10 premium landing page references across fashion, beauty, wellness, music, education, and e-commerce. These patterns are DIFFERENT from dashboard UI patterns — landing pages prioritize visual impact, storytelling, and conversion over data density.

**When to use**: When the user asks to build a landing page, marketing page, product page, hero section, or any single-purpose conversion-oriented page.

---

## 1. Hero Typography — The #1 Differentiator

Landing page headlines are dramatically larger and more expressive than dashboard text.

### Size & Weight
- Hero headline: **48-72px minimum**, often 80-96px on desktop
- Weight: 800-900 (extra bold / black)
- Letter-spacing: -0.03em to -0.04em (tighter than dashboard headlines)
- Line height: 1.0 to 1.15 (much tighter than body text)

### Mixed Typography (the premium technique)
Top landing pages mix font styles WITHIN the same headline:
- Bold sans-serif + italic serif: "Fresh & *Stylish*"
- Regular weight + bold weight: "Become Fluent In Any Language With **Anna Wynerson**"
- Dark text + accent-colored text: "Mindfulness | **More Calm** Meaningful"
- All-caps overline above a large mixed-case headline

### Implementation
```javascript
// Mixed typography headline
<h1 style={{fontSize:64, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.05}}>
  Fresh &{' '}
  <span style={{fontFamily:'Georgia, serif', fontStyle:'italic', fontWeight:400}}>
    Stylish
  </span>
</h1>

// Accent-colored name within headline
<h1 style={{fontSize:48, fontWeight:800, lineHeight:1.1}}>
  Become Fluent In Any Language With{' '}
  <span style={{color: accentColor}}>Anna Wynerson</span>
</h1>
```

### Font Choices for Landing Pages
Landing pages allow more expressive fonts than dashboards:
- **Serif display**: Playfair Display, Fraunces, Libre Baskerville, DM Serif Display
- **Bold sans**: Plus Jakarta Sans (800-900), Outfit, Sora, Manrope
- **Best combo**: Bold sans-serif headline + italic serif accent word + clean sans body

---

## 2. Colored & Gradient Backgrounds

Almost NONE of the premium landing pages use plain white backgrounds.

### Background Patterns Observed
| Reference | Background | Effect |
|-----------|-----------|--------|
| GreenVision | Light sage green #D4E8D0 | Soft, organic feel |
| Olley | Peach-to-amber gradient | Warm, inviting |
| Skincare | Bold saturated yellow #F5D95A | Energetic, bold |
| Anghami | Teal-to-blue-to-pink gradient | Immersive, atmospheric |
| Me.Beauty | Sage/olive muted green | Elegant, natural |
| Cmouse | Sage green + dark green sections | Layered, organic |
| Sarina | Light gray-green | Calming, wellness |

### Implementation Rules
- Page background: **saturated or tinted**, never plain #FFFFFF
- Content cards: white or glassmorphic, floating ON the colored background
- Use HSL for easy tinting: `hsl(120, 30%, 90%)` for soft sage, `hsl(35, 90%, 85%)` for warm peach
- Gradients should be subtle (15-25° hue shift) or dramatic (full spectrum for music/entertainment)

### Decorative Background Elements
Large watermark text behind content at 3-6% opacity:
```javascript
<div style={{
  position:'absolute', top:'50%', left:'50%',
  transform:'translate(-50%,-50%)',
  fontSize:200, fontWeight:900, color:'rgba(0,0,0,0.03)',
  whiteSpace:'nowrap', pointerEvents:'none',
  letterSpacing:'-0.02em'
}}>YOUR MUSIC YOUR WAY</div>
```

Colored circles behind hero photos:
```javascript
<div style={{
  position:'absolute', top:'50%', left:'50%',
  transform:'translate(-50%,-50%)',
  width:400, height:400, borderRadius:'50%',
  background:'#60A5FA', // Accent circle
  zIndex:0
}}/>
// Photo sits on top with zIndex:1
```

---

## 3. Image + Shape Composition System

Landing pages use a LAYERED composition where stock images, decorative shapes, and floating elements work TOGETHER to create depth. Never use shapes as substitutes for images — shapes FRAME and COMPLEMENT the images.

### The Three-Layer System

```
Layer 3 (top):    Floating elements — glass cards, badges, icon buttons, text overlays
Layer 2 (middle): Stock images — hero photos, portraits, product shots
Layer 1 (bottom): Decorative shapes — colored circles, gradient blobs, outlined rings
```

All three layers stack via `position: relative/absolute` and `zIndex` to create visual depth.

### Composition Pattern A: Circle Behind Photo (most common — 4/10 references)
A large colored circle sits BEHIND a hero photo, creating a spotlight/framing effect.

**Seen in**: Stripo (subtle gray circle behind model), Skincare (bright blue circle on yellow bg), Olley (amber gradient circle behind portrait), Sarina (green tint behind meditator)

```javascript
// The composition container
<div style={{position:'relative', width:550, height:600}}>
  {/* Layer 1: Decorative circle BEHIND the image */}
  <div style={{
    position:'absolute', top:'50%', left:'50%',
    transform:'translate(-50%, -50%)',
    width:420, height:420, borderRadius:'50%',
    background:'radial-gradient(circle, #60A5FA, #3B82F6)',  // Match theme accent
    zIndex:0
  }}/>
  
  {/* Layer 1b: Optional thin ring outline extending beyond */}
  <div style={{
    position:'absolute', top:'50%', left:'50%',
    transform:'translate(-50%, -50%)',
    width:500, height:500, borderRadius:'50%',
    border:'1px solid rgba(255,100,130,0.3)',
    zIndex:0
  }}/>
  
  {/* Layer 2: Stock photo ON TOP of the circle */}
  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=600&fit=crop"
    alt="Hero portrait"
    style={{
      position:'absolute', top:20, left:'50%', transform:'translateX(-50%)',
      width:320, height:400, borderRadius:24,
      objectFit:'cover', zIndex:1
    }} />
  
  {/* Layer 3: Floating glass card over the photo */}
  <div style={{
    position:'absolute', bottom:120, left:'50%', transform:'translateX(-50%)',
    background:'rgba(255,255,255,0.2)', backdropFilter:'blur(16px)',
    WebkitBackdropFilter:'blur(16px)', border:'1px solid rgba(255,255,255,0.3)',
    borderRadius:16, padding:'10px 20px', zIndex:2,
    display:'flex', alignItems:'center', gap:10
  }}>
    <div style={{width:8,height:8,borderRadius:'50%',background:'#10B981'}}/>
    <span style={{fontWeight:600, fontSize:14}}>Anna Wynerson</span>
  </div>
  
  {/* Layer 3: Floating action buttons around the circle */}
  <div style={{
    position:'absolute', bottom:80, left:'60%',
    display:'flex', gap:10, zIndex:2
  }}>
    {['➕','📹','✉️'].map((icon,i) => (
      <div key={i} style={{
        width:44, height:44, borderRadius:'50%',
        background:'rgba(255,255,255,0.9)', boxShadow:'0 4px 12px rgba(0,0,0,0.1)',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:18
      }}>{icon}</div>
    ))}
  </div>
</div>
```

### Composition Pattern B: Photo Grid with Colored Backgrounds (TrendZone style)
Multiple photos in varied-size containers, each with a different colored background behind the photo.

```javascript
// Photo in colored container
<div style={{
  width:200, height:280, borderRadius:20, overflow:'hidden',
  background:'#F97316',  // Orange background shows in gaps/padding
  position:'relative'
}}>
  <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=560&fit=crop"
    alt="Fashion model"
    style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:16}} />
</div>

// Grid with varied sizes and different bg colors per card
<div style={{display:'flex', gap:12, alignItems:'center'}}>
  <div style={{width:200, height:320, borderRadius:20, background:'#F97316', overflow:'hidden'}}>
    <img ... style={{width:'100%', height:'100%', objectFit:'cover'}}/>
  </div>
  <div style={{display:'flex', flexDirection:'column', gap:12}}>
    <div style={{width:180, height:200, borderRadius:20, background:'#22C55E', overflow:'hidden'}}>
      <img ... />
    </div>
    <div style={{width:180, height:140, borderRadius:20, background:'#EC4899', overflow:'hidden'}}>
      <img ... />
    </div>
  </div>
  <div style={{width:220, height:300, borderRadius:20, background:'#EAB308', overflow:'hidden'}}>
    <img ... />
  </div>
</div>
```

### Composition Pattern C: Photo with Gradient Overlay + Floating Stats
Photo as a large background with gradient overlay from bottom, stats and text floating on top.

```javascript
<div style={{position:'relative', width:'100%', height:500, borderRadius:28, overflow:'hidden'}}>
  {/* Layer 1+2: Photo with gradient overlay */}
  <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&h=600&fit=crop"
    alt="Fitness activity"
    style={{width:'100%', height:'100%', objectFit:'cover'}} />
  <div style={{position:'absolute', inset:0,
    background:'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)'}} />
  
  {/* Layer 3: Floating content on the photo */}
  <div style={{position:'absolute', bottom:32, left:32, color:'#fff', zIndex:2}}>
    <div style={{fontSize:48, fontWeight:900}}>2.8</div>
    <div style={{fontSize:14, opacity:0.8}}>Kilometers</div>
  </div>
  
  {/* Layer 3: Glass stat card floating top-right */}
  <div style={{
    position:'absolute', top:24, right:24,
    background:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)',
    borderRadius:16, padding:'12px 20px', color:'#fff', zIndex:2
  }}>
    <div style={{fontSize:24, fontWeight:800}}>25°C</div>
    <div style={{fontSize:11, opacity:0.7}}>Monday · Mostly Sunny</div>
  </div>
</div>
```

### Composition Pattern D: Split Layout — Photo Right, Shapes as Section Dividers
Photo contained in a rounded card on one side, with decorative colored sections creating visual zones.

**Seen in**: Cmouse (sage green sections frame white content + photo card), Me.Beauty (green panels beside photo)

```javascript
<div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, minHeight:600}}>
  {/* Left: Text content on white/light bg */}
  <div style={{padding:48, display:'flex', flexDirection:'column', justifyContent:'center'}}>
    <h1 style={{fontSize:48, fontWeight:800, lineHeight:1.1}}>
      Beauty comes first, style follows every step.
    </h1>
    <p style={{fontSize:15, color:'#666', marginTop:16}}>Description text...</p>
  </div>
  
  {/* Right: Photo in rounded container with colored panel behind */}
  <div style={{position:'relative', padding:24}}>
    {/* Colored shape as background zone */}
    <div style={{
      position:'absolute', top:0, right:0, bottom:0, width:'80%',
      background:'#4A6741', borderRadius:'28px 0 0 28px'
    }}/>
    {/* Photo floating on the colored zone */}
    <div style={{position:'relative', zIndex:1, borderRadius:20, overflow:'hidden', height:420}}>
      <img src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500&h=600&fit=crop"
        alt="Portrait" style={{width:'100%', height:'100%', objectFit:'cover'}} />
      {/* Floating recommendation card */}
      <div style={{
        position:'absolute', bottom:16, left:16, right:16,
        background:'rgba(255,255,255,0.95)', borderRadius:14, padding:14
      }}>
        <div style={{fontSize:12, fontWeight:600}}>Recommended</div>
        <div style={{fontSize:14, fontWeight:700, marginTop:4}}>Deep Conditioning Treatments</div>
      </div>
    </div>
  </div>
</div>
```

### Composition Pattern E: Watermark Text Behind Photo
Large faded text (3-6% opacity) as a decorative background layer, with photo composed on top.

**Seen in**: Anghami ("YOUR MUSIC YOUR WAY"), Habits app ("Habits and")

```javascript
<div style={{position:'relative', overflow:'hidden', padding:'80px 48px'}}>
  {/* Layer 1: Giant watermark text */}
  <div style={{
    position:'absolute', top:'50%', left:'50%',
    transform:'translate(-50%,-50%)',
    fontSize:180, fontWeight:900, color:'rgba(0,0,0,0.03)',
    whiteSpace:'nowrap', pointerEvents:'none', letterSpacing:'-0.02em'
  }}>YOUR BRAND HERE</div>
  
  {/* Layer 2: Main photo */}
  <div style={{position:'relative', zIndex:1}}>
    <img src="..." style={{borderRadius:24, width:500}} />
  </div>
  
  {/* Layer 3: Glass card with content */}
  <div style={{position:'relative', zIndex:2, ...glassStyles}}>
    Content overlaying the photo...
  </div>
</div>
```

### Composition Pattern F: Portrait with Arc/Ring Behind Head
A thin circular arc or ring sits behind a person's head, creating a halo/spotlight effect. Different from Pattern A (solid filled circle) — this uses a thin stroke ring.

**Seen in**: Metly (man in profile with thin arc + rotating badge behind head)

```javascript
<div style={{position:'relative', width:500, height:600}}>
  {/* Layer 1: Thin arc behind head */}
  <svg style={{position:'absolute', top:0, right:0, width:400, height:400, zIndex:0}}
    viewBox="0 0 400 400" fill="none">
    <circle cx="200" cy="200" r="180" stroke="rgba(0,0,0,0.08)" strokeWidth="1" fill="none"/>
    {/* Small dot on the arc */}
    <circle cx="380" cy="200" r="4" fill="rgba(0,0,0,0.3)"/>
  </svg>
  
  {/* Layer 2: Portrait photo */}
  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop"
    alt="Professional" style={{position:'relative', zIndex:1, width:'100%', height:'100%',
    objectFit:'cover', borderRadius:20}} />
  
  {/* Layer 3: Rotating badge */}
  <div style={{position:'absolute', right:40, top:'45%', width:80, height:80, borderRadius:'50%',
    background:'#1A1A1A', display:'flex', alignItems:'center', justifyContent:'center',
    fontSize:8, fontWeight:600, color:'#fff', letterSpacing:'0.1em', textTransform:'uppercase',
    zIndex:2}}>
    START APPLYING
  </div>
</div>
```

### Composition Pattern G: Product Photos with Natural Props
Products (skincare, food, tech) composed with natural elements (stones, dried flowers, leaves) as styling props. The product IS the hero, and nature elements add texture.

**Seen in**: Luna skincare (moisturizer bottle on stone with dried thistles), Boostio

```javascript
// Product hero with nature composition
<div style={{position:'relative', width:'100%', height:500, borderRadius:24, overflow:'hidden',
  background:'linear-gradient(135deg, #F5EBD8 0%, #E8D5B7 100%)'}}>
  {/* Main product image */}
  <img src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&h=600&fit=crop"
    alt="Moisturizer"
    style={{position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
    width:300, height:400, objectFit:'contain', zIndex:2}} />
  {/* Decorative nature elements would be part of the product photo itself */}
  {/* Floating product info card */}
  <div style={{position:'absolute', bottom:24, left:24, zIndex:3,
    background:'rgba(255,255,255,0.9)', backdropFilter:'blur(12px)',
    borderRadius:16, padding:'16px 24px'}}>
    <div style={{fontSize:16, fontWeight:700}}>Moisturizer</div>
    <div style={{display:'flex', alignItems:'center', gap:8, marginTop:4}}>
      <span style={{fontSize:18, fontWeight:800}}>$21</span>
      <span style={{fontSize:12, color:'#888'}}>• in stock</span>
    </div>
  </div>
</div>
```

### Composition Pattern H: Mobile App Screenshots as Landing Page Visuals
Showing the actual mobile app screens embedded within the landing page hero, often tilted or overlapping.

**Seen in**: Luna landing page (phone mockup showing app screens alongside product photos and stats)

```javascript
// Phone mockup in hero section
<div style={{position:'relative', width:280, height:560}}>
  {/* Phone frame */}
  <div style={{
    width:'100%', height:'100%', borderRadius:40, overflow:'hidden',
    border:'8px solid #1A1A1A', background:'#fff',
    boxShadow:'0 20px 60px rgba(0,0,0,0.15)'
  }}>
    {/* App screenshot inside - use a real screenshot URL or build the mini-app inline */}
    <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=360&h=720&fit=crop"
      alt="App screenshot"
      style={{width:'100%', height:'100%', objectFit:'cover'}} />
  </div>
  {/* Notch */}
  <div style={{position:'absolute', top:8, left:'50%', transform:'translateX(-50%)',
    width:100, height:28, borderRadius:14, background:'#1A1A1A'}} />
</div>
```

### Stock Image Rules

1. **Use Unsplash URLs** with keyword tags matching the page context:
   ```
   https://images.unsplash.com/photo-[ID]?w=[width]&h=[height]&fit=crop
   ```

2. **Image keywords MUST match the page domain**:
   - Fitness → `fitness,workout,gym,yoga`
   - Fintech → `business,finance,office,meeting`
   - Education → `student,learning,classroom,books`
   - Beauty/skincare → `skincare,beauty,spa,cosmetics`
   - Fashion → `fashion,style,clothing,model`
   - Food → `food,cooking,restaurant,chef`
   - Tech/SaaS → `technology,laptop,workspace`

3. **Reliable avatar photo IDs** (diverse, face-cropped):
   ```javascript
   const avatars = [
     'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
     'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
     'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
     'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
     'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
   ];
   ```

4. **Image sizing**: Hero `w=800&h=600`, card thumbnails `w=400&h=300`, avatars `w=200&h=200&crop=face`, backgrounds `w=1200&h=800`, product `w=400&h=400`.

5. **Always add `&fit=crop`** for consistent sizing. Add `&crop=face` for portraits.

### Shape + Image Combination Rules

- Every hero section needs AT LEAST one decorative shape behind or around the main image
- Colored circles should use the theme accent color or a contrasting vivid color
- Circles should be 1.2-1.5x the width of the photo they frame
- Glass cards floating over images need `backdropFilter:'blur(16px)'` and semi-transparent background
- Photo containers should have `borderRadius:16-28px` and `overflow:'hidden'`
- Colored section blocks (Pattern D) should use the darkest theme color
- Watermark text should never exceed 5% opacity — it's felt, not read

### MANDATORY Image Placements for Landing Pages

A landing page WITHOUT stock images looks like a wireframe. These placements are NOT optional:

**1. Hero Section (REQUIRED)**
The hero MUST have a stock image — either a portrait/product shot with a colored circle behind it (Pattern A), or a large background photo with gradient overlay (Pattern C). The hero image makes or breaks the page. Match it to the domain: dental = smiling patient or modern clinic, fitness = active person, food = plated dish, fashion = model in featured garment, etc.

**2. Product/Item Cards (REQUIRED for e-commerce/fashion/portfolio)**
Every product card that would show a product in a real site MUST use a stock image — NOT a gradient placeholder. The image IS the product. Use domain-matched keywords:
```javascript
// Fashion product card with real image
<div style={{position:'relative', overflow:'hidden', marginBottom:20}}>
  <img src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=530&fit=crop"
    alt="Asa Wrap Dress"
    style={{width:'100%', aspectRatio:'3/4', objectFit:'cover'}} />
  {/* Tag badge */}
  <div style={{position:'absolute', top:16, left:16, fontSize:9, fontWeight:600,
    letterSpacing:'0.12em', textTransform:'uppercase', color:'#fff',
    background:accentColor, padding:'5px 12px'}}>Bestseller</div>
  {/* Hover overlay with Quick Add */}
  <div style={{position:'absolute', bottom:0, left:0, right:0, padding:20,
    background:'linear-gradient(transparent, rgba(0,0,0,0.6))',
    transform: hovered ? 'translateY(0)' : 'translateY(100%)',
    transition:'transform 0.5s cubic-bezier(0.22,1,0.36,1)'}}>
    <button style={{...glassButton}}>Quick Add</button>
  </div>
</div>
<div style={{fontSize:14, fontWeight:400}}>Asa Wrap Dress</div>
<div style={{fontSize:13, fontWeight:300, color:mutedColor}}>₦185,000</div>
```

**3. Category/Collection Cards (REQUIRED)**
Category browsing cards (Dresses, Outerwear, Accessories) MUST use images that represent the category — NOT dark gradient boxes. The image makes the category feel real:
```javascript
<div style={{position:'relative', overflow:'hidden', borderRadius:0}}>
  <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=750&fit=crop"
    alt="Dresses collection"
    style={{width:'100%', aspectRatio: isFirst ? '4/5' : '1/1', objectFit:'cover',
      transition:'transform 0.8s', transform: hov ? 'scale(1.03)' : 'scale(1)'}} />
  {/* Gradient overlay at bottom for text readability */}
  <div style={{position:'absolute', inset:0,
    background:'linear-gradient(transparent 50%, rgba(0,0,0,0.5))'}} />
  {/* Category name and count */}
  <div style={{position:'absolute', bottom:36, left:36}}>
    <div style={{fontSize:32, fontWeight:400, color:'#fff'}}>Dresses</div>
    <div style={{fontSize:11, color:'rgba(255,255,255,0.5)'}}>24 pieces</div>
  </div>
</div>
```

**4. Editorial/Story Split Sections (REQUIRED)**
Split-layout sections (text on one side, visual on the other) MUST have a real photo on the visual side — this is where artisan/lifestyle/behind-the-scenes images go. The shapes (geometric lines, blurred accent blobs) work as decorative layers ON the photo, not as replacements:
```javascript
<div style={{position:'relative', height:'100%', overflow:'hidden'}}>
  <img src="https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=800&h=1000&fit=crop"
    alt="Artisan weaving"
    style={{width:'100%', height:'100%', objectFit:'cover'}} />
  {/* Decorative geometric accent ON the photo */}
  <div style={{position:'absolute', top:'35%', right:'8%', width:1, height:120,
    background:'rgba(139,34,82,0.3)'}} />
  {/* Corner label ON the photo */}
  <div style={{position:'absolute', top:48, left:48}}>
    <div style={{fontSize:9, letterSpacing:'0.2em', textTransform:'uppercase',
      color:'rgba(255,255,255,0.5)'}}>Editorial</div>
  </div>
</div>
```

**5. Testimonial Section (REQUIRED)**
Every testimonial card MUST include a real avatar photo (48-56px, circular, face-cropped). Testimonials without faces feel fake. Use the avatar array from the Stock Image Rules section.

**6. Social/Instagram Grid (REQUIRED for lifestyle brands)**
If the page has an Instagram-style grid, EVERY cell MUST be a real photo — 6 dark gradient squares is the most obvious sign of a placeholder page. Use varied lifestyle images matching the brand domain.

**7. CTA Section (RECOMMENDED)**
The final CTA block benefits from a background image with gradient overlay or a small product/team photo.

### NEVER create a gradient-only image component
Do NOT create helper components like `FashionImg`, `ImagePlaceholder`, or `PhotoBlock` that render gradient rectangles instead of real `<img>` tags. If the design calls for an image area, it MUST contain a real `<img>` with a relevant Unsplash URL. Decorative gradients and shapes are COMPANIONS to images, never substitutes.

---

## 4. Mobile App Screen Patterns (when building app showcases)

When the skill is used to build mobile app mockups or multi-screen showcases:

### Full-Bleed Product Photo on Detail Page
The product image fills the top 50-60% of the screen with the detail card overlapping from below.
**Seen in**: RentaX (car rental), Blazer Lungo (fashion), Luna (skincare)

### Glass Card Over Full-Bleed Photo
Product/person photo fills the screen, with a frosted glass card at the bottom showing name, price, sizes.
**Seen in**: Blazer Lungo product detail — model wearing garment as full-screen background, glass card at bottom with product info.

### Photo Grid with Domain-Matched Images
Product listing screens MUST show real product images in every card — not colored boxes.
**Seen in**: Luna skincare (product bottles in grid), Kiran glasses (eyeglasses on white bg), Blazer fashion (jackets flat-lay)

### Onboarding Screen with Portrait
First/welcome screens use a large portrait photo (often face close-up) filling 60-70% of screen with text overlaid.
**Seen in**: Luna skincare (smiling African woman with flowers), health insurance app (woman portrait with glass card)

### Key Rule
For mobile app mockups: every screen that would show a product, person, or scene in a real app MUST use a stock image. The image IS the content.

### Model Wearing Product as Full-Bleed Hero (Fashion/Wearable Apps)
**Seen in**: Sunglasses app — model wearing the product IS the hero image. Not a flat-lay product shot, but the product in use on a person. The detail screen uses the model as full-bleed background with a glass card overlay for specs/pricing.
```javascript
// Product detail: model as full-bleed bg + glass info card
<div style={{position:'relative', width:360, height:720, borderRadius:40, overflow:'hidden'}}>
  <img src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=800&fit=crop"
    alt="Model wearing product"
    style={{width:'100%', height:'100%', objectFit:'cover'}} />
  {/* Glass product info card at bottom */}
  <div style={{position:'absolute', bottom:0, left:0, right:0, padding:24,
    background:'rgba(255,255,255,0.15)', backdropFilter:'blur(20px)',
    borderRadius:'24px 24px 0 0'}}>
    <div style={{fontSize:20, fontWeight:700}}>Gold King</div>
    <div style={{display:'flex', gap:8, alignItems:'baseline'}}>
      <span style={{fontSize:24, fontWeight:800, color:accentColor}}>$109.99</span>
      <span style={{fontSize:14, textDecoration:'line-through', opacity:0.5}}>$180.00</span>
    </div>
  </div>
</div>
```

### Product Grid with Colored Background Cells
**Seen in**: Sunglasses app product listing — each product card has a different vivid background color (yellow, red, blue, green) with the model/product photo on it. This is NOT plain white cards.
```javascript
const productColors = ['#FDE68A','#FCA5A5','#93C5FD','#86EFAC'];
// Each grid cell: colored bg + product/model photo + name + price
```

### 3D Illustrations as Card Visuals
**Seen in**: Education app (Creative Sketching card with 3D art supplies), education syllabus (3D geometric shapes). When the domain involves creative/abstract concepts that don't photograph well, use 3D-style illustrations from Unsplash:
```
// Search terms for 3D illustration style images:
// "3d render abstract" "3d geometric shapes" "3d illustration education"
// These work for: education, creative tools, abstract concepts, gaming
```

### Onboarding with Portrait + Decorative Shapes
**Seen in**: Education app — student portrait (60% of screen) with pastel decorative circles/rings behind, text below. The portrait drives the emotional connection, shapes add playfulness.
```javascript
<div style={{position:'relative', overflow:'hidden'}}>
  {/* Decorative pastel rings behind portrait */}
  <div style={{position:'absolute', top:-30, left:-30, width:300, height:300,
    borderRadius:'50%', border:'40px solid rgba(255,182,193,0.2)'}} />
  <div style={{position:'absolute', top:20, right:-20, width:200, height:200,
    borderRadius:'50%', border:'30px solid rgba(144,238,144,0.15)'}} />
  {/* Portrait photo */}
  <img src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop"
    alt="Student" style={{position:'relative', zIndex:1, width:'80%', margin:'0 auto',
    borderRadius:24, objectFit:'cover'}} />
</div>
```

### Hero Layout Patterns (ranked by frequency)

**Pattern A: Left Text + Right Image (most common, 6/10 references)**
```
[Logo  Nav Links   CTA]

[Large             [Hero Image]
 Headline]         [with colored
                    circle behind]
[Subtitle]
[CTA Buttons]      [Floating card]

[Stats / Category Cards Row]
```
Split: 45-55% text / 45-55% image. Image often bleeds outside its container.

**Pattern B: Centered Text + Background Image**
```
[Logo  Nav Links   CTA]

      [Large Headline]
      [Subtitle text]
    [CTA Button] [CTA Button]

[Background: photo or gradient fills entire section]
```

**Pattern C: Bento Grid Hero (GreenVision style)**
```
[Logo  Nav Links   CTA]

     [Giant Centered Headline]
        [Subtitle + CTAs]

[Card][Stat][Photo][Stat][Photo]
[with  350%  card   95%   card ]
[text]                         ]
```
Asymmetric bento with mixed card sizes, some containing photos, some stats, some text.

---

## 4. Navigation Patterns

### Pill-Shaped Nav (seen in 7/10 references)
```javascript
// Pill navigation bar
<nav style={{
  display:'flex', alignItems:'center', gap:4,
  background:'rgba(255,255,255,0.8)',
  backdropFilter:'blur(10px)',
  padding:4, borderRadius:99,
  border:'1px solid rgba(0,0,0,0.06)'
}}>
  {['Home','About','Products','Blog'].map((item,i) => (
    <button key={i} style={{
      padding:'10px 22px', borderRadius:99,
      background: i===0 ? '#1A1A1A' : 'transparent',
      color: i===0 ? '#FFFFFF' : '#666',
      fontSize:14, fontWeight: i===0 ? 600 : 400,
      transition:'all 0.2s'
    }}>{item}</button>
  ))}
</nav>
```

### CTA Button Styles
- **Primary**: Solid accent color, rounded-full (99px radius), 600-700 weight
- **Secondary**: White/transparent with border, rounded-full
- **With arrow**: Text + arrow icon (→ or ↗) in a separate circle button beside main CTA
```javascript
// Split CTA: pill button + circle arrow
<div style={{display:'flex', gap:8, alignItems:'center'}}>
  <button style={{padding:'14px 28px', borderRadius:99,
    background:'#1A1A1A', color:'#fff', fontSize:15, fontWeight:600}}>
    Explore Our Store
  </button>
  <button style={{width:48, height:48, borderRadius:'50%',
    background:'#1A1A1A', color:'#fff', display:'flex',
    alignItems:'center', justifyContent:'center'}}>
    ↗
  </button>
</div>
```

---

## 5. Social Proof & Stats Integration

Stats are embedded WITHIN the hero section, not in a separate section below.

### Inline Stats Pattern
```javascript
// Floating stat on the side of hero
<div style={{textAlign:'right'}}>
  <div style={{fontSize:36, fontWeight:900}}>1.5m</div>
  <div style={{fontSize:12, color:'#888'}}>Monthly traffic</div>
</div>

// Stats row with large numbers
<div style={{display:'flex', gap:48}}>
  {[{n:'350%', l:'Annual growth rate'}, {n:'95%', l:'ROAS increase'}, {n:'10K+', l:'Happy clients'}]
    .map((s,i) => (
      <div key={i}>
        <div style={{fontSize:40, fontWeight:900}}>{s.n}</div>
        <div style={{fontSize:13, color:'#888', maxWidth:140}}>{s.l}</div>
      </div>
  ))}
</div>
```

### Emoji Reactions Row (modern social proof)
```javascript
<div style={{display:'flex', alignItems:'center', gap:8}}>
  <span style={{fontSize:20}}>🔥👍😍💙😊</span>
  <span style={{fontSize:13, fontWeight:600}}>Loved From 500k Users</span>
</div>
```

### Avatar Stack
```javascript
<div style={{display:'flex', alignItems:'center'}}>
  {['#E8B4B8','#B4D4E8','#D4E8B4'].map((c,i) => (
    <div key={i} style={{
      width:36, height:36, borderRadius:'50%', background:c,
      border:'2px solid #fff', marginLeft: i ? -10 : 0, zIndex:3-i
    }}/>
  ))}
  <div style={{width:36, height:36, borderRadius:'50%', background:'#1A1A1A',
    color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center',
    justifyContent:'center', marginLeft:-10}}>+</div>
</div>
```

---

## 6. Glassmorphic Floating Elements

Landing pages use glassmorphism more aggressively than dashboards — for cards, stats, player bars, and profile cards floating over images or gradients.

### Glass Card Over Image/Gradient
```javascript
const GlassCard = ({children}) => (
  <div style={{
    background:'rgba(255,255,255,0.15)',
    backdropFilter:'blur(16px)',
    WebkitBackdropFilter:'blur(16px)',
    border:'1px solid rgba(255,255,255,0.2)',
    borderRadius:20, padding:20,
    boxShadow:'0 8px 32px rgba(0,0,0,0.08)'
  }}>{children}</div>
);
```

### Floating Player Bar (music/audio pages)
```javascript
// Bottom player bar spanning full width
<div style={{
  position:'absolute', bottom:0, left:0, right:0,
  background:'rgba(0,0,0,0.3)',
  backdropFilter:'blur(20px)',
  padding:'12px 24px', display:'flex', alignItems:'center', gap:16
}}>
  <div style={{width:48, height:48, borderRadius:8, background:'#333'}}/>
  <div>
    <div style={{fontSize:10, color:'rgba(255,255,255,0.5)'}}>PLAYING NOW</div>
    <div style={{fontSize:14, fontWeight:700, color:'#fff'}}>04. Believer</div>
  </div>
  <div style={{marginLeft:'auto', display:'flex', gap:16, alignItems:'center'}}>
    {/* Playback controls: prev, play, next */}
  </div>
</div>
```

---

## 7. Product/Category Cards

### Category Card with Thumbnail
```javascript
<div style={{
  display:'flex', alignItems:'center', gap:16,
  background:'#fff', borderRadius:20, padding:16,
  border:'1px solid rgba(0,0,0,0.06)',
  cursor:'pointer', transition:'all 0.2s'
}}>
  <div style={{width:64, height:64, borderRadius:14,
    background:'linear-gradient(135deg, #FEE2E2, #FECACA)',
    flexShrink:0}}/>
  <div style={{flex:1}}>
    <div style={{fontSize:18, fontWeight:800}}>Men's</div>
    <div style={{fontSize:13, fontWeight:400, color:'#666'}}>Collection</div>
    <div style={{fontSize:11, color:'#999', marginTop:4}}>The Essence of Modern Sophistication</div>
  </div>
  <div style={{width:36, height:36, borderRadius:'50%', background:'#1A1A1A',
    color:'#fff', display:'flex', alignItems:'center', justifyContent:'center'}}>↗</div>
</div>
```

### Product Card with Price
```javascript
<div style={{
  background:'#fff', borderRadius:20, padding:20,
  border:'1px solid rgba(0,0,0,0.06)', width:220
}}>
  <div style={{fontSize:12, fontWeight:700, color: accentColor, letterSpacing:1}}>SKIN</div>
  <div style={{fontSize:12, color:'#888', marginBottom:8}}>Super Skin Care</div>
  <div style={{width:'100%', height:120, borderRadius:12,
    background:'linear-gradient(135deg, #E0F2FE, #BAE6FD)', marginBottom:12}}/>
  <div style={{fontSize:28, fontWeight:900}}>25$</div>
  <button style={{marginTop:8, padding:'8px 20px', borderRadius:8,
    border:'1px solid #1A1A1A', fontSize:12, fontWeight:600}}>SHOP NOW</button>
</div>
```

---

## 8. Decorative Elements Checklist

Every premium landing page includes at least 3-4 of these:

- [ ] **Sparkle/star icons** — Small 4-pointed stars (✦ or SVG) scattered near headlines
- [ ] **Decorative dots** — Grid of dots (3x3 or 4x4) as corner accents
- [ ] **Curved lines** — Subtle SVG curves connecting sections or circling elements
- [ ] **Large background text** — Watermark text at 2-5% opacity behind hero
- [ ] **Colored circle behind photo** — Solid color circle (accent at 100%) behind portrait
- [ ] **Floating badges** — Small pill-shaped labels ("Mental health", "Mindfulness") floating near hero
- [ ] **Arrow decorations** — Angled arrows (↗) as both buttons and decorative marks
- [ ] **Slide pagination** — "01 / 03" or dot indicators suggesting carousel content
- [ ] **Vertical text** — "Scroll Down ↓" or "Scroll Explore" rotated on the right edge

### Sparkle Icon SVG
```javascript
const Sparkle = ({size=16, color='currentColor'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41L12 0Z"/>
  </svg>
);
```

### Dot Grid Decoration
```javascript
const DotGrid = ({rows=3, cols=3, size=4, gap=8, color='rgba(0,0,0,0.15)'}) => (
  <div style={{display:'grid', gridTemplateColumns:`repeat(${cols}, ${size}px)`, gap}}>
    {Array(rows*cols).fill(0).map((_,i) => (
      <div key={i} style={{width:size, height:size, borderRadius:'50%', background:color}}/>
    ))}
  </div>
);
```

---

## 9. Responsive Sections for Landing Pages

### Hero Section Height
- Desktop: 90-100vh (full viewport) or 600-800px fixed
- The hero should feel IMMERSIVE — not cramped

### Section Flow (typical order)
1. **Hero**: Headline + subtitle + CTA + hero visual + floating elements
2. **Social proof**: Stats row, client logos, or testimonial
3. **Features/Categories**: 3-4 cards in a grid or horizontal scroll
4. **Detail section**: Split layout (text + visual) explaining one key benefit
5. **Testimonials**: Quote with attribution and photo
6. **CTA section**: Final conversion block with headline + button

### Scroll Indicator
```javascript
<div style={{
  position:'absolute', bottom:24, left:'50%', transform:'translateX(-50%)',
  display:'flex', alignItems:'center', gap:8, color:'#888', fontSize:12
}}>
  <span>↓</span> Scroll Explore
</div>
```

---

## 10. Key Differences from Dashboard UI

| Aspect | Dashboard | Landing Page |
|--------|-----------|-------------|
| Typography size | 28-32px max headlines | 48-96px hero headlines |
| Font mixing | Single family, weight varies | Serif + sans-serif in same headline |
| Background | White/off-white or dark | Colored, gradient, or photographic |
| Photos | Avatars only (32-48px) | Full hero images (300-500px+) |
| Layout | 3-zone (sidebar+main+panel) | Full-width sections stacked vertically |
| Navigation | Sidebar with icons | Top bar with pill buttons |
| Data density | High (charts, tables, KPIs) | Low (1-3 stats, 1 key message) |
| Interactivity | Many stateful components | Hover effects, scroll indicators |
| Goal | Monitor & manage | Convert & persuade |
| Decorative elements | Minimal | Abundant (sparkles, shapes, dots) |

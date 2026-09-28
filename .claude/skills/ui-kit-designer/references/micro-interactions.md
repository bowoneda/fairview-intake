# Micro-Interaction & Animation System

Complete implementation patterns for: advanced scroll animations, custom cursor, magnetic buttons, and smooth page transitions. All code is React + vanilla JS — no external animation libraries (GSAP, Framer Motion, etc. are NOT available in standalone HTML).

---

## PART 1: CUSTOM CURSOR SYSTEM

### When to Use
Use on: agency portfolios, premium landing pages, creative platforms, award-targeting designs.
Skip on: data-heavy dashboards, B2B SaaS tools, accessibility-critical interfaces.

### Component A — Dual-Ring Cursor (most versatile)
Two circles: a small fast dot (follows cursor exactly) + a larger slow ring (follows with lerp delay).

```jsx
// Add to App root — renders above everything
function CustomCursor() {
  const [pos, setPos] = React.useState({ x: -100, y: -100 });
  const [ring, setRing] = React.useState({ x: -100, y: -100 });
  const [hovered, setHovered] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);
  const ringRef = React.useRef({ x: -100, y: -100 });
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    // Hide default cursor
    document.body.style.cursor = 'none';

    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      // Detect hover on interactive elements
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = el && (
        el.closest('button') || el.closest('a') || el.closest('[data-cursor="hover"]')
      );
      setHovered(!!interactive);
    };

    const onLeave = () => setHidden(true);
    const onEnter = () => setHidden(false);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    // Lerp loop for ring
    const lerp = (a, b, t) => a + (b - a) * t;
    const animate = () => {
      ringRef.current.x = lerp(ringRef.current.x, pos.x, 0.12);
      ringRef.current.y = lerp(ringRef.current.y, pos.y, 0.12);
      setRing({ x: ringRef.current.x, y: ringRef.current.y });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = '';
    };
  }, [pos.x, pos.y]);

  const opacity = hidden ? 0 : 1;

  return (
    <>
      {/* Dot — follows exactly */}
      <div style={{
        position: 'fixed', zIndex: 9999, pointerEvents: 'none',
        left: pos.x, top: pos.y, opacity,
        width: hovered ? 8 : 6, height: hovered ? 8 : 6,
        borderRadius: '50%',
        background: hovered ? C.accent : '#FFFFFF',
        transform: 'translate(-50%, -50%)',
        transition: 'width 200ms ease, height 200ms ease, background 200ms ease, opacity 300ms ease',
        mixBlendMode: 'difference',
      }} />
      {/* Ring — follows with lerp */}
      <div style={{
        position: 'fixed', zIndex: 9998, pointerEvents: 'none',
        left: ring.x, top: ring.y, opacity,
        width: hovered ? 48 : 32, height: hovered ? 48 : 32,
        borderRadius: '50%',
        border: `1.5px solid ${hovered ? C.accent : 'rgba(255,255,255,0.6)'}`,
        transform: 'translate(-50%, -50%)',
        transition: 'width 300ms ease, height 300ms ease, border-color 200ms ease, opacity 300ms ease',
        mixBlendMode: 'difference',
      }} />
    </>
  );
}
// Usage in App: <CustomCursor /> as first child of root div
```

### Component B — Glow Blob Cursor (for dark premium themes)
A soft radial glow that follows the cursor with heavy lerp — creates an atmospheric lighting effect.

```jsx
function GlowCursor() {
  const [pos, setPos] = React.useState({ x: -200, y: -200 });
  const [target, setTarget] = React.useState({ x: -200, y: -200 });
  const rafRef = React.useRef(null);
  const curRef = React.useRef({ x: -200, y: -200 });

  React.useEffect(() => {
    const onMove = (e) => setTarget({ x: e.clientX, y: e.clientY });
    document.addEventListener('mousemove', onMove);

    const lerp = (a, b, t) => a + (b - a) * t;
    const loop = () => {
      curRef.current.x = lerp(curRef.current.x, target.x, 0.08);
      curRef.current.y = lerp(curRef.current.y, target.y, 0.08);
      setPos({ x: curRef.current.x, y: curRef.current.y });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [target.x, target.y]);

  return (
    <div style={{
      position: 'fixed', zIndex: 0, pointerEvents: 'none',
      left: pos.x, top: pos.y,
      width: 480, height: 480,
      borderRadius: '50%',
      transform: 'translate(-50%, -50%)',
      background: `radial-gradient(circle, ${C.accent}18 0%, transparent 70%)`,
      // accent at ~10% opacity center, fading to transparent
    }} />
  );
}
// Place BEFORE page content in the layout — it's a background layer
// Works best on dark themes (#0A0A0F type backgrounds)
```

### Component C — Text Reveal Cursor (editorial / agency)
Cursor shows a rotating label that changes based on what's being hovered.

```jsx
function LabelCursor() {
  const [pos, setPos] = React.useState({ x: -200, y: -200 });
  const [label, setLabel] = React.useState('');

  React.useEffect(() => {
    document.body.style.cursor = 'none';
    const onMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setLabel(el?.closest('[data-cursor-label]')?.dataset?.cursorLabel || '');
    };
    document.addEventListener('mousemove', onMove);
    return () => { document.removeEventListener('mousemove', onMove); document.body.style.cursor=''; };
  }, []);

  return (
    <div style={{
      position: 'fixed', zIndex: 9999, pointerEvents: 'none',
      left: pos.x + 16, top: pos.y + 16,
      background: C.accent, color: C.bg,
      padding: '6px 12px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      opacity: label ? 1 : 0,
      transform: `scale(${label ? 1 : 0.8})`,
      transition: 'opacity 200ms ease, transform 200ms ease',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </div>
  );
}
// Usage: <div data-cursor-label="View Case Study"> on any element
```

---

## PART 2: MAGNETIC BUTTONS

### How Magnetic Buttons Work
On `mousemove` near the button, calculate the cursor's offset from center and apply a proportional `translate` to the button. On `mouseleave`, spring back to origin.

### Implementation A — Hook-Based (clean, reusable)
```jsx
function useMagnetic(strength = 0.4, radius = 100) {
  const ref = React.useRef(null);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const animRef = React.useRef(null);
  const currentOffset = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const lerp = (a, b, t) => a + (b - a) * t;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius) {
        const pull = (1 - dist / radius);  // stronger pull when closer
        setOffset({ x: dx * strength * pull, y: dy * strength * pull });
      }
    };

    const onLeave = () => {
      // Animate back to zero
      const spring = () => {
        currentOffset.current.x = lerp(currentOffset.current.x, 0, 0.15);
        currentOffset.current.y = lerp(currentOffset.current.y, 0, 0.15);
        setOffset({ ...currentOffset.current });
        if (Math.abs(currentOffset.current.x) > 0.1 || Math.abs(currentOffset.current.y) > 0.1) {
          animRef.current = requestAnimationFrame(spring);
        }
      };
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(spring);
    };

    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [strength, radius]);

  // Sync currentOffset ref with state
  React.useEffect(() => {
    currentOffset.current = offset;
  }, [offset]);

  return { ref, style: { transform: `translate(${offset.x}px, ${offset.y}px)`, transition: 'none' } };
}

// Usage:
function MagneticButton({ children, ...props }) {
  const magnetic = useMagnetic(0.4, 90);
  return (
    <button ref={magnetic.ref} style={{
      ...props.style,
      ...magnetic.style,
      // base button styles
      padding: '14px 32px', borderRadius: 99,
      background: C.accent, color: C.bg,
      fontSize: 14, fontWeight: 700,
      border: 'none', cursor: 'none',
      willChange: 'transform',
    }}>
      {children}
    </button>
  );
}
```

### Implementation B — Inline (for one-off CTAs)
```jsx
function CTAButton({ children }) {
  const btnRef = React.useRef(null);

  const handleMove = (e) => {
    const btn = btnRef.current;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
  };

  const handleLeave = () => {
    btnRef.current.style.transform = 'translate(0,0)';
    btnRef.current.style.transition = 'transform 500ms cubic-bezier(0.23,1,0.32,1)';
    setTimeout(() => { btnRef.current.style.transition = ''; }, 500);
  };

  return (
    <button ref={btnRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        padding: '16px 36px', borderRadius: 99,
        background: `linear-gradient(135deg, ${C.accent}, ${C.accentDark})`,
        color: C.bg, fontSize: 15, fontWeight: 700,
        border: 'none', cursor: 'none',
        boxShadow: `0 8px 32px ${C.accent}40`,
        willChange: 'transform',
      }}>
      {children}
    </button>
  );
}
```

---

## PART 3: ADVANCED SCROLL ANIMATION SYSTEM

### System 1 — IntersectionObserver Reveal (Enhanced)
Better than basic: supports stagger groups, direction variants, and one-time vs repeating.

```jsx
// useReveal hook — attach to any container, children animate in
function useReveal(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -60px 0px',  // trigger slightly before entering view
    stagger = 80,         // ms between children
    duration = 600,
    translateY = 32,
    translateX = 0,
    scale = 1,
    once = true,          // animate only on first enter
  } = options;

  const ref = React.useRef(null);

  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Apply initial hidden state to all children with data-reveal
    const items = container.querySelectorAll('[data-reveal]');
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = `translateY(${translateY}px) translateX(${translateX}px) scale(${scale})`;
      el.style.transition = 'none';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const children = entry.target.querySelectorAll('[data-reveal]');
          children.forEach((el, i) => {
            setTimeout(() => {
              el.style.transition = `opacity ${duration}ms cubic-bezier(0.16,1,0.3,1), transform ${duration}ms cubic-bezier(0.16,1,0.3,1)`;
              el.style.opacity = '1';
              el.style.transform = 'translateY(0) translateX(0) scale(1)';
            }, i * stagger);
          });
          if (once) observer.unobserve(entry.target);
        } else if (!once) {
          // Reset for repeat animation
          const children = entry.target.querySelectorAll('[data-reveal]');
          children.forEach((el) => {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.transform = `translateY(${translateY}px)`;
          });
        }
      });
    }, { threshold, rootMargin });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return ref;
}

// Usage:
function FeaturesSection() {
  const reveal = useReveal({ stagger: 100, translateY: 40 });
  return (
    <div ref={reveal}>
      <h2 data-reveal>Our Features</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 24 }}>
        {features.map(f => (
          <div key={f.id} data-reveal style={{ ...cardStyle }}>
            {f.content}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### System 2 — Parallax (scroll-linked position)
Elements move at different speeds relative to scroll. Background moves slowest, foreground fastest.

```jsx
function useParallax(speed = 0.3) {
  // speed: 0 = no movement, 1 = moves at scroll speed, negative = moves opposite
  const ref = React.useRef(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress: -1 (above viewport) to 1 (below viewport)
      const progress = (viewH - rect.top) / (viewH + rect.height);
      const offset = (progress - 0.5) * rect.height * speed * 2;
      el.style.transform = `translateY(${offset}px)`;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial call
    return () => window.removeEventListener('scroll', onScroll);
  }, [speed]);

  return ref;
}

// Usage in a hero section:
function Hero() {
  const bgParallax = useParallax(0.4);    // slow — background layer
  const imgParallax = useParallax(0.2);   // medium — image layer
  // text at speed 0 — stays fixed (or use 0.05 for subtle)

  return (
    <div style={{ position:'relative', height:'100vh', overflow:'hidden' }}>
      {/* Layer 1 — bg shape, moves slowest */}
      <div ref={bgParallax} style={{ position:'absolute', inset: '-20%', zIndex: 0,
        background: `radial-gradient(ellipse at 40% 60%, ${C.accent}20, transparent 60%)`,
        willChange: 'transform',
      }} />
      {/* Layer 2 — image, medium speed */}
      <div ref={imgParallax} style={{ position:'absolute', right:'5%', top:'10%',
        width:'45%', zIndex: 1, willChange: 'transform',
      }}>
        <img src={heroImg} style={{ width:'100%', borderRadius: 24 }} />
      </div>
      {/* Layer 3 — text, no parallax (or minimal) */}
      <div style={{ position:'relative', zIndex: 2, padding:'0 80px', paddingTop:'20vh' }}>
        <h1>Headline</h1>
      </div>
    </div>
  );
}
```

### System 3 — Scroll-Linked Value Interpolation
Element properties (opacity, scale, x/y, rotation) change proportionally to scroll position.

```jsx
function useScrollProgress(top, bottom) {
  // Returns 0-1 as element scrolls from `top`% to `bottom`% of viewport
  const [progress, setProgress] = React.useState(0);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * (1 - top / 100);
      const end = vh * (1 - bottom / 100);
      const raw = (start - rect.top) / (start - end);
      setProgress(Math.max(0, Math.min(1, raw)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [top, bottom]);

  return { ref, progress };
}

// lerp utility
const lerp = (a, b, t) => a + (b - a) * t;

// Usage — element fades and scales in as it enters viewport:
function AnimatedCard({ children }) {
  const { ref, progress } = useScrollProgress(100, 60);
  // progress 0 = element at bottom of screen, 1 = element 40% up
  return (
    <div ref={ref} style={{
      opacity: lerp(0, 1, progress),
      transform: `scale(${lerp(0.92, 1, progress)}) translateY(${lerp(32, 0, progress)}px)`,
      willChange: 'transform, opacity',
    }}>
      {children}
    </div>
  );
}
```

### System 4 — Counter Animation on Scroll
Numbers count up when they enter the viewport. Trigger once.

```jsx
function AnimatedCounter({ target, prefix = '', suffix = '', duration = 1400 }) {
  const [current, setCurrent] = React.useState(0);
  const ref = React.useRef(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const startTime = performance.now();
        // easeOutQuart
        const ease = (t) => 1 - Math.pow(1 - t, 4);

        const update = (now) => {
          const elapsed = now - startTime;
          const t = Math.min(elapsed / duration, 1);
          setCurrent(Math.round(ease(t) * target));
          if (t < 1) requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
        observer.disconnect();
      }
    }, { threshold: 0.5 });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}{current.toLocaleString()}{suffix}
    </span>
  );
}

// Usage in a stats section:
<AnimatedCounter target={12400} suffix="+" />  // counts: 0 -> 12,400+
<AnimatedCounter target={98} suffix="%" />      // counts: 0 -> 98%
<AnimatedCounter target={50} prefix="$" suffix="M+" />  // counts: $0 -> $50M+
```

### System 5 — Sticky Section with Scroll-Linked Content Swap
Section pins while user scrolls, and content changes based on scroll progress.

```jsx
function StickyFeatureSection({ steps }) {
  // steps: [{ title, desc, visual }, ...]
  const [activeStep, setActiveStep] = React.useState(0);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const onScroll = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const progress = Math.max(0, Math.min(1, -rect.top / (rect.height - window.innerHeight)));
      const step = Math.floor(progress * steps.length);
      setActiveStep(Math.min(step, steps.length - 1));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [steps.length]);

  return (
    // Container height = viewport * number of steps (creates scroll space)
    <div ref={containerRef} style={{ height: `${steps.length * 100}vh`, position:'relative' }}>
      {/* Sticky inner panel */}
      <div style={{ position:'sticky', top: 0, height:'100vh',
        display:'flex', alignItems:'center', padding:'0 80px', gap: 80,
      }}>
        {/* Left: text, changes based on activeStep */}
        <div style={{ flex: 1 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              position: 'absolute',
              opacity: activeStep === i ? 1 : 0,
              transform: `translateY(${activeStep === i ? 0 : activeStep > i ? -24 : 24}px)`,
              transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.16,1,0.3,1)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing:'0.1em',
                textTransform:'uppercase', color: C.accent, marginBottom: 16 }}>
                Step {String(i + 1).padStart(2, '0')}
              </div>
              <h2 style={{ fontSize: 40, fontWeight: 800 }}>{step.title}</h2>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: C.t2, maxWidth: 480 }}>{step.desc}</p>
            </div>
          ))}
        </div>
        {/* Right: visual, changes per step */}
        <div style={{ flex: 1, position:'relative', height: 480 }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              position:'absolute', inset: 0,
              opacity: activeStep === i ? 1 : 0,
              transform: `scale(${activeStep === i ? 1 : 0.95})`,
              transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.16,1,0.3,1)',
              borderRadius: 24, overflow:'hidden',
            }}>
              {step.visual}
            </div>
          ))}
        </div>
      </div>
      {/* Step progress dots */}
      <div style={{ position:'sticky', bottom: 40, left:'50%', transform:'translateX(-50%)',
        display:'flex', gap: 8, justifyContent:'center',
      }}>
        {steps.map((_, i) => (
          <div key={i} style={{
            width: activeStep === i ? 24 : 8, height: 8, borderRadius: 99,
            background: activeStep === i ? C.accent : C.border,
            transition: 'width 300ms ease, background 300ms ease',
          }} />
        ))}
      </div>
    </div>
  );
}
```

---

## PART 4: SMOOTH PAGE TRANSITIONS

### Transition A — Cross-Fade (default, universal)
```jsx
// Wrap page content in this — fades out old, fades in new
function PageTransition({ pageKey, children }) {
  const [displayChildren, setDisplayChildren] = React.useState(children);
  const [transState, setTransState] = React.useState('visible'); // 'visible' | 'exit' | 'enter'

  React.useEffect(() => {
    if (pageKey !== displayChildren?.key) {
      setTransState('exit');
      setTimeout(() => {
        setDisplayChildren(children);
        setTransState('enter');
        setTimeout(() => setTransState('visible'), 400);
      }, 200); // half of transition duration
    }
  }, [pageKey]);

  const opacity = { visible: 1, exit: 0, enter: 0 }[transState];
  const translateY = { visible: '0px', exit: '-12px', enter: '12px' }[transState];

  return (
    <div style={{
      opacity,
      transform: `translateY(${translateY})`,
      transition: 'opacity 200ms ease, transform 200ms ease',
    }}>
      {displayChildren}
    </div>
  );
}

// Usage in App:
function App() {
  const [page, setPage] = React.useState('dashboard');
  return (
    <div style={{ display:'flex' }}>
      <Sidebar active={page} onNav={setPage} />
      <PageTransition pageKey={page}>
        {page === 'dashboard' && <DashboardPage key="dashboard" />}
        {page === 'courses' && <CoursesPage key="courses" />}
      </PageTransition>
    </div>
  );
}
```

### Transition B — Slide (directional)
```jsx
function SlideTransition({ pageKey, direction = 'right', children }) {
  const [current, setCurrent] = React.useState({ key: pageKey, node: children });
  const [prev, setPrev] = React.useState(null);
  const [animating, setAnimating] = React.useState(false);

  React.useEffect(() => {
    if (pageKey !== current.key) {
      setPrev(current);
      setCurrent({ key: pageKey, node: children });
      setAnimating(true);
      setTimeout(() => { setPrev(null); setAnimating(false); }, 350);
    }
  }, [pageKey]);

  const slideOut = direction === 'right' ? '-100%' : '100%';
  const slideIn = direction === 'right' ? '100%' : '-100%';

  return (
    <div style={{ position:'relative', overflow:'hidden', flex: 1, minHeight: 0 }}>
      {prev && (
        <div style={{
          position:'absolute', inset: 0,
          transform: animating ? `translateX(${slideOut})` : 'translateX(0)',
          transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)',
        }}>
          {prev.node}
        </div>
      )}
      <div style={{
        position: prev ? 'absolute' : 'relative',
        inset: prev ? 0 : 'auto',
        transform: animating ? 'translateX(0)' : `translateX(${slideIn})`,
        transition: animating ? 'transform 350ms cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        {current.node}
      </div>
    </div>
  );
}
```

### Transition C — Clip-Path Reveal (cinematic, for landing pages)
```jsx
// Full-screen overlay that wipes off to reveal new content
function ClipTransition({ pageKey, children }) {
  const [node, setNode] = React.useState(children);
  const [clipProgress, setClipProgress] = React.useState(100);
  const rafRef = React.useRef(null);

  React.useEffect(() => {
    if (pageKey !== node?.key) {
      // Wipe in from left
      setClipProgress(0);
      setNode(children);
      let start = null;
      const duration = 600;
      const ease = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // easeInOut

      const animate = (ts) => {
        if (!start) start = ts;
        const t = Math.min((ts - start) / duration, 1);
        setClipProgress(ease(t) * 100);
        if (t < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [pageKey]);

  return (
    <div style={{
      clipPath: `inset(0 ${100 - clipProgress}% 0 0)`,
      transition: clipProgress === 100 ? 'none' : undefined,
    }}>
      {node}
    </div>
  );
}
```

---

## PART 5: HOVER MICRO-INTERACTIONS LIBRARY

### Interaction A — Card Tilt (3D on hover)
```jsx
function TiltCard({ children, style }) {
  const ref = React.useRef(null);

  const handleMove = (e) => {
    const el = ref.current;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    const rotateX = -y * 12;  // max 12deg tilt
    const rotateY = x * 12;
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    el.style.transition = 'transform 100ms ease';
  };

  const handleLeave = (e) => {
    const el = ref.current;
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)';
    el.style.transition = 'transform 400ms cubic-bezier(0.23,1,0.32,1)';
  };

  return (
    <div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={{ ...style, transformStyle:'preserve-3d', willChange:'transform' }}>
      {children}
    </div>
  );
}
```

### Interaction B — Shimmer on Hover (for CTA cards)
```jsx
// CSS keyframe in <style> tag:
// @keyframes shimmer { from { left: -100% } to { left: 200% } }

function ShimmerCard({ children, style }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ ...style, position:'relative', overflow:'hidden' }}>
      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        transform: 'skewX(-20deg)',
        animation: hovered ? 'shimmer 600ms ease forwards' : 'none',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  );
}
```

### Interaction C — Underline Grow (nav links, text links)
```jsx
function UnderlineLink({ children, style }) {
  return (
    <span style={{
      ...style,
      position: 'relative',
      display: 'inline-block',
      cursor: 'pointer',
      '&::after': undefined, // not supported in React inline
    }}>
      {children}
      {/* Pseudo-element via real div */}
      <span style={{
        position: 'absolute', bottom: -2, left: 0,
        width: '100%', height: 2, borderRadius: 99,
        background: C.accent,
        transform: 'scaleX(0)', transformOrigin: 'left',
        transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
      }} className="link-underline" />
    </span>
  );
}
// Note: Add CSS in <style>: .link-underline-wrap:hover .link-underline { transform: scaleX(1) }
// Or handle with React state hover on the parent
```

---

## PART 6: USAGE RULES

### When to Use Each System
| Feature | Use when | Skip when |
|---------|----------|-----------|
| Dual-ring cursor | Agency portfolio, premium landing page, creative platform | B2B SaaS dashboard, data app, accessibility-priority |
| Glow blob cursor | Dark premium theme, fintech/AI platform | Light themes (glow invisible), e-commerce |
| Magnetic buttons | Hero CTAs (1-2 per page max) | Navigation items, form buttons, table actions |
| Parallax | Hero sections, feature section backgrounds | Data tables, form pages, settings pages |
| Scroll reveal | Every section on landing pages | Data tables (content should be immediately visible) |
| Sticky + content swap | Feature walkthroughs (3-6 steps), "How it works" sections | More than 6 steps (too long), mobile-first designs |
| Counter animation | Stats sections, KPI reveals | Already-visible numbers (counters that start in viewport) |
| Cross-fade transition | Default for all multi-page apps | — |
| Slide transition | Mobile app feel, wizard/onboarding flows | Data dashboards |
| Clip-path transition | Landing pages, portfolio showcases | — |
| Card tilt | Product showcases, feature cards | Table rows, list items, stat cards |

### Performance Rules
- Always `willChange: 'transform'` on animated elements before animation starts. Remove after animation ends.
- Never animate `width`, `height`, `top`, `left`, `margin`, `padding` — these cause layout reflow. Animate `transform` and `opacity` only.
- Parallax: `position: fixed` alternatives on mobile (parallax causes jank on iOS). Disable at `< 768px`.
- Magnetic buttons: Only on elements ≥ 40px in both dimensions. Too small = erratic movement.
- Glow cursor: Limit to ONE glow element. Multiple glows competing is visually chaotic.

### The Animation Budget Rule
Per page, the total animation complexity is capped:
- Landing page: Full budget (all systems available)
- App dashboard: Reduced budget (entrance animations + hover states only — no cursor, no parallax, no page transitions inside pages)
- Data-heavy pages (tables, forms): Minimal (hover states only)

A page that uses ALL systems simultaneously feels like a circus. Use 2-3 systems per page type, not all 6.

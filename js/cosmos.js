/**
 * cosmos.js
 * Topological star field background
 * Stars cluster at nodes of meaning
 */

const Cosmos = (() => {
  const cvs = document.getElementById('cosmos');
  const ctx = cvs ? cvs.getContext('2d') : null;
  let W, H, STARS = [];
  let animationFrame = null;

  // Detect if reduced motion is preferred
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function randF(a, b) {
    return a + Math.random() * (b - a);
  }

  // Topological weight function - defines meaning density
  function topoWeight(nx, ny) {
    const nodes = [
      { x: 0.50, y: 0.08, w: 1.0, spread: 20 },  // hero/origin
      { x: 0.25, y: 0.40, w: 0.55, spread: 16 }, // awareness
      { x: 0.50, y: 0.50, w: 0.55, spread: 16 }, // action
      { x: 0.75, y: 0.40, w: 0.55, spread: 16 }, // reflection
      { x: 0.18, y: 0.60, w: 0.30, spread: 22 }, // shadow
      { x: 0.35, y: 0.60, w: 0.30, spread: 22 }, // patterns
      { x: 0.62, y: 0.60, w: 0.30, spread: 22 }, // standards
      { x: 0.78, y: 0.60, w: 0.30, spread: 22 }, // bridges
      { x: 0.50, y: 0.88, w: 0.40, spread: 18 }, // CTA
    ];

    let w = 0.025; // sparse base field
    for (const n of nodes) {
      const d = Math.hypot(nx - n.x, ny - n.y);
      w += Math.exp(-d * d * n.spread) * n.w;
    }
    return Math.min(1, w);
  }

  function buildStars() {
    STARS = [];
    
    // Reduce density on mobile for performance
    const isMobile = W < 768;
    const baseDensity = Math.floor((W * H) / 820);
    const density = isMobile ? baseDensity * 0.6 : baseDensity;

    for (let i = 0; i < density * 4; i++) {
      const nx = Math.random();
      const ny = Math.random();
      const weight = topoWeight(nx, ny);
      
      if (Math.random() > weight) continue;

      const tier = Math.random();
      let size, base, tSpeed, tAmp;

      if (tier < 0.58) {
        // distant micro - faint but visible
        size = randF(0.18, 0.50);
        base = randF(0.10, 0.22);
        tSpeed = randF(0.0003, 0.0009);
        tAmp = randF(0.04, 0.08);
      } else if (tier < 0.86) {
        // mid field - quietly present
        size = randF(0.45, 0.85);
        base = randF(0.22, 0.40);
        tSpeed = randF(0.0005, 0.0013);
        tAmp = randF(0.06, 0.13);
      } else if (tier < 0.96) {
        // bright - clearly there
        size = randF(0.7, 1.3);
        base = randF(0.40, 0.62);
        tSpeed = randF(0.0007, 0.0018);
        tAmp = randF(0.10, 0.18);
      } else {
        // node-star - rare, pure white
        size = randF(1.1, 1.8);
        base = randF(0.62, 0.82);
        tSpeed = randF(0.0004, 0.001);
        tAmp = randF(0.12, 0.22);
      }

      STARS.push({
        x: nx * W,
        y: ny * H,
        size,
        base,
        opacity: base,
        phase: Math.random() * Math.PI * 2,
        tSpeed: prefersReducedMotion ? 0 : tSpeed,
        tAmp: prefersReducedMotion ? 0 : tAmp,
        r: Math.floor(240 + Math.random() * 15),
        g: Math.floor(246 + Math.random() * 9),
        b: 255,
      });
    }
  }

  function resize() {
    W = cvs.width = window.innerWidth;
    H = cvs.height = window.innerHeight;
    buildStars();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    
    for (const s of STARS) {
      if (!prefersReducedMotion) {
        s.phase += s.tSpeed;
        s.opacity = Math.max(0, Math.min(1, s.base + Math.sin(s.phase) * s.tAmp));
      } else {
        s.opacity = s.base;
      }
      
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${s.opacity.toFixed(3)})`;
      ctx.fill();
    }
    
    animationFrame = requestAnimationFrame(draw);
  }

  function init() {
    if (!cvs || !ctx) {
      console.warn('Cosmos canvas not found');
      return;
    }
    
    window.addEventListener('resize', resize);
    resize();
    draw();
  }

  function destroy() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
  }

  return { init, destroy };
})();

window.Cosmos = Cosmos;

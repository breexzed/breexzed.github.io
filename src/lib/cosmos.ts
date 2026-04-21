type Star = {
  x: number;
  y: number;
  size: number;
  base: number;
  opacity: number;
  phase: number;
  tSpeed: number;
  tAmp: number;
  r: number;
  g: number;
  b: number;
};

type CosmosApi = {
  init: () => void;
  destroy: () => void;
};

const cvs = document.getElementById('cosmos') as HTMLCanvasElement | null;
const ctx = cvs ? cvs.getContext('2d') : null;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let width = 0;
let height = 0;
let stars: Star[] = [];
let animationFrame: number | null = null;

function randF(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function topoWeight(nx: number, ny: number): number {
  const nodes = [
    { x: 0.5, y: 0.08, w: 1.0, spread: 20 },
    { x: 0.25, y: 0.4, w: 0.55, spread: 16 },
    { x: 0.5, y: 0.5, w: 0.55, spread: 16 },
    { x: 0.75, y: 0.4, w: 0.55, spread: 16 },
    { x: 0.18, y: 0.6, w: 0.3, spread: 22 },
    { x: 0.35, y: 0.6, w: 0.3, spread: 22 },
    { x: 0.62, y: 0.6, w: 0.3, spread: 22 },
    { x: 0.78, y: 0.6, w: 0.3, spread: 22 },
    { x: 0.5, y: 0.88, w: 0.4, spread: 18 }
  ];

  let w = 0.025;
  for (const node of nodes) {
    const d = Math.hypot(nx - node.x, ny - node.y);
    w += Math.exp(-d * d * node.spread) * node.w;
  }
  return Math.min(1, w);
}

function buildStars(): void {
  stars = [];
  const isMobile = width < 768;
  const baseDensity = Math.floor((width * height) / 820);
  const density = isMobile ? baseDensity * 0.6 : baseDensity;

  for (let i = 0; i < density * 4; i += 1) {
    const nx = Math.random();
    const ny = Math.random();
    const weight = topoWeight(nx, ny);
    if (Math.random() > weight) continue;

    const tier = Math.random();
    let size: number;
    let base: number;
    let tSpeed: number;
    let tAmp: number;

    if (tier < 0.58) {
      size = randF(0.18, 0.5);
      base = randF(0.1, 0.22);
      tSpeed = randF(0.0003, 0.0009);
      tAmp = randF(0.04, 0.08);
    } else if (tier < 0.86) {
      size = randF(0.45, 0.85);
      base = randF(0.22, 0.4);
      tSpeed = randF(0.0005, 0.0013);
      tAmp = randF(0.06, 0.13);
    } else if (tier < 0.96) {
      size = randF(0.7, 1.3);
      base = randF(0.4, 0.62);
      tSpeed = randF(0.0007, 0.0018);
      tAmp = randF(0.1, 0.18);
    } else {
      size = randF(1.1, 1.8);
      base = randF(0.62, 0.82);
      tSpeed = randF(0.0004, 0.001);
      tAmp = randF(0.12, 0.22);
    }

    stars.push({
      x: nx * width,
      y: ny * height,
      size,
      base,
      opacity: base,
      phase: Math.random() * Math.PI * 2,
      tSpeed: prefersReducedMotion ? 0 : tSpeed,
      tAmp: prefersReducedMotion ? 0 : tAmp,
      r: Math.floor(240 + Math.random() * 15),
      g: Math.floor(246 + Math.random() * 9),
      b: 255
    });
  }
}

function resize(): void {
  if (!cvs) return;
  width = cvs.width = window.innerWidth;
  height = cvs.height = window.innerHeight;
  buildStars();
}

function draw(): void {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);

  for (const star of stars) {
    if (!prefersReducedMotion) {
      star.phase += star.tSpeed;
      star.opacity = Math.max(0, Math.min(1, star.base + Math.sin(star.phase) * star.tAmp));
    } else {
      star.opacity = star.base;
    }

    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${star.opacity.toFixed(3)})`;
    ctx.fill();
  }

  animationFrame = requestAnimationFrame(draw);
}

export const Cosmos: CosmosApi = {
  init() {
    if (!cvs || !ctx) {
      console.warn('Cosmos canvas not found');
      return;
    }
    window.addEventListener('resize', resize);
    resize();
    draw();
  },
  destroy() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
  }
};

declare global {
  interface Window {
    Cosmos: CosmosApi;
  }
}

window.Cosmos = Cosmos;

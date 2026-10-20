"use client";
import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   HomeBackground — Premium immersive canvas background
   
   Layers (back → front):
     1  CSS  – Deep space base gradient (#050510)
     2  CSS  – Animated aurora borealis ribbons (amber / cyan / violet)
     3  SVG  – Subtle honeycomb hex pattern overlay
     4  Canvas – Interactive particle constellation + energy rings + glyphs
     5  CSS  – 3D perspective cyber floor grid
     6  CSS  – Hero vignette spotlight
   ────────────────────────────────────────────────────────────────────────────── */

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
}

interface EnergyRing {
  x: number; y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
}

interface FloatingGlyph {
  x: number; y: number;
  vy: number; vx: number;
  text: string;
  alpha: number;
  targetAlpha: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  length: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

const PALETTE = {
  amber:  ["#f59e0b", "#fbbf24", "#f97316", "#fef08a"],
  cyan:   ["#22d3ee", "#38bdf8", "#06b6d4"],
  violet: ["#a78bfa", "#8b5cf6", "#c084fc"],
  all: [] as string[],
};
PALETTE.all = [...PALETTE.amber, ...PALETTE.cyan, ...PALETTE.violet];

const GLYPHS = [
  "λ", "⚡", "IoT", "AI", "01", "∑", "◈", "⚙", "{ }",
  "⟡", "∞", "◉", "ML", "⬡", "→", "∂", "π", "Δ",
];

export function HomeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf: number;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let time = 0;

    const mouse = { x: -9999, y: -9999, active: false };

    // ── Particles ───────────────────────────────────────────────────
    let particles: Particle[] = [];
    let energyRings: EnergyRing[] = [];
    let glyphs: FloatingGlyph[] = [];
    let shootingStars: ShootingStar[] = [];

    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;

      // Particles — constellation nodes
      const count = Math.min(Math.floor((W * H) / 12000), 90);
      particles = Array.from({ length: count }, () => {
        const useOrbit = Math.random() < 0.3;
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          radius: Math.random() * 2.2 + 0.8,
          baseRadius: Math.random() * 2.2 + 0.8,
          color: PALETTE.all[Math.floor(Math.random() * PALETTE.all.length)],
          alpha: Math.random() * 0.55 + 0.2,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.025 + 0.008,
          orbitRadius: useOrbit ? Math.random() * 40 + 20 : 0,
          orbitSpeed: (Math.random() - 0.5) * 0.006,
          orbitAngle: Math.random() * Math.PI * 2,
        };
      });

      // Floating tech glyphs
      const gCount = Math.min(Math.floor(W / 100), 18);
      glyphs = Array.from({ length: gCount }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: -(Math.random() * 0.25 + 0.1),
        vx: (Math.random() - 0.5) * 0.15,
        text: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        alpha: 0,
        targetAlpha: Math.random() * 0.18 + 0.06,
        color: Math.random() > 0.5 ? "#f59e0b" : Math.random() > 0.5 ? "#38bdf8" : "#a78bfa",
        size: Math.random() * 4 + 11,
        rotation: (Math.random() - 0.5) * 0.3,
        rotSpeed: (Math.random() - 0.5) * 0.002,
      }));

      energyRings = [];
      shootingStars = [];
    };

    init();

    // ── Event Handlers ──────────────────────────────────────────────
    const onResize = () => init();
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true;
    };
    const onMouseLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };
    const onClick = (e: MouseEvent) => {
      // Spawn energy ring on click
      energyRings.push({
        x: e.clientX, y: e.clientY,
        radius: 5, maxRadius: 180,
        alpha: 0.6,
        color: PALETTE.amber[Math.floor(Math.random() * PALETTE.amber.length)],
        speed: 3,
      });
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);

    // ── Render Loop ─────────────────────────────────────────────────
    const render = () => {
      ctx.clearRect(0, 0, W, H);
      time += 0.016;

      // — Spawn shooting stars occasionally
      if (Math.random() < 0.008) {
        const fromRight = Math.random() > 0.5;
        shootingStars.push({
          x: fromRight ? W + 10 : -10,
          y: Math.random() * H * 0.5,
          vx: (fromRight ? -1 : 1) * (Math.random() * 4 + 3),
          vy: Math.random() * 2 + 1,
          length: Math.random() * 80 + 40,
          alpha: 1,
          color: Math.random() > 0.6 ? "#fbbf24" : "#38bdf8",
          life: 0,
          maxLife: Math.random() * 60 + 40,
        });
      }

      // — Draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += s.vx; s.y += s.vy;
        s.life++;
        s.alpha = 1 - s.life / s.maxLife;

        if (s.alpha <= 0) { shootingStars.splice(i, 1); continue; }

        const tailX = s.x - s.vx * (s.length / 5);
        const tailY = s.y - s.vy * (s.length / 5);
        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(1, s.color);

        ctx.save();
        ctx.globalAlpha = s.alpha * 0.7;
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        // Star head glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      }

      // — Draw constellation connections
      const maxDist = 140;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const prox = 1 - dist / maxDist;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${prox * 0.18})`;
            ctx.lineWidth = prox * 0.8;
            ctx.stroke();
          }
        }
      }

      // — Draw cursor magnetic field lines
      if (mouse.active) {
        for (const p of particles) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 200) {
            const force = (1 - mdist / 200);
            // Attract lightly
            p.x += (mdx / mdist) * force * 0.8;
            p.y += (mdy / mdist) * force * 0.8;

            // Draw connection to cursor
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            const grad = ctx.createLinearGradient(mouse.x, mouse.y, p.x, p.y);
            grad.addColorStop(0, `rgba(251, 191, 36, ${force * 0.4})`);
            grad.addColorStop(1, `rgba(56, 189, 248, ${force * 0.15})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = force * 1.2;
            ctx.stroke();
          }
        }

        // Cursor glow
        const cursorGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
        cursorGrad.addColorStop(0, "rgba(251, 191, 36, 0.15)");
        cursorGrad.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = cursorGrad;
        ctx.fillRect(mouse.x - 60, mouse.y - 60, 120, 120);
      }

      // — Update & draw particles
      for (const p of particles) {
        p.pulsePhase += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.6;

        if (p.orbitRadius > 0) {
          p.orbitAngle += p.orbitSpeed;
          p.x += Math.cos(p.orbitAngle) * p.orbitSpeed * p.orbitRadius;
          p.y += Math.sin(p.orbitAngle) * p.orbitSpeed * p.orbitRadius;
        }

        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20;
        if (p.y > H + 20) p.y = -20;

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.radius, 0.3), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      }

      // — Draw floating glyphs
      for (const g of glyphs) {
        g.y += g.vy;
        g.x += g.vx;
        g.rotation += g.rotSpeed;

        // Fade in smoothly
        g.alpha += (g.targetAlpha - g.alpha) * 0.02;

        if (g.y < -40) {
          g.y = H + 40;
          g.x = Math.random() * W;
          g.text = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          g.alpha = 0;
        }

        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rotation);
        ctx.font = `600 ${g.size}px "SF Mono", "Fira Code", monospace`;
        ctx.fillStyle = g.color;
        ctx.globalAlpha = g.alpha;
        ctx.textAlign = "center";
        ctx.fillText(g.text, 0, 0);
        ctx.restore();
      }

      // — Draw energy rings
      for (let i = energyRings.length - 1; i >= 0; i--) {
        const ring = energyRings[i];
        ring.radius += ring.speed;
        ring.alpha = (1 - ring.radius / ring.maxRadius) * 0.5;
        if (ring.radius >= ring.maxRadius) {
          energyRings.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.globalAlpha = ring.alpha;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.restore();
      }

      // — Ambient pulsing central energy orb
      const orbX = W * 0.5;
      const orbY = H * 0.35;
      const orbPulse = Math.sin(time * 0.8) * 0.3 + 0.7;
      const orbGrad = ctx.createRadialGradient(orbX, orbY, 0, orbX, orbY, 250 * orbPulse);
      orbGrad.addColorStop(0, "rgba(245, 158, 11, 0.06)");
      orbGrad.addColorStop(0.5, "rgba(251, 191, 36, 0.02)");
      orbGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = orbGrad;
      ctx.fillRect(orbX - 250, orbY - 250, 500, 500);

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#050510]">

      {/* ── Layer 1: Aurora Borealis Ribbons ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary amber aurora */}
        <div
          className="absolute top-[-15%] left-[-10%] w-[900px] h-[600px] rounded-full blur-[140px] animate-aurora-1"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.35), rgba(249,115,22,0.2), transparent)",
          }}
        />
        {/* Secondary cyan aurora */}
        <div
          className="absolute top-[15%] right-[-8%] w-[850px] h-[700px] rounded-full blur-[150px] animate-aurora-2"
          style={{
            background: "linear-gradient(225deg, rgba(34,211,238,0.2), rgba(56,189,248,0.12), transparent)",
          }}
        />
        {/* Tertiary violet aurora */}
        <div
          className="absolute bottom-[-10%] left-[20%] w-[700px] h-[550px] rounded-full blur-[130px] animate-aurora-3"
          style={{
            background: "linear-gradient(45deg, rgba(167,139,250,0.18), rgba(139,92,246,0.1), transparent)",
          }}
        />
        {/* Deep amber core glow */}
        <div
          className="absolute top-[25%] left-[35%] w-[500px] h-[500px] rounded-full blur-[100px] animate-neon-pulse"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.2) 0%, rgba(245,158,11,0.08) 40%, transparent 70%)",
          }}
        />
      </div>

      {/* ── Layer 2: Honeycomb Hex Pattern ── */}
      <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="home-hex-grid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(1.5)">
            <path
              d="M28 2 L54 18 L54 50 L28 66 L2 50 L2 18 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeOpacity="0.5"
            />
            <path
              d="M28 34 L54 50 L54 82 L28 98 L2 82 L2 50 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeOpacity="0.3"
            />
            {/* Node dots at vertices */}
            <circle cx="28" cy="2" r="1" fill="#f59e0b" fillOpacity="0.6" />
            <circle cx="28" cy="66" r="1" fill="#38bdf8" fillOpacity="0.4" />
          </pattern>
          {/* Fade mask so the hex grid isn't uniform */}
          <radialGradient id="hex-fade" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="hex-mask">
            <rect width="100%" height="100%" fill="url(#hex-fade)" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="url(#home-hex-grid)" mask="url(#hex-mask)" />
      </svg>

      {/* ── Layer 3: Interactive Physics Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto"
      />

      {/* ── Layer 4: 3D Perspective Cyber Floor Grid ── */}
      <div
        className="absolute bottom-0 left-[-20%] right-[-20%] h-[400px] opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(245,158,11,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.35) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          transform: "perspective(600px) rotateX(68deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 85%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, rgba(0,0,0,0) 85%)",
        }}
      />

      {/* ── Layer 5: Animated scan line ── */}
      <div
        className="absolute left-0 right-0 h-[1px] opacity-20 pointer-events-none animate-scan-line"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.6), rgba(56,189,248,0.4), transparent)",
        }}
      />

      {/* ── Layer 6: Hero Vignette ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_35%,transparent_20%,#050510_80%)] pointer-events-none" />

      {/* ── Subtle noise texture overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}

"use client";
import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   HomeBackground — High-Performance GPU-Accelerated Canvas & Cosmic Background
   
   Optimized for silky-smooth 60/120 FPS scrolling:
     1. Automatic pause when scrolled past the hero view (saves 100% canvas GPU/CPU)
     2. Throttled line drawing during active wheel scroll (zero scroll latency)
     3. Native GPU-composited CSS transforms without memory-heavy will-change
     4. Eliminated CPU-bound software CSS mask-image
     5. Tab visibility pause when hidden
   ────────────────────────────────────────────────────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const PALETTE = {
  amber: ["#f59e0b", "#fbbf24", "#f97316"],
  cyan: ["#22d3ee", "#38bdf8", "#06b6d4"],
  violet: ["#a78bfa", "#8b5cf6", "#c084fc"],
};
const ALL_COLORS = [...PALETTE.amber, ...PALETTE.cyan, ...PALETTE.violet];

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
    let isVisible = true;
    let isScrolledPast = false;
    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const mouse = { x: -9999, y: -9999, active: false };

    // ── Optimized Particles — Constellation nodes ──
    let particles: Particle[] = [];

    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;

      // 28-36 particles provide beautiful constellation density with negligible CPU cost
      const count = Math.min(Math.floor((W * H) / 36000), 34);
      particles = Array.from({ length: Math.max(count, 20) }, () => {
        const baseR = Math.random() * 1.6 + 0.8;
        return {
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          radius: baseR,
          baseRadius: baseR,
          color: ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)],
          alpha: Math.random() * 0.45 + 0.2,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: Math.random() * 0.02 + 0.008,
        };
      });
    };

    init();

    // ── Scroll & Visibility Listeners ──
    const onResize = () => init();
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const onMouseLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };

    const onScroll = () => {
      // Pause canvas entirely if scrolled past 90% of fold 1
      isScrolledPast = window.scrollY > window.innerHeight * 0.95;
      
      // Temporarily throttle heavy line checks during rapid mouse wheel movements
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 100);
    };

    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", onMouseLeave, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    const maxDist = 125;
    const maxDistSq = maxDist * maxDist;

    // ── Ultra-Smooth 60/120 FPS Render Loop ──
    const render = () => {
      // If tab hidden or user scrolled down past hero, sleep to give 100% CPU/GPU to page scrolling
      if (!isVisible || isScrolledPast) {
        raf = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, W, H);

      const len = particles.length;

      // Only draw connecting lines when not actively flicking the scroll wheel
      if (!isScrolling) {
        for (let i = 0; i < len; i++) {
          const pi = particles[i];
          for (let j = i + 1; j < len; j++) {
            const pj = particles[j];
            const dx = pi.x - pj.x;
            const dy = pi.y - pj.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
              const prox = 1 - Math.sqrt(distSq) / maxDist;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.strokeStyle = `rgba(245, 158, 11, ${prox * 0.15})`;
              ctx.lineWidth = prox * 0.7;
              ctx.stroke();
            }
          }
        }
      }

      // Cursor subtle attraction
      if (mouse.active && !isScrolling) {
        for (let i = 0; i < len; i++) {
          const p = particles[i];
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mdistSq = mdx * mdx + mdy * mdy;
          if (mdistSq < 32000) {
            const mdist = Math.sqrt(mdistSq);
            const force = (1 - mdist / 180) * 0.45;
            p.x += (mdx / mdist) * force;
            p.y += (mdy / mdist) * force;
          }
        }
      }

      // Hardware-native particle updates
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        p.pulsePhase += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.4;

        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.radius, 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(scrollTimeout);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#050510]">
      {/* ── Layer 1: Hardware-accelerated native radial glow orbs ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary amber glow */}
        <div
          className="absolute top-[-10%] left-[-5%] w-[800px] h-[550px] rounded-full animate-aurora-1 opacity-75"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(245,158,11,0.22) 0%, rgba(249,115,22,0.08) 45%, transparent 70%)",
          }}
        />
        {/* Secondary cyan glow */}
        <div
          className="absolute top-[12%] right-[-5%] w-[750px] h-[600px] rounded-full animate-aurora-2 opacity-65"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.18) 0%, rgba(56,189,248,0.06) 45%, transparent 70%)",
          }}
        />
        {/* Tertiary violet glow */}
        <div
          className="absolute bottom-[-5%] left-[20%] w-[650px] h-[450px] rounded-full animate-aurora-3 opacity-55"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(167,139,250,0.15) 0%, rgba(139,92,246,0.05) 45%, transparent 70%)",
          }}
        />
        {/* Amber core accent */}
        <div
          className="absolute top-[28%] left-[36%] w-[450px] h-[450px] rounded-full animate-neon-pulse opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.05) 50%, transparent 75%)",
          }}
        />
      </div>

      {/* ── Layer 2: Lightweight SVG honeycomb hex pattern ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-18 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="home-hex-grid"
            width="56"
            height="100"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(1.5)"
          >
            <path
              d="M28 2 L54 18 L54 50 L28 66 L2 50 L2 18 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeOpacity="0.4"
            />
            <path
              d="M28 34 L54 50 L54 82 L28 98 L2 82 L2 50 Z"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="0.4"
              strokeOpacity="0.25"
            />
            <circle cx="28" cy="2" r="1" fill="#f59e0b" fillOpacity="0.5" />
            <circle cx="28" cy="66" r="1" fill="#38bdf8" fillOpacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#home-hex-grid)" />
      </svg>

      {/* ── Layer 3: Interactive Physics Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* ── Layer 4: 3D Perspective Cyber Floor Grid with pure CSS gradient overlay ── */}
      <div className="absolute bottom-0 left-[-20%] right-[-20%] h-[360px] opacity-25 pointer-events-none overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.3) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            transform: "perspective(600px) rotateX(68deg)",
            transformOrigin: "bottom center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#050510]/80 to-[#050510] pointer-events-none" />
      </div>

      {/* ── Layer 5: Hero Vignette ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_70%_at_50%_35%,transparent_25%,#050510_85%)] pointer-events-none" />
    </div>
  );
}

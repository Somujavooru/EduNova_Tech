"use client";
import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   MarketplaceBackground — Immersive Cyber Blueprint & Nebula Canvas
   Optimized for silky-smooth 60/120 FPS marketplace scrolling
   ────────────────────────────────────────────────────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

const COLORS = ["#00d4ff", "#f59e0b", "#8b5cf6", "#10b981", "#38bdf8"];

export function MarketplaceBackground() {
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
    let isScrolling = false;
    let scrollTimer: NodeJS.Timeout;

    let particles: Particle[] = [];

    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((W * H) / 38000), 28);
      particles = Array.from({ length: Math.max(count, 18) }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        radius: Math.random() * 1.8 + 0.8,
        alpha: Math.random() * 0.45 + 0.15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    init();
    const handleResize = () => init();
    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    const onScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
      }, 100);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    const maxDist = 120;
    const maxDistSq = maxDist * maxDist;

    const render = () => {
      if (!isVisible) {
        raf = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, W, H);
      const len = particles.length;

      // Draw particle positions
      for (let i = 0; i < len; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = W;
        if (p1.x > W) p1.x = 0;
        if (p1.y < 0) p1.y = H;
        if (p1.y > H) p1.y = 0;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.fill();

        // Connect nearby particles with squared distance check
        if (!isScrolling) {
          for (let j = i + 1; j < len; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < maxDistSq) {
              const dist = Math.sqrt(distSq);
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = p1.color;
              ctx.globalAlpha = (1 - dist / maxDist) * 0.15;
              ctx.lineWidth = 0.75;
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(scrollTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden bg-[#070913]">
      {/* ── Layer 1: Ambient Glowing Radial Nebulae ── */}
      <div className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-cyan-600/15 via-blue-600/10 to-transparent blur-[120px] pointer-events-none animate-pulse duration-1000" />
      <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-amber-500/12 via-orange-600/08 to-transparent blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[20%] w-[60vw] h-[40vw] rounded-full bg-gradient-to-tr from-purple-600/12 via-indigo-600/08 to-transparent blur-[150px] pointer-events-none" />

      {/* ── Layer 2: Subtle Cyber Blueprint Grid Pattern ── */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Layer 3: Faint Hexagonal Circuit Dot Grid ── */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(rgba(0, 212, 255, 0.6) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* ── Layer 4: Interactive Particle Constellation Canvas ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* ── Layer 5: Top & Bottom Dark Edge Vignette ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070913]/60 via-transparent to-[#070913]/90 pointer-events-none" />
    </div>
  );
}

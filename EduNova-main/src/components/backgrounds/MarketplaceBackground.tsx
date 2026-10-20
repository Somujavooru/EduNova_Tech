"use client";
import { useEffect, useRef } from "react";

/* ──────────────────────────────────────────────────────────────────────────────
   MarketplaceBackground — Immersive Cyber Blueprint & Nebula Canvas
   Features:
     - Multi-layer deep space & cybernetic grid overlay
     - Glowing ambient nebulae (Cyan, Amber, Violet)
     - Interactive micro-particle constellation nodes
     - Subtle blueprint circuit traces & grid lines
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

    let particles: Particle[] = [];

    const init = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((W * H) / 18000), 55);
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.45 + 0.15,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    init();
    const handleResize = () => init();
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw particle constellation connections
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = W;
        if (p1.x > W) p1.x = 0;
        if (p1.y < 0) p1.y = H;
        if (p1.y > H) p1.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.fill();

        // Connect nearby particles with subtle circuit lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = (1 - dist / 130) * 0.15;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
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

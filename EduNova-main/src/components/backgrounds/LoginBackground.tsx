"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  color: string;
  pulseSpeed: number;
  pulsePhase: number;
}

export function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for interactive physics
    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    // Color palette: Warm Gold, Solar Flame Amber, Amber Glow
    const colors = ["#f59e0b", "#fbbf24", "#d97706", "#fef08a", "#ea580c"];
    let particles: Particle[] = [];

    let isVisible = true;
    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const initParticles = () => {
      const count = Math.min(Math.floor((width * height) / 42000), 28);
      particles = [];
      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2.2 + 1;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.45,
          vy: (Math.random() - 0.5) * 0.45,
          radius,
          baseRadius: radius,
          alpha: Math.random() * 0.6 + 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
          pulseSpeed: Math.random() * 0.03 + 0.015,
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    };

    initParticles();

    // Render loop
    const maxDistance = 110;
    const maxDistSq = maxDistance * maxDistance;

    const render = () => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      // Draw particle connections with squared distance optimization
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const proximity = 1 - dist / maxDistance;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${proximity * 0.28})`;
            ctx.lineWidth = proximity * 1.0;
            ctx.stroke();
          }
        }
      }

      // Update & Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Pulsating size & glow
        p.pulsePhase += p.pulseSpeed;
        p.radius = p.baseRadius + Math.sin(p.pulsePhase) * 0.7;

        // Interactive mouse repulsion/attraction
        if (mouse.active) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            const force = (1 - mdist / 140) * 1.8;
            p.x -= (mdx / mdist) * force;
            p.y -= (mdy / mdist) * force;

            // Connect mouse to nearby particles
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - mdist / 140) * 0.45})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Screen boundary wrap
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Draw particle (hardware-accelerated, no CPU shadowBlur)
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(p.radius, 0.5), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#0a0908]">
      {/* ── Layer 1: Vivid Glowing Solar Plasma Orbs ── */}
      <div className="absolute top-[-10%] left-[-8%] w-[680px] h-[680px] bg-gradient-to-br from-amber-500/40 via-orange-600/30 to-transparent rounded-full blur-[90px] animate-bg-float-1" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[720px] h-[720px] bg-gradient-to-tl from-orange-500/45 via-amber-500/35 to-transparent rounded-full blur-[100px] animate-bg-float-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 rounded-full blur-[120px] animate-neon-pulse" />

      {/* ── Layer 2: Geometric Hexagonal Solar Circuit Pattern ── */}
      <svg className="absolute inset-0 w-full h-full opacity-45 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="login-geom-matrix" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 L 30 50 L 50 30 L 80 30 L 100 50" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.55" />
            <path d="M 50 0 L 50 30 L 70 50 L 70 100" fill="none" stroke="#fbbf24" strokeWidth="1.2" strokeOpacity="0.45" />
            <circle cx="30" cy="50" r="2.5" fill="#fef08a" />
            <circle cx="80" cy="30" r="2.5" fill="#fef08a" />
            <circle cx="70" cy="50" r="3" fill="#f59e0b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#login-geom-matrix)" />
      </svg>

      {/* ── Layer 3: Interactive Physics Canvas (Particles & Connecting Golden Beams) ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* ── Layer 4: 3D Perspective Cyber Floor Grid ── */}
      <div
        className="absolute bottom-0 left-[-20%] right-[-20%] h-[380px] opacity-55 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(245, 158, 11, 0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.45) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
          transform: "perspective(500px) rotateX(65deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 95%)",
          WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 95%)",
        }}
      />

      {/* ── Layer 5: Traveling Cyber Laser Beam Scan ── */}
      <div className="absolute left-0 right-0 h-28 bg-gradient-to-b from-transparent via-amber-400/25 to-transparent animate-cyber-scan pointer-events-none" />

      {/* ── Layer 6: Vignette Spotlight to draw eyes to central card ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_45%,transparent_20%,#0a0908_85%)] pointer-events-none" />
    </div>
  );
}

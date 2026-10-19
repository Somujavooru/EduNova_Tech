"use client";
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  alpha: number;
  color: string;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  active: boolean;
}

export function SignupBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: -1000, y: -1000, active: false };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
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

    const starColors = ["#c084fc", "#38bdf8", "#f43f5e", "#f59e0b", "#e0e7ff", "#a855f7"];
    let stars: Star[] = [];
    let shootingStars: ShootingStar[] = [];

    const initStars = () => {
      const count = Math.min(Math.floor((width * height) / 14000), 100);
      stars = [];
      for (let i = 0; i < count; i++) {
        const radius = Math.random() * 2.2 + 0.8;
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius,
          baseRadius: radius,
          alpha: Math.random() * 0.7 + 0.3,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          twinkleSpeed: Math.random() * 0.04 + 0.02,
          twinklePhase: Math.random() * Math.PI * 2,
        });
      }

      // Initialize shooting stars
      shootingStars = [
        { x: -100, y: -100, length: 120, speed: 12, angle: Math.PI / 4, opacity: 0, active: false },
        { x: -100, y: -100, length: 90, speed: 10, angle: Math.PI / 3.5, opacity: 0, active: false },
      ];
    };

    initStars();

    // Trigger shooting stars periodically
    const spawnShootingStar = () => {
      const s = shootingStars.find((item) => !item.active);
      if (s) {
        s.active = true;
        s.x = Math.random() * width * 0.8;
        s.y = Math.random() * (height * 0.4);
        s.length = Math.random() * 80 + 70;
        s.speed = Math.random() * 8 + 10;
        s.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        s.opacity = 1;
      }
    };

    const shootingStarInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        spawnShootingStar();
      }
    }, 3200);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw constellation links
      const maxDistance = 115;
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const proximity = 1 - dist / maxDistance;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(168, 85, 247, ${proximity * 0.25})`;
            ctx.lineWidth = proximity * 0.9;
            ctx.stroke();
          }
        }
      }

      // Update & Draw stars
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        s.twinklePhase += s.twinkleSpeed;
        s.radius = s.baseRadius + Math.sin(s.twinklePhase) * 0.6;

        // Mouse gravity attraction
        if (mouse.active) {
          const mdx = mouse.x - s.x;
          const mdy = mouse.y - s.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 150) {
            const force = (1 - mdist / 150) * 1.5;
            s.x -= (mdx / mdist) * force;
            s.y -= (mdy / mdist) * force;

            // Connect mouse to star with cyan thread
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(s.x, s.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - mdist / 150) * 0.4})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        s.x += s.vx;
        s.y += s.vy;

        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;
        if (s.y < -10) s.y = height + 10;
        if (s.y > height + 10) s.y = -10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(s.x, s.y, Math.max(s.radius, 0.5), 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha = s.alpha;
        ctx.fill();
        ctx.restore();
      }

      // Update & Draw Shooting Stars
      for (let i = 0; i < shootingStars.length; i++) {
        const ss = shootingStars[i];
        if (!ss.active) continue;

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.opacity -= 0.015;

        if (ss.opacity <= 0 || ss.x > width || ss.y > height) {
          ss.active = false;
          continue;
        }

        const tailX = ss.x - Math.cos(ss.angle) * ss.length;
        const tailY = ss.y - Math.sin(ss.angle) * ss.length;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, "rgba(56, 189, 248, 0)");
        grad.addColorStop(0.7, `rgba(168, 85, 247, ${ss.opacity * 0.8})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${ss.opacity})`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(shootingStarInterval);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#09080e]">
      {/* ── Layer 1: Saturated Cosmic Nebula Clouds ── */}
      <div className="absolute -top-[12%] left-[5%] w-[820px] h-[820px] bg-gradient-to-tr from-purple-600/50 via-indigo-600/35 to-fuchsia-900/20 rounded-full blur-[90px] animate-aurora" />
      <div className="absolute bottom-[-15%] left-[-8%] w-[780px] h-[780px] bg-gradient-to-br from-cyan-500/45 via-teal-600/35 to-blue-900/15 rounded-full blur-[95px] animate-bg-float-1" />
      <div className="absolute top-[25%] right-[-10%] w-[820px] h-[820px] bg-gradient-to-bl from-rose-500/40 via-purple-600/35 to-amber-500/30 rounded-full blur-[100px] animate-bg-float-2" />

      {/* ── Layer 2: Interactive Starlight & Constellation Canvas with Shooting Stars ── */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* ── Layer 3: Deep Space Nebula Vignette ── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_40%,transparent_20%,#09080e_85%)] pointer-events-none" />
    </div>
  );
}

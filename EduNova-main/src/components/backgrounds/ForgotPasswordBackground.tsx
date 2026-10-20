"use client";
import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export function ForgotPasswordBackground() {
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
      initNodes();
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

    const colors = ["#10b981", "#34d399", "#059669", "#06b6d4", "#6ee7b7"];
    let nodes: Node[] = [];
    let radarRadius = 0;

    const initNodes = () => {
      const count = Math.min(Math.floor((width * height) / 16000), 75);
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          alpha: Math.random() * 0.6 + 0.3,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    initNodes();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Expanding Security Radar Pulse from center
      radarRadius += 1.2;
      const maxRadar = Math.max(width, height) * 0.65;
      if (radarRadius > maxRadar) radarRadius = 0;

      const centerX = width / 2;
      const centerY = height / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radarRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(16, 185, 129, ${(1 - radarRadius / maxRadar) * 0.25})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, (radarRadius * 0.5) % maxRadar, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(52, 211, 153, ${(1 - ((radarRadius * 0.5) % maxRadar) / maxRadar) * 0.18})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // Draw cryptographic links
      const maxDistance = 110;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const proximity = 1 - dist / maxDistance;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${proximity * 0.26})`;
            ctx.lineWidth = proximity * 1;
            ctx.stroke();
          }
        }
      }

      // Update & Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (mouse.active) {
          const mdx = mouse.x - n.x;
          const mdy = mouse.y - n.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < 140) {
            const force = (1 - mdist / 140) * 1.6;
            n.x -= (mdx / mdist) * force;
            n.y -= (mdy / mdist) * force;

            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = `rgba(110, 231, 183, ${(1 - mdist / 140) * 0.45})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        n.x += n.vx;
        n.y += n.vy;

        if (n.x < -10) n.x = width + 10;
        if (n.x > width + 10) n.x = -10;
        if (n.y < -10) n.y = height + 10;
        if (n.y > height + 10) n.y = -10;

        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = n.alpha;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-[#060c09]">
      {/* Saturated Emerald & Cyber Teal Security Orbs */}
      <div className="absolute top-[-12%] right-[5%] w-[720px] h-[720px] bg-gradient-to-br from-emerald-500/40 via-teal-600/35 to-green-950/20 rounded-full blur-[90px] animate-bg-float-1" />
      <div className="absolute bottom-[-15%] left-[2%] w-[680px] h-[680px] bg-gradient-to-tr from-cyan-500/35 via-emerald-700/30 to-teal-900/15 rounded-full blur-[95px] animate-bg-float-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[780px] h-[780px] bg-emerald-500/15 rounded-full blur-[110px] animate-neon-pulse" />

      {/* Hexagonal Honeycomb Security Grid SVG Overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="forgot-hex-pattern" width="60" height="103.92" patternUnits="userSpaceOnUse">
            <path d="M30 0 L60 17.32 L60 51.96 L30 69.28 L0 51.96 L0 17.32 Z" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.45" />
            <circle cx="30" cy="17.32" r="2" fill="#6ee7b7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#forgot-hex-pattern)" />
      </svg>

      {/* Interactive Cryptographic Radar Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" />

      {/* Ambient Radial Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,transparent_20%,#060c09_85%)] pointer-events-none" />
    </div>
  );
}

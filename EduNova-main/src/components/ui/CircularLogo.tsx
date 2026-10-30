"use client";
import { useEffect, useRef, useState } from "react";

interface CircularLogoProps {
  className?: string;
}

/**
 * CircularLogo — animation identity:
 * 1. On mount: the amber SVG ring draws itself in via stroke-dashoffset
 *    (0 → full circumference, 1.8s, cubic-bezier easing). Fires once.
 * 2. On hover: the ring rotates continuously at 8s/revolution using
 *    CSS animation. Not a Framer scale — feels like a mechanism, not
 *    a generic interactive affordance.
 */
export function CircularLogo({ className = "w-[60px] h-[60px]" }: CircularLogoProps) {
  const [drawn, setDrawn] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Extract size from className for the SVG — default 60px
  // Parse the size from the className (e.g. "w-[48px]" → 48)
  const sizeMatch = className.match(/w-\[(\d+)px\]/);
  const size = sizeMatch ? parseInt(sizeMatch[1]) : 60;
  const strokeWidth = Math.max(1.5, size * 0.03);
  const r = (size / 2) - strokeWidth - 1;
  const circumference = 2 * Math.PI * r;

  useEffect(() => {
    // Slight delay so the draw-in is visible after layout paint
    const t = setTimeout(() => setDrawn(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* SVG ring — draws in on mount, rotates on hover */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: "rotate(-90deg)",
          animation: hovered ? "logo-ring-spin 8s linear infinite" : "none",
        }}
      >
        <style>{`
          @keyframes logo-ring-spin {
            from { transform: rotate(-90deg); }
            to   { transform: rotate(270deg); }
          }
        `}</style>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(217, 119, 6, 0.55)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={drawn ? 0 : circumference}
          style={{
            transition: drawn
              ? "stroke-dashoffset 1.8s cubic-bezier(0.16, 1, 0.3, 1)"
              : "none",
          }}
        />
        {/* Small amber tick at the "start" position for texture */}
        <circle
          cx={size / 2}
          cy={strokeWidth + 1}
          r={strokeWidth * 0.9}
          fill="#d97706"
          opacity={drawn ? 1 : 0}
          style={{ transition: "opacity 0.4s ease 1.6s" }}
        />
      </svg>

      {/* Logo image */}
      <div className="rounded-full overflow-hidden relative bg-[#0a0e1a] z-10 w-full h-full flex items-center justify-center p-1">
        <img
          src="/ef-logo.png"
          alt="EduNova Forge Logo"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
}

"use client";

import React from "react";

interface EduNovaForgeLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  theme?: "dark" | "light" | "auto";
}

/**
 * Geometric circular brand 'O' glyph with centered, glowing 4-point sparkle star.
 * Uses a clean hollow circular stroke matching the typography's stem thickness and cap alignment,
 * with a luminous 4-point star perfectly fitted into the counter and emitting a subtle electric-blue bloom.
 */
function BrandSparkleLetterO({ isLight = false }: { isLight?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="inline-block select-none pointer-events-none shrink-0"
      style={{
        width: "0.56em",
        height: "0.56em",
        verticalAlign: "-0.05em",
        margin: "0 0.02em",
        overflow: "visible",
      }}
    >
      {/* Outer Cyan Ring: 100% Hollow Circle matching font stroke thickness */}
      <circle
        cx="12"
        cy="12"
        r="8.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.6"
      />

      {/* Subtle electric-blue glow and soft bloom behind the star */}
      <circle
        cx="12"
        cy="12"
        r="4.6"
        fill={isLight ? "#007ba8" : "#00e5ff"}
        opacity={isLight ? 0.12 : 0.2}
        style={{ filter: "blur(1.5px)" }}
      />

      {/* Luminous 4-Point Sparkle Star - perfectly fitted inside the counter */}
      <path
        d="M 12 6.8 Q 13.5 10.5 17.2 12 Q 13.5 13.5 12 17.2 Q 10.5 13.5 6.8 12 Q 10.5 10.5 12 6.8 Z"
        fill={isLight ? "#004b66" : "#ffffff"}
        style={{
          filter: isLight
            ? "none"
            : "drop-shadow(0 0 1.2px #ffffff) drop-shadow(0 0 3.2px rgba(0, 229, 255, 0.95)) drop-shadow(0 0 6px rgba(0, 160, 255, 0.4))",
        }}
      />

      {/* Central bright glint */}
      <circle cx="12" cy="12" r="1.1" fill={isLight ? "#004b66" : "#ffffff"} />
    </svg>
  );
}

/**
 * Inline brand text helper matching reference branding:
 * "EduNova" in Electric Cyan with sparkle in 'o', "Forge" in Fiery Orange.
 */
export function EduNovaBrandText({
  className = "",
  showForge = true,
}: {
  className?: string;
  showForge?: boolean;
}) {
  return (
    <span className={`inline-flex items-baseline font-bold tracking-tight whitespace-nowrap select-none ${className}`}>
      <span className="text-[#00e5ff] inline-flex items-baseline">
        <span>EduN</span>
        <BrandSparkleLetterO isLight={false} />
        <span>va</span>
      </span>
      {showForge && (
        <span className="ml-1 text-[#ff7828]">
          Forge
        </span>
      )}
    </span>
  );
}

export function EduNovaForgeLogo({
  className = "",
  size = "md",
  showTagline = true,
  theme = "auto",
}: EduNovaForgeLogoProps) {
  const sizeClasses = {
    sm: {
      text: "text-lg md:text-xl",
      tagline: "text-[6.5px] md:text-[7.5px] tracking-[0.12em] md:tracking-[0.14em] mt-0.5",
    },
    md: {
      text: "text-xl md:text-2xl",
      tagline: "text-[7.5px] md:text-[8.5px] tracking-[0.12em] md:tracking-[0.15em] mt-0.5",
    },
    lg: {
      text: "text-3xl md:text-4xl",
      tagline: "text-[9px] md:text-[10px] tracking-[0.14em] md:tracking-[0.16em] mt-1",
    },
    xl: {
      text: "text-4xl md:text-5xl",
      tagline: "text-[11px] md:text-[12px] tracking-[0.16em] md:tracking-[0.18em] mt-1",
    },
  }[size];

  const isLight = theme === "light";

  return (
    <div className={`relative flex flex-col select-none leading-none shrink-0 group ${className}`}>
      {/* Main Brand Text: "EduNova" (Vibrant Cyan) + "Forge" (Fiery Orange) */}
      <div
        className={`relative inline-flex items-baseline font-bold tracking-tight leading-none whitespace-nowrap shrink-0 ${sizeClasses.text}`}
      >
        {/* EduNova in Vibrant Cyan with correctly fitted sparkle star inside 'o' */}
        <span
          className={`font-bold tracking-tight inline-flex items-baseline transition-colors duration-200 ${
            isLight ? "text-[#007ba8]" : "text-[#00e5ff]"
          }`}
          style={{ fontFamily: "var(--font-geist-sans), 'Inter', 'Montserrat', sans-serif" }}
        >
          <span>EduN</span>
          {/* Perfectly fitted 4-point sparkle star inside centered circular counter */}
          <BrandSparkleLetterO isLight={isLight} />
          <span>va</span>
        </span>

        {/* Forge in Fiery Orange */}
        <span
          className={`ml-1.5 font-bold tracking-tight inline-flex items-baseline transition-colors duration-200 ${
            isLight ? "text-[#c2410c]" : "text-[#ff7828]"
          }`}
          style={{ fontFamily: "var(--font-geist-sans), 'Inter', 'Montserrat', sans-serif" }}
        >
          Forge
        </span>
      </div>

      {/* Tagline: "DISCOVER • BUILD • BRING IDEAS TO LIFE" */}
      {showTagline && (
        <div
          className={`flex items-center gap-1 uppercase font-bold whitespace-nowrap shrink-0 ${sizeClasses.tagline} ${
            isLight ? "text-[#002060]/90" : "text-slate-200/95"
          }`}
          style={{ fontFamily: "var(--font-geist-sans), 'Inter', sans-serif" }}
        >
          <span className="whitespace-nowrap shrink-0">DISCOVER</span>
          <span className="text-[#00e5ff] font-black shrink-0 leading-none select-none">•</span>
          <span className="whitespace-nowrap shrink-0">BUILD</span>
          <span className="text-[#00e5ff] font-black shrink-0 leading-none select-none">•</span>
          <span className="whitespace-nowrap shrink-0">BRING IDEAS TO LIFE</span>
        </div>
      )}
    </div>
  );
}

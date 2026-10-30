"use client";

import React from "react";

interface EfMonogramLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EfMonogramLogo({
  className = "",
  size = "md",
}: EfMonogramLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-auto",
    md: "h-10 md:h-[44px] w-auto",
    lg: "h-12 md:h-14 w-auto",
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {/* 3D EF Monogram Emblem with transparent background */}
      <img
        src="/ef-logo.png"
        alt="EduNova Forge Monogram"
        className={`relative z-10 ${sizeClasses} object-contain transition-transform duration-300 group-hover:scale-105`}
        draggable={false}
      />
    </div>
  );
}

"use client";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glowOnHover?: boolean;
  onClick?: () => void;
}

/**
 * Card — hover identity: image pans x:-8px (lateral drift, not zoom/lift).
 * A category badge within the card tilts -1.5deg via CSS group-hover.
 * No whileHover scale. No y-lift. Feels grounded, not floating.
 *
 * Animation is CSS-only via Tailwind group-hover utilities applied to
 * children — no Framer motion on the card itself. This avoids the
 * generic "every card lifts on hover" AI tell.
 */
export function Card({ children, className = "", glowOnHover = false, onClick }: CardProps) {
  const hasCustomBg = className.includes("bg-");
  return (
    <div
      onClick={onClick}
      className={`${hasCustomBg ? "" : "surface-card"} rounded-2xl p-5 group/card transition-all duration-300 ${
        glowOnHover
          ? "hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

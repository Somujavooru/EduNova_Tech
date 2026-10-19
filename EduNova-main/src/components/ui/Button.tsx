"use client";
import { motion, useAnimation } from "framer-motion";
import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  as?: "button" | "div" | "span";
}

/**
 * Button — each variant has its own animation identity:
 *
 * primary:   amber underline wipes left→right on hover (via CSS .btn-underline)
 *            + text nudges x:2px. whileTap: brightness drop, no scale.
 * secondary: border + bg opacity transition only. No movement at all.
 * outline:   background floods in. No movement.
 * ghost:     simple color fade. No movement.
 *
 * NO variant uses scale on hover — that's the generic AI default.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  as = "button",
  ...props
}: ButtonProps) {

  const base = "relative inline-flex items-center justify-center font-medium rounded-lg overflow-hidden select-none";

  const variants = {
    // Primary: warm amber fill. Underline wipe via .btn-underline CSS class.
    primary: "btn-underline bg-amber-600 text-stone-950 border border-amber-500/60 font-semibold",
    // Secondary: stone surface. Border brightens on hover — no movement.
    secondary: "bg-stone-800 text-stone-100 border border-stone-700 hover:border-stone-500 hover:bg-stone-700 transition-colors duration-200",
    // Outline: amber text, border. Background floods amber on hover.
    outline: "bg-transparent text-amber-500 border border-amber-500/50 hover:bg-amber-600/10 hover:text-amber-400 transition-colors duration-200",
    // Ghost: no background, no border. Color fade only.
    ghost: "bg-transparent text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] transition-colors duration-200",
  };

  const sizes = {
    sm: "text-sm px-4 py-1.5 gap-1.5",
    md: "text-sm px-5 py-2.5 gap-2",
    lg: "text-base px-7 py-3.5 gap-2.5 font-semibold",
  };

  // Primary-specific hover: nudge text x:2px. Other variants: no motion.
  const primaryHover = variant === "primary"
    ? { x: 1 }
    : {};

  // tap: brightness only, no scale
  const tapAnim = variant === "primary"
    ? { filter: "brightness(0.88)" }
    : { filter: "brightness(0.92)" };

  const Component = as === "div" ? motion.div : as === "span" ? motion.span : motion.button;

  return (
    <Component
      whileHover={primaryHover}
      whileTap={tapAnim}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      suppressHydrationWarning
      {...(props as any)}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </Component>
  );
}

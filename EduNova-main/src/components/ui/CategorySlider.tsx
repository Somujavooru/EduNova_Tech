"use client";

import { motion } from "framer-motion";
import { categories, CategoryKey } from "@/lib/data/categories";

interface Props {
  activeCategory?: CategoryKey | null;
  onSelect?: (categoryId: CategoryKey) => void;
}

/**
 * CategorySlider — animation identities:
 * - Entrance: items slide in from x:-12px (not y:20px — that's the AI default).
 *   Stagger delay is slightly uneven: i * 0.05 + (i%3 === 0 ? 0.02 : 0)
 *   so groups of 3 don't fire in perfect sync.
 * - Hover: icon ring expands from center (scale 0.8→1 on the icon bg).
 *   Text slides left 3px. No y-movement. Feels lateral, not floating.
 * - Every 3rd card (on desktop) is offset down by -translate-y-2
 *   to break the uniform grid row alignment.
 * - "N specializations" copy removed — it's meaningless UI filler.
 */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0 } }, // manual per-item delays below
};

export function CategorySlider({ activeCategory, onSelect }: Props) {
  return (
    <div className="w-full px-4 md:px-8 xl:px-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
      >
        {categories.map((category, i) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          // Slightly uneven stagger: pairs of 2 fire close but not identically
          const delay = i * 0.05 + (i % 3 === 0 ? 0.02 : 0);
          // Every 3rd item on desktop gets a slight downward offset
          const offsetClass = i % 3 === 2 ? "lg:translate-y-2" : "";

          return (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.35,
                delay,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={() => onSelect?.(category.id)}
              className={`group relative flex items-center gap-3.5 px-4 py-4 rounded-xl border text-left transition-colors duration-200 ${offsetClass} ${
                isActive
                  ? "bg-amber-500/8 border-amber-500/35 [background-color:rgba(217,119,6,0.08)]"
                  : "bg-stone-900 border-stone-800 hover:border-stone-600"
              }`}
            >
              {/* Icon container — ring expands from center on hover */}
              <div
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-250 ${
                  isActive
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-stone-800 text-stone-500 group-hover:bg-stone-700 group-hover:text-stone-300"
                }`}
                style={{ transitionDuration: "250ms" }}
              >
                {/* Ring that expands on hover */}
                <span
                  className={`absolute inset-0 rounded-lg border transition-all duration-300 ${
                    isActive
                      ? "border-amber-500/30 scale-100 opacity-100"
                      : "border-stone-600/0 scale-[0.85] opacity-0 group-hover:border-stone-600/70 group-hover:scale-100 group-hover:opacity-100"
                  }`}
                />
                <Icon className="w-4.5 h-4.5 relative z-10" />
              </div>

              {/* Text — slides 3px left on hover, no y-movement */}
              <div
                className="flex-1 min-w-0 transition-transform duration-250 group-hover:-translate-x-[3px]"
                style={{ transitionDuration: "250ms" }}
              >
                <h3 className={`font-medium text-sm truncate transition-colors duration-150 ${
                  isActive ? "text-stone-100" : "text-stone-400 group-hover:text-stone-200"
                }`}>
                  {category.name}
                </h3>
              </div>

              {/* Active dot — amber, right edge */}
              {isActive && (
                <motion.span
                  layoutId="active-category-dot"
                  className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

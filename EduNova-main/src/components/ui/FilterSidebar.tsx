"use client";

import { useState } from "react";
import { categories, CategoryKey } from "@/lib/data/categories";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  selectedCategories: CategoryKey[];
  selectedSubCategories: string[];
  onToggleCategory: (id: CategoryKey) => void;
  onToggleSubCategory: (id: string) => void;
  onClearAll: () => void;
}

export function FilterSidebar({ 
  selectedCategories, 
  selectedSubCategories,
  onToggleCategory,
  onToggleSubCategory,
  onClearAll
}: Props) {
  // All categories open by default for visibility, but they can be toggled
  const [openCategories, setOpenCategories] = useState<string[]>(categories.map(c => c.id));

  const toggleAccordion = (id: string) => {
    setOpenCategories(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-[#0c1020]/85 backdrop-blur-2xl border border-cyan-500/20 shadow-[0_16px_50px_rgba(0,0,0,0.6)] rounded-2xl p-5 flex flex-col gap-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          Filters
        </h2>
        {(selectedCategories.length > 0 || selectedSubCategories.length > 0) && (
          <button onClick={onClearAll} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
            Clear All
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {categories.map(category => {
          const isSelected = selectedCategories.includes(category.id);
          const isOpen = openCategories.includes(category.id);
          
          return (
            <div key={category.id} className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-black/20">
              {/* Category Header / Accordion Toggle */}
              <div className="flex items-center justify-between p-3 cursor-pointer group hover:bg-white/5 transition-colors" onClick={() => toggleAccordion(category.id)}>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCategory(category.id);
                    }}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all duration-200 ${
                      isSelected 
                        ? "bg-[var(--color-neon-purple)] border-[var(--color-neon-purple)] shadow-[0_0_8px_rgba(176,38,255,0.5)]" 
                        : "bg-white/5 border-white/20 hover:border-[var(--color-neon-purple)]/50"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className={`text-sm font-bold transition-colors ${isSelected ? "text-[var(--color-neon-purple)] text-shadow-glow-purple" : "text-gray-300 group-hover:text-white"}`}>
                    {category.name}
                  </span>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </motion.div>
              </div>
              
              {/* Subcategories (Expandable) */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-1.5 p-3 pt-0 pl-11 bg-black/40">
                      {category.subCategories.map(sub => {
                        const subSelected = selectedSubCategories.includes(sub.id);
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onToggleSubCategory(sub.id)}
                            className="flex items-center gap-3 cursor-pointer group text-left w-full py-1.5 rounded-lg px-2 hover:bg-[var(--color-neon-blue)]/10 transition-colors"
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all duration-200 ${
                              subSelected 
                                ? "bg-[var(--color-neon-blue)] border-[var(--color-neon-blue)] shadow-[0_0_8px_rgba(0,240,255,0.5)]" 
                                : "bg-white/5 border-white/20 group-hover:border-[var(--color-neon-blue)]/50"
                            }`}>
                              {subSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className={`text-xs font-medium transition-colors ${subSelected ? "text-[var(--color-neon-blue)] text-shadow-glow-blue" : "text-gray-400 group-hover:text-gray-200"}`}>
                              {sub.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

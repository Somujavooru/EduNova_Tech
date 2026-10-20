"use client";

import { useState, useMemo } from "react";
import { categories, CategoryKey } from "@/lib/data/categories";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  selectedCategories: CategoryKey[];
  selectedSubCategories: string[];
  onToggleCategory: (id: CategoryKey) => void;
  onToggleSubCategory: (id: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function FilterSidebar({ 
  selectedCategories, 
  selectedSubCategories,
  onToggleCategory,
  onToggleSubCategory,
  onClearAll,
  className = ""
}: Props) {
  const [filterSearch, setFilterSearch] = useState("");

  // Open categories with active selections, or first 2 by default
  const [openCategories, setOpenCategories] = useState<string[]>(() => {
    if (selectedCategories.length > 0) return selectedCategories;
    return ["software", "web"];
  });

  const toggleAccordion = (id: string) => {
    setOpenCategories(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const visibleCategories = useMemo(() => {
    const q = filterSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(cat => {
      const matchCat = cat.name.toLowerCase().includes(q);
      const matchSub = cat.subCategories.some(sub => sub.name.toLowerCase().includes(q));
      return matchCat || matchSub;
    });
  }, [filterSearch]);

  return (
    <div className={`bg-[#0c1020]/85 backdrop-blur-2xl border border-cyan-500/20 shadow-[0_16px_50px_rgba(0,0,0,0.6)] rounded-2xl p-4 sm:p-5 flex flex-col h-full min-h-[460px] max-h-[520px] ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          Filter Projects
        </h2>
        {(selectedCategories.length > 0 || selectedSubCategories.length > 0) && (
          <button onClick={onClearAll} className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold hover:underline cursor-pointer">
            Clear All
          </button>
        )}
      </div>

      {/* Filter Category Search Bar */}
      <div className="relative mt-3 shrink-0">
        <Search className="w-3.5 h-3.5 text-cyan-400/60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Filter categories & tech..."
          className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/60 transition-colors"
        />
        {filterSearch && (
          <button
            onClick={() => setFilterSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 min-w-0 pr-1 mt-3">
        {visibleCategories.map(category => {
          const isSelected = selectedCategories.includes(category.id);
          const isOpen = filterSearch ? true : openCategories.includes(category.id);
          
          return (
            <div key={category.id} className="flex flex-col border border-white/5 rounded-xl overflow-hidden bg-black/20 shrink-0">
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

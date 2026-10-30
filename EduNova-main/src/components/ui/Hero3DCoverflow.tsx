"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/lib/data/mockProjects";
import { Star, ChevronLeft, ChevronRight, ArrowRight, Sparkles, Play, Pause } from "lucide-react";
import Link from "next/link";

interface Props {
  projects: Project[];
}

function getOffset(index: number, active: number, total: number): number {
  let diff = index - active;
  while (diff > total / 2) diff -= total;
  while (diff < -total / 2) diff += total;
  return diff;
}

export function Hero3DCoverflow({ projects }: { projects: Project[] }) {
  // Curate order with flagship high-complexity engineering projects
  const orderedProjects = [
    projects.find(p => p.id === "proj-predictive-maintenance") || projects.find(p => p.id === "p6" || p.category === "web"),
    projects.find(p => p.id === "proj-solar-agri-robot") || projects.find(p => p.id === "p1" || p.category === "iot" || p.category === "hardware"),
    projects.find(p => p.id === "proj-ai-skill-agent") || projects.find(p => p.id === "p2" || p.category === "aiml"),
    projects.find(p => p.id === "proj-esp32-cam-display") || projects.find(p => p.id === "p7" || p.category === "embedded"),
    projects.find(p => p.id === "proj-hospital-appointment") || projects.find(p => p.id === "p3" || p.category === "web"),
    projects.find(p => p.id === "proj-gas-leakage") || projects.find(p => p.category === "hardware"),
  ].filter((p): p is Project => Boolean(p));

  const items = orderedProjects.length > 0 ? orderedProjects : projects;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play interval: rotates to next card every 5 seconds when in viewport
  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden && window.scrollY < 400) {
        setCurrentIndex(prev => (prev + 1) % items.length);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  if (items.length === 0) return null;

  const count = items.length;
  const currentProject = items[currentIndex];

  const categoryLabels: Record<string, string> = {
    web: "Web App",
    mobile: "Mobile App",
    iot: "IoT & Embedded",
    hardware: "Hardware & Embedded",
    aiml: "AI & Machine Learning",
    cybersecurity: "Cybersecurity & Networks",
    cloud: "Cloud & DevOps",
    blockchain: "Blockchain & Web3",
    software: "Software & Desktop",
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + count) % count);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % count);
  };

  // 3D positioning variant helper for buttery smooth sliding transitions
  const getCardAnimation = (offset: number) => {
    if (offset === 0) {
      return {
        x: "0%",
        scale: 1,
        rotateY: 0,
        zIndex: 30,
        opacity: 1,
        filter: "brightness(1)",
      };
    }
    if (offset === -1) {
      return {
        x: "-52%",
        scale: 0.83,
        rotateY: 22,
        zIndex: 18,
        opacity: 0.65,
        filter: "brightness(0.75)",
      };
    }
    if (offset === 1) {
      return {
        x: "52%",
        scale: 0.83,
        rotateY: -22,
        zIndex: 18,
        opacity: 0.65,
        filter: "brightness(0.75)",
      };
    }
    if (offset === -2) {
      return {
        x: "-88%",
        scale: 0.68,
        rotateY: 34,
        zIndex: 8,
        opacity: 0,
        filter: "brightness(0.4)",
      };
    }
    if (offset === 2) {
      return {
        x: "88%",
        scale: 0.68,
        rotateY: -34,
        zIndex: 8,
        opacity: 0,
        filter: "brightness(0.4)",
      };
    }
    return {
      x: offset > 0 ? "110%" : "-110%",
      scale: 0.55,
      rotateY: offset > 0 ? -40 : 40,
      zIndex: 2,
      opacity: 0,
      filter: "brightness(0.3)",
    };
  };

  return (
    <div
      className="relative w-full max-w-xl mx-auto select-none py-1"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ambient glowing radial spotlight behind carousel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Banner Tag & Category Indicator with Controls on Right (Reference Image 2) */}
      <div className="flex items-center justify-between mb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
          <span className="text-[10px] xl:text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
            FEATURED PROJECTS
          </span>
          <span className="text-[10px] text-stone-500 font-mono">
            • {currentIndex + 1} of {count}
          </span>
        </div>

        {/* Previous & Next Navigation Arrows in Top-Right */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Previous project"
            aria-label="Previous project"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Next project"
            aria-label="Next project"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── 3D Stage / Perspective Viewport ── */}
      <div
        className="relative h-[260px] sm:h-[275px] xl:h-[285px] w-full flex items-center justify-center overflow-visible"
        style={{ perspective: "1200px" }}
      >
        {items.map((project, index) => {
          const offset = getOffset(index, currentIndex, count);
          const isCenter = offset === 0;
          const isPeeking = Math.abs(offset) === 1;
          const isInteractive = Math.abs(offset) <= 1;

          return (
            <motion.div
              key={project.id}
              onClick={() => {
                if (offset === -1) handlePrev();
                else if (offset === 1) handleNext();
                else if (!isCenter) setCurrentIndex(index);
              }}
              initial={false}
              animate={getCardAnimation(offset)}
              transition={{
                duration: 0.55,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                transformStyle: "preserve-3d",
                pointerEvents: isInteractive ? "auto" : "none",
              }}
              className={`absolute w-[270px] sm:w-[295px] xl:w-[320px] rounded-xl overflow-hidden flex flex-col transition-shadow duration-300 ${
                isCenter
                  ? "border-2 border-cyan-400/50 bg-gradient-to-b from-[#131b33] via-[#0d1224] to-[#070a14] shadow-[0_12px_35px_rgba(6,182,212,0.22)]"
                  : "border border-white/10 bg-[#0c1020]/95 shadow-xl cursor-pointer hover:border-cyan-500/30"
              }`}
              title={!isCenter ? `Click to view ${project.title}` : undefined}
            >
              {/* Postcard banner preview */}
              <div className="relative h-26 sm:h-28 xl:h-30 bg-black overflow-hidden border-b border-cyan-500/20 group">
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    isCenter ? "group-hover:scale-105" : ""
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1224] via-transparent to-transparent pointer-events-none" />

                {/* Category tag */}
                <span
                  className={`absolute top-1.5 left-1.5 text-[8.5px] px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                    isCenter
                      ? "bg-black/80 text-cyan-300 border-cyan-500/40"
                      : "bg-black/80 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {categoryLabels[project.category] || project.category}
                </span>

                {/* Rating badge */}
                <span className="absolute top-1.5 right-1.5 text-[8.5px] px-1.5 py-0.5 rounded-md bg-black/80 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 backdrop-blur-md shadow-md">
                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  {project.rating}{" "}
                  <span className="text-gray-400 font-normal">({project.reviewsCount})</span>
                </span>
              </div>

              {/* Body details */}
              <div className="p-2.5 sm:p-3 flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xs sm:text-[13px] font-bold text-white line-clamp-1 mb-0.5 tracking-tight">
                    {project.title}
                  </h3>
                  <p className="text-stone-400 text-[9.5px] sm:text-[10px] line-clamp-2 leading-tight mb-1.5">
                    {project.description}
                  </p>

                  {/* Tech Stack Tags */}
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {project.techStack.slice(0, 4).map((tech, i) => (
                      <span
                        key={i}
                        className="text-[8.5px] px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-cyan-200/90 font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.techStack.length > 4 && (
                      <span className="text-[8.5px] px-1 py-0.5 rounded-md bg-white/[0.04] text-gray-400 font-mono">
                        +{project.techStack.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & CTA Action */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                  <div>
                    <p className="text-[7.5px] text-gray-500 uppercase tracking-wider font-semibold leading-tight">
                      Verified Price
                    </p>
                    <p className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 leading-tight">
                      ₹{project.price.toLocaleString("en-IN")}
                    </p>
                  </div>

                  {isCenter ? (
                    <Link
                      href={`/marketplace?project=${project.id}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-[10px] font-bold shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  ) : (
                    <span className="text-[10px] font-medium text-cyan-400/80 flex items-center gap-1 group-hover:text-cyan-300">
                      <span>Click to focus</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

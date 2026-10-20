"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/lib/data/mockProjects";
import { Star, ChevronLeft, ChevronRight, ArrowRight, Sparkles, Play, Pause } from "lucide-react";
import Link from "next/link";

interface Props {
  projects: Project[];
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

  // Auto-play interval: rotates to next card every 4 seconds
  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isPaused, items.length]);

  if (items.length === 0) return null;

  const count = items.length;
  const prevIndex = (currentIndex - 1 + count) % count;
  const nextIndex = (currentIndex + 1) % count;

  const currentProject = items[currentIndex];
  const prevProject = items[prevIndex];
  const nextProject = items[nextIndex];

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

  const handlePrev = () => setCurrentIndex(prevIndex);
  const handleNext = () => setCurrentIndex(nextIndex);

  return (
    <div
      className="relative w-full max-w-xl mx-auto select-none py-1"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Ambient glowing radial spotlight behind carousel */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-cyan-500/15 via-blue-500/10 to-amber-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Banner Tag & Category Indicator */}
      <div className="flex items-center justify-between mb-2.5 px-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
          </span>
          <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            {categoryLabels[currentProject.category] || currentProject.category}
          </span>
          <span className="text-[11px] text-gray-500 font-mono">
            • {currentIndex + 1} of {count}
          </span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          Ready to Deploy
        </div>
      </div>

      {/* ── 3D Stage / Perspective Viewport ── */}
      <div
        className="relative h-[415px] sm:h-[435px] w-full flex items-center justify-center overflow-visible"
        style={{ perspective: "1100px" }}
      >
        {/* ── LEFT PEEKING POSTER (Previous) ── */}
        <motion.div
          key={`prev-${prevProject.id}`}
          onClick={handlePrev}
          initial={{ opacity: 0, scale: 0.75, x: "-70%", rotateY: 35 }}
          animate={{
            opacity: 0.55,
            scale: 0.82,
            x: "-50%",
            rotateY: 24,
            zIndex: 10,
            filter: "brightness(0.65) blur(0.5px)",
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[270px] sm:w-[310px] rounded-2xl overflow-hidden border border-white/10 bg-[#0c1020]/95 shadow-2xl cursor-pointer hover:opacity-75 transition-opacity"
          style={{ transformStyle: "preserve-3d" }}
          title={`Click to view ${prevProject.title}`}
        >
          <div className="relative h-36 sm:h-38 bg-black overflow-hidden pointer-events-none">
            <img
              src={prevProject.thumbnail}
              alt={prevProject.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1020] via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded bg-black/80 text-amber-300 font-bold uppercase tracking-wider">
              {categoryLabels[prevProject.category] || prevProject.category}
            </span>
          </div>
          <div className="p-3.5 pointer-events-none">
            <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{prevProject.title}</h4>
            <p className="text-[10px] text-gray-400 line-clamp-2">{prevProject.description}</p>
            <div className="mt-2.5 flex items-center justify-between text-xs font-black text-amber-400">
              <span>₹{prevProject.price.toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-gray-400 font-normal">★ {prevProject.rating}</span>
            </div>
          </div>
        </motion.div>

        {/* ── CENTER ACTIVE POSTER (Main Spotlight) ── */}
        <motion.div
          key={`active-${currentProject.id}`}
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: "0%",
            rotateY: 0,
            zIndex: 30,
            filter: "brightness(1) blur(0px)",
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[310px] sm:w-[350px] rounded-2xl overflow-hidden border-2 border-cyan-400/50 bg-gradient-to-b from-[#131b33] via-[#0d1224] to-[#070a14] shadow-[0_20px_60px_rgba(6,182,212,0.25)] flex flex-col"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Postcard banner preview */}
          <div className="relative h-40 sm:h-44 bg-black overflow-hidden border-b border-cyan-500/20 group">
            <img
              src={currentProject.thumbnail}
              alt={currentProject.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d1224] via-transparent to-transparent pointer-events-none" />

            {/* Category tag */}
            <span className="absolute top-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-lg bg-black/80 text-cyan-300 border border-cyan-500/40 font-bold uppercase tracking-wider backdrop-blur-md shadow-md">
              {categoryLabels[currentProject.category] || currentProject.category}
            </span>

            {/* Rating badge */}
            <span className="absolute top-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-lg bg-black/80 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 backdrop-blur-md shadow-md">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {currentProject.rating} <span className="text-gray-400 font-normal">({currentProject.reviewsCount})</span>
            </span>
          </div>

          {/* Body details */}
          <div className="p-4 sm:p-4.5 flex flex-col justify-between flex-1">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white line-clamp-1 mb-1 tracking-tight">
                {currentProject.title}
              </h3>
              <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-2.5">
                {currentProject.description}
              </p>

              {/* Tech Stack Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {currentProject.techStack.slice(0, 4).map((tech, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-cyan-200/90 font-medium"
                  >
                    {tech}
                  </span>
                ))}
                {currentProject.techStack.length > 4 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-gray-400 font-mono">
                    +{currentProject.techStack.length - 4}
                  </span>
                )}
              </div>
            </div>

            {/* Price & CTA Action */}
            <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
              <div>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Verified Price</p>
                <p className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                  ₹{currentProject.price.toLocaleString("en-IN")}
                </p>
              </div>

              <Link
                href={`/marketplace?project=${currentProject.id}`}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ── RIGHT PEEKING POSTER (Next) ── */}
        <motion.div
          key={`next-${nextProject.id}`}
          onClick={handleNext}
          initial={{ opacity: 0, scale: 0.75, x: "70%", rotateY: -35 }}
          animate={{
            opacity: 0.55,
            scale: 0.82,
            x: "50%",
            rotateY: -24,
            zIndex: 10,
            filter: "brightness(0.65) blur(0.5px)",
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="absolute w-[270px] sm:w-[310px] rounded-2xl overflow-hidden border border-white/10 bg-[#0c1020]/95 shadow-2xl cursor-pointer hover:opacity-75 transition-opacity"
          style={{ transformStyle: "preserve-3d" }}
          title={`Click to view ${nextProject.title}`}
        >
          <div className="relative h-36 sm:h-38 bg-black overflow-hidden pointer-events-none">
            <img
              src={nextProject.thumbnail}
              alt={nextProject.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1020] via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 text-[9px] px-2 py-0.5 rounded bg-black/80 text-amber-300 font-bold uppercase tracking-wider">
              {categoryLabels[nextProject.category] || nextProject.category}
            </span>
          </div>
          <div className="p-3.5 pointer-events-none">
            <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{nextProject.title}</h4>
            <p className="text-[10px] text-gray-400 line-clamp-2">{nextProject.description}</p>
            <div className="mt-2.5 flex items-center justify-between text-xs font-black text-amber-400">
              <span>₹{nextProject.price.toLocaleString("en-IN")}</span>
              <span className="text-[10px] text-gray-400 font-normal">★ {nextProject.rating}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Bottom Controls: Navigation Arrows + Autoplay Notice + Dots ── */}
      <div className="mt-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 px-2">
        {/* Navigation Arrows */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Previous project"
            aria-label="Previous project"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Next project"
            aria-label="Next project"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* User Hint (Matches reference screenshot: "Autoplay • Tap a poster to focus") */}
        <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/[0.03] border border-white/10 px-3 py-1.5 rounded-full">
          {isPaused ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Pause className="w-3 h-3" /> Paused
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Play className="w-3 h-3 fill-cyan-400" /> Autoplay
            </span>
          )}
          <span className="text-gray-600">•</span>
          <span>Tap a poster to focus</span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-6 bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                  : "w-2 bg-white/20 hover:bg-white/40"
              }`}
              title={`Switch to ${item.title}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

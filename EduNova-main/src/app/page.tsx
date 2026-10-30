"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  ArrowRight,
  GraduationCap,
  ShoppingCart,
  Cog,
  CheckCircle2,
  Star,
  ChevronRight,
} from "lucide-react";
import { Project, getPublicProjects, mockProjects } from "@/lib/data/mockProjects";
import { categories } from "@/lib/data/categories";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { HomeBackground } from "@/components/backgrounds/HomeBackground";
import { Hero3DCoverflow } from "@/components/ui/Hero3DCoverflow";

const APPROVED = mockProjects.filter(p => p.status === "approved");
const TOTAL_PROJECTS = APPROVED.length;
const TOTAL_CATEGORIES = categories.length;
const AVG_RATING = (
  APPROVED.reduce((s, p) => s + p.rating, 0) / (APPROVED.length || 1)
).toFixed(1);

const COUNT_BY_CATEGORY: Record<string, number> = {};
for (const p of APPROVED) {
  COUNT_BY_CATEGORY[p.category] = (COUNT_BY_CATEGORY[p.category] ?? 0) + 1;
}

const INITIAL_FEATURED: Project[] = (() => {
  const preferred = [
    APPROVED.find(p => p.id === "proj-predictive-maintenance"),
    APPROVED.find(p => p.id === "proj-solar-agri-robot"),
    APPROVED.find(p => p.id === "proj-ai-skill-agent"),
    APPROVED.find(p => p.id === "proj-gas-leakage"),
  ].filter((p): p is Project => Boolean(p));

  if (preferred.length >= 3) return preferred.slice(0, 3);
  const remaining = APPROVED.filter(p => !preferred.some(pr => pr.id === p.id));
  return [...preferred, ...remaining].slice(0, 3);
})();

export default function Home() {
  const router = useRouter();
  const [projectsList, setProjectsList] = useState<Project[]>(APPROVED);
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>(INITIAL_FEATURED);

  useEffect(() => {
    getPublicProjects().then(all => {
      const approved = all.filter(p => p.status === "approved");
      if (approved.length > 0) {
        setProjectsList(approved);
      }

      const flagshipIds = [
        "proj-predictive-maintenance",
        "proj-solar-agri-robot",
        "proj-ai-skill-agent",
        "proj-esp32-cam-display",
        "proj-hospital-appointment",
        "proj-gas-leakage",
        "p3",
      ];

      const flagshipProjects = flagshipIds
        .map(id => approved.find(p => p.id === id))
        .filter((p): p is Project => Boolean(p));

      const otherComplex = approved
        .filter(p => !flagshipIds.includes(p.id))
        .filter(p => {
          const t = p.title.toLowerCase();
          return !t.includes("turtle") && !t.includes("drawing") && !t.includes("flag") && !t.includes("rose");
        })
        .sort((a, b) => b.price - a.price);

      const combined = [...flagshipProjects, ...otherComplex];
      if (combined.length > 0) {
        setFeaturedProjects(combined.slice(0, 3));
      }
    });
  }, []);

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/marketplace?category=${categoryId}`);
  };

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* ── Living Engineering Blueprint Cosmos & Solar Plasma Background ── */}
      <HomeBackground />

      {/* ── Main Viewport Container (Fold 1) — Proportional flexbox ensuring full view of Hero + Service Cards at 1920x1080 ── */}
      <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 flex flex-col justify-start lg:justify-center min-h-[calc(100vh-56px)] gap-2 sm:gap-3 xl:gap-4 py-2 xl:py-3">
        
        {/* ── Hero Section (Two columns: brand message left, 3D carousel right) ── */}
        <section className="relative w-full pt-0.5 pb-1 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8 xl:gap-10 items-center">

            {/* Left Column — Brand & Mission Copy */}
            <div className="max-w-xl xl:max-w-2xl">
              {/* Category Indicator Pill */}
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="inline-flex items-center gap-2 sm:gap-2.5 px-3 py-1 rounded-full bg-[#0d1527]/90 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,229,255,0.2)] mb-2 xl:mb-2.5 backdrop-blur-md"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#00e5ff]" />
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider text-cyan-300 uppercase">STUDENTS</span>
                <span className="text-stone-600 select-none">•</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#ff7828]" />
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider text-amber-300 uppercase">BUSINESSES</span>
                <span className="text-stone-600 select-none">•</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-wider text-purple-300 uppercase">AUTOMATION</span>
              </motion.div>

              {/* Main Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black leading-[1.08] tracking-tight text-white mb-2.5 xl:mb-3"
              >
                Ideas Into{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff7828] via-[#f59e0b] to-[#fbbf24] drop-shadow-[0_0_25px_rgba(255,120,40,0.4)]">
                  Reality.
                </span>
              </motion.h1>

              {/* Supporting Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="text-stone-300 text-sm sm:text-[15px] xl:text-[15.5px] leading-relaxed mb-3 xl:mb-4 font-normal max-w-xl"
              >
                Engineering projects, e-commerce platforms, and smart automation solutions — built to help students and businesses turn ideas into real-world solutions.
              </motion.p>

              {/* Three subtle visual indicators for categories */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3.5 xl:mb-4"
              >
                {/* For Students */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-cyan-950/80 border border-cyan-400/60 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                    <GraduationCap className="w-4.5 h-4.5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-cyan-300 leading-tight">For Students</p>
                    <p className="text-[10.5px] xl:text-[11px] text-stone-400 leading-tight mt-0.5">Explore, learn and build projects</p>
                  </div>
                </div>

                {/* For Businesses */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-amber-950/80 border border-amber-400/60 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(255,120,40,0.3)]">
                    <ShoppingCart className="w-4.5 h-4.5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-amber-300 leading-tight">For Businesses</p>
                    <p className="text-[10.5px] xl:text-[11px] text-stone-400 leading-tight mt-0.5">Launch online store and grow digitally</p>
                  </div>
                </div>

                {/* For Everyone */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-purple-950/80 border border-purple-400/60 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(192,132,252,0.3)]">
                    <Cog className="w-4.5 h-4.5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-purple-300 leading-tight">For Everyone</p>
                    <p className="text-[10.5px] xl:text-[11px] text-stone-400 leading-tight mt-0.5">Automate work and save time</p>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                className="flex flex-wrap items-center gap-3"
              >
                <a
                  href="#services"
                  className="inline-flex items-center justify-center gap-2 px-5.5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-stone-950 bg-gradient-to-r from-[#ff7828] to-[#f59e0b] hover:from-[#ff8838] hover:to-[#fbbf24] shadow-[0_0_20px_rgba(255,120,40,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Explore Our Services <ArrowRight className="w-4 h-4" />
                </a>
              </motion.div>
            </div>

            {/* Right Column — 3D Perspective Coverflow Carousel */}
            {projectsList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="w-full mt-1 lg:mt-0"
              >
                <Hero3DCoverflow projects={projectsList} />
              </motion.div>
            )}
          </div>
        </section>

        {/* ── Three Service Cards Directly Below the Hero (Reference Image 2) ── */}
        <section id="services" className="relative z-10 mt-1 sm:mt-1.5 xl:mt-2 pt-0 pb-1 xl:pb-2 scroll-mt-16 flex-shrink-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 xl:gap-4 items-stretch">

            {/* ── Card 1: Engineering Projects ── */}
            <div
              className="animate-hw-float-1 group relative rounded-xl bg-gradient-to-b from-[#0e1628]/95 via-[#090d1a]/95 to-[#05070e]/98 border-2 border-cyan-400/50 p-2.5 sm:p-3 xl:p-3.5 flex flex-col justify-between shadow-[0_0_20px_rgba(0,229,255,0.18)] hover:shadow-[0_0_35px_rgba(0,229,255,0.3)] hover:border-cyan-400 hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                {/* Header */}
                <div className="flex items-start gap-2.5 mb-1.5 xl:mb-2">
                  <div className="w-7.5 h-7.5 xl:w-8 xl:h-8 rounded-full bg-cyan-950/80 border-2 border-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,255,0.4)] text-cyan-300">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base xl:text-[17px] font-black text-[#00e5ff] tracking-tight leading-tight">
                      Engineering Projects
                    </h2>
                    <p className="text-[10px] xl:text-[10.5px] text-stone-300 leading-tight mt-0.5 line-clamp-2">
                      Mini-projects, final year projects and project resources for engineering students.
                    </p>
                  </div>
                </div>

                {/* Features & Visual Thumbnail */}
                <div className="grid grid-cols-12 gap-2.5 items-center mb-1.5 xl:mb-2">
                  <div className="col-span-7 flex flex-col gap-0.5 xl:gap-1">
                    {[
                      "Ready-made project resources",
                      "Custom project development",
                      "Documentation and guidance",
                      "Projects in IoT, AI, ML, Web, Embedded & more",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                        <span className="text-[9.5px] xl:text-[10.5px] text-stone-200 leading-tight font-medium">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-5">
                    <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-cyan-500/30 shadow-sm group-hover:border-cyan-400/60 transition-colors w-full max-w-[105px] xl:max-w-[120px] mx-auto">
                      <img
                        src="/services/engineering-projects.jpg"
                        alt="Engineering Projects robotics kit and code"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-1.5 xl:pt-2 border-t border-cyan-500/20 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[7.5px] xl:text-[8px] uppercase tracking-wider text-stone-400 font-semibold block leading-none">
                    Starting at
                  </span>
                  <span className="text-lg xl:text-xl font-black text-[#00e5ff] tracking-tight leading-none mt-0.5 block">
                    @499
                  </span>
                </div>
                <Link href="/marketplace">
                  <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] xl:text-[11px] text-stone-950 bg-[#00e5ff] hover:bg-[#38eeff] shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all active:scale-[0.98] cursor-pointer">
                    Explore Projects <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>

            {/* ── Card 2: E-Commerce Services ── */}
            <div
              className="animate-hw-float-2 group relative rounded-xl bg-gradient-to-b from-[#14121d]/95 via-[#0d0f19]/95 to-[#05060d]/98 border-2 border-amber-400/50 p-2.5 sm:p-3 xl:p-3.5 flex flex-col justify-between shadow-[0_0_22px_rgba(245,158,11,0.2)] hover:shadow-[0_0_38px_rgba(245,158,11,0.36)] hover:border-amber-400 hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                {/* Header */}
                <div className="flex items-start gap-2.5 mb-1.5 xl:mb-2">
                  <div className="w-7.5 h-7.5 xl:w-8 xl:h-8 rounded-full bg-amber-500/15 border-2 border-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)] text-amber-300">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base xl:text-[17px] font-black text-[#fbbf24] tracking-tight leading-tight">
                      E-Commerce Services
                    </h2>
                    <p className="text-[10px] xl:text-[10.5px] text-stone-300 leading-tight mt-0.5 line-clamp-2">
                      Launch your online store with modern shopping experiences and smart integration.
                    </p>
                  </div>
                </div>

                {/* Features & Visual Thumbnail */}
                <div className="grid grid-cols-12 gap-2.5 items-center mb-1.5 xl:mb-2">
                  <div className="col-span-7 flex flex-col gap-0.5 xl:gap-1">
                    {[
                      "E-commerce website development",
                      "Product catalog and payment integration",
                      "Shopping cart and order management",
                      "Custom e-commerce solutions",
                      "Maintenance and support",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-[9.5px] xl:text-[10.5px] text-stone-200 leading-tight font-medium">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-5">
                    <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)] group-hover:border-amber-400/60 transition-colors w-full max-w-[105px] xl:max-w-[120px] mx-auto">
                      <img
                        src="/services/ecommerce-services.jpg"
                        alt="E-Commerce store laptop and phone mockup"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-1.5 xl:pt-2 border-t border-amber-500/20 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[7.5px] xl:text-[8px] uppercase tracking-wider text-stone-400 font-semibold block leading-none">
                    Starting at
                  </span>
                  <span className="text-lg xl:text-xl font-black text-[#fbbf24] tracking-tight leading-none mt-0.5 block">
                    @999
                  </span>
                </div>
                <Link href="/requests?service=ecommerce">
                  <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] xl:text-[11px] text-stone-950 bg-gradient-to-r from-[#f59e0b] via-[#fbbf24] to-[#f59e0b] hover:from-[#fbbf24] hover:to-[#f59e0b] shadow-[0_0_14px_rgba(245,158,11,0.45)] transition-all active:scale-[0.98] cursor-pointer">
                    Explore E-Commerce Services <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>

            {/* ── Card 3: Automation Solutions ── */}
            <div
              className="animate-hw-float-3 group relative rounded-xl bg-gradient-to-b from-[#161126]/95 via-[#0e0c1c]/95 to-[#06050e]/98 border-2 border-purple-400/50 p-2.5 sm:p-3 xl:p-3.5 flex flex-col justify-between shadow-[0_0_22px_rgba(168,85,247,0.2)] hover:shadow-[0_0_38px_rgba(168,85,247,0.36)] hover:border-purple-400 hover:-translate-y-1.5 transition-all duration-300"
            >
              <div>
                {/* Header */}
                <div className="flex items-start gap-2.5 mb-1.5 xl:mb-2">
                  <div className="w-7.5 h-7.5 xl:w-8 xl:h-8 rounded-full bg-purple-500/15 border-2 border-[#c084fc] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.4)] text-[#c084fc]">
                    <Cog className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base xl:text-[17px] font-black text-[#c084fc] tracking-tight leading-tight">
                      Automation Solutions
                    </h2>
                    <p className="text-[10px] xl:text-[10.5px] text-stone-300 leading-tight mt-0.5 line-clamp-2">
                      Smart automation systems to reduce manual work and save time.
                    </p>
                  </div>
                </div>

                {/* Features & Visual Thumbnail */}
                <div className="grid grid-cols-12 gap-2.5 items-center mb-1.5 xl:mb-2">
                  <div className="col-span-7 flex flex-col gap-0.5 xl:gap-1">
                    {[
                      "Social media auto-posting",
                      "Order and enquiry automation",
                      "Workflow and notification systems",
                      "Data management and reporting",
                      "Custom automation solutions",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-[9.5px] xl:text-[10.5px] text-stone-200 leading-tight font-medium">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="col-span-5">
                    <div className="relative aspect-[4/3] rounded-md overflow-hidden border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)] group-hover:border-purple-400/60 transition-colors w-full max-w-[105px] xl:max-w-[120px] mx-auto">
                      <img
                        src="/services/automation-solutions.jpg"
                        alt="Workflow automation dashboard and social publishing"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row */}
              <div className="pt-1.5 xl:pt-2 border-t border-purple-500/20 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[7.5px] xl:text-[8px] uppercase tracking-wider text-stone-400 font-semibold block leading-none">
                    Starting at
                  </span>
                  <span className="text-lg xl:text-xl font-black text-[#c084fc] tracking-tight leading-none mt-0.5 block">
                    @999
                  </span>
                </div>
                <Link href="/requests?service=automation">
                  <button className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg font-bold text-[10px] xl:text-[11px] text-stone-950 bg-gradient-to-r from-[#c084fc] via-[#d8b4fe] to-[#c084fc] hover:from-[#d8b4fe] hover:to-[#c084fc] shadow-[0_0_14px_rgba(168,85,247,0.45)] transition-all active:scale-[0.98] cursor-pointer">
                    Explore Automation Solutions <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* ── Stats band — real verified numbers ── */}
      <section className="relative z-10 border-y border-white/[0.08] py-8 bg-black/40 backdrop-blur-md">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="flex flex-wrap gap-x-12 gap-y-5 items-center justify-between">
            <StatItem value="100%" label="verified source code & documentation" />
            <StatItem value={`${TOTAL_CATEGORIES}`} label="engineering categories" />
            <StatItem value="Instant" label="commercial license & download" />
            <StatItem value={`${AVG_RATING}★`} label="average project rating" />
          </div>
        </div>
      </section>

      {/* ── Category section — hierarchy grid with real project counts ── */}
      <section className="pt-16 pb-14 relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 mb-2 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Engineering Disciplines
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Explore Engineering Categories
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-semibold flex items-center gap-1.5 pb-0.5 border-b border-amber-500/30 hover:border-amber-400 shrink-0 self-start sm:self-auto"
            >
              Browse all projects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <HomeCategoryGrid
            countByCategory={COUNT_BY_CATEGORY}
            onCategoryClick={handleCategoryClick}
          />
        </div>
      </section>

      {/* ── Trending inventory — real project cards ── */}
      <section className="pt-4 pb-20 relative z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                In the marketplace now
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Featured Projects Ready to Deploy
              </h2>
            </div>
            <Link
              href="/marketplace"
              className="text-amber-400 hover:text-amber-300 transition-colors text-sm font-semibold flex items-center gap-1.5 pb-0.5 border-b border-amber-500/30 hover:border-amber-400 shrink-0 self-start sm:self-auto"
            >
              See all projects <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {/* Card 0 — larger: spans 2 cols */}
              <div className="md:col-span-2">
                <ProjectCard project={featuredProjects[0]} imageHeight="h-64" />
              </div>

              {/* Card 1 */}
              <div>
                <ProjectCard project={featuredProjects[1]} imageHeight="h-48" />
              </div>

              {/* Card 2 */}
              <div>
                <ProjectCard project={featuredProjects[2]} imageHeight="h-48" />
              </div>

              <div className="md:col-span-3 flex justify-end mt-2">
                <Link
                  href="/marketplace"
                  className="text-sm text-stone-400 hover:text-amber-400 transition-colors border-b border-transparent hover:border-amber-400/40 pb-0.5"
                >
                  See all projects in the marketplace →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Custom Build — distinct section ── */}
      <section className="py-16 border-t border-white/[0.05] relative z-10 bg-black/20">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-cyan-400 mb-3 font-semibold">
                Custom Projects
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-100 mb-4 leading-snug">
                Don&apos;t see exactly what you need?<br />
                <span className="text-[#ff7828]">We build to order.</span>
              </h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md">
                Describe your project requirements — topic, tech stack,
                submission date — and we&apos;ll scope it, price it, and deliver a
                working project tailored to your brief. No generic templates.
              </p>
              <Link href="/requests">
                <Button variant="secondary">
                  Submit a custom request <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-5">
              {[
                {
                  step: "01",
                  heading: "Describe your requirements",
                  body: "Tell us your topic, tech stack preferences, department, and submission deadline.",
                },
                {
                  step: "02",
                  heading: "We scope and price it",
                  body: "Within 24 hours we confirm feasibility and send you a fixed price quote — no surprises.",
                },
                {
                  step: "03",
                  heading: "Receive your project",
                  body: "Get working, documented source code delivered before your deadline. Revisions included.",
                },
              ].map(({ step, heading, body }) => (
                <div key={step} className="flex gap-5 items-start">
                  <span className="text-xs font-mono text-amber-500/60 mt-0.5 shrink-0 w-6">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-stone-200 mb-1">{heading}</p>
                    <p className="text-stone-500 text-sm leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


    </div>
  );
}

// ─── Stats item ─────────────────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-stone-100">{value}</span>
      <span className="text-stone-400 text-sm">{label}</span>
    </div>
  );
}

// ─── Theme styling map for Category Cards ──────────────────────────────────
const CATEGORY_THEMES: Record<string, {
  gradient: string;
  glow: string;
  badge: string;
  hoverBorder: string;
}> = {
  hardware: {
    gradient: "from-emerald-500 to-teal-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(16,185,129,0.22)]",
    badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    hoverBorder: "group-hover:border-emerald-500/50",
  },
  software: {
    gradient: "from-blue-500 to-indigo-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(59,130,246,0.22)]",
    badge: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    hoverBorder: "group-hover:border-blue-500/50",
  },
  web: {
    gradient: "from-amber-500 to-orange-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(245,158,11,0.22)]",
    badge: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    hoverBorder: "group-hover:border-amber-500/50",
  },
  mobile: {
    gradient: "from-pink-500 to-rose-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(244,63,94,0.22)]",
    badge: "text-pink-400 bg-pink-500/10 border-pink-500/30",
    hoverBorder: "group-hover:border-pink-500/50",
  },
  iot: {
    gradient: "from-cyan-500 to-blue-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(6,182,212,0.22)]",
    badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
    hoverBorder: "group-hover:border-cyan-500/50",
  },
  embedded: {
    gradient: "from-teal-500 to-cyan-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(20,184,166,0.22)]",
    badge: "text-teal-400 bg-teal-500/10 border-teal-500/30",
    hoverBorder: "group-hover:border-teal-500/50",
  },
  aiml: {
    gradient: "from-purple-500 to-fuchsia-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(168,85,247,0.22)]",
    badge: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    hoverBorder: "group-hover:border-purple-500/50",
  },
  robotics: {
    gradient: "from-orange-500 to-amber-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(249,115,22,0.22)]",
    badge: "text-orange-400 bg-orange-500/10 border-orange-500/30",
    hoverBorder: "group-hover:border-orange-500/50",
  },
  cloud: {
    gradient: "from-sky-500 to-blue-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(14,165,233,0.22)]",
    badge: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    hoverBorder: "group-hover:border-sky-500/50",
  },
  cybersecurity: {
    gradient: "from-violet-500 to-purple-600",
    glow: "group-hover:shadow-[0_12px_32px_rgba(139,92,246,0.22)]",
    badge: "text-violet-400 bg-violet-500/10 border-violet-500/30",
    hoverBorder: "group-hover:border-violet-500/50",
  },
};

function HomeCategoryGrid({
  countByCategory,
  onCategoryClick,
}: {
  countByCategory: Record<string, number>;
  onCategoryClick: (id: string) => void;
}) {
  const sorted = [...categories].sort(
    (a, b) => (countByCategory[b.id] ?? 0) - (countByCategory[a.id] ?? 0)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {sorted.map((cat) => {
        const count = countByCategory[cat.id] ?? 0;
        const Icon = cat.icon;
        const theme = CATEGORY_THEMES[cat.id] || {
          gradient: "from-cyan-500 to-blue-600",
          glow: "group-hover:shadow-[0_12px_32px_rgba(6,182,212,0.2)]",
          badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
          hoverBorder: "group-hover:border-cyan-500/50",
        };

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111728]/95 via-[#0c1220]/95 to-[#070b14]/95 ${theme.hoverBorder} ${theme.glow} shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-left overflow-hidden cursor-pointer`}
          >
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${theme.gradient} text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <span
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-full border ${theme.badge} font-bold flex items-center gap-1.5`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      count > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-500"
                    }`}
                  />
                  {count} {count === 1 ? "project" : "projects"}
                </span>
              </div>

              <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors tracking-tight mb-2">
                {cat.name}
              </h3>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {cat.subCategories.slice(0, 3).map(sub => (
                  <span
                    key={sub.id}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/[0.06] group-hover:border-white/15 group-hover:text-gray-300 transition-colors"
                  >
                    {sub.name}
                  </span>
                ))}
                {cat.subCategories.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.03] text-gray-500 font-mono">
                    +{cat.subCategories.length - 3}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-cyan-300 transition-colors">
              <span>Explore category</span>
              <ArrowRight className="w-3.5 h-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Project card — used by the trending inventory section ───────────────────
function ProjectCard({
  project,
  imageHeight = "h-48",
}: {
  project: Project;
  imageHeight?: string;
}) {
  if (!project) return null;
  return (
    <div className="group relative flex flex-col h-full rounded-2xl border border-white/10 bg-gradient-to-b from-[#111728]/90 via-[#0c1220]/90 to-[#070b14]/90 hover:border-cyan-500/40 shadow-xl hover:shadow-[0_15px_35px_rgba(6,182,212,0.15)] hover:-translate-y-1 transition-all duration-300 p-4 sm:p-5 overflow-hidden">
      {/* Image Preview with hover zoom */}
      <div className={`relative ${imageHeight} rounded-xl mb-4 border border-white/10 overflow-hidden bg-black`}>
        <img
          src={project.thumbnail}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220] via-transparent to-transparent pointer-events-none" />

        {/* Category badge */}
        <span className="absolute top-2.5 left-2.5 text-[10px] px-2.5 py-0.5 rounded-md bg-black/80 text-cyan-300 border border-cyan-500/30 font-bold tracking-wider uppercase backdrop-blur-md">
          {project.category}
        </span>
      </div>

      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
          {project.title}
        </h3>
        <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold ml-2 shrink-0 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/10">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          {project.rating}
        </span>
      </div>

      <p className="text-gray-400 text-xs flex-1 mb-4 line-clamp-2 leading-relaxed">
        {project.description}
      </p>

      {/* Tech Stack Tags */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {project.techStack.slice(0, 3).map(tech => (
          <span
            key={tech}
            className="text-[10px] px-2 py-0.5 bg-white/[0.05] rounded-md text-cyan-200 border border-white/10 font-medium"
          >
            {tech}
          </span>
        ))}
        {project.techStack.length > 3 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-white/[0.03] rounded-md text-gray-400 font-mono">
            +{project.techStack.length - 3}
          </span>
        )}
      </div>

      {/* Bottom Price & Direct Action CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-auto">
        <div>
          <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Verified Price</p>
          <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            ₹{project.price.toLocaleString("en-IN")}
          </span>
        </div>
        <Link
          href={`/marketplace?project=${project.id}`}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

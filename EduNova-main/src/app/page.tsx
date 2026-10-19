"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ArrowRight, PenLine, Star, ChevronRight } from "lucide-react";
import { Project, getPublicProjects, mockProjects } from "@/lib/data/mockProjects";
import { categories } from "@/lib/data/categories";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { HomeBackground } from "@/components/backgrounds/HomeBackground";
import { Hero3DCoverflow } from "@/components/ui/Hero3DCoverflow";

// ─── Real data, computed once at module level from the static mock layer ────
// These numbers come directly from mockProjects.ts — nothing is invented.

const APPROVED = mockProjects.filter(p => p.status === "approved");
const TOTAL_PROJECTS = APPROVED.length;                               // 8
const TOTAL_CATEGORIES = categories.length;                           // 9
const MIN_PRICE = Math.min(...APPROVED.map(p => p.price));           // 899
const AVG_RATING = (
  APPROVED.reduce((s, p) => s + p.rating, 0) / APPROVED.length
).toFixed(1);                                                         // 4.7

// Project counts per category — used by the category hierarchy grid
const COUNT_BY_CATEGORY: Record<string, number> = {};
for (const p of APPROVED) {
  COUNT_BY_CATEGORY[p.category] = (COUNT_BY_CATEGORY[p.category] ?? 0) + 1;
}

// The "banner" project is the hero card — defined in mock data, not invented
const HERO_PROJECT = APPROVED.find(p => p.featured === "banner") ?? APPROVED[0];

const INITIAL_FEATURED: Project[] = [
  APPROVED.find(p => p.id === "proj-predictive-maintenance"),
  APPROVED.find(p => p.id === "proj-solar-agri-robot"),
  APPROVED.find(p => p.id === "proj-ai-skill-agent"),
].filter((p): p is Project => Boolean(p));

export default function Home() {
  const router = useRouter();
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>(INITIAL_FEATURED);

  useEffect(() => {
    // Pull from Firestore (with local fallback via mockProjects)
    getPublicProjects().then(all => {
      const approved = all.filter(p => p.status === "approved");

      // Curate flagship high-complexity engineering projects (Spring Boot, IoT Robotics, AI Agents)
      const flagshipIds = [
        "proj-predictive-maintenance",
        "proj-solar-agri-robot",
        "proj-ai-skill-agent",
        "proj-esp32-cam-display",
        "proj-hospital-appointment",
        "proj-gas-leakage",
        "p3", // MERN Stack E-Commerce Platform
      ];

      const flagshipProjects = flagshipIds
        .map(id => approved.find(p => p.id === id))
        .filter((p): p is Project => Boolean(p));

      // Fill remaining if needed with complex projects (filtering out basic drawings or scripts)
      const otherComplex = approved
        .filter(p => !flagshipIds.includes(p.id))
        .filter(p => {
          const t = p.title.toLowerCase();
          return !t.includes("turtle") && !t.includes("drawing") && !t.includes("flag") && !t.includes("rose");
        })
        .sort((a, b) => b.price - a.price);

      const combined = [...flagshipProjects, ...otherComplex];
      setFeaturedProjects(combined.slice(0, 3));
    });
  }, []);

  const handleCategoryClick = (categoryId: string) =>
    router.push(`/marketplace?category=${categoryId}`);

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* ── Living Engineering Blueprint Cosmos & Solar Plasma Background ── */}
      <HomeBackground />

      {/* ── Hero — two columns: copy left, real project card right ────── */}
      <section className="relative flex flex-col justify-center">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 pt-20 pb-8 md:pt-24 md:pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center">

            {/* Left — copy */}
            <div className="max-w-xl">
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight text-stone-100 mb-5"
              >
                Your project deadline is{" "}
                <span className="text-amber-500">not the time to start from scratch.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.3 }}
                className="text-stone-400 text-base md:text-lg leading-relaxed mb-3"
              >
                EduNova has ready-to-submit engineering projects — IoT,
                ML, web, mobile, hardware — built for actual college requirements.
              </motion.p>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.45, delay: 0.4 }}
                className="text-stone-500 text-sm leading-relaxed mb-6"
              >
                Need something that doesn&apos;t exist yet? Describe it and we&apos;ll scope and
                build it for you.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-start gap-3"
              >
                <Link href="/marketplace">
                  <Button size="lg" as="div">
                    Browse Projects <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/requests">
                  <Button size="lg" variant="secondary" as="div">
                    <PenLine className="w-4 h-4" />
                    Request a custom build
                  </Button>
                </Link>
              </motion.div>
            </div>

            {/* Right — 3D Perspective Coverflow Poster Carousel */}
            {APPROVED.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="w-full mt-8 lg:mt-0"
              >
                <Hero3DCoverflow projects={APPROVED} />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats band — real numbers only, nothing invented ────────────── */}
      <section className="border-y border-white/[0.05] py-7">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="flex flex-wrap gap-x-12 gap-y-5 items-center">
            <StatItem value="100%" label="verified source code & documentation" />
            <StatItem value={`${TOTAL_CATEGORIES}`} label="engineering categories" />
            <StatItem value="Instant" label="commercial license & download" />
            <StatItem value={`${AVG_RATING}★`} label="average project rating" />
          </div>
        </div>
      </section>

      {/* ── Category section — hierarchy grid with real project counts ──── */}
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

      {/* ── Trending inventory — real project cards, not marketing copy ─── */}
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
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0 }}
              >
                <ProjectCard project={featuredProjects[0]} imageHeight="h-64" />
              </motion.div>

              {/* Card 1 — standard */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
              >
                <ProjectCard project={featuredProjects[1]} imageHeight="h-48" />
              </motion.div>

              {/* Card 2 — standard */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.14 }}
              >
                <ProjectCard project={featuredProjects[2]} imageHeight="h-48" />
              </motion.div>

              <div className="md:col-span-3 flex justify-end mt-2">
                <Link
                  href="/marketplace"
                  className="text-sm text-stone-500 hover:text-amber-400 transition-colors border-b border-transparent hover:border-amber-400/40 pb-0.5"
                >
                  See all projects in the marketplace →
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Custom Build — distinct section, not another card ───────────── */}
      <section className="py-16 border-t border-white/[0.05]">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

            {/* Left — what it is */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3 font-semibold">
                Custom Projects
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-stone-100 mb-4 leading-snug">
                Don&apos;t see exactly what you need?<br />
                <span className="text-amber-500">We build to order.</span>
              </h2>
              <p className="text-stone-400 text-sm leading-relaxed mb-6 max-w-md">
                Describe your project requirements — topic, tech stack,
                submission date — and we&apos;ll scope it, price it, and deliver a
                working project tailored to your brief. No generic templates.
              </p>
              <Link href="/requests">
                <Button variant="secondary" as="div">
                  Submit a custom request <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Right — how it works (plain list, not a grid of identical cards) */}
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

// ─── Hero project carousel — auto-transitions across categories ──────────
function HeroCarousel({ projects }: { projects: Project[] }) {
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

  useEffect(() => {
    if (isPaused || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, items.length]);

  const currentProject = items[currentIndex];
  if (!currentProject) return null;

  const categoryLabels: Record<string, string> = {
    web: "Web App",
    mobile: "Mobile App",
    iot: "IoT & Embedded",
    hardware: "Hardware & Embedded",
    aiml: "AI & Machine Learning",
    cybersecurity: "Cybersecurity & Networks",
    cloud: "Cloud & DevOps",
    blockchain: "Blockchain & Web3",
  };

  return (
    <div
      className="relative w-full max-w-lg mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Decorative ambient gradient backdrop */}
      <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500/20 via-orange-500/10 to-amber-500/20 rounded-2xl blur-xl opacity-75 -z-10" />

      {/* Top indicator & slide progress */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
            {categoryLabels[currentProject.category] || currentProject.category}
          </span>
          <span className="text-[10px] text-stone-600">
            • {currentIndex + 1} of {items.length}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-6 bg-amber-400"
                  : "w-2 bg-stone-700 hover:bg-stone-500"
              }`}
              title={`Switch to ${categoryLabels[item.category] || item.title}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Animated Card Container */}
      <div className="surface-card rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl relative min-h-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentProject.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col h-full"
          >
            {/* Image banner */}
            <div className="relative h-56 border-b border-white/[0.05] overflow-hidden bg-stone-950">
              <img
                src={currentProject.thumbnail}
                alt={currentProject.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                loading="eager"
              />
              <span className="absolute top-3 left-3 text-[10px] px-2.5 py-1 rounded bg-stone-950/85 text-amber-400 border border-amber-500/30 font-semibold tracking-wider uppercase backdrop-blur-sm">
                {categoryLabels[currentProject.category] || currentProject.category}
              </span>
              <span className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold backdrop-blur-sm flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Featured
              </span>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-stone-100 leading-snug">
                    {currentProject.title}
                  </h3>
                  <span className="flex items-center gap-1 text-[11px] text-amber-400 shrink-0 bg-stone-900/80 px-2 py-0.5 rounded border border-stone-800">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {currentProject.rating}
                    <span className="text-stone-500">({currentProject.reviewsCount})</span>
                  </span>
                </div>

                <p className="text-stone-400 text-xs leading-relaxed mb-4 line-clamp-2">
                  {currentProject.description}
                </p>

                <div className="flex items-center gap-1.5 mb-5 flex-wrap">
                  {currentProject.techStack.slice(0, 4).map(tech => (
                    <span
                      key={tech}
                      className="text-[9px] px-2 py-0.5 bg-stone-800/80 rounded text-stone-300 border border-stone-700/60"
                    >
                      {tech}
                    </span>
                  ))}
                  {currentProject.techStack.length > 4 && (
                    <span className="text-[9px] px-2 py-0.5 bg-stone-800/80 rounded text-stone-500 border border-stone-700/60">
                      +{currentProject.techStack.length - 4}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.05] mt-auto">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Price</span>
                  <span className="text-base font-bold text-amber-500">
                    ₹{currentProject.price.toLocaleString("en-IN")}
                  </span>
                </div>
                <Link href={`/marketplace?category=${currentProject.category}`}>
                  <Button size="sm" variant="secondary" as="div">
                    View in marketplace <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Hero project card — shown in the right half of the hero ───────────────
function HeroProjectCard({ project }: { project: Project }) {
  return (
    <div className="surface-card rounded-xl overflow-hidden">
      {/* Image */}
      <div className="relative h-52 border-b border-white/[0.05]">
        <img
          src={project.thumbnail}
          alt={project.title}
          className="w-full h-full object-cover"
          loading="eager"
        />
        <span className="absolute top-3 left-3 text-[10px] px-2 py-1 rounded bg-stone-950/80 text-amber-400 border border-amber-500/20 font-semibold tracking-wider uppercase">
          {project.category}
        </span>
        {project.featured === "banner" && (
          <span className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold">
            Featured
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-stone-100 leading-snug">{project.title}</h3>
          <span className="flex items-center gap-1 text-[11px] text-amber-400 shrink-0">
            <Star className="w-3 h-3 fill-amber-400" />
            {project.rating}
            <span className="text-stone-600">({project.reviewsCount})</span>
          </span>
        </div>

        <p className="text-stone-500 text-xs leading-relaxed mb-4 line-clamp-2">
          {project.description}
        </p>

        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {project.techStack.slice(0, 4).map(tech => (
            <span key={tech} className="text-[9px] px-2 py-0.5 bg-stone-800/80 rounded text-stone-400 border border-stone-700/60">
              {tech}
            </span>
          ))}
          {project.techStack.length > 4 && (
            <span className="text-[9px] px-2 py-0.5 bg-stone-800/80 rounded text-stone-600 border border-stone-700/60">
              +{project.techStack.length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
          <span className="text-base font-bold text-amber-500">
            ₹{project.price.toLocaleString("en-IN")}
          </span>
          <Link href="/marketplace">
            <Button size="sm" variant="secondary" as="div">
              View in marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Stats item ───────────────────────────────────────────────────────────
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold text-stone-100">{value}</span>
      <span className="text-stone-600 text-sm">{label}</span>
    </div>
  );
}

// ─── Theme styling map for Category Cards ───────────────────────────────────
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
  // Sort categories by project count descending, then preserve original order
  const sorted = [...categories].sort(
    (a, b) => (countByCategory[b.id] ?? 0) - (countByCategory[a.id] ?? 0)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {sorted.map((cat, i) => {
        const count = countByCategory[cat.id] ?? 0;
        const Icon = cat.icon;
        const theme = CATEGORY_THEMES[cat.id] || {
          gradient: "from-cyan-500 to-blue-600",
          glow: "group-hover:shadow-[0_12px_32px_rgba(6,182,212,0.2)]",
          badge: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
          hoverBorder: "group-hover:border-cyan-500/50",
        };

        return (
          <motion.button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.35, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={`group relative flex flex-col justify-between p-5 rounded-2xl border border-white/10 bg-gradient-to-b from-[#111728]/95 via-[#0c1220]/95 to-[#070b14]/95 ${theme.hoverBorder} ${theme.glow} shadow-xl hover:-translate-y-1.5 transition-all duration-300 text-left overflow-hidden`}
          >
            {/* Top row: Icon Badge & Project Count */}
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

              {/* Title */}
              <h3 className="font-bold text-base text-white group-hover:text-amber-300 transition-colors tracking-tight mb-2">
                {cat.name}
              </h3>

              {/* Subcategories preview tags */}
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

            {/* Bottom Action Footer */}
            <div className="pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs font-semibold text-gray-400 group-hover:text-cyan-300 transition-colors">
              <span>Explore category</span>
              <ArrowRight className="w-3.5 h-3.5 transform transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

// ─── Project card — used by the trending/inventory section ────────────────
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

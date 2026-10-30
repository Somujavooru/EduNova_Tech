"use client";

import { useState, useEffect } from "react";
import { Project, isProjectReadyToDownload } from "@/lib/data/mockProjects";
import { copyToClipboard } from "@/lib/clipboard";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Star,
  ShoppingCart,
  Download,
  User,
  Tag,
  Layers,
  Calendar,
  MessageSquare,
  Sparkles,
  PackageCheck,
  ExternalLink,
  Cpu,
  Terminal,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Workflow,
  Rocket,
  FileCode,
  ArrowRight,
  Hammer
} from "lucide-react";
import { Button } from "./Button";
import { PreviewModal } from "./PreviewModal";
import { CheckoutModal } from "./CheckoutModal";
import { ReviewSection } from "./ReviewSection";
import { CommentSection } from "./CommentSection";
import { getAverageRating } from "@/lib/data/reviews";
import { useAuth } from "@/context/AuthContext";
import { Order, getOrdersByUser } from "@/lib/data/orders";
import Link from "next/link";
import { Clock } from "lucide-react";
import { ProjectDeliverablesSection } from "./ProjectDeliverablesSection";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

interface Props {
  project: Project | null;
  onClose: () => void;
}

type TabKey = "overview" | "architecture" | "setup" | "deliverables" | "reviews" | "comments";

// Helper to provide comprehensive fallback technical information for any project
function getResolvedProjectDetails(project: Project) {
  const features =
    project.featuresList && project.featuresList.length > 0
      ? project.featuresList
      : [
          `Production-grade architecture tailored for ${project.title}`,
          `Integrated modern tech stack: ${project.techStack.join(", ")}`,
          "Deterministic business logic with automated validation and error logging",
          "Decoupled, modular code structure allowing easy expansion and API integration",
          "Complete pre-configured setup with clean deliverables and documentation"
        ];

  const structure =
    project.projectStructure && project.projectStructure.length > 0
      ? project.projectStructure
      : [
          {
            layer: "📦 Core System Architecture",
            items: [
              `Entry & Dispatch: Main application bootstrap and request handlers`,
              `Core Logic: Dedicated controllers and services implemented in ${project.techStack[0] || "Code"}`,
              `Data / State: Schema configurations, data contracts, and persistence rules`,
              `Presentation / Drivers: Responsive UI components or hardware firmware interfaces`
            ]
          }
        ];

  const howItWorks =
    project.howItWorks && project.howItWorks.length > 0
      ? project.howItWorks
      : [
          "1. System initializes with environment configs and establishes connection to services or sensors.",
          `2. Ingests user input or data events through the ${project.techStack[0] || "main engine"} layer.`,
          "3. Evaluates real-time business logic, threshold rules, or AI models on incoming data.",
          "4. Triggers deterministic events, dispatches notifications, and updates live UI indicators.",
          "5. Persists operations to the database or storage for reporting and auditing."
        ];

  const gettingStarted =
    project.gettingStarted && project.gettingStarted.length > 0
      ? project.gettingStarted
      : [
          {
            title: "1. Extract & Setup Workspace",
            command: `# Extract your purchased project package\nunzip ${project.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.zip\ncd ${project.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
            details: `Ensure you have the required runtimes for ${project.techStack.slice(0, 3).join(", ")} installed.`
          },
          {
            title: "2. Install Dependencies & Build",
            command: project.techStack.some(t => t.toLowerCase().includes("python"))
              ? "pip install -r requirements.txt\npython main.py"
              : project.techStack.some(t => t.toLowerCase().includes("spring") || t.toLowerCase().includes("java"))
              ? "mvn clean install\nmvn spring-boot:run"
              : "npm install\nnpm run dev",
            details: "Compile all assets and verify that dependencies install cleanly."
          }
        ];

  const commonIssues =
    project.commonIssues && project.commonIssues.length > 0
      ? project.commonIssues
      : [
          {
            issue: "Environment / Port Conflict",
            solution: "Ensure target ports are free or configure custom ports in the application configuration file."
          },
          {
            issue: "Missing Dependencies / Permissions",
            solution: "Run with administrative privileges or ensure runtime package versions match the documentation."
          }
        ];

  const futureImprovements =
    project.futureImprovements && project.futureImprovements.length > 0
      ? project.futureImprovements
      : [
          "Real-time event streaming and high-concurrency throughput scaling",
          "Automated CI/CD deployment pipelines with containerization",
          "Advanced analytics dashboard and performance telemetry export"
        ];

  return { features, structure, howItWorks, gettingStarted, commonIssues, futureImprovements };
}

export function ProjectDetailModal({ project, onClose }: Props) {
  const { user } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [liveRating, setLiveRating] = useState({ average: 0, count: 0 });
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [existingOrder, setExistingOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (project) {
      getAverageRating(project.id).then(setLiveRating);
      setActiveTab("overview");
      setCopiedIdx(null);
    }
  }, [project]);

  useEffect(() => {
    if (!project || !user) {
      setExistingOrder(null);
      return;
    }
    let isMounted = true;
    getOrdersByUser(user.id)
      .then((orders) => {
        if (!isMounted) return;
        const pTitle = (project.title || "").trim().toLowerCase();
        const matched = orders.filter((o) => {
          if (o.projectId === project.id) return true;
          const cleanOrderTitle = (o.projectTitle || "")
            .replace(/^(advance\s*\(25%\):\s*|balance\s*\(75%\):\s*|final balance\s*\(75%\):\s*)/i, "")
            .trim()
            .toLowerCase();
          return cleanOrderTitle === pTitle || (o.projectTitle && o.projectTitle.trim().toLowerCase() === pTitle);
        });
        if (matched.length > 0) {
          const fullBuy = matched.find(
            (o) =>
              (o.status === "approved" || o.finalPayment?.status === "approved") &&
              (o.orderType === "marketplace" || o.orderType === "final_payment" || !o.orderType || o.finalPayment?.status === "approved")
          );
          const advance = matched.find((o) => o.status === "approved" && o.orderType === "advance_payment");
          const pending = matched.find((o) => o.status === "pending" || o.finalPayment?.status === "pending");
          setExistingOrder(fullBuy || advance || pending || matched[0]);
        } else {
          setExistingOrder(null);
        }
      })
      .catch(() => {
        if (isMounted) setExistingOrder(null);
      });
    return () => { isMounted = false; };
  }, [project?.id, project?.title, user?.id]);

  useEffect(() => {
    document.body.classList.add("modal-open");
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!project) return null;

  if (showPreview) {
    return (
      <PreviewModal
        project={project}
        onClose={() => setShowPreview(false)}
        onBuyNow={() => {
          setShowPreview(false);
          setShowCheckout(true);
        }}
      />
    );
  }

  if (showCheckout) {
    return (
      <CheckoutModal
        project={project}
        onClose={() => {
          setShowCheckout(false);
          onClose();
        }}
      />
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview & Features", icon: <Layers className="w-3.5 h-3.5" /> },
    { key: "architecture", label: "Architecture & Code", icon: <Cpu className="w-3.5 h-3.5" /> },
    { key: "setup", label: "Quickstart & Setup", icon: <Terminal className="w-3.5 h-3.5" /> },
    { key: "deliverables", label: "Deliverables & Documents", icon: <Layers className="w-3.5 h-3.5 text-cyan-400" /> },
    { key: "reviews", label: `Reviews (${liveRating.count})`, icon: <Star className="w-3.5 h-3.5" /> },
    { key: "comments", label: "Discussion", icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ];

  const isCustomProject = project.fromCustomRequest === true;
  const isReady = isProjectReadyToDownload(project);
  const advanceAmount = Math.round(project.price * 0.25);
  const balanceAmount = project.price - advanceAmount;
  const details = getResolvedProjectDetails(project);

  const handleCopy = async (text: string, idx: number) => {
    await copyToClipboard(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <div className="min-h-full flex items-center justify-center p-3 sm:p-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-white/10 bg-[#0a0a1a]/95 backdrop-blur-2xl shadow-[0_0_80px_rgba(0,212,255,0.15)] flex flex-col overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-black/60 hover:bg-white/20 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-lg backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Scrollable Container: Image scrolls up, Navigation sticks to top, Tab body expands */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
            {/* Header Image/Video Area */}
            <div className="h-56 sm:h-64 w-full border-b border-white/10 relative overflow-hidden group shrink-0">
              {project.demoVideoUrl ? (
                <iframe
                  src={project.demoVideoUrl.includes("drive.google.com") ? project.demoVideoUrl.replace("/view", "/preview") : project.demoVideoUrl}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  allowFullScreen
                  title={`${project.title} Demo`}
                />
              ) : (
                <img
                  src={project.thumbnail}
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              )}
              <div className={`absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/40 to-transparent pointer-events-none transition-opacity ${project.demoVideoUrl ? 'opacity-0 group-hover:opacity-100' : ''}`} />
              
              <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/30 uppercase font-bold tracking-wider">
                  {project.category}
                </span>
                {isReady ? (
                  <span className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/25 backdrop-blur-md text-emerald-300 border border-emerald-500/40 uppercase font-bold tracking-wider flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Instant Download
                  </span>
                ) : (
                  <span className="text-[10px] px-3 py-1.5 rounded-lg bg-amber-500/25 backdrop-blur-md text-amber-300 border border-amber-500/40 uppercase font-bold tracking-wider flex items-center gap-1 shadow-sm">
                    <Hammer className="w-3 h-3 text-amber-400" />
                    Build on Order (25% Advance)
                  </span>
                )}
                {isCustomProject && (
                  <span className="text-[10px] px-3 py-1.5 rounded-lg bg-[var(--color-neon-purple)]/30 backdrop-blur-md text-[var(--color-neon-purple)] border border-[var(--color-neon-purple)]/30 uppercase font-bold tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Community Build
                  </span>
                )}
              </div>
            </div>

            {/* Modal Header & Navigation Bar (Sticky when banner scrolls away) */}
            <div className="sticky top-0 z-20 px-6 md:px-8 pt-4 pb-2 border-b border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-md">
              {/* Title & Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pr-12">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
                    {project.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Curated by <span className="text-white font-semibold">{project.sellerName || "EduNova Forge Team"}</span> • Listed {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--color-neon-blue)]/15 border border-[var(--color-neon-blue)]/30 self-start sm:self-auto shrink-0">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm">
                    {liveRating.count > 0 ? liveRating.average.toFixed(1) : project.rating}
                  </span>
                  <span className="text-gray-400 text-xs">
                    ({liveRating.count > 0 ? liveRating.count : project.reviewsCount})
                  </span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.key
                        ? "bg-[var(--color-neon-blue)]/20 text-[var(--color-neon-blue)] border border-[var(--color-neon-blue)]/40 shadow-[0_0_15px_rgba(0,212,255,0.1)]"
                        : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Body (Full reading height) */}
            <div className="p-6 md:p-8 flex-1">
            <AnimatePresence>
              {/* ───────────────── OVERVIEW TAB ───────────────── */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {!isReady && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent border border-amber-500/30 flex items-start gap-3.5 shadow-[0_0_30px_rgba(245,158,11,0.08)]">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 border border-amber-500/30">
                        <Hammer className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-white">
                            Build on Order — 25% Advance Milestone
                          </h4>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">
                            Custom Build
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed mb-2">
                          This project is customized and built specifically on your order. To initiate the build, you pay a <strong className="text-amber-400 font-bold">25% advance (₹{advanceAmount.toLocaleString("en-IN")})</strong>.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Live milestone tracking in Dashboard
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <Workflow className="w-3.5 h-3.5" />
                            Planning &rarr; Building &rarr; Testing
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-blue-400 font-medium">
                            Remaining 25% (₹{balanceAmount.toLocaleString("en-IN")}) on delivery
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Executive Description */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Overview</h3>
                    <p className="text-gray-300 text-base leading-relaxed bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                      {project.description}
                    </p>
                  </div>

                  {/* Key Features & Capabilities */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[var(--color-neon-blue)]" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Key Features & Capabilities</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {details.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-[var(--color-neon-blue)]/30 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-neon-blue)] shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm text-gray-300 leading-snug">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Project Deliverables: What You Will Receive */}
                  <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <ProjectDeliverablesSection
                      project={project}
                      titleVariant="included_with_project"
                      showFolderTree={true}
                    />
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">Technologies Used</h3>
                    <div className="flex flex-wrap gap-2">
                      {project.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-200 border border-white/10 hover:border-[var(--color-neon-blue)]/50 transition-colors font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadata Specs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Category</p>
                      <p className="text-xs sm:text-sm font-bold text-white capitalize">{project.category}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Author</p>
                      <p className="text-xs sm:text-sm font-bold text-white truncate">{project.sellerName || "EduNova Forge Team"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Status</p>
                      <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                        Verified & Ready
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Satisfaction</p>
                      <p className="text-xs sm:text-sm font-bold text-yellow-400">{project.rating} / 5.0 Rating</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── ARCHITECTURE TAB ───────────────── */}
              {activeTab === "architecture" && (
                <motion.div
                  key="architecture"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Architecture Overview */}
                  {project.architectureOverview && (
                    <div className="p-4 rounded-xl bg-[var(--color-neon-blue)]/5 border border-[var(--color-neon-blue)]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Cpu className="w-4 h-4 text-[var(--color-neon-blue)]" />
                        <h4 className="text-xs font-bold text-[var(--color-neon-blue)] uppercase tracking-wider">System Architecture</h4>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {project.architectureOverview}
                      </p>
                    </div>
                  )}

                  {/* Project Structure Breakdown */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileCode className="w-4 h-4 text-[var(--color-neon-purple)]" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Structure & File Breakdown</h3>
                    </div>
                    <div className="space-y-3.5">
                      {details.structure.map((block, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                          <h4 className="text-sm font-bold text-white mb-2.5 pb-2 border-b border-white/5 flex items-center justify-between">
                            <span>{block.layer}</span>
                            <span className="text-[10px] text-gray-500 font-normal">{block.items.length} Modules / Layers</span>
                          </h4>
                          <ul className="space-y-1.5">
                            {block.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="text-xs sm:text-sm text-gray-300 font-mono flex items-start gap-2">
                                <span className="text-[var(--color-neon-blue)] select-none">▸</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* How It Works Flow */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Workflow className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">How It Works & Pipeline Logic</h3>
                    </div>
                    <div className="space-y-2">
                      {details.howItWorks.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 transition-colors"
                        >
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed pt-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ───────────────── SETUP & RUN GUIDE TAB ───────────────── */}
              {activeTab === "setup" && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="space-y-6"
                >
                  {/* Step-by-Step Setup Guide */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Rocket className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Step-by-Step Setup & Execution</h3>
                    </div>
                    <div className="space-y-3.5">
                      {details.gettingStarted.map((step, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                          <h4 className="text-sm font-bold text-amber-400 mb-1.5">{step.title}</h4>
                          {step.details && <p className="text-xs text-gray-400 mb-2.5">{step.details}</p>}
                          {step.command && (
                            <div className="relative group">
                              <pre className="p-3.5 rounded-lg bg-[#050510] border border-white/10 text-xs sm:text-sm text-cyan-300 font-mono overflow-x-auto custom-scrollbar">
                                <code>{step.command}</code>
                              </pre>
                              <button
                                onClick={() => handleCopy(step.command || "", idx)}
                                title="Copy command"
                                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-all"
                              >
                                {copiedIdx === idx ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="text-emerald-400">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Troubleshooting & Gotchas */}
                  {details.commonIssues && details.commonIssues.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Troubleshooting & Gotchas</h3>
                      </div>
                      <div className="space-y-2.5">
                        {details.commonIssues.map((issue, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                            <h5 className="text-xs sm:text-sm font-bold text-rose-300 mb-1">🐞 {issue.issue}</h5>
                            <p className="text-xs text-gray-300 font-mono bg-black/40 p-2 rounded-lg border border-white/5">{issue.solution}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Future Improvements */}
                  {details.futureImprovements && details.futureImprovements.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">📌 Roadmap & Future Enhancements</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {details.futureImprovements.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-gray-300">
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ───────────────── DELIVERABLES TAB ───────────────── */}
              {activeTab === "deliverables" && (
                <motion.div
                  key="deliverables"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <ProjectDeliverablesSection
                    project={project}
                    titleVariant="what_you_receive"
                    showFolderTree={true}
                  />
                </motion.div>
              )}

              {/* ───────────────── REVIEWS TAB ───────────────── */}
              {activeTab === "reviews" && (
                <motion.div
                  key="reviews"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                >
                  <ReviewSection projectId={project.id} />
                </motion.div>
              )}

              {/* ───────────────── COMMENTS TAB ───────────────── */}
              {activeTab === "comments" && (
                <motion.div
                  key="comments"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                >
                  <CommentSection projectId={project.id} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>

          {/* Sticky Modal Footer Actions */}
          <div className="px-6 md:px-8 py-4 border-t border-white/10 bg-[#070714] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative z-20">
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                {isReady ? "Instant Commercial License" : "Build on Order • 25% Advance to Start"}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">
                  ₹{(isReady ? project.price : advanceAmount).toLocaleString("en-IN")}
                </p>
                {!isReady && (
                  <span className="text-xs text-gray-400">
                    (Total: ₹{project.price.toLocaleString("en-IN")} • 75% on delivery)
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" size="md" onClick={() => setShowPreview(true)}>
                <Download className="w-4 h-4" />
                Preview Files
              </Button>
              {existingOrder ? (
                existingOrder.status === "approved" ? (
                  existingOrder.orderType === "advance_payment" ? (
                    <Link href="/dashboard" onClick={onClose}>
                      <Button size="md" className="bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-1.5">
                        <Rocket className="w-4 h-4 text-amber-200" />
                        🔨 Build in Progress (25% Paid) • Track in Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/dashboard" onClick={onClose}>
                      <Button size="md" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        ✅ Already Purchased • View in Dashboard
                      </Button>
                    </Link>
                  )
                ) : (
                  <Link href="/dashboard" onClick={onClose}>
                    <Button size="md" className="bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-200" />
                      ⏳ Order Placed (Under Verification) • Track
                    </Button>
                  </Link>
                )
              ) : (
                <Button
                  size="md"
                  onClick={() => setShowCheckout(true)}
                  className={!isReady ? "bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-600 hover:to-purple-700 text-white font-bold shadow-[0_0_20px_rgba(245,158,11,0.25)]" : ""}
                >
                  {!isReady ? (
                    <>
                      <Rocket className="w-4 h-4" />
                      Order Project (25% Advance)
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Buy & Download
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Project } from "@/lib/data/mockProjects";
import { ProjectDeliverable, getProjectDeliverables } from "@/lib/data/deliverables";
import { downloadCompleteProjectZip } from "@/lib/projectZipGenerator";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Presentation,
  Code2,
  Cpu,
  BookOpen,
  FolderTree,
  Download,
  Lock,
  CheckCircle,
  Sparkles,
  Info,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Layers,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";

interface ProjectDeliverablesSectionProps {
  project: {
    id: string;
    title: string;
    category?: any;
    price?: number;
    driveUrl?: string;
    deliverables?: ProjectDeliverable[];
    [key: string]: any;
  };
  mode?: "catalog" | "order" | "admin_preview";
  isPurchasedAndApproved?: boolean;
  onDownloadItem?: (item: ProjectDeliverable) => void;
  onDownloadCompleteZip?: () => void;
  titleVariant?: "what_you_receive" | "included_with_project";
  showFolderTree?: boolean;
}

export function ProjectDeliverablesSection({
  project,
  mode = "catalog",
  isPurchasedAndApproved = false,
  onDownloadItem,
  onDownloadCompleteZip,
  titleVariant = "what_you_receive",
  showFolderTree = true,
}: ProjectDeliverablesSectionProps) {
  const [isTreeExpanded, setIsTreeExpanded] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  const deliverables = useMemo(() => {
    return getProjectDeliverables(project).filter((item) => item.isIncluded);
  }, [project]);

  const cleanProjectFolder = useMemo(() => {
    return (project.title || "Project").trim().replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
  }, [project.title]);

  const getDeliverableIcon = (type: ProjectDeliverable["type"]) => {
    switch (type) {
      case "report":
        return <FileText className="w-5 h-5 text-rose-400" />;
      case "presentation":
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case "source_code":
        return <Code2 className="w-5 h-5 text-cyan-400" />;
      case "circuit_diagram":
        return <Cpu className="w-5 h-5 text-emerald-400" />;
      case "user_guide":
        return <BookOpen className="w-5 h-5 text-purple-400" />;
      default:
        return <FileCheck2 className="w-5 h-5 text-blue-400" />;
    }
  };

  const getFormatBadgeStyle = (format: ProjectDeliverable["format"]) => {
    switch (format) {
      case "PDF":
        return "bg-rose-500/15 text-rose-300 border-rose-500/30";
      case "PPT":
      case "PPTX":
        return "bg-amber-500/15 text-amber-300 border-amber-500/30";
      case "ZIP":
      case "RAR":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      case "PNG":
      case "MP4":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
      default:
        return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    }
  };

  const handleDownloadCompleteZip = async () => {
    if (!isPurchasedAndApproved) return;
    if (onDownloadCompleteZip) {
      onDownloadCompleteZip();
      return;
    }
    setIsGeneratingZip(true);
    try {
      await downloadCompleteProjectZip({
        project,
        orderId: project.orderId,
        customerName: project.customerName,
      });
    } catch (err) {
      console.error("Complete project ZIP download failed:", err);
      alert("Failed to package the complete project ZIP. Please try again or reach out to support.");
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const sectionTitle =
    titleVariant === "included_with_project"
      ? "Included with This Project"
      : "What You Will Receive";

  const sectionSubtitle =
    titleVariant === "included_with_project"
      ? "Everything provided in your verified project package upon purchase"
      : "Official engineering project deliverables, documents, and source packages";

  return (
    <div className="w-full space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[var(--color-neon-purple)]/15 border border-[var(--color-neon-purple)]/30 text-[var(--color-neon-purple)]">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-extrabold text-white tracking-wide">
              {sectionTitle}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              {deliverables.length} Verified Files
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {sectionSubtitle}
          </p>
        </div>

        {/* Deliverables Trust Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-semibold text-gray-300">
            Dedicated Project Folder Structure
          </span>
        </div>
      </div>

      {/* Deliverable Cards Grid */}
      <div className={`grid gap-3.5 ${mode === "order" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 md:grid-cols-2"}`}>
        {deliverables.map((item, idx) => {
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative group rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent border border-white/10 hover:border-cyan-500/40 hover:shadow-[0_8px_30px_rgba(6,182,212,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden min-w-0 w-full"
            >
              <div className="min-w-0 w-full">
                {/* Header inside Card */}
                <div className="flex items-start gap-2.5 mb-2.5 min-w-0 w-full">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                    {getDeliverableIcon(item.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                        {item.title}
                      </h4>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shrink-0 ${getFormatBadgeStyle(
                          item.format
                        )}`}
                      >
                        {item.format}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-mono text-gray-500 truncate w-full block mt-0.5" title={item.folderPath}>
                      {item.folderPath}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-300/90 leading-relaxed mb-3 break-words line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Card Footer: Status & Clean Non-wrapping Metadata */}
              <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 mt-auto min-w-0 w-full">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 truncate">
                    {isPurchasedAndApproved ? "Unlocked" : "Included"}
                  </span>
                  {item.fileSize && (
                    <span className="text-[10px] text-gray-400 font-mono shrink-0 whitespace-nowrap">
                      ({item.fileSize.replace(/\s*-\s*/g, " - ")})
                    </span>
                  )}
                </div>

                {/* Deliverable Status (No individual download button) */}
                {isPurchasedAndApproved ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Bundled in ZIP</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 shrink-0 whitespace-nowrap">
                    <Lock className="w-3 h-3 text-amber-400/80" />
                    <span>Bundled in ZIP</span>
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Structured Folder Hierarchy Preview */}
      {showFolderTree && (
        <div className="mt-4 rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
          <button
            onClick={() => setIsTreeExpanded(!isTreeExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-gray-200">
                View Project Documents Folder Structure
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                ({cleanProjectFolder}/)
              </span>
            </div>
            {isTreeExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {isTreeExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4 border-t border-white/5 text-xs font-mono text-gray-300 space-y-1.5 bg-[#070913]/60"
              >
                <div className="text-cyan-400 font-bold pt-2">📁 {cleanProjectFolder}/</div>
                <div className="pl-4 text-amber-300">├── 📁 Documents/</div>
                <div className="pl-8 text-gray-300">├── 📄 Project_Report.pdf (IEEE Standard)</div>
                <div className="pl-8 text-gray-300">├── 📊 Project_Presentation.pptx (Slide Deck)</div>
                <div className="pl-8 text-gray-300">└── 📘 User_Guide.pdf (Setup &amp; Troubleshooting)</div>
                <div className="pl-4 text-cyan-300">├── 📁 Source_Code/</div>
                <div className="pl-8 text-gray-300">├── 💻 Source_Files.zip (Full Code &amp; Libraries)</div>
                <div className="pl-8 text-gray-300">└── 📝 README.md (Execution Commands)</div>
                {deliverables.some((d) => d.type === "circuit_diagram") && (
                  <>
                    <div className="pl-4 text-emerald-300">└── 📁 Circuit_Diagram/</div>
                    <div className="pl-8 text-gray-300">└── 🔌 Circuit_Schematic.pdf (Pinout &amp; BOM)</div>
                  </>
                )}
                <div className="mt-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200/90 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Each project maintains an isolated, non-overlapping document directory. All files are verified before release.
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ───────────────── ONE COMPLETE PROJECT ZIP DOWNLOAD ───────────────── */}
      <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/20 to-purple-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-cyan-950/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
              <Download className="w-4 h-4" />
            </span>
            <span className="text-sm font-bold text-white tracking-wide">
              Complete Project Package
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              .ZIP ARCHIVE
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed max-w-xl">
            All included project documents, source files, and supporting resources are bundled into one complete project ZIP.
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
          {isPurchasedAndApproved ? (
            <button
              onClick={handleDownloadCompleteZip}
              disabled={isGeneratingZip}
              id="btn-download-complete-project"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingZip ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Preparing Complete ZIP...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Complete Project</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Available After Order &amp; Payment Approval</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

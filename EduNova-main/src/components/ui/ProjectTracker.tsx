"use client";

import { motion } from "framer-motion";
import { CheckCircle, Circle, Loader2, Clock, FileText } from "lucide-react";

export interface TrackingMilestone {
  stage: string;
  label: string;
  completedAt?: string;
  notes?: string;
  progressPercent: number;
}

// Default 13-step lifecycle
export const DEFAULT_MILESTONES: TrackingMilestone[] = [
  { stage: "pending", label: "Request Submitted", progressPercent: 0 },
  { stage: "reviewing", label: "Under Review", progressPercent: 5 },
  { stage: "negotiating", label: "Negotiation", progressPercent: 10 },
  { stage: "awaiting_final_approval", label: "Pending Approval", progressPercent: 15 },
  { stage: "accepted", label: "Accepted", progressPercent: 20 },
  { stage: "planning", label: "Project Planning", progressPercent: 30 },
  { stage: "building", label: "Project Building", progressPercent: 40 },
  { stage: "development", label: "Development in Progress", progressPercent: 55 },
  { stage: "testing", label: "Testing & Verification", progressPercent: 75 },
  { stage: "final_review", label: "Final Review", progressPercent: 90 },
  { stage: "completed", label: "Completed", progressPercent: 95 },
  { stage: "delivered", label: "Delivered", progressPercent: 100 },
];

interface ProjectTrackerProps {
  currentStatus: string;
  trackingHistory?: TrackingMilestone[];
  onAdvanceStage?: (stage: string) => void;
  adminMode?: boolean;
  estimatedCompletion?: string;
  lastUpdated?: string;
}

export function ProjectTracker({
  currentStatus,
  trackingHistory,
  onAdvanceStage,
  adminMode = false,
  estimatedCompletion,
  lastUpdated,
}: ProjectTrackerProps) {
  // Merge default milestones with any custom tracking data
  const milestones = DEFAULT_MILESTONES.map(m => {
    const tracked = trackingHistory?.find(t => t.stage === m.stage);
    return tracked ? { ...m, ...tracked } : m;
  });

  // When pending, the request is submitted AND under review
  const effectiveStatus = currentStatus === "pending" ? "reviewing" : currentStatus;
  const currentIndex = milestones.findIndex(m => m.stage === effectiveStatus);
  const currentMilestone = milestones[currentIndex] || milestones[0];
  const progressPercent = currentMilestone.progressPercent;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress Bar */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Project Progress</span>
          <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">
            {progressPercent}%
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          {estimatedCompletion && (
            <span>Est. completion: {new Date(estimatedCompletion).toLocaleDateString("en-IN")}</span>
          )}
          {lastUpdated && (
            <span>Last updated: {new Date(lastUpdated).toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-white/10" />
        <motion.div
          className="absolute left-[11px] top-2 w-px bg-gradient-to-b from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]"
          initial={{ height: 0 }}
          animate={{ height: currentIndex >= 0 ? `${(currentIndex / (milestones.length - 1)) * 100}%` : 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {milestones.map((milestone, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex + 1;
          const isFuture = index > currentIndex + 1;

          return (
            <div key={milestone.stage} className="relative flex items-start gap-3 mb-4 last:mb-0">
              {/* Node */}
              <div className="absolute -left-6 mt-0.5">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 drop-shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <Loader2 className="w-5 h-5 text-[var(--color-neon-blue)] animate-spin drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]" />
                  </motion.div>
                ) : (
                  <Circle className="w-5 h-5 text-gray-600" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 rounded-lg px-3 py-2 transition-all ${
                isCurrent
                  ? "bg-[var(--color-neon-blue)]/10 border border-[var(--color-neon-blue)]/30"
                  : isCompleted
                    ? "bg-green-500/5 border border-green-500/10"
                    : "bg-white/[0.02] border border-white/5"
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${
                    isCurrent ? "text-[var(--color-neon-blue)]" : isCompleted ? "text-green-400" : "text-gray-500"
                  }`}>
                    {milestone.label}
                  </span>
                  {milestone.completedAt && (
                    <span className="text-[10px] text-gray-500">
                      {new Date(milestone.completedAt).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>

                {milestone.notes && (
                  <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                    <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {milestone.notes}
                  </p>
                )}

                {/* Admin: advance to this stage */}
                {adminMode && isFuture && onAdvanceStage && (
                  <button
                    onClick={() => onAdvanceStage(milestone.stage)}
                    className="mt-2 text-[10px] text-gray-500 hover:text-[var(--color-neon-blue)] transition-colors underline underline-offset-2"
                  >
                    Advance to this stage →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

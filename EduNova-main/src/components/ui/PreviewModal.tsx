"use client";

import { Project } from "@/lib/data/mockProjects";
import { motion } from "framer-motion";
import { X, Star, Layers, Code, Cpu, Zap, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "./Button";

interface Props {
  project: Project;
  onClose: () => void;
  onBuyNow: () => void;
}

// Generate mock features based on project data
function getProjectFeatures(project: Project): string[] {
  const baseFeatures = [
    `Built with ${project.techStack[0]}`,
    "Clean, well-documented source code",
    "Ready to deploy",
    "Includes setup documentation",
  ];
  if (project.category === "web") baseFeatures.push("Responsive design", "SEO optimized", "REST API integration");
  if (project.category === "mobile") baseFeatures.push("Cross-platform support", "Push notifications", "Offline mode");
  if (project.category === "iot" || project.category === "hardware") baseFeatures.push("Circuit diagrams included", "Sensor calibration guide", "PCB layout files");
  if (project.category === "aiml") baseFeatures.push("Pre-trained model weights", "Dataset samples included", "Jupyter notebooks");
  return baseFeatures.slice(0, 6);
}

export function PreviewModal({ project, onClose, onBuyNow }: Props) {
  const features = getProjectFeatures(project);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0a0a1a]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(0,240,255,0.15)] modal-scrollable custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner */}
        <div className="h-64 rounded-t-2xl border-b border-white/10 relative overflow-hidden">
          <img
            src={project.thumbnail}
            alt={project.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/50 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 z-10">
            <h2 className="text-2xl font-black text-white drop-shadow-lg">{project.title}</h2>
            <p className="text-gray-300 text-sm mt-1">by EduNova Team</p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Rating Badge */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-white font-bold text-sm">{project.rating}</span>
              <span className="text-gray-400 text-xs">({project.reviewsCount} reviews)</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 uppercase font-bold tracking-wider">
              Verified Project
            </span>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[var(--color-neon-blue)]" /> About This Project
            </h3>
            <p className="text-gray-400 text-base leading-relaxed">
              {project.description} This project comes with complete source code, documentation, and setup instructions. Perfect for engineering students looking to learn, modify, or deploy a production-grade solution.
            </p>
          </div>

          {/* Features Grid */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-neon-purple)]" /> What You Get
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm text-gray-300">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-[var(--color-neon-blue)]" /> Technologies Used
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map(tech => (
                <span key={tech} className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-gray-200 border border-white/10">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Demo Screenshots */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Screenshots</h3>
            <div className="grid grid-cols-3 gap-3">
              {(project.previewImages && project.previewImages.length > 0
                ? project.previewImages
                : [project.thumbnail]
              ).slice(0, 3).map((img, i) => (
                <div key={i} className="aspect-video rounded-xl border border-white/10 overflow-hidden group">
                  <img
                    src={img}
                    alt={`${project.title} preview ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Price & CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Price</p>
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)]">
                ₹{project.price.toLocaleString("en-IN")}
              </p>
            </div>
            <Button size="lg" onClick={onBuyNow}>
              <ArrowRight className="w-5 h-5" />
              Proceed to Buy
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

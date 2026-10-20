"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAllProjectsForAdmin,
  approveProject,
  rejectProject,
  deleteProject,
  setProjectFeatured,
  updateProject,
  Project
} from "@/lib/data/mockProjects";
import {
  FolderKanban, Search, CheckCircle, XCircle, Clock,
  Trash2, Star, TrendingUp, Award, Layout, IndianRupee,
  Tag, Calendar, User, Edit3, X, Save, Layers, Sparkles, Check
} from "lucide-react";

function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const config = {
    pending: { label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    approved: { label: "Approved", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
    rejected: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      {c.label}
    </span>
  );
}

function FeaturedBadge({ featured }: { featured: Project["featured"] }) {
  if (featured === "none") return null;
  const config: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof Star }> = {
    trending: { label: "Trending", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: TrendingUp },
    featured: { label: "Featured", color: "text-[#00d4ff]", bg: "bg-[#00d4ff]/10", border: "border-[#00d4ff]/30", icon: Star },
    recommended: { label: "Recommended", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: Award },
    banner: { label: "Homepage Banner", color: "text-[var(--color-neon-purple)]", bg: "bg-[var(--color-neon-purple)]/10", border: "border-[var(--color-neon-purple)]/30", icon: Layout },
  };
  const c = config[featured];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.color} ${c.bg} border ${c.border}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  );
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [featureDropdown, setFeatureDropdown] = useState<string | null>(null);

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategory, setEditCategory] = useState<Project["category"]>("web");
  const [editStatus, setEditStatus] = useState<Project["status"]>("approved");
  const [editFeatured, setEditFeatured] = useState<Project["featured"]>("none");
  const [editSellerName, setEditSellerName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTechStack, setEditTechStack] = useState("");
  const [editArchitecture, setEditArchitecture] = useState("");
  const [editDeliverables, setEditDeliverables] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const refresh = async () => {
    const fetched = await getAllProjectsForAdmin();
    setProjects(fetched);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleApprove = async (id: string) => { await approveProject(id); refresh(); };
  const handleReject = async (id: string) => { await rejectProject(id); refresh(); };
  const handleDelete = async (id: string) => { 
    if (confirm("Are you sure you want to remove this project?")) {
      await deleteProject(id);
      refresh();
    }
  };
  const handleSetFeatured = async (id: string, featured: Project["featured"]) => {
    await setProjectFeatured(id, featured);
    refresh();
    setFeatureDropdown(null);
  };

  const handleStartEdit = (project: Project) => {
    setEditingProject(project);
    setEditTitle(project.title);
    setEditPrice(project.price);
    setEditCategory(project.category);
    setEditStatus(project.status);
    setEditFeatured(project.featured);
    setEditSellerName(project.sellerName);
    setEditDescription(project.description);
    setEditTechStack(project.techStack.join(", "));
    setEditArchitecture(project.architectureOverview || "");
    setEditDeliverables((project.finalDeliverables || []).join("\n"));
  };

  const handleSaveEdit = async () => {
    if (!editingProject) return;
    setSavingEdit(true);

    const parsedTechStack = editTechStack
      .split(",")
      .map(t => t.trim())
      .filter(Boolean);

    const parsedDeliverables = editDeliverables
      .split("\n")
      .map(d => d.trim())
      .filter(Boolean);

    const updates: Partial<Project> = {
      title: editTitle.trim(),
      price: Number(editPrice) || 0,
      category: editCategory,
      status: editStatus,
      featured: editFeatured,
      sellerName: editSellerName.trim() || "Somashekhar Javooru",
      description: editDescription.trim(),
      techStack: parsedTechStack.length > 0 ? parsedTechStack : editingProject.techStack,
      architectureOverview: editArchitecture.trim(),
      finalDeliverables: parsedDeliverables.length > 0 ? parsedDeliverables : editingProject.finalDeliverables,
    };

    await updateProject(editingProject.id, updates);
    setSavingEdit(false);
    setEditingProject(null);
    await refresh();
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) || p.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Project Management</h1>
            <p className="text-gray-400 text-xs">Approve, reject, feature, edit price & metadata for all {projects.length} uploaded projects</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 font-semibold">
            Catalog: <span className="text-amber-400 font-bold">{projects.length} Total Projects</span>
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects by title or seller..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[var(--color-neon-blue)]/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors ${
                filterStatus === f
                  ? "bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)] border border-[var(--color-neon-purple)]/40"
                  : "bg-white/5 text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-500">
              No projects found matching the filter.
            </div>
          ) : (
            filtered.map(project => {
              return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-5 rounded-2xl bg-[#0c0c1d] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Thumbnail + Title & Price */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-16 h-12 rounded-lg object-cover border border-white/10 shrink-0 bg-stone-900"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <h3 className="text-white font-bold text-lg leading-snug truncate">{project.title}</h3>
                        <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{project.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                        ₹{project.price.toLocaleString("en-IN")}
                      </p>
                      <span className="text-[10px] text-gray-500 font-mono">Commercial</span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-3 mt-1">
                    <ProjectStatusBadge status={project.status} />
                    <FeaturedBadge featured={project.featured} />
                  </div>

                  {/* Meta Details */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 mb-3 bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-gray-500 shrink-0" /> <span className="truncate">{project.sellerName}</span>
                    </span>
                    <span className="flex items-center gap-1.5 capitalize truncate">
                      <Tag className="w-3.5 h-3.5 text-gray-500 shrink-0" /> {project.category}
                    </span>
                    <span className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                    </span>
                  </div>

                  {/* Tech Stack */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.techStack.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-gray-300 font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5 mt-auto">
                  {project.status === "pending" && (
                    <>
                      <button onClick={() => handleApprove(project.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleReject(project.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}

                  {/* Featured Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setFeatureDropdown(featureDropdown === project.id ? null : project.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                    >
                      <Star className="w-3.5 h-3.5" /> Feature
                    </button>
                    <AnimatePresence>
                      {featureDropdown === project.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute bottom-full left-0 mb-2 w-44 rounded-xl bg-[#0c0c1d] border border-white/10 shadow-2xl overflow-hidden z-20"
                        >
                          {(["none", "trending", "featured", "recommended", "banner"] as const).map(opt => (
                            <button
                              key={opt}
                              onClick={() => handleSetFeatured(project.id, opt)}
                              className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-white/5 ${
                                project.featured === opt ? "text-[var(--color-neon-purple)] bg-[var(--color-neon-purple)]/5 font-bold" : "text-gray-400"
                              }`}
                            >
                              {opt === "none" ? "— Remove" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* EDIT PROJECT BUTTON (FULL ADMIN ACCESS) */}
                  <button
                    onClick={() => handleStartEdit(project)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
                    title="Edit Price, Title, Description and Info"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Info & Price
                  </button>

                  {/* Delete Button */}
                  <button onClick={() => handleDelete(project.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/5 border border-white/10 text-gray-500 text-xs font-bold hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          ADMIN EDIT PROJECT MODAL
      ───────────────────────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-6 flex justify-center items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0e1120] border border-cyan-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-4 sm:my-8 flex flex-col max-h-[90vh]"
            >
              {/* Modal Top Header (Always pinned & visible) */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#13172e] flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Edit Project & Pricing</h2>
                    <p className="text-[11px] text-gray-400 font-mono">ID: {editingProject.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingProject(null)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Postcard Banner Preview (Full uncropped view) */}
              <div className="relative h-44 sm:h-52 w-full overflow-hidden border-b border-white/10 bg-[#070913] flex-shrink-0 flex items-center justify-center">
                <img
                  src={editingProject.thumbnail}
                  alt={editingProject.title}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e1120]/80 via-transparent to-transparent pointer-events-none" />
                <span className="absolute top-3 right-3 text-[10px] px-2.5 py-1 rounded-full bg-black/80 text-cyan-300 border border-cyan-500/40 font-semibold tracking-wider uppercase shadow-md backdrop-blur-sm">
                  Project Postcard
                </span>
              </div>

              {/* Modal Form Content */}
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                {/* Title & Price Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Project Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      placeholder="e.g. 2048 Game Desktop App"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-amber-400 mb-1.5 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" /> Price (INR ₹)
                    </label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={e => setEditPrice(Number(e.target.value))}
                      placeholder="3499"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 text-sm font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Quick Price Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-gray-400 mr-1">Quick Presets:</span>
                  {[2999, 3299, 3499, 3799, 3999, 4499, 4999].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditPrice(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        editPrice === preset
                          ? "bg-amber-500 text-black font-bold"
                          : "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10"
                      }`}
                    >
                      ₹{preset.toLocaleString("en-IN")}
                    </button>
                  ))}
                </div>

                {/* Category, Status, Featured */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Category</label>
                    <select
                      value={editCategory}
                      onChange={e => setEditCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141829] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                    >
                      <option value="web">Web Development</option>
                      <option value="software">Software / Desktop</option>
                      <option value="aiml">AI & Machine Learning</option>
                      <option value="iot">IoT & Sensors</option>
                      <option value="hardware">Hardware & Arduino</option>
                      <option value="embedded">Embedded Systems</option>
                      <option value="mobile">Mobile Apps</option>
                      <option value="robotics">Robotics</option>
                      <option value="cloud">Cloud Computing</option>
                      <option value="cybersecurity">Cybersecurity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141829] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                    >
                      <option value="approved">Approved (Public)</option>
                      <option value="pending">Pending Review</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Featured Promotion</label>
                    <select
                      value={editFeatured}
                      onChange={e => setEditFeatured(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141829] border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                    >
                      <option value="none">None (Standard)</option>
                      <option value="trending">Trending 🔥</option>
                      <option value="featured">Featured ⭐</option>
                      <option value="recommended">Recommended 🏆</option>
                      <option value="banner">Homepage Banner 🚀</option>
                    </select>
                  </div>
                </div>

                {/* Seller / Curated By */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Curated / Uploaded By (Author)</label>
                  <input
                    type="text"
                    value={editSellerName}
                    onChange={e => setEditSellerName(e.target.value)}
                    placeholder="Somashekhar Javooru"
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Short Description</label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="Brief overview of the project scope and value proposition..."
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                {/* Tech Stack */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Tech Stack <span className="text-gray-500 font-normal">(Separate with commas)</span>
                  </label>
                  <input
                    type="text"
                    value={editTechStack}
                    onChange={e => setEditTechStack(e.target.value)}
                    placeholder="Python, Tkinter, SQLite, GUI"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Architecture Overview */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Architecture Overview & Technical Details</label>
                  <textarea
                    rows={2}
                    value={editArchitecture}
                    onChange={e => setEditArchitecture(e.target.value)}
                    placeholder="Detailed architecture description explaining models, services, databases, or frontend layers..."
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                {/* Final Deliverables */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Final Deliverables Included in Purchase <span className="text-gray-500 font-normal">(One item per line)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editDeliverables}
                    onChange={e => setEditDeliverables(e.target.value)}
                    placeholder="Full Source Code&#10;Database SQL Dump&#10;Architecture Manual&#10;Setup Readme"
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-cyan-400 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="p-4 sm:p-5 border-t border-white/10 bg-[#13172e] flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
                >
                  {savingEdit ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

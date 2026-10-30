"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FilterSidebar } from "@/components/ui/FilterSidebar";
import { ProjectDetailModal } from "@/components/ui/ProjectDetailModal";
import { getPublicProjects, Project, isProjectReadyToDownload } from "@/lib/data/mockProjects";
import { CategoryKey, categories } from "@/lib/data/categories";
import { StarRating } from "@/components/ui/StarRating";
import { Search, SlidersHorizontal, Eye, Sparkles, Rocket, Hammer, CheckCircle, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MarketplaceBackground } from "@/components/backgrounds/MarketplaceBackground";
import { ProjectChatbot } from "@/components/ui/ProjectChatbot";
import { useAuth } from "@/context/AuthContext";
import { getOrdersByUser, Order } from "@/lib/data/orders";

const CATEGORY_MAP: Record<string, CategoryKey> = {
  hardware: "hardware",
  software: "software",
  iot: "iot",
  embedded: "embedded",
  aiml: "aiml",
  ai: "aiml",
  robotics: "robotics",
  web: "web",
  mobile: "mobile",
  cloud: "cloud",
  cybersecurity: "cybersecurity",
  security: "cybersecurity",
};

function MarketplaceContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [projects, setProjects]                     = useState<Project[]>([]);
  const [userOrders, setUserOrders]                 = useState<Order[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery]               = useState("");
  const [sortBy, setSortBy]                         = useState("latest");
  const [showMobileFilters, setShowMobileFilters]   = useState(false);
  const [selectedProject, setSelectedProject]       = useState<Project | null>(null);

  // Sync category & search query from URL search parameters
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      const mapped = CATEGORY_MAP[catParam.toLowerCase()];
      if (mapped) {
        setSelectedCategories([mapped]);
      }
    }

    const qParam = searchParams.get("search");
    if (qParam) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  // Sync selected project from URL parameter once projects are loaded
  useEffect(() => {
    const projParam = searchParams.get("project");
    if (projParam && projects.length > 0) {
      const matched = projects.find(p => p.id === projParam);
      if (matched) {
        setSelectedProject(matched);
      }
    }
  }, [searchParams, projects]);

  useEffect(() => {
    const fetchProjects = () => {
      getPublicProjects().then(setProjects);
    };

    fetchProjects();

    window.addEventListener("edunova_projects_updated", fetchProjects);
    window.addEventListener("storage", fetchProjects);

    const projectPoll = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) fetchProjects();
    }, 30000);

    return () => {
      clearInterval(projectPoll);
      window.removeEventListener("edunova_projects_updated", fetchProjects);
      window.removeEventListener("storage", fetchProjects);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setUserOrders([]);
      return;
    }

    const fetchOrders = () => {
      getOrdersByUser(user.id).then(setUserOrders);
    };

    fetchOrders();

    window.addEventListener("edunova_orders_updated", fetchOrders);
    window.addEventListener("storage", fetchOrders);

    const orderPoll = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) fetchOrders();
    }, 30000);

    return () => {
      clearInterval(orderPoll);
      window.removeEventListener("edunova_orders_updated", fetchOrders);
      window.removeEventListener("storage", fetchOrders);
    };
  }, [user?.id]);

  const getProjectUserOrderStatus = (project: Project): {
    status: "owned" | "advance_paid" | "pending" | "none";
    order?: Order;
  } => {
    if (!user || userOrders.length === 0) return { status: "none" };
    const pTitle = (project.title || "").trim().toLowerCase();
    const matched = userOrders.filter(
      o => o.projectId === project.id || (o.projectTitle && o.projectTitle.trim().toLowerCase() === pTitle)
    );
    if (matched.length === 0) return { status: "none" };

    const fullBuyApproved = matched.find(
      o => o.status === "approved" && o.orderType !== "advance_payment"
    );
    if (fullBuyApproved) return { status: "owned", order: fullBuyApproved };

    const advanceApproved = matched.find(
      o => o.status === "approved" && o.orderType === "advance_payment"
    );
    if (advanceApproved) return { status: "advance_paid", order: advanceApproved };

    const pendingOrder = matched.find(o => o.status === "pending");
    if (pendingOrder) return { status: "pending", order: pendingOrder };

    return { status: "none" };
  };

  const toggleCategory    = (id: CategoryKey) => setSelectedCategories(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const toggleSubCategory = (id: string)      => setSelectedSubCategories(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id]);
  const clearAll          = () => { setSelectedCategories([]); setSelectedSubCategories([]); setSearchQuery(""); };

  const filteredProjects = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    return projects
      .filter(p => {
        if (!p) return false;
        const titleStr = (p.title || "").toLowerCase();
        const descStr = (p.description || "").toLowerCase();
        const techArr = Array.isArray(p.techStack) ? p.techStack : [];
        const subCats = Array.isArray(p.subCategoryIds) ? p.subCategoryIds : [];
        const projectCat = p.category;

        const matchesSearch =
          !q ||
          titleStr.includes(q) ||
          descStr.includes(q) ||
          techArr.some(t => String(t).toLowerCase().includes(q));

        // Matches if no category selected, OR if project.category is selected,
        // OR if any of the project's subcategories belong to one of the selected categories
        const matchesCategory =
          selectedCategories.length === 0 ||
          (projectCat && selectedCategories.includes(projectCat)) ||
          selectedCategories.some(catId => {
            const catObj = categories.find(c => c.id === catId);
            return catObj?.subCategories?.some(sub => subCats.includes(sub.id));
          });

        const matchesSubCategory =
          selectedSubCategories.length === 0 ||
          selectedSubCategories.some(sub => subCats.includes(sub));

        return matchesSearch && matchesCategory && matchesSubCategory;
      })
      .sort((a, b) => {
        const priceA = typeof a.price === "number" ? a.price : 0;
        const priceB = typeof b.price === "number" ? b.price : 0;
        const ratingA = typeof a.rating === "number" ? a.rating : 0;
        const ratingB = typeof b.rating === "number" ? b.rating : 0;
        if (sortBy === "price_asc") return priceA - priceB;
        if (sortBy === "price_desc") return priceB - priceA;
        if (sortBy === "rating") return ratingB - ratingA;
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
  }, [projects, selectedCategories, selectedSubCategories, searchQuery, sortBy]);

  return (
    <div className="relative min-h-screen">
      {/* ── Immersive Cyber Blueprint & Ambient Nebulae Canvas Background ── */}
      <MarketplaceBackground />

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 py-8 md:py-14 relative z-10">

        {/* Page header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <p className="text-[11px] uppercase tracking-widest text-cyan-300 font-bold">
                Engineering Projects Marketplace
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center">
              Browse Projects
              {filteredProjects.length > 0 && (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-bold text-xl ml-3">
                  ({filteredProjects.length})
                </span>
              )}
            </h1>
          </div>
          <button
            className="md:hidden flex items-center gap-2 bg-[#0c1020]/80 border border-cyan-500/30 px-4 py-2.5 rounded-xl text-cyan-300 text-sm hover:border-cyan-400 transition-colors backdrop-blur-md"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {(selectedCategories.length + selectedSubCategories.length) > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
                {selectedCategories.length + selectedSubCategories.length}
              </span>
            )}
          </button>
        </div>

        {/* Search + sort bar (Full width above grid) */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/60" />
            <input
              type="text"
              placeholder="Search by name, category, or tech stack (e.g. Python, IoT, React)…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c1020]/80 border border-cyan-500/25 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all shadow-inner backdrop-blur-md"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-[#0c1020]/80 border border-cyan-500/25 rounded-xl px-4 py-2.5 text-cyan-200 text-sm focus:outline-none focus:border-cyan-400 transition-colors shadow-inner backdrop-blur-md cursor-pointer"
          >
            <option value="latest">Latest first</option>
            <option value="rating">Highest rated</option>
            <option value="price_asc">Price: low → high</option>
            <option value="price_desc">Price: high → low</option>
          </select>
        </div>

        {/* Active filter chips */}
        {(selectedCategories.length > 0 || selectedSubCategories.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategories.map(catId => (
              <span key={catId} className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs flex items-center gap-1 border border-amber-500/20">
                {catId} <button onClick={() => toggleCategory(catId)} className="hover:text-amber-200 ml-0.5 leading-none">&times;</button>
              </span>
            ))}
            {selectedSubCategories.map(subId => (
              <span key={subId} className="px-3 py-1 bg-stone-800 text-stone-400 rounded-full text-xs flex items-center gap-1 border border-stone-700">
                {subId} <button onClick={() => toggleSubCategory(subId)} className="hover:text-stone-200 ml-0.5 leading-none">&times;</button>
              </span>
            ))}
          </div>
        )}

        {/* Unified Responsive Grid:
            - Row 1: FilterSidebar in Col 1, Projects in remaining cols (aligned at top!)
            - Row 2 onwards: Projects fill entire width (including left side!)
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
          {/* Filter Sidebar — Cell 1 of Row 1 on Desktop */}
          <div className="hidden md:block h-full">
            <FilterSidebar
              selectedCategories={selectedCategories}
              selectedSubCategories={selectedSubCategories}
              onToggleCategory={toggleCategory}
              onToggleSubCategory={toggleSubCategory}
              onClearAll={clearAll}
            />
          </div>

          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, i) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 20,
                  delay: Math.min(i * 0.03, 0.25),
                }}
                className="h-full"
              >
                <Card
                  glowOnHover
                  onClick={() => setSelectedProject(project)}
                  className="flex flex-col h-full bg-[#0c1020]/80 backdrop-blur-xl border border-white/[0.08] hover:border-cyan-400/50 hover:shadow-[0_12px_35px_rgba(6,182,212,0.18)] transition-all duration-300 cursor-pointer group/card"
                >
                  {/* Image — lateral pan on hover */}
                  <div className="relative h-44 rounded-lg mb-4 border border-white/[0.05] overflow-hidden">
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:-translate-x-2"
                      loading="lazy"
                    />
                    {/* Category badge — tilts on hover */}
                    <span className="absolute top-2 left-2 text-[9px] px-2 py-0.5 rounded bg-stone-950/80 text-amber-400 border border-amber-500/20 font-semibold tracking-wider uppercase transition-transform duration-300 group-hover/card:rotate-[-1.5deg]">
                      {project.category}
                    </span>
                  </div>

                  {(() => {
                    const orderInfo = getProjectUserOrderStatus(project);
                    const isReady = isProjectReadyToDownload(project);
                    return (
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {orderInfo.status === "owned" ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold tracking-wider uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> ✅ Owned / Purchased
                          </span>
                        ) : orderInfo.status === "advance_paid" ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/40 font-bold tracking-wider uppercase flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <Rocket className="w-3 h-3 text-amber-400" /> 🔨 Build in Progress (25% Paid)
                          </span>
                        ) : orderInfo.status === "pending" ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 font-bold tracking-wider uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3 text-yellow-400" /> ⏳ Order Placed (Pending)
                          </span>
                        ) : isReady ? (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold tracking-wider uppercase">
                            ⚡ Instant Download
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold tracking-wider uppercase">
                            🔨 Build on Order
                          </span>
                        )}
                        {project.fromCustomRequest && (
                          <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold tracking-wider inline-flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> Community build
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-stone-100 leading-snug">{project.title}</h3>
                    {(() => {
                      const rating = project.rating || 5.0;
                      const count  = project.reviewsCount || 0;
                      return (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-500 ml-2 whitespace-nowrap border border-stone-700 shrink-0">
                          ★ {rating.toFixed(1)}
                          {count > 0 && ` (${count})`}
                        </span>
                      );
                    })()}
                  </div>

                  <p className="text-stone-500 text-xs flex-1 mb-3 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(project.techStack || []).slice(0, 3).map(tech => (
                      <span key={tech} className="text-[9px] px-2 py-0.5 bg-stone-800/70 rounded text-stone-500 border border-stone-700/50">
                        {tech}
                      </span>
                    ))}
                    {(project.techStack || []).length > 3 && (
                      <span className="text-[9px] px-2 py-0.5 bg-stone-800/70 rounded text-stone-600 border border-stone-700/50">
                        +{(project.techStack || []).length - 3}
                      </span>
                    )}
                  </div>

                  {(() => {
                    const isReady = isProjectReadyToDownload(project);
                    const orderInfo = getProjectUserOrderStatus(project);
                    return (
                      <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                        <div>
                          <span className="text-base font-bold text-amber-500">
                            ₹{(project.price || 0).toLocaleString("en-IN")}
                          </span>
                          {orderInfo.status === "owned" ? (
                            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Fully Purchased
                            </p>
                          ) : orderInfo.status === "advance_paid" ? (
                            <p className="text-[10px] text-amber-300 font-bold flex items-center gap-1">
                              <Rocket className="w-3 h-3" /> 25% Advance Paid
                            </p>
                          ) : !isReady ? (
                            <p className="text-[10px] text-amber-400/80 font-medium">
                              ₹{Math.round((project.price || 0) * 0.25).toLocaleString("en-IN")} to start
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProject(project);
                            }}
                            className={
                              orderInfo.status === "owned"
                                ? "bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                : orderInfo.status === "advance_paid"
                                ? "bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                                : orderInfo.status === "pending"
                                ? "bg-yellow-600/30 text-yellow-300 border border-yellow-500/40 font-bold"
                                : !isReady
                                ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                : ""
                            }
                          >
                            {orderInfo.status === "owned" ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                Owned • View
                              </>
                            ) : orderInfo.status === "advance_paid" ? (
                              <>
                                <Rocket className="w-3.5 h-3.5" />
                                Track Build
                              </>
                            ) : orderInfo.status === "pending" ? (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                Pending Track
                              </>
                            ) : !isReady ? (
                              <>
                                <Rocket className="w-3.5 h-3.5" />
                                Order
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredProjects.length === 0 && (
            <div className="col-span-1 md:col-span-1 lg:col-span-2 xl:col-span-3 py-20 text-center flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0c1020]/40 backdrop-blur-sm">
              <p className="text-stone-300 font-semibold mb-1">No projects found</p>
              <p className="text-stone-500 text-xs">Nothing matches those filters. Try clearing one or two.</p>
              <button
                onClick={clearAll}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Mobile Filters Modal */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-4 flex items-center justify-center"
              onClick={() => setShowMobileFilters(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#0c1020] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl my-auto text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    Filters
                  </h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:text-white"
                  >
                    &times;
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  <FilterSidebar
                    selectedCategories={selectedCategories}
                    selectedSubCategories={selectedSubCategories}
                    onToggleCategory={toggleCategory}
                    onToggleSubCategory={toggleSubCategory}
                    onClearAll={clearAll}
                  />
                </div>
                <Button fullWidth className="mt-4" onClick={() => setShowMobileFilters(false)}>
                  Apply Filters
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Local AI Assistant Chatbot */}
      <ProjectChatbot
        projects={projects}
        onSelectProject={setSelectedProject}
      />

      {selectedProject && (
        <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070913]">
          <div className="w-9 h-9 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}

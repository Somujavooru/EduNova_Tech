"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { 
  CheckCircle, 
  AlertTriangle, 
  Phone, 
  Mail, 
  User, 
  Sparkles, 
  ShoppingCart, 
  Cog, 
  Rocket, 
  IndianRupee, 
  Code2, 
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  Globe,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Layers,
  Cpu,
  FileCode,
  Clock,
  Calendar
} from "lucide-react";

type ServiceCategory = "engineering" | "ecommerce" | "automation" | "fullstack";

interface ServiceOption {
  id: ServiceCategory;
  name: string;
  badge: string;
  shortLabel: string;
  icon: typeof GraduationCap;
  themeColor: "cyan" | "amber" | "purple" | "blue";
  startingPrice: string;
  defaultTitle: string;
  defaultTech: string;
  techTags: string[];
  tagline: string;
  descriptionPlaceholder: string;
  deliverables: string[];
}

const SERVICE_OPTIONS: Record<ServiceCategory, ServiceOption> = {
  engineering: {
    id: "engineering",
    name: "Engineering & Academic Projects",
    badge: "Academic & Research Builds • Starting @₹499",
    shortLabel: "Engineering Projects",
    icon: GraduationCap,
    themeColor: "cyan",
    startingPrice: "499",
    defaultTitle: "Custom Engineering & Research Project",
    defaultTech: "Python, TensorFlow, Arduino, ESP32, React, IoT Cloud",
    techTags: ["Python", "TensorFlow", "Arduino", "ESP32", "Raspberry Pi", "OpenCV", "React", "Node.js", "MATLAB", "IoT Cloud"],
    tagline: "Turnkey final-year projects, IoT embedded hardware, AI/ML models, IEEE paper implementations, and full viva defense documentation.",
    descriptionPlaceholder: "Describe your project features, target hardware/sensors, ML algorithms, circuit pinouts, or university submission guidelines...",
    deliverables: [
      "100% Tested Working Source Code",
      "Circuit Schematics & Pinout Diagrams",
      "Full Project Report & Presentation Slides",
      "1-on-1 Mentor Guidance & Setup Support"
    ]
  },
  ecommerce: {
    id: "ecommerce",
    name: "E-Commerce & Digital Storefronts",
    badge: "Modern E-Commerce Store • Starting @₹999",
    shortLabel: "E-Commerce Stores",
    icon: ShoppingCart,
    themeColor: "amber",
    startingPrice: "999",
    defaultTitle: "Custom E-Commerce Storefront Development",
    defaultTech: "Next.js, TailwindCSS, Razorpay, UPI Integration, Admin CMS",
    techTags: ["Next.js", "TailwindCSS", "Razorpay / UPI", "Stripe", "PostgreSQL", "Firebase", "Admin CMS", "WhatsApp Orders", "Inventory Sync"],
    tagline: "High-converting online store, instant UPI/card payment checkout, product catalog CMS, and automated WhatsApp order notifications.",
    descriptionPlaceholder: "Describe your product catalog, payment gateway preferences, branding style, and custom features (discount codes, WhatsApp checkout, inventory tracking)...",
    deliverables: [
      "Ultra-Fast Next.js Online Storefront",
      "Live Payment Gateway (Razorpay/UPI/Cards)",
      "Admin CMS to Manage Products & Orders",
      "Automated WhatsApp & Email Notifications"
    ]
  },
  automation: {
    id: "automation",
    name: "Business & Workflow Automation",
    badge: "Smart Automation Systems • Starting @₹999",
    shortLabel: "Automation & Bots",
    icon: Cog,
    themeColor: "purple",
    startingPrice: "999",
    defaultTitle: "Custom Business & Workflow Automation System",
    defaultTech: "Python, Webhooks, Telegram/WhatsApp APIs, Cloud Run, Selenium",
    techTags: ["Python", "WhatsApp API", "Telegram Bot", "Web Scraping", "Google Sheets API", "Cloud Run", "Zapier / Webhooks", "Cron Jobs", "Email Invoicing"],
    tagline: "Automate repetitive business workflows, social media auto-publishing, order syncing, customer support bots, and webhook notification pipelines.",
    descriptionPlaceholder: "Describe the tasks you want automated (e.g., auto-reply to customer DMs, extract invoices from emails, sync orders to Google Sheets, auto-post to social media)...",
    deliverables: [
      "24/7 Cloud Automated Execution",
      "Instant Error Alerting & Logs",
      "Zero-Maintenance Serverless Architecture",
      "Secure API Key & Webhook Configuration"
    ]
  },
  fullstack: {
    id: "fullstack",
    name: "Custom Web & SaaS Applications",
    badge: "Custom Web Platforms • Starting @₹1499",
    shortLabel: "Full-Stack Web & SaaS",
    icon: Globe,
    themeColor: "blue",
    startingPrice: "1499",
    defaultTitle: "Custom Full-Stack Web Application",
    defaultTech: "Next.js 15, TypeScript, TailwindCSS, Supabase / PostgreSQL, Auth",
    techTags: ["Next.js", "TypeScript", "TailwindCSS", "Supabase", "PostgreSQL", "Firebase Auth", "REST / GraphQL", "Docker", "Analytics Dashboard"],
    tagline: "Bespoke web applications, SaaS dashboards, customer portals, interactive calculators, and production-grade database systems.",
    descriptionPlaceholder: "Describe your app concept, target users, primary user journeys, database models, authentication requirements, and admin dashboard metrics...",
    deliverables: [
      "Modern, Responsive UI/UX Interface",
      "Secure Role-Based Authentication",
      "Production-Ready Cloud Deployment",
      "Modular & Well-Documented Codebase"
    ]
  }
};

const BUDGET_PRESETS = ["499", "999", "1999", "3999", "7999"];
const TIMELINE_PRESETS = [
  { label: "⚡ Express (1–3 Days)", val: "Express (1-3 Days)" },
  { label: "📅 Standard (1–2 Weeks)", val: "Standard (1-2 Weeks)" },
  { label: "🗓️ Flexible (1 Month+)", val: "Flexible (1 Month+)" },
];

function RequestsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service");

  // Determine initial active category from query parameter
  const initialCategory: ServiceCategory = 
    serviceParam === "ecommerce" ? "ecommerce" :
    serviceParam === "automation" ? "automation" :
    serviceParam === "fullstack" ? "fullstack" :
    serviceParam === "engineering" ? "engineering" :
    "engineering";

  const [activeCategory, setActiveCategory] = useState<ServiceCategory>(initialCategory);

  const currentServiceConfig = SERVICE_OPTIONS[activeCategory];

  const [formData, setFormData] = useState({
    userName: user?.name || "",
    userEmail: user?.email || "",
    userPhone: "",
    projectTitle: currentServiceConfig.defaultTitle,
    description: "",
    requiredTech: currentServiceConfig.defaultTech,
    budget: currentServiceConfig.startingPrice,
    deadline: "",
    additionalNotes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        userName: prev.userName || user.name || "",
        userEmail: prev.userEmail || user.email || "",
      }));
    }
  }, [user]);

  // Keep state in sync if URL query parameter changes
  useEffect(() => {
    if (serviceParam && (serviceParam in SERVICE_OPTIONS)) {
      const cat = serviceParam as ServiceCategory;
      setActiveCategory(cat);
      setFormData(prev => ({
        ...prev,
        projectTitle: SERVICE_OPTIONS[cat].defaultTitle,
        requiredTech: SERVICE_OPTIONS[cat].defaultTech,
        budget: SERVICE_OPTIONS[cat].startingPrice,
      }));
    }
  }, [serviceParam]);

  // Switch category handler
  const handleCategorySelect = (cat: ServiceCategory) => {
    setActiveCategory(cat);
    const cfg = SERVICE_OPTIONS[cat];
    setFormData(prev => ({
      ...prev,
      projectTitle: cfg.defaultTitle,
      requiredTech: cfg.defaultTech,
      budget: cfg.startingPrice,
    }));
    // Soft update query param without full reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("service", cat);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleToggleTechTag = (tag: string) => {
    const current = formData.requiredTech.trim();
    if (!current) {
      setFormData(prev => ({ ...prev, requiredTech: tag }));
      return;
    }
    const tags = current.split(",").map(t => t.trim()).filter(Boolean);
    if (tags.includes(tag)) {
      const updated = tags.filter(t => t !== tag).join(", ");
      setFormData(prev => ({ ...prev, requiredTech: updated }));
    } else {
      tags.push(tag);
      setFormData(prev => ({ ...prev, requiredTech: tags.join(", ") }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.userName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }
    if (!formData.userEmail.trim()) {
      setErrorMessage("Please enter your email address.");
      return;
    }
    if (!formData.userPhone.trim()) {
      setErrorMessage("Please enter your phone / WhatsApp number so our engineering team can contact you.");
      return;
    }
    if (!formData.description.trim()) {
      setErrorMessage("Please provide a description of your project or requirements.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          service: activeCategory,
          userId: user?.id || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit request.");
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong while submitting. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success State ──
  if (isSuccess) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-[#100820] via-[#090514] to-[#04020a] -mt-20 pt-32 pb-24 relative overflow-hidden flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4 text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.35)] animate-bounce duration-1000">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>

          <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            Inquiry Received Successfully
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 tracking-tight">
            Thank You, {formData.userName}!
          </h1>

          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl mb-8 text-left space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="text-amber-400 font-bold text-sm shrink-0">Service Track:</span>
              <span className="text-stone-200 text-sm font-medium">{currentServiceConfig.name}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-cyan-400 font-bold text-sm shrink-0">Project Title:</span>
              <span className="text-stone-200 text-sm font-medium">{formData.projectTitle}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold text-sm shrink-0">WhatsApp / Phone:</span>
              <span className="text-stone-200 text-sm font-medium">{formData.userPhone}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-purple-400 font-bold text-sm shrink-0">Email:</span>
              <span className="text-stone-200 text-sm font-medium">{formData.userEmail}</span>
            </div>
            <div className="pt-3 border-t border-white/10 text-stone-300 text-xs sm:text-[13px] leading-relaxed">
              💬 Our technical mentors will review your requirements and reach out on WhatsApp / Phone within <strong>24 hours</strong> with feasibility, fixed pricing, and an implementation roadmap.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/">
              <Button variant="secondary" className="px-6 py-2.5 text-sm">
                Return to Home
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button className="px-6 py-2.5 text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold">
                Browse Marketplace <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active theme classes based on selected service
  const themeAccent = 
    activeCategory === "ecommerce" ? "from-amber-400 to-orange-400" :
    activeCategory === "automation" ? "from-purple-400 to-pink-400" :
    activeCategory === "fullstack" ? "from-blue-400 to-cyan-300" :
    "from-cyan-400 via-amber-300 to-orange-400";

  const themeBadge =
    activeCategory === "ecommerce" ? "bg-amber-500/15 border-amber-400/40 text-amber-300" :
    activeCategory === "automation" ? "bg-purple-500/15 border-purple-400/40 text-purple-300" :
    activeCategory === "fullstack" ? "bg-blue-500/15 border-blue-400/40 text-blue-300" :
    "bg-cyan-500/15 border-cyan-400/40 text-cyan-300";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#140b28] via-[#0c071a] to-[#05030d] -mt-20 pt-28 pb-24 relative overflow-hidden">
      {/* Background ambient lighting orbs */}
      <div className="absolute top-10 left-1/4 w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-64 right-10 w-[480px] h-[480px] bg-amber-600/12 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-cyan-600/12 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto px-4 md:px-8 xl:px-12 relative z-10">
        
        {/* Back Link */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-xs font-semibold text-stone-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-stone-400 bg-white/[0.03] px-3 py-1 rounded-full border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Confidential • Direct WhatsApp Consultation</span>
          </div>
        </div>

        {/* ── Category Selection Pills (Tab Switcher) ── */}
        <div className="mb-8">
          <div className="text-center sm:text-left mb-3">
            <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400">
              Select Your Project or Service Domain
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {(Object.keys(SERVICE_OPTIONS) as ServiceCategory[]).map((key) => {
              const opt = SERVICE_OPTIONS[key];
              const IconComp = opt.icon;
              const isSelected = activeCategory === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleCategorySelect(key)}
                  className={`relative p-3 sm:p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? "bg-gradient-to-b from-white/[0.12] to-white/[0.04] border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.22)] scale-[1.02]"
                      : "bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.05] opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected 
                        ? "bg-amber-400 text-stone-950 font-bold shadow-sm" 
                        : "bg-white/10 text-stone-300"
                    }`}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-black tracking-tight text-white leading-tight">
                      {opt.shortLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-1 pt-1.5 border-t border-white/5">
                    <span className="text-stone-400">Starts @</span>
                    <span className={`font-bold ${isSelected ? "text-amber-300" : "text-stone-300"}`}>
                      ₹{opt.startingPrice}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Dynamic Header Banner ── */}
        <div className="mb-8 text-center sm:text-left p-6 rounded-3xl bg-gradient-to-r from-white/[0.03] via-white/[0.01] to-transparent border border-white/10 backdrop-blur-md">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider mb-3 shadow-sm ${themeBadge}`}>
            <Sparkles className="w-3.5 h-3.5" />
            {currentServiceConfig.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2.5">
            {activeCategory === "engineering" && (
              <>Custom <span className={`bg-gradient-to-r ${themeAccent} bg-clip-text text-transparent`}>Engineering &amp; Research</span> Projects</>
            )}
            {activeCategory === "ecommerce" && (
              <>Launch Your <span className={`bg-gradient-to-r ${themeAccent} bg-clip-text text-transparent`}>Online Store &amp; Brand</span></>
            )}
            {activeCategory === "automation" && (
              <>Automate Your <span className={`bg-gradient-to-r ${themeAccent} bg-clip-text text-transparent`}>Business Workflows</span></>
            )}
            {activeCategory === "fullstack" && (
              <>Custom <span className={`bg-gradient-to-r ${themeAccent} bg-clip-text text-transparent`}>Full-Stack &amp; SaaS</span> Platforms</>
            )}
          </h1>
          <p className="text-stone-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            {currentServiceConfig.tagline}
          </p>

          {/* Quick Deliverable Bullets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-5 pt-5 border-t border-white/10">
            {currentServiceConfig.deliverables.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-stone-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-center gap-3 backdrop-blur-md">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Request Form */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-[#1a1130]/95 via-[#120b22]/95 to-[#0a0614]/98 border-2 border-purple-500/30 shadow-[0_20px_70px_rgba(168,85,247,0.18)] backdrop-blur-2xl p-5 sm:p-8 rounded-3xl">
          <form className="flex flex-col gap-6 relative z-10" onSubmit={handleSubmit}>
            
            {/* ── Section 1: Contact Details ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner">
              <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                1. Your Contact Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-stone-200">
                    Full Name <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text" 
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Somashekhar Javooru" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-stone-200">
                    Email Address <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="email" 
                      name="userEmail"
                      value={formData.userEmail}
                      onChange={handleChange}
                      required
                      placeholder="yourname@gmail.com" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all"
                    />
                  </div>
                </div>

                {/* Phone / WhatsApp */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11.5px] font-semibold text-stone-200 flex items-center justify-between">
                    <span>Phone / WhatsApp <span className="text-amber-400">*</span></span>
                    <span className="text-[10px] text-emerald-400 font-medium">WhatsApp Direct</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="tel" 
                      name="userPhone"
                      value={formData.userPhone}
                      onChange={handleChange}
                      required
                      placeholder="+91 98765 43210" 
                      className="w-full bg-black/40 border border-emerald-500/30 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Request Requirements ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner flex flex-col gap-4">
              <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                2. Project &amp; Requirements Specifications
              </h2>

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold text-stone-200">
                  Project or Service Title <span className="text-amber-400">*</span>
                </label>
                <input 
                  type="text" 
                  name="projectTitle"
                  value={formData.projectTitle}
                  onChange={handleChange}
                  required
                  placeholder={currentServiceConfig.defaultTitle}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-semibold text-stone-200">
                  Detailed Requirements / What do you need built? <span className="text-amber-400">*</span>
                </label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={4}
                  placeholder={currentServiceConfig.descriptionPlaceholder}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all resize-y"
                />
              </div>

              {/* Tech Stack with Quick-Add Chips */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11.5px] font-semibold text-stone-200">
                    Preferred Technologies / Hardware Stack
                  </label>
                  <span className="text-[10px] text-stone-400">Click tags below to toggle</span>
                </div>
                
                <div className="relative">
                  <Code2 className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="text" 
                    name="requiredTech"
                    value={formData.requiredTech}
                    onChange={handleChange}
                    placeholder="e.g. Next.js, Python, Arduino, ESP32, React, Node.js"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition-all"
                  />
                </div>

                {/* Quick-add chips */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {currentServiceConfig.techTags.map(tag => {
                    const isSelected = formData.requiredTech.toLowerCase().includes(tag.toLowerCase());
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleToggleTechTag(tag)}
                        className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-semibold shadow-sm"
                            : "bg-white/[0.03] border-white/10 text-stone-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        + {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Section 3: Budget & Delivery Timeline ── */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 shadow-inner">
              <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                3. Budget &amp; Delivery Timeline
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Budget */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11.5px] font-semibold text-stone-200">
                      Estimated Budget (₹)
                    </label>
                    <span className="text-[10px] text-amber-400 font-semibold">
                      Starting @₹{currentServiceConfig.startingPrice}
                    </span>
                  </div>

                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="number" 
                      name="budget"
                      value={formData.budget}
                      onChange={handleChange}
                      placeholder={currentServiceConfig.startingPrice}
                      min="499"
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white font-semibold text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40 transition-all"
                    />
                  </div>

                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {BUDGET_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, budget: preset }))}
                        className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          formData.budget === preset 
                            ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                            : "bg-white/[0.03] border-white/10 text-stone-400 hover:text-white"
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Deadline */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11.5px] font-semibold text-stone-200">
                      Target Delivery Timeline
                    </label>
                    <span className="text-[10px] text-stone-400">Choose preset or pick exact date</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Text input / Active selection */}
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="text" 
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleChange}
                        placeholder="e.g. Within 1 week / Flexible"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40 transition-all"
                      />
                    </div>

                    {/* Calendar Date Picker */}
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={formData.deadline && /^\d{4}-\d{2}-\d{2}$/.test(formData.deadline) ? formData.deadline : ""}
                        onChange={(e) => {
                          if (e.target.value) {
                            setFormData(prev => ({ ...prev, deadline: e.target.value }));
                          }
                        }}
                        title="Select deadline date from calendar"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  {/* Timeline Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-stone-400 mr-1">Quick Presets:</span>
                    {TIMELINE_PRESETS.map(p => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, deadline: p.val }))}
                        className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          formData.deadline === p.val 
                            ? "bg-purple-500/20 border-purple-400 text-purple-300 font-bold"
                            : "bg-white/[0.03] border-white/10 text-stone-400 hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center">
                <FileCode className="w-4 h-4 text-cyan-400 mb-1" />
                <span className="text-[11px] font-bold text-white">Full Source Code</span>
                <span className="text-[9.5px] text-stone-400">Clean &amp; modular</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center">
                <Zap className="w-4 h-4 text-amber-400 mb-1" />
                <span className="text-[11px] font-bold text-white">Free Setup &amp; Demo</span>
                <span className="text-[9.5px] text-stone-400">Guided live walkthrough</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[11px] font-bold text-white">Verified Working</span>
                <span className="text-[9.5px] text-stone-400">100% test-passed code</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center">
                <Phone className="w-4 h-4 text-purple-400 mb-1" />
                <span className="text-[11px] font-bold text-white">Direct WhatsApp</span>
                <span className="text-[9.5px] text-stone-400">Response within 24 hrs</span>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button 
                type="submit" 
                size="lg" 
                fullWidth 
                className="bg-gradient-to-r from-amber-500 via-[#ff7828] to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black py-4 rounded-xl shadow-[0_4px_30px_rgba(245,158,11,0.4)] transition-all hover:scale-[1.01] active:scale-[0.99] text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Submitting Inquiry...</span>
                ) : (
                  <>
                    <span>{user ? "🚀 Submit Project Request" : "🚀 Submit Project Inquiry (No Login Required)"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <p className="text-center text-[11px] text-stone-400 mt-2.5">
                🔒 Free technical consultation. Our engineering leads will review your specs and contact you via WhatsApp / Phone within 24 hours.
              </p>
            </div>

          </form>
        </Card>

      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#070510]">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        </div>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}

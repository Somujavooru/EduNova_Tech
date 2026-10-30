"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PlusCircle, CheckCircle, Image as ImageIcon, Upload, X, Link as LinkIcon, PackageCheck } from "lucide-react";
import { addProject, Project } from "@/lib/data/mockProjects";
import { compressImage } from "@/lib/imageUtils";
import { generateId } from "@/lib/idUtils";

export default function AdminAddProjectPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("iot");
  const [price, setPrice] = useState("");
  const [techStack, setTechStack] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [readyToDownload, setReadyToDownload] = useState(false);
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [customDeliverable, setCustomDeliverable] = useState("");
  const [saved, setSaved] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const thumbRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      
      const t = params.get("title");
      if (t) setTitle(decodeURIComponent(t));
      
      const p = params.get("price");
      if (p) setPrice(p);
      
      const ts = params.get("techStack");
      if (ts) setTechStack(decodeURIComponent(ts));
      
      const d = params.get("driveUrl");
      if (d) setDriveUrl(decodeURIComponent(d));
    }
  }, []);

  const standardDeliverables = [
    "Source Code",
    "Documentation",
    "Circuit Diagrams",
    "PPT / Report",
    "Setup Guide",
    "Demo Video",
    "APK / Software Build",
    "PCB Files",
    "AI Model Files",
    "Dataset",
    "Installation Support",
    "Deployment Guide"
  ];

  const toggleDeliverable = (item: string) => {
    setDeliverables(prev => 
      prev.includes(item) ? prev.filter(d => d !== item) : [...prev, item]
    );
  };

  const addCustomDeliverable = () => {
    if (customDeliverable.trim() && !deliverables.includes(customDeliverable.trim())) {
      setDeliverables(prev => [...prev, customDeliverable.trim()]);
      setCustomDeliverable("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await addProject({
      id: generateId("proj").toLowerCase(),
      title,
      description,
      price: Number(price) || 0,
      rating: 5.0,
      reviewsCount: 0,
      category: category as Project["category"],
      subCategoryIds: [],
      sellerName: "Admin",
      thumbnail: thumbnailPreview || "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800",
      previewImages: previewImages.length > 0 ? previewImages : ["https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=800"],
      createdAt: new Date().toISOString(),
      techStack: techStack.split(',').map(s => s.trim()).filter(Boolean),
      status: "approved",
      featured: "none",
      uploadedBy: "admin",
      readyToDownload: readyToDownload,
      driveUrl: driveUrl || undefined,
      demoVideoUrl: demoUrl || undefined
    });

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setTitle("");
      setDescription("");
      setPrice("");
      setTechStack("");
      setDemoUrl("");
      setDriveUrl("");
      setDeliverables([]);
      setThumbnailPreview(null);
      setPreviewImages([]);
    }, 2000);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result, 800);
          setThumbnailPreview(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPreviews: string[] = [];
    Array.from(files).slice(0, 4).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          const compressed = await compressImage(reader.result, 800);
          newPreviews.push(compressed);
          if (newPreviews.length === Math.min(files.length, 4)) {
            setPreviewImages(prev => [...prev, ...newPreviews].slice(0, 4));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-neon-purple)]/10 border border-[var(--color-neon-purple)]/30 flex items-center justify-center">
          <PlusCircle className="w-5 h-5 text-[var(--color-neon-purple)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">Add New Project</h1>
          <p className="text-gray-500 text-xs">Add a curated project to the EduNova Forge marketplace</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 rounded-3xl border-2 border-purple-500/50 bg-gradient-to-br from-[#2c134f]/98 via-[#1a0a30]/98 to-[#0e041b]/98 shadow-[0_16px_55px_rgba(168,85,247,0.25)] backdrop-blur-2xl p-7 md:p-8 relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full blur-3xl bg-purple-500/20 pointer-events-none" />
          <form className="flex flex-col gap-5 relative z-10" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Project Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors shadow-inner"
                placeholder="e.g. Smart IoT Plant Monitor"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors resize-none shadow-inner"
                placeholder="Detailed description of the project..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-purple-100 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors"
                >
                  <option value="iot" className="bg-[#10061e] text-white">IoT &amp; Embedded</option>
                  <option value="aiml" className="bg-[#10061e] text-white">AI / ML</option>
                  <option value="web" className="bg-[#10061e] text-white">Web Development</option>
                  <option value="mobile" className="bg-[#10061e] text-white">Mobile Apps</option>
                  <option value="hardware" className="bg-[#10061e] text-white">Hardware / Robotics</option>
                  <option value="cybersecurity" className="bg-[#10061e] text-white">Cybersecurity</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Price (₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors shadow-inner"
                  placeholder="999"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Tech Stack (comma-separated)</label>
              <input
                type="text"
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors shadow-inner"
                placeholder="React, Node.js, MongoDB"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Demo Video URL</label>
              <input
                type="url"
                value={demoUrl}
                onChange={e => setDemoUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-purple-500/35 text-white placeholder-purple-200/40 text-sm focus:outline-none focus:border-purple-400 focus:bg-[#1a0a30] transition-colors shadow-inner"
                placeholder="https://youtube.com/..."
              />
            </div>

            {/* Thumbnail Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Project Thumbnail</label>
              <input type="file" ref={thumbRef} accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleThumbnailChange} />
              {thumbnailPreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500/40 h-48 shadow-lg">
                  <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setThumbnailPreview(null); if(thumbRef.current) thumbRef.current.value=''; }} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => thumbRef.current?.click()} className="flex flex-col items-center gap-2 border-2 border-dashed border-purple-500/40 bg-gradient-to-br from-purple-950/30 via-black/40 to-indigo-950/30 rounded-2xl p-8 text-center hover:border-purple-400 transition-all cursor-pointer">
                  <ImageIcon className="w-8 h-8 text-purple-400" />
                  <p className="text-purple-200 font-medium text-sm">Click to upload project thumbnail</p>
                  <p className="text-[11px] text-purple-300/60">JPG, PNG, WEBP • Recommended: 1280×720</p>
                </button>
              )}
            </div>

            {/* Preview Images Upload */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-purple-300/80 uppercase tracking-wider font-bold">Preview Screenshots (up to 4)</label>
              <input type="file" ref={previewRef} accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handlePreviewImagesChange} />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {previewImages.map((img, i) => (
                  <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                    <img src={img} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setPreviewImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {previewImages.length < 4 && (
                  <button type="button" onClick={() => previewRef.current?.click()} className="aspect-video rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-1 hover:border-[var(--color-neon-blue)]/40 transition-colors cursor-pointer">
                    <Upload className="w-5 h-5 text-gray-600" />
                    <span className="text-[10px] text-gray-600">Add Image</span>
                  </button>
                )}
              </div>
            </div>

            {/* Delivery Mode Toggle */}
            <div className="flex flex-col gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={readyToDownload}
                  onChange={e => setReadyToDownload(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black/40 text-[var(--color-neon-purple)] focus:ring-0 cursor-pointer mt-0.5"
                />
                <div>
                  <span className="text-sm font-bold text-white">Ready for Instant Download</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {readyToDownload
                      ? "⚡ Instant Download: Users pay 100% upfront and immediately receive files upon approval."
                      : "🔨 Build on Order: Users pay a 25% advance to start development with live milestone tracking, and the remaining 75% on delivery."}
                  </p>
                </div>
              </label>
            </div>

            {/* Google Drive Link */}
            <div className="flex flex-col gap-2 border-2 border-dashed border-[var(--color-neon-blue)]/30 bg-[var(--color-neon-blue)]/5 rounded-xl p-6 hover:border-[var(--color-neon-blue)]/60 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-5 h-5 text-[var(--color-neon-blue)]" />
                <label className="text-sm text-white font-bold">
                  Secure Delivery Link (Google Drive) {readyToDownload && <span className="text-red-400">*</span>}
                </label>
              </div>
              <input
                type="url"
                value={driveUrl}
                onChange={e => setDriveUrl(e.target.value)}
                required={readyToDownload}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[var(--color-neon-blue)] transition-colors"
                placeholder={readyToDownload ? "https://drive.google.com/drive/folders/... (Required for instant download)" : "Optional initially — can be added later when project is completed"}
              />
              <p className="text-[10px] text-gray-500 mt-1">This link will only be unlocked for users after final payment verification.</p>
            </div>

            {/* Final Deliverables Selection */}
            <div className="flex flex-col gap-3 border-2 border-dashed border-[var(--color-neon-purple)]/30 bg-[var(--color-neon-purple)]/5 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <PackageCheck className="w-5 h-5 text-[var(--color-neon-purple)]" />
                <label className="text-sm text-white font-bold">Final Deliverables Selection</label>
              </div>
              <p className="text-xs text-gray-400 mb-3">Select exactly what the user will receive upon full payment.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {standardDeliverables.map(item => {
                  const isSelected = deliverables.includes(item);
                  return (
                    <div 
                      key={item}
                      onClick={() => toggleDeliverable(item)}
                      className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                        isSelected 
                          ? "bg-[var(--color-neon-purple)]/20 border-[var(--color-neon-purple)]/50 text-white shadow-[0_0_15px_rgba(176,38,255,0.2)]"
                          : "bg-black/30 border-white/10 text-gray-400 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm flex items-center justify-center border ${isSelected ? 'bg-[var(--color-neon-purple)] border-[var(--color-neon-purple)]' : 'border-gray-500'}`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold">{item}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex items-center gap-2 mt-2 pt-4 border-t border-white/10">
                <input
                  type="text"
                  value={customDeliverable}
                  onChange={e => setCustomDeliverable(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomDeliverable())}
                  className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-[var(--color-neon-purple)] transition-colors"
                  placeholder="Add custom deliverable..."
                />
                <button
                  type="button"
                  onClick={addCustomDeliverable}
                  className="px-4 py-2 rounded-xl bg-[var(--color-neon-purple)]/20 text-[var(--color-neon-purple)] font-bold text-sm border border-[var(--color-neon-purple)]/30 hover:bg-[var(--color-neon-purple)]/30 transition-colors"
                >
                  Add
                </button>
              </div>
              
              {/* Custom selected deliverables display */}
              {deliverables.filter(d => !standardDeliverables.includes(d)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {deliverables.filter(d => !standardDeliverables.includes(d)).map(item => (
                    <span key={item} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-neon-blue)]/20 border border-[var(--color-neon-blue)]/30 text-[var(--color-neon-blue)] text-xs font-bold">
                      {item}
                      <button type="button" onClick={() => toggleDeliverable(item)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2 ${
                saved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-gradient-to-r from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] text-white hover:opacity-90 shadow-[0_0_20px_rgba(176,38,255,0.3)]"
              }`}
            >
              {saved ? (
                <><CheckCircle className="w-4 h-4" /> Project Added Successfully!</>
              ) : (
                <><PlusCircle className="w-4 h-4" /> Publish to Marketplace</>
              )}
            </button>
          </form>
        </motion.div>

        {/* Sidebar Tips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border-2 border-amber-500/50 bg-gradient-to-br from-[#4d2800]/98 via-[#2f1802]/98 to-[#170c01]/98 shadow-[0_16px_55px_rgba(245,158,11,0.25)] backdrop-blur-2xl p-7 md:p-8 h-fit relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-amber-500/25 pointer-events-none" />
          <h3 className="text-white font-black text-xl mb-5 relative z-10 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            Publishing Guidelines
          </h3>
          <div className="flex flex-col gap-3.5 text-sm relative z-10">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">1</span>
              <p className="text-amber-100 font-medium leading-relaxed text-xs">Use a clear, descriptive title that highlights the project&apos;s core purpose.</p>
            </div>
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">2</span>
              <p className="text-amber-100 font-medium leading-relaxed text-xs">Write a comprehensive description covering features, use cases, and setup steps.</p>
            </div>
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">3</span>
              <p className="text-amber-100 font-medium leading-relaxed text-xs">Include all relevant tech stack tags for better discoverability.</p>
            </div>
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">4</span>
              <p className="text-amber-100 font-medium leading-relaxed text-xs">Set competitive pricing based on project complexity and market demand.</p>
            </div>
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-amber-500/30">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xs flex-shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.4)]">5</span>
              <p className="text-amber-100 font-medium leading-relaxed text-xs">A demo video dramatically increases conversion rates.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

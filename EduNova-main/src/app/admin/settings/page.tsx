"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Globe, CreditCard, Shield,
  ToggleLeft, ToggleRight, Save, QrCode, AlertTriangle, CheckCircle, Share2,
  Upload, Trash2, Eye, X, RefreshCw, Sparkles, Check
} from "lucide-react";
import { getSocialLinks, saveSocialLinks, SocialMediaLinks } from "@/lib/data/contact";
import {
  getPlatformSettings,
  savePlatformSettings,
  resetPlatformSettings,
  getEffectiveQrCodeUrl,
  PlatformSettings
} from "@/lib/data/settings";
import { purgeRejectedProjects } from "@/lib/data/mockProjects";
import { clearAllOrders } from "@/lib/data/orders";

import { compressImage } from "@/lib/imageUtils";

export default function AdminSettingsPage() {
  const [siteTitle, setSiteTitle] = useState("EduNova Forge");
  const [tagline, setTagline] = useState("DISCOVER • BUILD • BRING IDEAS TO LIFE");
  const [upiId, setUpiId] = useState("edunova@paytm");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoApproveProjects, setAutoApproveProjects] = useState(false);
  const [autoApprovePayments, setAutoApprovePayments] = useState(false);
  const [bannerText, setBannerText] = useState("🚀 EduNova Forge — Discover • Build • Bring Ideas to Life");
  const [socials, setSocials] = useState<SocialMediaLinks | null>(null);

  const [saved, setSaved] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [isSavingSocials, setIsSavingSocials] = useState(false);
  const [socialsSaved, setSocialsSaved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [previewQrModal, setPreviewQrModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasUserEdited = useRef(false);

  // Load existing settings on mount & react to live remote updates
  useEffect(() => {
    const sync = () => {
      // Do not clobber fields if admin is actively typing
      if (hasUserEdited.current) return;
      const s = getPlatformSettings();
      setSiteTitle(s.siteTitle);
      setTagline(s.tagline);
      setUpiId(s.upiId);
      setQrCodeUrl(s.qrCodeUrl);
      setMaintenanceMode(s.maintenanceMode);
      setAutoApproveProjects(s.autoApproveProjects);
      setAutoApprovePayments(s.autoApprovePayments);
      setBannerText(s.bannerText);
      setSocials(getSocialLinks());
    };

    sync();

    window.addEventListener("edunova_settings_updated", sync);
    return () => window.removeEventListener("edunova_settings_updated", sync);
  }, []);

  // Handle uploading custom QR scanner image with automatic compression
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, WEBP, or SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const compressed = await compressImage(raw, 700, 700, 0.88);
      setQrCodeUrl(compressed);
      setStatusMessage("New QR Code Scanner loaded! Click 'Save Payment Configuration' below to apply.");
      setTimeout(() => setStatusMessage(null), 5000);
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDynamicQr = () => {
    setQrCodeUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatusMessage("Reverted to automatic dynamic UPI QR generator. Remember to click Save.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Dedicated save handler for Payment Configuration
  const handleSavePaymentConfig = async () => {
    setIsSavingPayment(true);
    try {
      await savePlatformSettings({
        upiId,
        qrCodeUrl,
        siteTitle,
        tagline,
        bannerText,
        socialLinks: socials || undefined,
      });
      setPaymentSaved(true);
      setStatusMessage("Payment configuration and official UPI QR scanner saved live across the entire website!");
      setTimeout(() => {
        setPaymentSaved(false);
        setStatusMessage(null);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving payment configuration";
      alert("Error saving payment configuration: " + msg);
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Dedicated save handler for Social Media Links
  const handleSaveSocialsConfig = async () => {
    if (!socials) return;
    setIsSavingSocials(true);
    try {
      await savePlatformSettings({
        socialLinks: socials,
      });
      saveSocialLinks(socials);
      setSocialsSaved(true);
      setStatusMessage("Social media links saved live across the entire website!");
      setTimeout(() => {
        setSocialsSaved(false);
        setStatusMessage(null);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving social media links";
      alert("Error saving social media links: " + msg);
    } finally {
      setIsSavingSocials(false);
    }
  };

  // Save all settings to localStorage + Firestore + Server API
  const handleSave = async () => {
    setIsProcessing(true);
    try {
      await savePlatformSettings({
        siteTitle,
        tagline,
        bannerText,
        upiId,
        qrCodeUrl,
        maintenanceMode,
        autoApproveProjects,
        autoApprovePayments,
        socialLinks: socials || undefined,
      });

      if (socials) {
        saveSocialLinks(socials);
      }

      hasUserEdited.current = false;
      setSaved(true);
      setStatusMessage("All platform settings, payment configuration, and QR scanner saved successfully!");
      setTimeout(() => {
        setSaved(false);
        setStatusMessage(null);
      }, 3500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      alert("Error saving settings: " + msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Immediate toggle persistence handlers
  const handleToggleMaintenance = async () => {
    const nextVal = !maintenanceMode;
    setMaintenanceMode(nextVal);
    try {
      await savePlatformSettings({ maintenanceMode: nextVal });
      setStatusMessage(`Maintenance Mode ${nextVal ? "ENABLED — live across site" : "DISABLED — site is live to all visitors"}`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error saving";
      alert("Failed to update Maintenance Mode: " + msg);
    }
  };

  const handleToggleAutoApproveProjects = async () => {
    const nextVal = !autoApproveProjects;
    setAutoApproveProjects(nextVal);
    try {
      await savePlatformSettings({ autoApproveProjects: nextVal });
      setStatusMessage(`Auto-Approve Projects ${nextVal ? "ENABLED" : "DISABLED"}`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error saving";
      alert("Failed to update Auto-Approve Projects: " + msg);
    }
  };

  const handleToggleAutoApprovePayments = async () => {
    const nextVal = !autoApprovePayments;
    setAutoApprovePayments(nextVal);
    try {
      await savePlatformSettings({ autoApprovePayments: nextVal });
      setStatusMessage(`Auto-Approve Payments ${nextVal ? "ENABLED" : "DISABLED"}`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error saving";
      alert("Failed to update Auto-Approve Payments: " + msg);
    }
  };

  // Danger Zone: Clear all mock data & orders
  const handleClearAllData = async () => {
    if (!confirm("Are you sure you want to clear all test platform orders, revenue records, and reset settings to defaults? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    try {
      await clearAllOrders();
      await resetPlatformSettings();

      const defaults = getPlatformSettings();
      setSiteTitle(defaults.siteTitle);
      setTagline(defaults.tagline);
      setUpiId(defaults.upiId);
      setQrCodeUrl(defaults.qrCodeUrl);
      setMaintenanceMode(defaults.maintenanceMode);
      setAutoApproveProjects(defaults.autoApproveProjects);
      setAutoApprovePayments(defaults.autoApprovePayments);
      setBannerText(defaults.bannerText);

      alert("All test orders and platform data have been reset to default clean state.");
    } catch (e: any) {
      alert("Error clearing data: " + (e?.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  // Danger Zone: Purge rejected projects
  const handlePurgeRejectedProjects = async () => {
    if (!confirm("Are you sure you want to permanently remove all rejected projects from the platform?")) {
      return;
    }

    setIsProcessing(true);
    try {
      const purgedCount = await purgeRejectedProjects();
      alert(`Purge complete. ${purgedCount} rejected project(s) have been permanently deleted.`);
    } catch (e: any) {
      alert("Error purging projects: " + (e?.message || e));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSocialToggle = async (key: keyof SocialMediaLinks) => {
    if (!socials) return;
    const nextSocials = {
      ...socials,
      [key]: { ...socials[key], enabled: !socials[key].enabled }
    };
    setSocials(nextSocials);
    try {
      await savePlatformSettings({ socialLinks: nextSocials });
      saveSocialLinks(nextSocials);
      const keyStr = String(key);
      setStatusMessage(`${keyStr.charAt(0).toUpperCase() + keyStr.slice(1)} ${nextSocials[key].enabled ? "ENABLED" : "DISABLED"} live across platform!`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e: unknown) {
      console.warn("Auto-save social toggle notice:", e);
    }
  };

  const handleSocialUrl = (key: keyof SocialMediaLinks, url: string) => {
    if (!socials) return;
    hasUserEdited.current = true;
    setSocials({
      ...socials,
      [key]: { ...socials[key], url }
    });
  };

  // Effective QR image for display
  const activeQrSrc = qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${encodeURIComponent(upiId || "edunova@paytm")}&pn=EduNova%20Forge%20Technologies&cu=INR`;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#00d4ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Platform Settings</h1>
            <p className="text-gray-500 text-xs">Configure payment scanners, appearance, and platform behavior</p>
          </div>
        </div>

        {/* Top Save Button */}
        <button
          onClick={handleSave}
          disabled={isProcessing}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
            saved
              ? "bg-green-500 text-black shadow-green-500/25"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20"
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
        </button>
      </div>

      {/* Global Status Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-cyan-400/60 hover:text-cyan-200">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-br from-[#0c2b4e]/95 via-[#071d36]/95 to-[#040f1d]/98 shadow-[0_12px_40px_rgba(6,182,212,0.18)] backdrop-blur-xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-cyan-500/15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
              <Globe className="w-4 h-4 text-cyan-300" />
            </div>
            <h2 className="text-white font-bold text-lg">General Settings</h2>
          </div>

          <div className="flex flex-col gap-5 relative z-10">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-cyan-200/70 uppercase tracking-wider font-bold">Website Title</label>
              <input
                type="text"
                value={siteTitle}
                onChange={e => {
                  hasUserEdited.current = true;
                  setSiteTitle(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400 focus:bg-[#071d36]/60 transition-colors shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-cyan-200/70 uppercase tracking-wider font-bold">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={e => {
                  hasUserEdited.current = true;
                  setTagline(e.target.value);
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400 focus:bg-[#071d36]/60 transition-colors shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-cyan-200/70 uppercase tracking-wider font-bold">Homepage Banner Text</label>
              <textarea
                rows={2}
                value={bannerText}
                onChange={e => {
                  hasUserEdited.current = true;
                  setBannerText(e.target.value);
                }}
                placeholder="E.g., 🚀 Welcome to EduNova Forge — Discover • Build • Bring Ideas to Life"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-400 focus:bg-[#071d36]/60 transition-colors resize-none shadow-inner"
              />
            </div>
          </div>
        </motion.div>

        {/* Payment Configuration (QR Scanner + UPI ID) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-[#0b3824]/95 via-[#062417]/95 to-[#03130c]/98 shadow-[0_12px_40px_rgba(16,185,129,0.18)] backdrop-blur-xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-emerald-500/15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Payment Configuration</h2>
              <p className="text-[11px] text-emerald-300/70">Custom UPI QR scanner and official payment receiver ID</p>
            </div>
          </div>

          <div className="flex flex-col gap-5 relative z-10">
            {/* UPI ID */}
            <div className="flex flex-col gap-2">
              <label className="text-xs text-emerald-200/70 uppercase tracking-wider font-bold">UPI ID (Receiver)</label>
              <input
                type="text"
                value={upiId}
                onChange={e => {
                  hasUserEdited.current = true;
                  setUpiId(e.target.value);
                }}
                placeholder="edunova@paytm"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-emerald-500/30 text-white text-sm font-mono focus:outline-none focus:border-emerald-400 focus:bg-[#062417]/60 transition-colors shadow-inner"
              />
              <p className="text-[10px] text-emerald-300/60">
                Shown to buyers during checkout and used to generate dynamic payment QR codes.
              </p>
            </div>

            {/* QR Code Scanner Upload & Active Preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-emerald-200/70 uppercase tracking-wider font-bold">
                  Official UPI QR Scanner
                </label>
                {qrCodeUrl ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Custom Image Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Auto-Generated UPI
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                onChange={handleQrUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-black/50 border border-dashed border-emerald-500/40">
                {/* QR Image Frame */}
                <div className="relative group flex-shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl border border-white/20 overflow-hidden">
                    <img
                      src={activeQrSrc}
                      alt="UPI QR Scanner"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <button
                    onClick={() => setPreviewQrModal(true)}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                    title="View Enlarged"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                </div>

                {/* QR Info and Action Buttons */}
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm text-emerald-100 font-bold mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                    {qrCodeUrl ? "Custom Scanner QR Active" : "Dynamic UPI Scanner Active"}
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  </p>
                  <p className="text-[11px] text-emerald-300/70 leading-relaxed">
                    {qrCodeUrl
                      ? "Custom uploaded scanner is active across Checkout and Custom Request payments."
                      : `Live UPI QR code linked to "${upiId}". Upload your merchant scanner image to replace it.`}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all hover:scale-105 cursor-pointer shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {qrCodeUrl ? "Replace Scanner" : "Upload New QR"}
                    </button>

                    <button
                      onClick={() => setPreviewQrModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Enlarge
                    </button>

                    {qrCodeUrl && (
                      <button
                        onClick={handleResetToDynamicQr}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition-all cursor-pointer"
                        title="Revert to dynamic UPI QR"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Save Button for Payment Configuration */}
            <div className="pt-1">
              <button
                onClick={handleSavePaymentConfig}
                disabled={isSavingPayment}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                  paymentSaved
                    ? "bg-green-500 text-black shadow-green-500/30"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20 hover:scale-[1.01]"
                }`}
              >
                {isSavingPayment ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving Payment Config...</>
                ) : paymentSaved ? (
                  <><Check className="w-4 h-4" /> Payment Configuration & Scanner Saved Live!</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Payment Configuration</>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Feature Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border-2 border-purple-500/40 bg-gradient-to-br from-[#2a134a]/95 via-[#1a0a2f]/95 to-[#0d0418]/98 shadow-[0_12px_40px_rgba(168,85,247,0.18)] backdrop-blur-xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-purple-500/15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/40 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-300" />
            </div>
            <h2 className="text-white font-bold text-lg">Feature Toggles</h2>
          </div>

          <div className="flex flex-col gap-4 relative z-10">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-purple-500/25">
              <div>
                <p className="text-white font-semibold text-sm flex items-center gap-2">
                  Maintenance Mode
                  {maintenanceMode && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />}
                </p>
                <p className="text-purple-200/60 text-xs mt-0.5">Temporarily take the site offline for updates</p>
              </div>
              <button onClick={handleToggleMaintenance} className="flex-shrink-0 cursor-pointer" title="Toggle Maintenance Mode">
                {maintenanceMode ? (
                  <ToggleRight className="w-10 h-10 text-yellow-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-500" />
                )}
              </button>
            </div>

            {/* Auto-Approve Projects */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-purple-500/25">
              <div>
                <p className="text-white font-semibold text-sm">Auto-Approve Projects</p>
                <p className="text-purple-200/60 text-xs mt-0.5">Skip manual review for new project uploads</p>
              </div>
              <button onClick={handleToggleAutoApproveProjects} className="flex-shrink-0 cursor-pointer" title="Toggle Auto-Approve Projects">
                {autoApproveProjects ? (
                  <ToggleRight className="w-10 h-10 text-green-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-500" />
                )}
              </button>
            </div>

            {/* Auto-Approve Payments */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-purple-500/25">
              <div>
                <p className="text-white font-semibold text-sm">Auto-Approve Payments</p>
                <p className="text-purple-200/60 text-xs mt-0.5">Automatically verify uploaded payment screenshots</p>
              </div>
              <button onClick={handleToggleAutoApprovePayments} className="flex-shrink-0 cursor-pointer" title="Toggle Auto-Approve Payments">
                {autoApprovePayments ? (
                  <ToggleRight className="w-10 h-10 text-green-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border-2 border-red-500/40 bg-gradient-to-br from-[#3d121c]/95 via-[#260910]/95 to-[#130307]/98 shadow-[0_12px_40px_rgba(239,68,68,0.18)] backdrop-blur-xl p-7 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-red-500/15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/40 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-red-300 font-bold text-lg">Danger Zone</h2>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            {/* Clear All Data */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-red-500/25">
              <div>
                <p className="text-white font-semibold text-sm">Clear All Test Orders & Data</p>
                <p className="text-red-200/60 text-xs mt-0.5">Reset orders, revenue to ₹0, and clear overrides</p>
              </div>
              <button
                onClick={handleClearAllData}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-400/50 text-red-300 text-xs font-bold hover:bg-red-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Reset
              </button>
            </div>

            {/* Purge Rejected Projects */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-red-500/25">
              <div>
                <p className="text-white font-semibold text-sm">Purge Rejected Projects</p>
                <p className="text-red-200/60 text-xs mt-0.5">Permanently remove all rejected projects from catalog</p>
              </div>
              <button
                onClick={handlePurgeRejectedProjects}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-400/50 text-red-300 text-xs font-bold hover:bg-red-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Purge
              </button>
            </div>
          </div>
        </motion.div>

        {/* Social Media Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-[#3b2007]/95 via-[#261304]/95 to-[#130801]/98 shadow-[0_12px_40px_rgba(245,158,11,0.18)] backdrop-blur-xl p-7 lg:col-span-2 relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-amber-500/15 pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 relative z-10">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-amber-300" />
            </div>
            <h2 className="text-white font-bold text-lg">Social Media Integration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {socials && Object.entries(socials).map(([key, data]) => (
              <div key={key} className="flex flex-col gap-3 p-4 rounded-2xl bg-black/40 border border-amber-500/25">
                <div className="flex items-center justify-between">
                  <p className="text-amber-100 font-bold text-sm capitalize">{key}</p>
                  <button onClick={() => handleSocialToggle(key as keyof SocialMediaLinks)} className="flex-shrink-0 cursor-pointer">
                    {data.enabled ? (
                      <ToggleRight className="w-8 h-8 text-amber-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-500" />
                    )}
                  </button>
                </div>
                <input
                  type="url"
                  value={data.url}
                  disabled={!data.enabled}
                  onChange={e => handleSocialUrl(key as keyof SocialMediaLinks, e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-amber-500/30 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-40"
                  placeholder={`https://${key}.com/edunova`}
                />
              </div>
            ))}

            {/* Direct Save Button for Social Media Links */}
            <div className="pt-2 col-span-full">
              <button
                onClick={handleSaveSocialsConfig}
                disabled={isSavingSocials}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                  socialsSaved
                    ? "bg-green-500 text-black shadow-green-500/30"
                    : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20 hover:scale-[1.01]"
                }`}
              >
                {isSavingSocials ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Saving Social Media Links...</>
                ) : socialsSaved ? (
                  <><Check className="w-4 h-4" /> Social Media Links Saved Live Across Platform!</>
                ) : (
                  <><Save className="w-4 h-4" /> Save Social Media Links Live</>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Save Action */}
      <motion.div
        className="mt-8 flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <button
          onClick={handleSave}
          disabled={isProcessing}
          className={`flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xl cursor-pointer ${
            saved
              ? "bg-green-500 text-black shadow-green-500/30"
              : "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-[1.02]"
          }`}
        >
          {saved ? (
            <><CheckCircle className="w-5 h-5" /> Settings & QR Scanner Saved!</>
          ) : (
            <><Save className="w-5 h-5" /> Save All Settings</>
          )}
        </button>
      </motion.div>

      {/* QR Scanner Preview Modal */}
      <AnimatePresence>
        {previewQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0e1120] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative"
            >
              <button
                onClick={() => setPreviewQrModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-white font-bold text-base mb-1">Official Payment QR Scanner</h3>
              <p className="text-gray-400 text-xs mb-4">
                Receiver UPI: <span className="text-emerald-400 font-mono font-bold">{upiId}</span>
              </p>

              <div className="w-64 h-64 mx-auto rounded-2xl bg-white p-3 flex items-center justify-center shadow-2xl mb-4">
                <img
                  src={activeQrSrc}
                  alt="Enlarged QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-gray-400">
                Buyers can scan this with Google Pay, PhonePe, Paytm, or BHIM UPI to complete purchases.
              </p>

              <button
                onClick={() => setPreviewQrModal(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

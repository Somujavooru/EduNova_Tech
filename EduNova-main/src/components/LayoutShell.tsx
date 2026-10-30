"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/ui/Navbar";
import { Footer } from "@/components/ui/Footer";
import { ReferralTracker } from "@/components/ReferralTracker";
import { getPlatformSettings, PlatformSettings } from "@/lib/data/settings";
import { useAuth } from "@/context/AuthContext";
import { EfMonogramLogo } from "@/components/ui/EfMonogramLogo";
import { EduNovaForgeLogo } from "@/components/ui/EduNovaForgeLogo";
import { Wrench, Shield, ArrowRight, AlertTriangle } from "lucide-react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>(getPlatformSettings());

  useEffect(() => {
    const sync = () => setSettings(getPlatformSettings());
    sync();
    window.addEventListener("edunova_settings_updated", sync);
    return () => window.removeEventListener("edunova_settings_updated", sync);
  }, []);

  // Dynamically update document title based on Platform Settings
  useEffect(() => {
    if (typeof document !== "undefined" && settings.siteTitle) {
      document.title = `${settings.siteTitle} | ${settings.tagline || "Discover • Build • Bring Ideas to Life"}`;
    }
  }, [settings.siteTitle, settings.tagline]);

  const isAdmin = pathname.startsWith("/admin") && pathname !== "/admin/login";

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  const isLoginPage = pathname === "/admin/login" || pathname === "/login";

  // If Maintenance Mode is active in settings and user is not an admin
  if (settings.maintenanceMode && !loading && user?.role !== "admin" && !isLoginPage) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#0c0d18] via-[#070810] to-[#030408] text-white relative overflow-hidden select-none">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

        <header className="p-6 max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <EfMonogramLogo size="md" />
            <EduNovaForgeLogo size="md" showTagline={false} />
          </Link>
          <Link
            href="/admin/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 font-semibold transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Admin Portal
          </Link>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-2xl mx-auto py-12 relative z-10">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 shadow-[0_0_35px_rgba(245,158,11,0.2)] animate-pulse">
            <Wrench className="w-10 h-10 text-amber-400" />
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 mb-4 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Scheduled System Upgrade in Progress
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            We&apos;re Tuning Up The Forge
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed mb-8 max-w-lg">
            {settings.siteTitle || "EduNova Forge"} is undergoing scheduled maintenance to deploy performance enhancements and catalog updates. We will be back online shortly!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-stone-950 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <Shield className="w-4 h-4" />
              Administrator Access
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </main>

        <footer className="p-6 text-center text-xs text-stone-500 border-t border-white/5 relative z-10">
          &copy; {new Date().getFullYear()} {settings.siteTitle || "EduNova Forge"}. All rights reserved.
        </footer>
      </div>
    );
  }

  const isHome = pathname === "/";

  return (
    <>
      {/* If Maintenance Mode is active and Admin is previewing the site, show banner */}
      {settings.maintenanceMode && user?.role === "admin" && (
        <div className="bg-amber-600/90 text-stone-950 font-bold text-xs py-1.5 px-4 text-center z-50 relative flex items-center justify-center gap-2 shadow-md">
          <AlertTriangle className="w-4 h-4" />
          <span>Maintenance Mode is ACTIVE. Regular visitors currently see the maintenance screen.</span>
          <Link href="/admin/settings" className="underline font-black hover:text-white transition-colors ml-1">
            Turn Off in Settings &rarr;
          </Link>
        </div>
      )}

      <ReferralTracker />
      <Navbar />
      <main className={`flex-1 ${isHome ? "pt-14 sm:pt-16" : "pt-20"}`}>{children}</main>
      <Footer />
    </>
  );
}

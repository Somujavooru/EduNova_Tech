"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LayoutDashboard, Shield } from "lucide-react";
import { Button } from "./Button";
import { EfMonogramLogo } from "./EfMonogramLogo";
import { NotificationBell } from "./NotificationBell";
import { EduNovaForgeLogo } from "./EduNovaForgeLogo";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",            label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/requests",    label: "Custom Projects" },
];

/**
 * Navbar — animation identity:
 * Active link: a 2px amber underline that slides between links using
 * Framer layoutId shared element animation. The underline moves from
 * link to link as the pathname changes — not a static highlight.
 * Logo: no hover scale (removed). Just an opacity transition.
 */
import { getPlatformSettings, PlatformSettings } from "@/lib/data/settings";

export function Navbar() {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [scrolled, setScrolled]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sync = () => setPlatformSettings(getPlatformSettings());
    sync();
    window.addEventListener("edunova_settings_updated", sync);
    return () => window.removeEventListener("edunova_settings_updated", sync);
  }, []);

  const activeHref = NAV_LINKS.find(l =>
    l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(l.href + "/")
  )?.href;

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-2" : "bg-transparent py-3"
      }`}
    >
      {/* Top Banner Announcement if set in Admin Settings */}
      {Boolean(platformSettings.bannerText?.trim()) && !scrolled && (
        <div className="w-full bg-gradient-to-r from-cyan-950/85 via-blue-900/70 to-purple-950/85 border-b border-cyan-500/20 py-1.5 px-4 text-center text-[11px] text-cyan-200 font-medium tracking-wide flex items-center justify-center gap-2 shadow-sm">
          <span>{platformSettings.bannerText}</span>
        </div>
      )}

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 flex items-center justify-between">
        {/* Logo — no hover scale, just opacity. Clicking while on home page smoothly scrolls to top. */}
        <Link
          href="/"
          onClick={handleLogoClick}
          className="flex items-center gap-1.5 sm:gap-2 group relative z-10 opacity-95 hover:opacity-100 transition-opacity duration-200 shrink-0 cursor-pointer"
          title="EduNova Forge — Back to top"
        >
          <EfMonogramLogo size="md" className="shrink-0" />
          <EduNovaForgeLogo size="md" showTagline={true} />
        </Link>

        {/* Desktop Nav — sliding amber underline indicator */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (link.href === "/" && pathname === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className={`relative pb-1 text-sm transition-colors duration-200 ${
                  isActive ? "text-stone-100" : "text-stone-500 hover:text-stone-200"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500 rounded-full"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-white text-xs font-semibold transition-all duration-200 shadow-[0_0_12px_rgba(245,158,11,0.18)] group"
                >
                  <Shield className="w-3.5 h-3.5 text-amber-400 group-hover:scale-105 transition-transform" />
                  <span>Admin Panel</span>
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-semibold transition-all duration-200 shadow-[0_0_12px_rgba(6,182,212,0.15)] group"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-105 transition-transform" />
                  <span>Dashboard</span>
                </Link>
              )}
              <Button
                variant="ghost"
                onClick={logout}
                className="text-stone-400 hover:text-stone-200 text-xs sm:text-sm"
              >
                Logout
              </Button>
              <NotificationBell userEmail={user.email} userName={user.name} userId={user.id} userRole={user.role} />
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" as="div">Login</Button>
              </Link>
              <Link href="/signup">
                <Button variant="primary" as="div">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle & notification bell */}
        <div className="flex items-center gap-2 md:hidden">
          {user && (
            <NotificationBell userEmail={user.email} userName={user.name} userId={user.id} userRole={user.role} />
          )}
          <button
            className="text-stone-400 hover:text-stone-100 transition-colors p-1.5"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden glass border-t border-white/[0.05] overflow-hidden"
          >
            <div className="flex flex-col p-4 gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = activeHref === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      if (link.href === "/" && pathname === "/") {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }}
                    className={`px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                      isActive
                        ? "text-stone-100 bg-white/[0.05]"
                        : "text-stone-500 hover:text-stone-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    {isActive && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-2 mb-0.5" />
                    )}
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                          {user.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <p className="text-stone-200 text-xs font-bold leading-none">{user.name}</p>
                          <p className="text-stone-500 text-[10px] leading-tight mt-0.5">{user.email}</p>
                        </div>
                      </div>
                      <NotificationBell userEmail={user.email} userName={user.name} userId={user.id} userRole={user.role} />
                    </div>

                    {user.role === "admin" ? (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>Admin Panel</span>
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Dashboard</span>
                      </Link>
                    )}

                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
                      className="text-xs"
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="secondary" fullWidth as="div">Login</Button>
                    </Link>
                    <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="primary" fullWidth as="div">Sign Up</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

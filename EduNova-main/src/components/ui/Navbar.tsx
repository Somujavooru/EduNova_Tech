"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "./Button";
import { CircularLogo } from "./CircularLogo";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
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
export function Navbar() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeHref = NAV_LINKS.find(l =>
    pathname === l.href || pathname.startsWith(l.href + "/")
  )?.href;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-2.5" : "bg-transparent py-4"
      }`}
    >
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 flex items-center justify-between">
        {/* Logo — no hover scale, just opacity */}
        <Link
          href="/"
          className="flex items-center gap-3 group relative z-10 opacity-90 hover:opacity-100 transition-opacity duration-200"
        >
          <CircularLogo className="w-[40px] md:w-[48px] h-[40px] md:h-[48px]" />
          <div className="hidden sm:flex flex-col justify-center">
            <span className="text-lg md:text-xl font-black tracking-widest leading-none text-stone-100 mt-0.5">
              EduNova
            </span>
            <span className="text-[8px] md:text-[9px] text-stone-600 font-medium tracking-widest mt-1 uppercase">
              Student project marketplace
            </span>
          </div>
        </Link>

        {/* Desktop Nav — sliding amber underline indicator */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => {
            const isActive = activeHref === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
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
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="text-amber-500 hover:text-amber-400 transition-colors text-sm font-semibold"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-stone-500 hover:text-stone-200 text-sm transition-colors"
              >
                {user.name}
              </Link>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
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

        {/* Mobile toggle */}
        <button
          className="md:hidden text-stone-400 hover:text-stone-100 transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
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
                    onClick={() => setMobileMenuOpen(false)}
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
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2.5 text-amber-500 text-sm font-semibold"
                >
                  Admin Panel
                </Link>
              )}
              <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-col gap-2">
                {user ? (
                  <>
                    <div className="text-stone-600 text-xs px-3 mb-1">{user.name}</div>
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => { logout(); setMobileMenuOpen(false); }}
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { EfMonogramLogo } from "./EfMonogramLogo";
import { EduNovaForgeLogo } from "./EduNovaForgeLogo";
import { getSocialLinks, SocialMediaLinks } from "@/lib/data/contact";
import { getPlatformSettings, PlatformSettings } from "@/lib/data/settings";
import { 
  ShieldCheck, 
  GraduationCap, 
  ArrowUp, 
  Sparkles, 
  Mail, 
  Headphones,
  ArrowRight
} from "lucide-react";

// Social SVG Icons
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const LinkedinIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);
const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);
const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
  </svg>
);
const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
  </svg>
);
const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6h0a14.5 14.5 0 0 0-4-1.2 10.3 10.3 0 0 0-.5 1.2 13.9 13.9 0 0 0-3 0 10.3 10.3 0 0 0-.5-1.2A14.5 14.5 0 0 0 6 6a15.7 15.7 0 0 0-2.4 9.8 14.4 14.4 0 0 0 4.4 2.2 11.2 11.2 0 0 0 .9-1.5 9.4 9.4 0 0 1-1.5-.7c.1-.1.3-.2.4-.3a10.3 10.3 0 0 0 9.2 0c.1.1.3.2.4.3a9.4 9.4 0 0 1-1.5.7 11.2 11.2 0 0 0 .9 1.5 14.4 14.4 0 0 0 4.4-2.2A15.7 15.7 0 0 0 18 6Z"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
  </svg>
);
const WhatsappIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
  </svg>
);

function SocialCapsule({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const isMailto = href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={isMailto ? undefined : "_blank"}
      rel={isMailto ? undefined : "noopener noreferrer"}
      aria-label={label}
      title={label}
      className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-amber-300 text-stone-400 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
    >
      {children}
    </a>
  );
}

export function Footer() {
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [socials, setSocials] = useState<SocialMediaLinks | null>(null);
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  useEffect(() => {
    const sync = () => {
      setPlatformSettings(getPlatformSettings());
      setSocials(getSocialLinks());
    };
    sync();

    window.addEventListener("edunova_settings_updated", sync);
    return () => window.removeEventListener("edunova_settings_updated", sync);
  }, []);

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Compact footer for authentication pages to prevent vertical screen overflow
  if (isAuthPage) {
    return (
      <footer className="w-full border-t border-white/[0.06] bg-black/40 backdrop-blur-md py-3.5 text-center text-stone-400 text-xs relative z-10">
        <div className="w-full max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-stone-300 font-semibold">&copy; {new Date().getFullYear()} EduNova Forge.</span>
            <span className="text-stone-500 hidden sm:inline">•</span>
            <span className="text-stone-500 hidden sm:inline">Engineering Project Marketplace</span>
          </div>
          <div className="flex items-center gap-4 text-[11.5px] text-stone-400">
            <Link href="/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link>
            <span className="text-stone-600">•</span>
            <Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
            <span className="text-stone-600">•</span>
            <Link href="/contact" className="hover:text-amber-400 transition-colors">Help &amp; Support</Link>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full relative z-10 border-t border-white/[0.08] bg-gradient-to-b from-[#090d1a] via-[#060812] to-[#03050a] backdrop-blur-xl text-stone-300 overflow-hidden">
      {/* ── Top Neon Accent Line ── */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ff7828]/60 via-[#00e5ff]/60 to-transparent" />

      {/* ── Ambient Glow Bulbs ── */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[420px] h-32 bg-[#ff7828]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 translate-x-1/2 w-[420px] h-32 bg-[#00e5ff]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">
        
        {/* ── Value Strip / Trust Badges ── */}
        <div className="py-8 border-b border-white/[0.06] grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">500+ Verified Projects</h4>
              <p className="text-[11.5px] text-stone-400 leading-snug">Production-grade source code, circuit pinouts &amp; BOM</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center shrink-0 text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">100% Bug-Free Guarantee</h4>
              <p className="text-[11.5px] text-stone-400 leading-snug">Pre-tested on real hardware with zero dependency issues</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">Defense-Ready Kits</h4>
              <p className="text-[11.5px] text-stone-400 leading-snug">Synopses, report templates &amp; viva Q&amp;A defense kits</p>
            </div>
          </div>
        </div>

        {/* ── Main Two-Column Links Section ── */}
        <div className="py-12 lg:py-14 flex flex-col md:flex-row justify-between items-start gap-10 md:gap-16 lg:gap-24">
          
          {/* Brand & Mission Column (Left) */}
          <div className="flex-1 max-w-2xl flex flex-col gap-4">
            <Link
              href="/"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  scrollToTop();
                }
              }}
              className="inline-flex items-center gap-3 group shrink-0 cursor-pointer"
              title="EduNova Forge — Back to top"
            >
              <EfMonogramLogo size="md" className="shrink-0 group-hover:scale-105 transition-transform" />
              <EduNovaForgeLogo size="md" showTagline={true} />
            </Link>

            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed mt-1">
              India&apos;s verified student engineering marketplace. We empower students, makers, and innovators with turnkey source code, circuit schematics, viva defense kits, and bespoke build guidance.
            </p>

            {/* Quick Contact & Mentor Assistance pill */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-3 max-w-md mt-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ff7828]/15 border border-[#ff7828]/30 flex items-center justify-center text-[#ff7828] shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-stone-200">Need Custom Engineering?</p>
                  <p className="text-[10px] text-stone-400">Direct Mentor Support • Mon - Sat</p>
                </div>
              </div>
              <Link 
                href="/requests" 
                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] font-bold border border-amber-500/30 transition-all flex items-center gap-1 shrink-0"
              >
                <span>Request</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Social Media Link Pills */}
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[10.5px] uppercase tracking-wider text-stone-500 font-semibold">Connect With Us</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                {socials?.instagram?.enabled && (
                  <SocialCapsule href={socials.instagram.url || "https://instagram.com/edunova"} label="Instagram">
                    <InstagramIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.linkedin?.enabled && (
                  <SocialCapsule href={socials.linkedin.url || "https://linkedin.com/company/edunova"} label="LinkedIn">
                    <LinkedinIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.twitter?.enabled && (
                  <SocialCapsule href={socials.twitter.url || "https://twitter.com/edunova"} label="X (Twitter)">
                    <TwitterIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.github?.enabled && (
                  <SocialCapsule href={socials.github.url || "https://github.com/edunova"} label="GitHub">
                    <GithubIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.youtube?.enabled && (
                  <SocialCapsule href={socials.youtube.url || "https://youtube.com/edunova"} label="YouTube">
                    <YoutubeIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.facebook?.enabled && (
                  <SocialCapsule href={socials.facebook.url || "https://facebook.com/edunova"} label="Facebook">
                    <FacebookIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.discord?.enabled && (
                  <SocialCapsule href={socials.discord.url} label="Discord">
                    <DiscordIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.telegram?.enabled && (
                  <SocialCapsule href={socials.telegram.url} label="Telegram">
                    <TelegramIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.whatsapp?.enabled && (
                  <SocialCapsule href={socials.whatsapp.url} label="WhatsApp">
                    <WhatsappIcon className="w-4 h-4" />
                  </SocialCapsule>
                )}
                {socials?.email?.enabled && (
                  <SocialCapsule href={`mailto:${socials.email.url?.replace(/^mailto:/, "") || "edunovaforgessupport@gmail.com"}`} label={`Email (${socials.email.url?.replace(/^mailto:/, "") || "edunovaforgessupport@gmail.com"})`}>
                    <Mail className="w-4 h-4" />
                  </SocialCapsule>
                )}
              </div>
            </div>
          </div>

          {/* Trust & Legal Column (Right) */}
          <div className="flex flex-col gap-3.5 shrink-0 min-w-[200px] lg:min-w-[240px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <p className="text-[11.5px] uppercase tracking-widest text-emerald-300 font-bold">Trust &amp; Legal</p>
            </div>
            <div className="flex flex-col gap-2.5 text-xs sm:text-[13px] text-stone-400">
              <Link href="/contact" className="hover:text-emerald-300 hover:translate-x-1 transition-all flex items-center justify-between gap-4">
                <span>Contact &amp; Support Desk</span>
                <span className="text-[10px] text-emerald-400 font-medium">Fast Reply</span>
              </Link>
              <Link href="/terms" className="hover:text-emerald-300 hover:translate-x-1 transition-all">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-emerald-300 hover:translate-x-1 transition-all">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-emerald-300 hover:translate-x-1 transition-all">Verified Project Guarantee</Link>
            </div>
          </div>

        </div>

        {/* ── Bottom Bar: Copyright & Back To Top ── */}
        <div className="py-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="text-stone-400 font-medium">&copy; {new Date().getFullYear()} EduNova Forge.</span>
            <span>All rights reserved. Built for engineering innovators.</span>
          </div>

          <div className="flex items-center">
            {/* Back to top button */}
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/10 hover:border-cyan-400/40 text-stone-400 hover:text-white transition-all text-xs cursor-pointer active:scale-95"
              title="Scroll to top"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}

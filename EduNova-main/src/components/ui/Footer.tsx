"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CircularLogo } from "./CircularLogo";
import { getSocialLinks, SocialMediaLinks } from "@/lib/data/contact";

const FacebookIcon  = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>);
const InstagramIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>);
const LinkedinIcon  = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>);
const TwitterIcon   = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>);
const GithubIcon    = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>);
const YoutubeIcon   = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>);

/** Social icon hover: an amber underline draws in below the icon, not a scale. */
function SocialLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative text-stone-600 hover:text-stone-300 transition-colors duration-200 group/social"
    >
      {children}
      {/* Underline draws in on hover — not a scale */}
      <span className="absolute -bottom-1 left-0 right-0 h-px bg-amber-500 scale-x-0 group-hover/social:scale-x-100 transition-transform duration-200 origin-left" />
    </a>
  );
}

import { usePathname } from "next/navigation";

export function Footer() {
  const [socials, setSocials] = useState<SocialMediaLinks | null>(null);
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";

  useEffect(() => {
    setSocials(getSocialLinks());
  }, []);

  return (
    <footer 
      className={`w-full border-t border-white/[0.08] mt-auto relative z-10 transition-colors ${
        isAuthPage ? "bg-black/20 backdrop-blur-md" : ""
      }`} 
      style={isAuthPage ? undefined : { background: "#0f0e0d" }}
    >
      <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 pt-14 pb-10 flex flex-col md:flex-row items-start justify-between gap-12">

        {/* Brand — left-aligned, not centered */}
        <div className="flex flex-col gap-4 max-w-xs">
          {/* Logo: no hover scale, just opacity */}
          <Link
            href="/"
            className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity duration-200"
          >
            <CircularLogo className="w-[44px] h-[44px]" />
            <span className="text-xl font-black tracking-widest text-stone-100">EduNova</span>
          </Link>
          <p className="text-stone-600 text-sm leading-relaxed">
            Projects built by students, for students.<br />
            Browse, buy, or get one made for you.
          </p>
        </div>

        {/* Links — right side, column layout */}
        <div className="flex flex-col sm:flex-row gap-10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3 font-semibold">Platform</p>
            <div className="flex flex-col gap-2.5 text-sm text-stone-500">
              <Link href="/marketplace" className="hover:text-stone-200 transition-colors">Marketplace</Link>
              <Link href="/requests"    className="hover:text-stone-200 transition-colors">Custom Projects</Link>
              <Link href="/dashboard"   className="hover:text-stone-200 transition-colors">Dashboard</Link>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-stone-600 mb-3 font-semibold">Legal</p>
            <div className="flex flex-col gap-2.5 text-sm text-stone-500">
              <Link href="/contact" className="hover:text-stone-200 transition-colors">Contact</Link>
              <Link href="/terms"   className="hover:text-stone-200 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-stone-200 transition-colors">Privacy</Link>
            </div>
          </div>
        </div>

        {/* Social — amber underline on hover, not scale */}
        {socials && (
          <div className="flex flex-col gap-4">
            <p className="text-[10px] uppercase tracking-widest text-stone-600 font-semibold">Find us</p>
            <div className="flex gap-4 items-center">
              {socials.instagram?.enabled && <SocialLink href={socials.instagram.url}><InstagramIcon className="w-4 h-4" /></SocialLink>}
              {socials.linkedin?.enabled  && <SocialLink href={socials.linkedin.url}><LinkedinIcon  className="w-4 h-4" /></SocialLink>}
              {socials.twitter?.enabled   && <SocialLink href={socials.twitter.url}><TwitterIcon    className="w-4 h-4" /></SocialLink>}
              {socials.github?.enabled    && <SocialLink href={socials.github.url}><GithubIcon      className="w-4 h-4" /></SocialLink>}
              {socials.youtube?.enabled   && <SocialLink href={socials.youtube.url}><YoutubeIcon    className="w-4 h-4" /></SocialLink>}
              {socials.facebook?.enabled  && <SocialLink href={socials.facebook.url}><FacebookIcon  className="w-4 h-4" /></SocialLink>}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.03] py-5 text-center text-stone-700 text-xs">
        &copy; {new Date().getFullYear()} EduNova
      </div>
    </footer>
  );
}

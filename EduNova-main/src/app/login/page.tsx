"use client";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { FormEvent, useState, useEffect } from "react";
import { 
  Loader2, 
  AlertTriangle, 
  MailCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Code2, 
  CheckCircle2, 
  ArrowRight,
  GraduationCap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { LoginBackground } from "@/components/backgrounds/LoginBackground";

export default function LoginPage() {
  const { login, googleLogin, user, resendVerification } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer for resending verification link
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    setResendMessage(null);
    const error = await login(email, password);
    if (error) {
      setAuthError(error);
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setResendMessage(null);
    const err = await resendVerification(email, password);
    if (err) {
      setResendMessage(`Failed: ${err}`);
    } else {
      setResendMessage("Verification link sent! Check your inbox & spam folder.");
      setResendCooldown(60);
    }
    setIsResending(false);
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setAuthError("");
    setResendMessage(null);
    const error = await googleLogin();
    if (error) {
      setAuthError(error);
    }
    setIsGoogleLoading(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-8 md:py-16">
      {/* ── Interactive Living Cyber Portal Canvas & Solar Core ── */}
      <LoginBackground />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Visual Showcase (Visible on lg screens) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between pr-4 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Student Project Marketplace</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15] mb-4">
              Build your degree project with{" "}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent">
                confidence.
              </span>
            </h1>

            <p className="text-stone-400 text-base leading-relaxed mb-6">
              Access 500+ production-grade engineering projects with full verified source code, circuit schematics, hardware lists, and defense-ready PPTs.
            </p>

            {/* Feature highlights */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-sm text-stone-300">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Tested source code with 100% bug-free guarantee</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-300">
                <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Code2 className="w-4 h-4 text-amber-400" />
                </div>
                <span>Complete documentation, viva Q&A, and synopses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-stone-300">
                <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                </div>
                <span>Direct mentor support & custom build assistance</span>
              </div>
            </div>
          </div>

          {/* Testimonial / Social proof badge */}
          <div className="p-4 rounded-xl bg-stone-900/60 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Raghav M. — VTU Engineering</p>
                <p className="text-[11px] text-stone-400">Final Year IoT Project • 1st Prize Winner</p>
              </div>
            </div>
            <p className="text-xs text-stone-300 italic">
              &ldquo;EduNova saved our team weeks of work. The code, hardware pinouts, and PPT were so thorough that our viva went flawlessly!&rdquo;
            </p>
          </div>
        </div>

        {/* Right Column: Modern Login Card */}
        <div className="w-full lg:col-span-6 flex justify-center">
          <div className="w-full max-w-md bg-stone-950/90 border border-amber-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_-10px_rgba(245,158,11,0.35)] relative overflow-hidden ring-1 ring-amber-500/25">
            {/* Top decorative glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

            <div className="mb-6">
              <div className="inline-block lg:hidden mb-3">
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                  EduNova Student Hub
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Log in to access your projects and dashboard
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {/* Unverified Email Warning Banner */}
              {authError === "EMAIL_NOT_VERIFIED" ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-stone-200 text-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                      <MailCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-400">Email Verification Required</h4>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                        Your account was created, but your email has not been verified yet. Check your inbox & spam folder for the activation link.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between">
                    <span className="text-xs text-stone-400">Didn&apos;t get the email?</span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isResending || resendCooldown > 0}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline disabled:opacity-50 transition-colors"
                    >
                      {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend verification link"}
                    </button>
                  </div>
                  {resendMessage && (
                    <p className="text-xs text-green-400 font-medium">{resendMessage}</p>
                  )}
                </div>
              ) : authError ? (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              ) : null}

              {/* Email Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-300">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="student@college.edu"
                  />
                </div>
              </div>
              
              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-stone-300">Password</label>
                  <Link href="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              {/* Divider */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-stone-500 text-xs uppercase tracking-wider">or continue with</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              
              {/* Google Button */}
              <button 
                type="button" 
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full py-3 px-4 rounded-xl bg-stone-950/60 hover:bg-stone-800/80 border border-white/10 text-stone-200 text-sm font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-white/5 text-center">
              <p className="text-stone-400 text-xs">
                Don&apos;t have an account yet?{" "}
                <Link href="/signup" className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

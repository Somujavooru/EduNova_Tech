"use client";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { sendNotification } from "@/lib/notifications";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Gift, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  MailCheck, 
  Mail, 
  ArrowRight, 
  RefreshCw, 
  Phone, 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  Sparkles, 
  ShieldCheck, 
  Award, 
  Zap, 
  ExternalLink, 
  Copy, 
  Check,
  ChevronDown
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { SignupBackground } from "@/components/backgrounds/SignupBackground";

const COUNTRY_CODES = [
  { code: "+91", country: "IN", flag: "🇮🇳", label: "India (+91)" },
  { code: "+1", country: "US", flag: "🇺🇸", label: "USA (+1)" },
  { code: "+44", country: "UK", flag: "🇬🇧", label: "UK (+44)" },
  { code: "+971", country: "AE", flag: "🇦🇪", label: "UAE (+971)" },
  { code: "+65", country: "SG", flag: "🇸🇬", label: "Singapore (+65)" },
  { code: "+61", country: "AU", flag: "🇦🇺", label: "Australia (+61)" },
  { code: "+49", country: "DE", flag: "🇩🇪", label: "Germany (+49)" },
  { code: "+33", country: "FR", flag: "🇫🇷", label: "France (+33)" },
  { code: "+81", country: "JP", flag: "🇯🇵", label: "Japan (+81)" },
  { code: "+880", country: "BD", flag: "🇧🇩", label: "Bangladesh (+880)" },
  { code: "+977", country: "NP", flag: "🇳🇵", label: "Nepal (+977)" },
  { code: "+94", country: "LK", flag: "🇱🇰", label: "Sri Lanka (+94)" },
  { code: "+966", country: "SA", flag: "🇸🇦", label: "Saudi (+966)" },
  { code: "+60", country: "MY", flag: "🇲🇾", label: "Malaysia (+60)" },
  { code: "+234", country: "NG", flag: "🇳🇬", label: "Nigeria (+234)" },
];

function SignupForm() {
  const { signup, googleLogin, user, resendVerification } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referralLocked, setReferralLocked] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Email verification modal state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [registeredPassword, setRegisteredPassword] = useState("");
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Cooldown countdown timer for resending verification link
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Auto-fill referral code from URL param or sessionStorage
  useEffect(() => {
    const urlRef = searchParams.get("ref");
    const storedRef = typeof window !== "undefined" ? sessionStorage.getItem("edunova_ref") : null;
    const code = urlRef || storedRef;
    if (code) {
      setReferralCode(code.toUpperCase());
      setReferralLocked(!!urlRef);
      sessionStorage.setItem("edunova_ref", code.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !showVerifyModal) {
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, router, showVerifyModal]);

  // Validate referral code via the public referralCodes index
  useEffect(() => {
    if (!referralCode.trim()) {
      setReferralStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setReferralStatus("checking");
      try {
        const codeSnap = await getDoc(doc(db, "referralCodes", referralCode.toUpperCase()));
        setReferralStatus(codeSnap.exists() ? "valid" : "invalid");
      } catch {
        setReferralStatus("idle");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [referralCode]);

  const handleGoogleLogin = async () => {
    if (referralCode.trim() && referralStatus === "valid") {
      sessionStorage.setItem("edunova_ref", referralCode.toUpperCase());
    }
    setIsGoogleLoading(true);
    setError("");
    const resultError = await googleLogin();
    if (resultError) {
      setError(resultError);
    }
    setIsGoogleLoading(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (referralCode.trim()) {
      if (referralStatus === "invalid") {
        setError("The referral code you entered is invalid. Please double-check or leave it blank.");
        return;
      }
      if (referralStatus === "checking") {
        setError("Please wait — checking referral code verification.");
        return;
      }
      sessionStorage.setItem("edunova_ref", referralCode.toUpperCase());
    } else {
      sessionStorage.removeItem("edunova_ref");
    }

    if (!phone.trim()) {
      setError("Please enter your mobile phone number.");
      return;
    }
    if (phone.trim().length < 7) {
      setError("Please enter a valid mobile number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords match.");
      return;
    }

    setIsLoading(true);
    const fullPhone = `${countryCode} ${phone.trim()}`;
    const result = await signup(name, email, password, fullPhone);
    if (result) {
      setError(result);
      setIsLoading(false);
    } else {
      sendNotification("signup", { userName: name, userEmail: email });
      setIsLoading(false);
      setRegisteredEmail(email);
      setRegisteredPassword(password);
      setShowVerifyModal(true);
    }
  };

  const handleResendEmail = async () => {
    if (!registeredEmail || isResending || resendCooldown > 0) return;
    setIsResending(true);
    setResendStatus(null);
    const err = await resendVerification(registeredEmail, registeredPassword);
    if (err) {
      setResendStatus(`Failed: ${err}`);
    } else {
      setResendStatus("Verification link resent! Check your inbox & spam folder.");
      setResendCooldown(60);
    }
    setIsResending(false);
  };

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(registeredEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-8 md:py-16">
      {/* ── Interactive Living Cosmic Nebula & Shooting Star Constellation Canvas ── */}
      <SignupBackground />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start my-4">
        
        {/* Left Column: Benefits & Community Showcase (lg screens) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between space-y-6 pt-4 pr-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>Join the #1 Student Marketplace</span>
            </div>

            <h1 className="text-4xl font-black text-white tracking-tight leading-[1.15] mb-4">
              Launch your engineering career with{" "}
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                EduNova.
              </span>
            </h1>

            <p className="text-stone-400 text-sm leading-relaxed mb-6">
              Create your free account today and discover ready-to-run projects across Web, AI/ML, Embedded Systems, IoT, and Cloud.
            </p>

            {/* Feature Perks */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-900/60 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Full Source & Hardware Blueprints</h4>
                  <p className="text-xs text-stone-400 mt-0.5">Complete code, wiring diagrams, components list, and presentation slides.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-900/60 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Gift className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Referral Cash Rewards</h4>
                  <p className="text-xs text-stone-400 mt-0.5">Share your code with batchmates and earn real wallet credits on every purchase.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-900/60 border border-white/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Verified Security</h4>
                  <p className="text-xs text-stone-400 mt-0.5">Email-verified genuine student profiles with instant 24/7 download access.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust strip */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
            <span>⚡ 500+ Verified Projects</span>
            <span>⭐ 4.9 Student Rating</span>
            <span>🔒 Safe & Protected</span>
          </div>
        </div>

        {/* Right Column: High-fidelity Signup Form */}
        <div className="w-full lg:col-span-7 flex justify-center">
          <div className="w-full max-w-lg bg-stone-950/90 border border-purple-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_-10px_rgba(168,85,247,0.35)] relative overflow-hidden ring-1 ring-purple-500/25">
            {/* Top decorative gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500" />

            <div className="mb-6">
              <div className="inline-block lg:hidden mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
                  Create Account
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Get started with EduNova
              </h2>
              <p className="text-stone-400 text-sm mt-1">
                Enter your details to create your student account
              </p>
            </div>

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-300">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="Aditya Sharma"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-300">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="aditya@example.com"
                  />
                </div>
              </div>

              {/* Mobile Number with Country Code (above Password) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="relative shrink-0">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="appearance-none bg-stone-950/90 border border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all cursor-pointer"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code + c.country} value={c.code} className="bg-stone-900 text-white">
                          {c.flag} {c.code}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    required
                    maxLength={15}
                    className="flex-1 bg-stone-950/70 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                    placeholder="98765 43210"
                  />
                </div>
              </div>

              {/* Password & Confirm Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-300">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-white text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-300">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className={`w-full bg-stone-950/70 border rounded-xl pl-10 pr-9 py-2.5 text-white text-sm placeholder:text-stone-600 focus:outline-none transition-all ${
                        confirmPassword && confirmPassword !== password
                          ? "border-red-500/60 focus:border-red-500"
                          : confirmPassword && confirmPassword === password
                          ? "border-emerald-500/60 focus:border-emerald-500"
                          : "border-white/10 focus:border-amber-500"
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {confirmPassword && (
                <div className="text-[11px] -mt-1 flex items-center gap-1.5">
                  {confirmPassword === password ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match perfectly
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Passwords do not match
                    </span>
                  )}
                </div>
              )}

              {/* Referral Code Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-stone-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    Referral Code
                  </span>
                  <span className="text-[11px] text-stone-500">Optional</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      if (!referralLocked) {
                        setReferralCode(e.target.value.toUpperCase());
                      }
                    }}
                    readOnly={referralLocked}
                    className={`w-full bg-stone-950/70 border rounded-xl px-4 py-2.5 text-white font-mono tracking-wider text-sm focus:outline-none transition-all pr-10 ${
                      referralLocked
                        ? "border-emerald-500/40 bg-emerald-500/5 cursor-not-allowed"
                        : referralStatus === "valid"
                        ? "border-emerald-500/50 focus:border-emerald-500"
                        : referralStatus === "invalid"
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-white/10 focus:border-amber-500"
                    }`}
                    placeholder="e.g. SOMU8431"
                    maxLength={12}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {referralStatus === "checking" && (
                      <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                    )}
                    {referralStatus === "valid" && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {referralStatus === "invalid" && (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                {referralStatus === "valid" && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Valid referral code applied!
                  </p>
                )}
                {referralStatus === "invalid" && (
                  <p className="text-[11px] text-red-400 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Invalid code. Check spelling or leave empty.
                  </p>
                )}
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              
              {/* Divider */}
              <div className="relative flex py-1.5 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-stone-500 text-xs uppercase tracking-wider">or sign up with</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              
              {/* Google Button */}
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-950/60 hover:bg-stone-800/80 border border-white/10 text-stone-200 text-sm font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-white/5 text-center">
              <p className="text-stone-400 text-xs">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── High-Fidelity Email Verification Sent Modal ────────────────────── */}
      <AnimatePresence>
        {showVerifyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-stone-900/95 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] relative overflow-hidden backdrop-blur-2xl"
            >
              {/* Celebratory Sunburst & Celestial Ambient Halo */}
              <div className="absolute -top-28 -right-28 w-72 h-72 bg-gradient-to-br from-amber-400/30 via-orange-500/20 to-transparent rounded-full blur-3xl pointer-events-none animate-bg-pulse" />
              <div className="absolute -bottom-28 -left-28 w-72 h-72 bg-gradient-to-tr from-yellow-500/20 via-amber-600/20 to-transparent rounded-full blur-3xl pointer-events-none animate-bg-float-1" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-amber-500/10 rounded-full pointer-events-none scale-125" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-dashed border-amber-500/15 rounded-full pointer-events-none animate-aurora" />

              <div className="relative z-10 text-center">
                
                {/* Glowing animated icon badge */}
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-2xl bg-amber-500/20 animate-ping opacity-30" />
                  <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/40 flex items-center justify-center shadow-[0_0_35px_rgba(245,158,11,0.3)]">
                    <MailCheck className="w-10 h-10 text-amber-400" />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Activation Link Dispatched</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
                  Verify Your Email Address
                </h2>

                <p className="text-stone-300 text-sm leading-relaxed mb-4">
                  We&apos;ve sent a secure verification link to activate your EduNova account:
                </p>

                {/* Email Highlight Box with Copy Button */}
                <div className="p-3.5 rounded-xl bg-stone-950/80 border border-white/10 mb-5 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-mono text-sm text-amber-300 truncate select-all">
                      {registeredEmail}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyEmailToClipboard}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white transition-colors shrink-0"
                    title="Copy email"
                  >
                    {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Quick 1-Click Mailbox Shortcuts */}
                <div className="mb-5">
                  <p className="text-xs text-stone-400 font-medium mb-2.5">Open your inbox directly:</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <a
                      href={`https://mail.google.com/mail/u/0/#search/EduNova`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-stone-950/70 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-amber-500/40 group"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" fill="#EA4335" />
                      </svg>
                      <span>Open Gmail</span>
                      <ExternalLink className="w-3 h-3 text-stone-500 group-hover:text-amber-400 transition-colors" />
                    </a>

                    <a
                      href="https://outlook.live.com/mail/0/inbox"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-stone-950/70 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-sky-500/40 group"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path d="M22 4H2C0.9 4 0 4.9 0 6v12c0 1.1 0.9 2 2 2h20c1.1 0 2-0.9 2-2V6c0-1.1-0.9-2-2-2zm-2 3.5l-8 5-8-5V6l8 5 8-5v1.5z" fill="#0078D4" />
                      </svg>
                      <span>Open Outlook</span>
                      <ExternalLink className="w-3 h-3 text-stone-500 group-hover:text-sky-400 transition-colors" />
                    </a>
                  </div>
                </div>

                {/* Next Steps List */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-stone-300 text-xs text-left mb-6 space-y-2 leading-relaxed">
                  <div className="flex items-center gap-2 font-semibold text-amber-300 text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>How to activate your account:</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">1</span>
                    <span>Open the email sent from <strong>EduNova Team</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">2</span>
                    <span>Click the <strong>Verify Email</strong> button or link inside.</span>
                  </div>
                  <div className="flex items-start gap-2 text-stone-300">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">3</span>
                    <span>Return and log in with your credentials to explore projects!</span>
                  </div>
                  <p className="text-stone-500 text-[11px] pt-1">
                    * If you don&apos;t see the message, please check your <strong>Spam</strong> or <strong>Updates</strong> folder.
                  </p>
                </div>

                {resendStatus && (
                  <p className="text-xs text-emerald-400 mb-4 bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-3.5 rounded-xl text-left">
                    {resendStatus}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <span>Proceed to Login</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isResending || resendCooldown > 0}
                    onClick={handleResendEmail}
                    className="w-full py-2.5 px-4 rounded-xl bg-stone-950/60 hover:bg-stone-800/80 border border-white/10 text-stone-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Resending verification link...</span>
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend email link in ${resendCooldown}s`
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

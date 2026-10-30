"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Mail, KeyRound, ExternalLink } from "lucide-react";
import { ForgotPasswordBackground } from "@/components/backgrounds/ForgotPasswordBackground";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setError("");

    const resultError = await resetPassword(email);
    
    if (resultError) {
      if (resultError === "This account uses Google Sign-In. Please continue with Google.") {
        setError(resultError);
      } else if (resultError.includes("No account found")) {
        // SECURITY: Still show success to prevent email enumeration attacks
        setIsSuccess(true);
      } else {
        setError(resultError);
      }
    } else {
      setIsSuccess(true);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-4 sm:py-6 md:py-8">
      {/* ── Interactive Cryptographic Security Radar & Matrix Canvas ── */}
      <ForgotPasswordBackground />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-xs font-medium text-stone-400 hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-emerald-400" /> Back to login
        </Link>
        
        <div className="bg-stone-950/90 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_60px_-10px_rgba(16,185,129,0.35)] relative overflow-hidden ring-1 ring-emerald-500/25">
          {/* Top decorative gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-500 to-cyan-400" />

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Password Reset Sent</h2>
              <p className="text-stone-300 text-sm mb-4 leading-relaxed">
                If an account exists for <span className="text-amber-400 font-mono text-xs">{email}</span>, you will receive a reset link shortly.
              </p>

              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 w-full text-left space-y-1.5">
                <p className="text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Next Steps</span>
                </p>
                <p className="text-stone-300 text-xs">1. Check your email and click the password reset link.</p>
                <p className="text-stone-300 text-xs">2. Set your new password and sign back in.</p>
              </div>

              {/* Prominent Spam / Junk Alert Box */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 text-left mb-6 w-full flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300 animate-pulse mt-0.5" />
                <div className="text-xs text-stone-200 leading-relaxed">
                  <p className="font-bold text-amber-300 text-xs mb-0.5">⚠️ Don&apos;t see the reset email?</p>
                  <p className="text-stone-300 text-[11.5px]">
                    Please check your <strong>Spam</strong>, <strong>Junk</strong>, or <strong>Promotions</strong> folder. Automated reset links often get filtered there.
                  </p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <a
                  href={`https://mail.google.com/mail/u/0/#search/EduNova+Forge`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-stone-950/70 hover:bg-stone-800 border border-white/10 text-stone-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:border-amber-500/40"
                >
                  <span>Open Gmail</span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                </a>

                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-sm shadow-lg shadow-amber-500/20 text-center transition-all"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
                  <p className="text-stone-400 text-xs mt-0.5">We will send a secure recovery link</p>
                </div>
              </div>

              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-stone-300">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="w-full bg-stone-950/70 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-stone-600" 
                      placeholder="engineer@example.com" 
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-semibold text-sm shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Reset Link</span>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

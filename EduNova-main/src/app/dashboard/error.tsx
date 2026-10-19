"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-5">📊</div>
        <h1 className="text-2xl font-black text-white mb-3">Dashboard Unavailable</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Something went wrong loading your dashboard. Your orders and data are safe.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl font-bold text-sm text-white transition-colors"
            style={{ background: "linear-gradient(135deg, #b026ff, #00f0ff)" }}
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10"
          >
            Go Home
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" && error.message && (
          <pre className="mt-8 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] font-mono text-left overflow-x-auto whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

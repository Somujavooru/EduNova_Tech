"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.warn("[Admin Error Boundary]", error.message || error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060612]">
      <div className="text-center max-w-md px-6">
        <Shield className="w-16 h-16 text-amber-500 mx-auto mb-5" />
        <h1 className="text-2xl font-black text-white mb-3">Admin Panel Error</h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          An unexpected error occurred in the admin panel. Your data has not been affected.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/admin"
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors border border-white/10"
          >
            Admin Home
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

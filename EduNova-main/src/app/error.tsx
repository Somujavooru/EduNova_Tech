"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log unexpected render errors — these are genuine bugs, not user errors
    console.error("[App Error Boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a1a",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>⚡</div>
        <h1
          style={{
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 800,
            fontFamily: "system-ui",
            marginBottom: 12,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            color: "#9ca3af",
            fontSize: 15,
            fontFamily: "system-ui",
            lineHeight: 1.6,
            marginBottom: 32,
          }}
        >
          An unexpected error occurred. Your data is safe — this is a display
          error, not a data problem.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #b026ff, #00f0ff)",
              color: "#fff",
              border: "none",
              fontFamily: "system-ui",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "12px 28px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.08)",
              color: "#e5e7eb",
              textDecoration: "none",
              fontFamily: "system-ui",
              fontSize: 14,
              fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Go Home
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" && error.message && (
          <pre
            style={{
              marginTop: 32,
              padding: "12px 16px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8,
              color: "#fca5a5",
              fontSize: 11,
              fontFamily: "monospace",
              textAlign: "left",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

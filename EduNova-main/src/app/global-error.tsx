"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// global-error.tsx must include its own <html> and <body> tags
// because it replaces the root layout when the layout itself throws.
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[Global Error Boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a1a",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🔴</div>
          <h1
            style={{
              color: "#ffffff",
              fontSize: 24,
              fontWeight: 800,
              fontFamily: "system-ui",
              marginBottom: 12,
            }}
          >
            EduNova Forge encountered a critical error
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
            The application failed to load. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "12px 32px",
              borderRadius: 10,
              background: "linear-gradient(135deg, #b026ff, #00f0ff)",
              color: "#fff",
              border: "none",
              fontFamily: "system-ui",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}

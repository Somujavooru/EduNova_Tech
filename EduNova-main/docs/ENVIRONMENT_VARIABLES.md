# EduNova Environment Variables Reference

This document catalogs every environment variable utilized by EduNova, its classification (Public vs. Secret), target runtime, and configuration location.

---

## 1. Inventory Table

| Variable Name | Classification | Target Runtime | Purpose | Configuration Location |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | **Public** | Client & Worker | Canonical public HTTPS URL for redirects and email links | `wrangler.jsonc` or `.env.local` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Public** | Client Browser | Firebase Web API Key | `firebase.ts` / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Public** | Client Browser | Firebase Auth Domain | `firebase.ts` / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Public** | Client Browser | Firebase Project ID (`edunova-ac27f`) | `firebase.ts` / `wrangler.jsonc` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **Public** | Client Browser | Firebase Storage Bucket URL | `firebase.ts` / `wrangler.jsonc` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| **Public** | Client Browser | Firebase Cloud Messaging Sender ID | `firebase.ts` / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | **Public** | Client Browser | Firebase App Identification Hash | `firebase.ts` / `.env.local` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | **Public** | Client Browser | Google Analytics 4 Measurement ID | `firebase.ts` / `.env.local` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | **SECRET** | Server / Worker | Complete Firebase Admin Service Account JSON | Cloudflare Worker Secrets |
| `FIREBASE_PROJECT_ID` | **SECRET** | Server / Worker | Alternative Firebase Admin project ID | Cloudflare Worker Secrets |
| `FIREBASE_CLIENT_EMAIL` | **SECRET** | Server / Worker | Firebase Admin client service email | Cloudflare Worker Secrets |
| `FIREBASE_PRIVATE_KEY` | **SECRET** | Server / Worker | Firebase Admin RSA private key | Cloudflare Worker Secrets |
| `RESEND_API_KEY` | **SECRET** | Server / Worker | Resend HTTPS API Key (Workers edge email) | Cloudflare Worker Secrets |
| `EMAIL_FROM` | **Config** | Server / Worker | Sender email header string | `wrangler.jsonc` or Secrets |
| `SMTP_HOST` | **Config** | Node Server (dev) | SMTP Server Hostname | `.env.local` |
| `SMTP_PORT` | **Config** | Node Server (dev) | SMTP Port (587 or 465) | `.env.local` |
| `SMTP_USER` | **SECRET** | Node Server (dev) | SMTP Account Username | `.env.local` |
| `SMTP_PASS` | **SECRET** | Node Server (dev) | SMTP App Password | `.env.local` |
| `SMTP_SECURE` | **Config** | Node Server (dev) | Set "true" for port 465, "false" for 587 | `.env.local` |

---

## 2. Configuration Best Practices

1. **Client-Side Variables (`NEXT_PUBLIC_*`):**
   - Automatically embedded into the compiled JavaScript bundle by Next.js during build.
   - Must NEVER contain service account private keys, admin credentials, or database secrets.
2. **Server-Side Secrets:**
   - In Cloudflare Workers, configure secrets via:
     ```bash
     npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON
     npx wrangler secret put RESEND_API_KEY
     ```
   - In local development, place secrets in `.env.local` (which is excluded from Git via `.gitignore`).
3. **Graceful Fallbacks:**
   - When email credentials or service accounts are not configured in local/preview environments, the application gracefully logs warnings and falls back to sandbox mock mode rather than crashing.

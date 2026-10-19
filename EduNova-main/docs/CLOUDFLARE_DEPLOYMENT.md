# Cloudflare Deployment Guide for EduNova

This guide provides end-to-end instructions for deploying the EduNova full-stack Next.js application to **Cloudflare Workers**.

---

## 1. Architecture & Adapter Evaluation

### Adapter Decision: OpenNext for Cloudflare (`@opennextjs/cloudflare`)

| Evaluated Option | Compatibility with Next.js 16 | Decision & Rationale |
| :--- | :--- | :--- |
| **`vinext`** | **Incompatible** | Requires `react@^19.3.1` (peer dependency conflict with Next.js 16.2.6 / `react@19.2.4`) and replaces the Next.js Turbopack compiler with Vite Plus Core, breaking Tailwind v4 PostCSS and 3D Canvas components (`@react-three/fiber`). |
| **`@opennextjs/cloudflare`** | **Recommended** | Cloudflare's official Next.js adapter. Fully supports App Router, dynamic server routes, Turbopack builds, Node.js compatibility (`nodejs_compat`), and static asset offloading to Cloudflare's global edge network. |

---

## 2. Prerequisites

1. **Node.js**: v20.x or v22.x LTS installed.
2. **Cloudflare Account**: Active Cloudflare account with Workers & Pages enabled.
3. **Wrangler CLI**: Installed locally or run via `npx wrangler`.
4. **Firebase Project**: Service Account JSON with Firestore and Auth permissions.
5. **Email Provider**: Resend API key (recommended for edge fetch) or SMTP credentials.

---

## 3. Configuration Files

### `wrangler.jsonc`
Contains the Cloudflare Worker runtime definition, node compatibility flags, and asset bindings:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "edunova",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": [
    "nodejs_compat"
  ],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "vars": {
    "NEXT_PUBLIC_APP_URL": "https://edunova.app",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "edunova-ac27f"
  }
}
```

### `open-next.config.ts`
Declares the edge wrapper and cache layers:

```typescript
const config = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
```

---

## 4. Setting Up Secrets in Cloudflare

Never commit private credentials or service account files. Upload them securely to Cloudflare Workers via Wrangler or the Cloudflare Dashboard:

### Via Wrangler CLI:
```bash
# 1. Firebase Service Account JSON (Recommended: pass entire JSON string)
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON

# OR individual Firebase variables:
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put FIREBASE_CLIENT_EMAIL
npx wrangler secret put FIREBASE_PRIVATE_KEY

# 2. Email Provider (Resend HTTPS API recommended for Cloudflare)
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
```

### Via Cloudflare Dashboard:
1. Navigate to **Workers & Pages** -> Select your Worker (`edunova`).
2. Go to **Settings** -> **Variables and Secrets**.
3. Click **Add** under **Environment Variables / Secrets** (select **Type: Secret** for private keys).

---

## 5. Local Build & Testing Steps

Before deploying, run the complete local verification pipeline:

```bash
# Step 1: Run security and architectural audit tests
npm run test:security

# Step 2: Test standard Next.js build
npm run build

# Step 3: Test Cloudflare Worker preview locally
npx wrangler dev
```

---

## 6. Staging & Production Deployment Workflow

### Step 1: Deploy to Isolated Preview / Staging
```bash
# Deploys to a preview URL (*.workers.dev) for end-to-end verification
npx wrangler deploy --dry-run
npx wrangler deploy
```

### Step 2: Verify Critical User Journeys on Staging
- [ ] Landing page loads with 3D canvas and dynamic banners.
- [ ] Student signup & login with Firebase Authentication.
- [ ] Contact form submission and admin message review.
- [ ] Order creation with atomic UTR uniqueness check.
- [ ] Admin payment verification and status transition.
- [ ] Secure file download header handling.

### Step 3: Attach Custom Production Domain
1. In Cloudflare Dashboard, go to **Workers & Pages** -> `edunova`.
2. Navigate to **Settings** -> **Domains & Routes**.
3. Click **Add Custom Domain** (e.g., `edunova.app` or `www.edunova.app`).
4. Cloudflare automatically provisions edge SSL/TLS certificates and routes incoming traffic.

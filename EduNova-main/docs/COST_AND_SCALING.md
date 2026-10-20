# EduNova Cost Optimization, Quotas, and Scaling Plan

This document outlines strategies for maximizing free-tier utilization across Cloudflare, Firebase, and third-party services, while detailing cost ceilings, monitoring points, and scaling triggers.

---

## 1. Cloudflare Workers Free Tier vs. Paid Architecture

### Free Plan Limits (Standard Cloudflare Account)
- **Worker Invocations:** 100,000 requests per day (free).
- **Static Asset Requests (Cloudflare Global Network):** Unlimited free requests and free bandwidth for static files (CSS, JS bundles, images, icons, postcards).
- **CPU Time per Worker Request:** Up to 10ms of active CPU time (generous for edge routing and JSON formatting).
- **Worker Subrequests:** Up to 50 subrequests per invocation (ample for Firebase & Resend calls).

### Key Architectural Optimizations Applied
1. **Static Offloading:**
   - 31 out of 31 public pages (landing page, marketplace catalog, login, signup, privacy, terms, dashboard layouts) are statically pre-rendered (`○ Static`).
   - Cloudflare serves these from its edge cache as static assets without consuming Worker invocations.
2. **Aggressive Image & Asset Caching:**
   - Configured `Cache-Control: public, max-age=31536000, immutable` for `/postcards` and `/projects`.
   - Repeated image downloads are cached directly in the visitor's browser and Cloudflare edge POPs.
3. **Elimination of Rapid Polling:**
   - Removed the 3-second `setInterval` in `contact.ts`. A single admin tab previously burned ~1,200 requests/hour. It now utilizes efficient real-time snapshot events or 60-second low-frequency sync.

---

## 2. Firebase Free Spark Plan Quotas

| Firebase Service | Free Spark Plan Quota | EduNova Optimization Applied |
| :--- | :--- | :--- |
| **Firestore Document Reads** | 50,000 reads / day | Client cache enabled (`persistentLocalCache` with multi-tab manager). Badge counters use `getCountFromServer()` which returns integer counts rather than reading complete collections. |
| **Firestore Document Writes** | 20,000 writes / day | Atomic transactions on order creation prevent duplicate UTR writes. |
| **Firestore Document Deletes** | 20,000 deletes / day | Batch deletions for admin cleanup. |
| **Firebase Auth** | Unlimited email/password, 10k phone auth / month | Client session persistence; tokens cached and auto-refreshed by Firebase SDK. |
| **Firebase Storage** | 5 GB stored, 1 GB/day download bandwidth | Download route enforces strict 15MB payload cap. |

---

## 3. Email Quotas & Scalability

| Provider | Free Quota | Scaling Architecture |
| :--- | :--- | :--- |
| **Resend** | 3,000 emails / month (100 / day) | High deliverability, zero-socket edge fetch. Ideal for onboarding and order verification. |
| **Gmail SMTP** | 500 emails / day | Good for staging / low-volume admin alerts. |
| **Mock Fallback** | Unlimited | In development/preview without keys, emails log to console without failing transactions. |

---

## 4. Usage Monitoring & Budget Controls

### 1. Cloudflare Dashboard Alerts
- Set up a notification under **Cloudflare Dashboard -> Analytics & Logs -> Notifications**:
  - Alert when Worker request count exceeds **80,000 requests/day** (80% of free tier).

### 2. Google Cloud / Firebase Budget Alerts
- In Google Cloud Console under **Billing -> Budgets & Alerts**:
  - Set a budget alert at **$1.00 USD** to ensure no unexpected charges occur if Spark plan limits are approached.

---

## 5. Scaling Upgrade Triggers

When EduNova's traffic grows commercially, upgrade triggers and paths are straightforward:

1. **When daily dynamic requests exceed 100k:**
   - Upgrade to **Cloudflare Workers Paid** ($5/month includes 10 million requests/month, + $0.50 per additional million).
2. **When daily active users exceed 5,000 (Firestore reads > 50k/day):**
   - Upgrade Firebase from Spark (Free) to **Blaze (Pay as you go)**.
   - Additional Firestore reads cost only **$0.06 per 100,000 reads**.
3. **When order screenshots/assets exceed 5 GB:**
   - Switch download and upload assets to **Cloudflare R2 Object Storage** (Zero egress fees, $0.015/GB-month storage, 10 GB free).

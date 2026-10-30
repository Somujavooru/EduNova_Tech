import { auth, db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { logger } from "@/lib/logger";

export interface PlatformSettings {
  siteTitle: string;
  tagline: string;
  bannerText: string;
  upiId: string;
  qrCodeUrl: string | null;
  maintenanceMode: boolean;
  autoApproveProjects: boolean;
  autoApprovePayments: boolean;
  socialLinks?: Record<string, { url: string; enabled: boolean }>;
  updatedAt?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteTitle: "EduNova Forge",
  tagline: "DISCOVER • BUILD • BRING IDEAS TO LIFE",
  bannerText: "🚀 EduNova Forge — Discover • Build • Bring Ideas to Life",
  upiId: "edunova@paytm",
  qrCodeUrl: null,
  maintenanceMode: false,
  autoApproveProjects: false,
  autoApprovePayments: false,
  socialLinks: {
    instagram: { url: "https://instagram.com/edunova", enabled: true },
    linkedin: { url: "https://linkedin.com/company/edunova", enabled: true },
    twitter: { url: "https://twitter.com/edunova", enabled: true },
    github: { url: "https://github.com/edunova", enabled: true },
    email: { url: "mailto:edunovaforgessupport@gmail.com", enabled: true },
    youtube: { url: "https://youtube.com/edunova", enabled: false },
    facebook: { url: "https://facebook.com/edunova", enabled: false },
    telegram: { url: "https://t.me/edunova", enabled: false },
    discord: { url: "https://discord.gg/edunova", enabled: false },
    whatsapp: { url: "https://wa.me/1234567890", enabled: false },
  },
};

const SETTINGS_STORAGE_KEY = "edunova_platform_settings";

let cachedSettings: PlatformSettings = DEFAULT_PLATFORM_SETTINGS;

function sanitizeSettingsEmail(settings: Partial<PlatformSettings>): Partial<PlatformSettings> {
  if (settings.socialLinks?.email?.url === "mailto:edunovasupport@gmail.com") {
    settings.socialLinks.email.url = "mailto:edunovaforgessupport@gmail.com";
  }
  return settings;
}

// Initialize real-time sync with API route, Firestore, and local cache
if (typeof window !== "undefined") {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.siteTitle || parsed.siteTitle === "EduNova") {
        parsed.siteTitle = "EduNova Forge";
      }
      if (!parsed.tagline || parsed.tagline.includes("Student Ideas")) {
        parsed.tagline = "DISCOVER • BUILD • BRING IDEAS TO LIFE";
      }
      sanitizeSettingsEmail(parsed);
      cachedSettings = { ...DEFAULT_PLATFORM_SETTINGS, ...parsed };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
    }
  } catch {}

  // Cross-tab synchronization via storage event
  window.addEventListener("storage", (e) => {
    if (e.key === SETTINGS_STORAGE_KEY && e.newValue) {
      try {
        cachedSettings = { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(e.newValue) };
        window.dispatchEvent(new Event("edunova_settings_updated"));
      } catch {}
    }
  });

  // Cross-tab synchronization via BroadcastChannel
  try {
    const channel = new BroadcastChannel("edunova_platform_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "settings_updated" && event.data?.settings) {
        cachedSettings = { ...DEFAULT_PLATFORM_SETTINGS, ...event.data.settings };
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
        } catch {}
        window.dispatchEvent(new Event("edunova_settings_updated"));
      }
    };
  } catch {}

  // 1. Fetch latest settings immediately from server API route
  try {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.settings) {
          cachedSettings = {
            ...DEFAULT_PLATFORM_SETTINGS,
            ...cachedSettings,
            ...data.settings,
          };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
            window.dispatchEvent(new Event("edunova_settings_updated"));
          } catch {}
        }
      })
      .catch(() => {});
  } catch {}

  // 2. Set up live real-time listener from Firestore
  try {
    onSnapshot(
      doc(db, "settings", "platform"),
      (snap) => {
        if (snap.exists()) {
          const remoteData = snap.data() as Partial<PlatformSettings>;
          cachedSettings = {
            ...DEFAULT_PLATFORM_SETTINGS,
            ...cachedSettings,
            ...remoteData,
          };
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
            window.dispatchEvent(new Event("edunova_settings_updated"));
          } catch {}
        }
      },
      (err) => {
        logger.warn("[Settings] Realtime sync notice:", err?.code || err?.message);
      }
    );
  } catch (err) {
    logger.warn("[Settings] Could not attach listener:", err);
  }
}

/**
 * Retrieves current platform settings synchronously (reactive via real-time cache).
 */
export function getPlatformSettings(): PlatformSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PLATFORM_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...cachedSettings, ...JSON.parse(raw) };
    }
  } catch {}
  return cachedSettings;
}

/**
 * Saves platform settings via secure server API route (with Cloudinary QR processing)
 * and updates local cache + Firestore.
 */
export async function savePlatformSettings(updates: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Optimistically update local cache immediately
  cachedSettings = updated;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("edunova_settings_updated"));
      try {
        const bc = new BroadcastChannel("edunova_platform_channel");
        bc.postMessage({ type: "settings_updated", settings: updated });
        bc.close();
      } catch {}
    } catch (e) {
      logger.warn("[Settings] Error writing to localStorage:", e);
    }
  }

  // 1. Primary: Save via server-side Admin API (/api/settings)
  let apiSucceeded = false;
  try {
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch("/api/settings", {
      method: "POST",
      headers,
      body: JSON.stringify(updated),
    });

    const data = await res.json();
    if (res.ok && data?.success && data?.settings) {
      apiSucceeded = true;
      cachedSettings = {
        ...DEFAULT_PLATFORM_SETTINGS,
        ...data.settings,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
          window.dispatchEvent(new Event("edunova_settings_updated"));
          try {
            const bc = new BroadcastChannel("edunova_platform_channel");
            bc.postMessage({ type: "settings_updated", settings: cachedSettings });
            bc.close();
          } catch {}
        } catch {}
      }
      return cachedSettings;
    } else {
      throw new Error(data?.error || `Server responded with status ${res.status}`);
    }
  } catch (apiErr: unknown) {
    const msg = apiErr instanceof Error ? apiErr.message : "API request failed";
    logger.warn("[Settings] Server API route notice:", msg);

    // 2. Fallback: Client-side direct Firestore write if API was unreachable
    if (!apiSucceeded) {
      try {
        const settingsDoc = doc(db, "settings", "platform");
        await setDoc(settingsDoc, updated, { merge: true });
        return updated;
      } catch (clientErr: unknown) {
        const clientMsg = clientErr instanceof Error ? clientErr.message : "Client write failed";
        logger.error("[Settings] Fallback save failed:", clientMsg);
        throw new Error(`Failed to save settings: ${msg}. (${clientMsg})`);
      }
    }
  }

  return updated;
}

/**
 * Resets all settings back to original defaults.
 */
export async function resetPlatformSettings(): Promise<PlatformSettings> {
  cachedSettings = DEFAULT_PLATFORM_SETTINGS;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.dispatchEvent(new Event("edunova_settings_updated"));
    } catch {}
  }

  try {
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    await fetch("/api/settings", {
      method: "POST",
      headers,
      body: JSON.stringify(DEFAULT_PLATFORM_SETTINGS),
    });
  } catch {}

  try {
    const settingsDoc = doc(db, "settings", "platform");
    await setDoc(settingsDoc, DEFAULT_PLATFORM_SETTINGS, { merge: true });
  } catch {}

  return DEFAULT_PLATFORM_SETTINGS;
}

/**
 * Returns the effective QR code URL:
 * - If a custom QR scanner / payment image was uploaded by the admin, returns that image.
 * - Otherwise generates a dynamic UPI QR code with the configured UPI ID and requested amount.
 */
export function getEffectiveQrCodeUrl(amount?: number, settingsOverride?: PlatformSettings): string {
  const settings = settingsOverride || getPlatformSettings();
  if (settings.qrCodeUrl) {
    return settings.qrCodeUrl;
  }
  const cleanUpi = encodeURIComponent(settings.upiId || "edunova@paytm");
  const amountParam = amount && amount > 0 ? `&am=${amount}` : "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${cleanUpi}&pn=EduNova%20Forge%20Technologies${amountParam}&cu=INR`;
}

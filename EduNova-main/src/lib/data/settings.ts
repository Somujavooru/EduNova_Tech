import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface PlatformSettings {
  siteTitle: string;
  tagline: string;
  bannerText: string;
  upiId: string;
  qrCodeUrl: string | null;
  maintenanceMode: boolean;
  autoApproveProjects: boolean;
  autoApprovePayments: boolean;
  updatedAt?: string;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  siteTitle: "EduNova",
  tagline: "Where Student Ideas Become Reality",
  bannerText: "🚀 EduNova — The #1 Platform for Engineering Students",
  upiId: "edunova@paytm",
  qrCodeUrl: null,
  maintenanceMode: false,
  autoApproveProjects: false,
  autoApprovePayments: false,
};

const SETTINGS_STORAGE_KEY = "edunova_platform_settings";

/**
 * Retrieves current platform settings synchronously from localStorage (with fallback to defaults).
 */
export function getPlatformSettings(): PlatformSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PLATFORM_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_PLATFORM_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PLATFORM_SETTINGS, ...parsed };
  } catch (e) {
    console.warn("[Settings] Error reading local settings:", e);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

/**
 * Saves platform settings to localStorage and syncs with Firestore settings/platform document.
 */
export async function savePlatformSettings(updates: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      // Dispatch storage event so open tabs/components instantly reflect changes
      window.dispatchEvent(new Event("edunova_settings_updated"));
    } catch (e) {
      console.warn("[Settings] Error writing to localStorage:", e);
    }
  }

  // Attempt Firestore sync in background
  try {
    const settingsDoc = doc(db, "settings", "platform");
    await setDoc(settingsDoc, updated, { merge: true });
  } catch (err: any) {
    console.warn("[Settings] Notice saving settings to Firestore (using local storage):", err?.message || err);
  }

  return updated;
}

/**
 * Resets all settings back to original defaults.
 */
export async function resetPlatformSettings(): Promise<PlatformSettings> {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    window.dispatchEvent(new Event("edunova_settings_updated"));
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

/**
 * Returns the effective QR code URL:
 * - If a custom QR scanner / payment image was uploaded by the admin, returns that image.
 * - Otherwise generates a dynamic UPI QR code with the configured UPI ID and requested amount.
 */
export function getEffectiveQrCodeUrl(amount?: number): string {
  const settings = getPlatformSettings();
  if (settings.qrCodeUrl) {
    return settings.qrCodeUrl;
  }
  const cleanUpi = encodeURIComponent(settings.upiId || "edunova@paytm");
  const amountParam = amount && amount > 0 ? `&am=${amount}` : "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=${cleanUpi}&pn=EduNova%20Technologies${amountParam}&cu=INR`;
}

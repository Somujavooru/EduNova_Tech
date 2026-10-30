import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyServerRequest } from "@/lib/serverAuth";
import { logger } from "@/lib/logger";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export interface PlatformSettingsPayload {
  siteTitle?: string;
  tagline?: string;
  bannerText?: string;
  upiId?: string;
  qrCodeUrl?: string | null;
  maintenanceMode?: boolean;
  autoApproveProjects?: boolean;
  autoApprovePayments?: boolean;
  socialLinks?: Record<string, { url: string; enabled: boolean }>;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: PlatformSettingsPayload = {
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

// GET /api/settings — Public read for platform settings (UPI ID, banner, QR scanner image)
export async function GET() {
  try {
    const snap = await adminDb.collection("settings").doc("platform").get();
    if (!snap.exists) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_SETTINGS,
      });
    }

    const data = snap.data() as PlatformSettingsPayload;
    const mergedSocials = {
      ...DEFAULT_SETTINGS.socialLinks,
      ...(data.socialLinks || {}),
    };
    if (mergedSocials.email?.url === "mailto:edunovasupport@gmail.com") {
      mergedSocials.email.url = "mailto:edunovaforgessupport@gmail.com";
    }

    return NextResponse.json(
      {
        success: true,
        settings: {
          ...DEFAULT_SETTINGS,
          ...data,
          socialLinks: mergedSocials,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load platform settings";
    logger.error("[Settings API GET Error]:", message);
    return NextResponse.json(
      {
        success: false,
        settings: DEFAULT_SETTINGS,
        error: message,
      },
      { status: 500 }
    );
  }
}

// POST /api/settings — Strictly restricted to verified platform admins
export async function POST(request: Request) {
  try {
    const authResult = await verifyServerRequest(request, true);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "Forbidden — administrator privileges required",
        },
        { status: authResult.status || 403 }
      );
    }

    const body = (await request.json()) as PlatformSettingsPayload;
    let finalQrCodeUrl: string | null = body.qrCodeUrl ?? null;

    // If an image was uploaded as base64 data URL, upload to Cloudinary for permanent ultra-fast CDN delivery
    if (finalQrCodeUrl && typeof finalQrCodeUrl === "string" && finalQrCodeUrl.startsWith("data:image/")) {
      try {
        const uploadResult = await cloudinary.uploader.upload(finalQrCodeUrl, {
          folder: "platform-settings",
          public_id: `official_upi_qr_${Date.now()}`,
          overwrite: true,
          resource_type: "image",
        });
        finalQrCodeUrl = uploadResult.secure_url;
      } catch (uploadErr: unknown) {
        const uploadMsg = uploadErr instanceof Error ? uploadErr.message : "Cloudinary upload failed";
        logger.error("[Settings API] Cloudinary QR upload failed:", uploadMsg);
        // If Cloudinary fails and image is under 500KB, allow compressed string fallback
        if (finalQrCodeUrl.length > 500 * 1024) {
          return NextResponse.json(
            {
              success: false,
              error: `QR code image upload failed: ${uploadMsg}. Please upload a smaller image.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const snap = await adminDb.collection("settings").doc("platform").get();
    const existing = snap.exists ? (snap.data() as PlatformSettingsPayload) : DEFAULT_SETTINGS;

    const cleanUpi = body.upiId !== undefined
      ? ((body.upiId || "").trim() || "edunova@paytm")
      : (existing.upiId || "edunova@paytm");

    const resolvedQrCodeUrl = body.qrCodeUrl !== undefined
      ? finalQrCodeUrl
      : (existing.qrCodeUrl ?? null);

    const updatedData: PlatformSettingsPayload = {
      ...existing,
      ...body,
      siteTitle: body.siteTitle !== undefined ? body.siteTitle : (existing.siteTitle || DEFAULT_SETTINGS.siteTitle),
      tagline: body.tagline !== undefined ? body.tagline : (existing.tagline || DEFAULT_SETTINGS.tagline),
      bannerText: body.bannerText !== undefined ? body.bannerText : (existing.bannerText ?? DEFAULT_SETTINGS.bannerText),
      upiId: cleanUpi,
      qrCodeUrl: resolvedQrCodeUrl,
      maintenanceMode: body.maintenanceMode !== undefined ? body.maintenanceMode : (existing.maintenanceMode ?? false),
      autoApproveProjects: body.autoApproveProjects !== undefined ? body.autoApproveProjects : (existing.autoApproveProjects ?? false),
      autoApprovePayments: body.autoApprovePayments !== undefined ? body.autoApprovePayments : (existing.autoApprovePayments ?? false),
      socialLinks: body.socialLinks !== undefined ? {
        ...(existing.socialLinks || DEFAULT_SETTINGS.socialLinks),
        ...body.socialLinks,
      } : (existing.socialLinks || DEFAULT_SETTINGS.socialLinks),
      updatedAt: new Date().toISOString(),
    };

    await adminDb.collection("settings").doc("platform").set(updatedData, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Platform settings updated successfully",
      settings: updatedData,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update platform settings";
    logger.error("[Settings API POST Error]:", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

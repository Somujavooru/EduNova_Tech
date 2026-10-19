import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

/**
 * Escapes HTML characters in user-controlled inputs to prevent HTML injection in emails.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface EmailDispatchOptions {
  from?: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
}

export interface EmailDispatchResult {
  success: boolean;
  mock?: boolean;
  error?: string;
  provider?: string;
}

/**
 * Sends email via Resend HTTPS API (native fetch — 100% compatible with Cloudflare Workers)
 */
async function sendViaResend(
  apiKey: string,
  options: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from || process.env.EMAIL_FROM || "EduNova <onboarding@resend.dev>",
        to: [options.to],
        reply_to: options.replyTo,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Email Resend] HTTP error response:", res.status, errText);
      return { success: false, error: `Resend error: ${res.statusText}`, provider: "resend" };
    }

    return { success: true, provider: "resend" };
  } catch (err: any) {
    console.error("[Email Resend] Network/fetch error:", err?.message || err);
    return { success: false, error: err?.message || "Failed to send via Resend", provider: "resend" };
  }
}

/**
 * Transporter singleton for Node.js / SMTP runtimes
 */
let smtpTransporter: nodemailer.Transporter | null = null;
function getSmtpTransporter(): nodemailer.Transporter | null {
  if (smtpTransporter) return smtpTransporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  try {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return smtpTransporter;
  } catch (err) {
    console.warn("[Email SMTP] Failed to initialize Nodemailer transport:", err);
    return null;
  }
}

/**
 * Unified email dispatcher: selects Resend HTTPS API, SMTP, or Mock mode
 */
async function dispatchEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  // 1. Prioritize Resend HTTPS API if RESEND_API_KEY is configured (Cloudflare Worker native)
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend(process.env.RESEND_API_KEY, options);
  }

  // 2. Try Nodemailer SMTP if configured
  const transporter = getSmtpTransporter();
  if (transporter) {
    try {
      await transporter.sendMail({
        from: options.from || `"EduNova" <${process.env.SMTP_USER}>`,
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
      });
      return { success: true, provider: "smtp" };
    } catch (err: any) {
      console.error("[Email SMTP] Failed to send via SMTP:", err?.message || err);
      return { success: false, error: err?.message || "SMTP delivery failed", provider: "smtp" };
    }
  }

  // 3. Fallback: Development / Sandbox Mock Mode
  logger.log(`[Email Mock] Subject: "${options.subject}"`);
  return { success: true, mock: true, provider: "mock" };
}

// Base HTML wrapper with futuristic styling
const getBaseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #050505;
      color: #e5e5e5;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0a0a1a;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid rgba(176, 38, 255, 0.2);
      box-shadow: 0 0 40px rgba(176, 38, 255, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #0a0a1a 0%, #1a0b2e 100%);
      padding: 40px 20px;
      text-align: center;
      border-bottom: 1px solid rgba(176, 38, 255, 0.2);
    }
    .logo {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -1px;
      background: linear-gradient(to right, #b026ff, #00d2ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
      background-color: #0a0a1a;
    }
    .footer {
      padding: 20px 30px;
      background-color: #050505;
      font-size: 12px;
      color: #666;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(to right, #b026ff, #00d2ff);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 20px;
      text-align: center;
    }
    h1 {
      color: #ffffff;
      font-size: 24px;
      margin-top: 0;
    }
    p {
      margin-bottom: 16px;
      font-size: 15px;
    }
    .card {
      background-color: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .data-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 8px;
    }
    .data-label {
      color: #888;
      font-size: 13px;
    }
    .data-value {
      color: #fff;
      font-weight: 500;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div style="padding: 40px 20px; background-color: #050505;">
    <div class="container">
      <div class="header">
        <h1 class="logo">EduNova</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>This is an automated notification from EduNova.<br>
        If you need assistance, please contact support@edunova.app</p>
        <p>&copy; ${new Date().getFullYear()} EduNova Platform. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (email: string, name: string): Promise<EmailDispatchResult> => {
  const safeName = escapeHtml(name);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edunova.app";

  const content = `
    <h1>Welcome to EduNova 🚀</h1>
    <p>Hi ${safeName},</p>
    <p>Your account has been successfully created. Welcome to the future of educational project collaboration.</p>
    <p>EduNova is designed to help you build, showcase, and collaborate on cutting-edge projects. You now have full access to our marketplace, requests portal, and collaboration tools.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/dashboard" class="btn">Access Dashboard</a>
    </div>

    <div class="card">
      <h3 style="margin-top:0;color:#fff;">Getting Started</h3>
      <p style="margin-bottom:8px;">• <strong>Explore the Marketplace:</strong> Discover projects created by other innovators.</p>
      <p style="margin-bottom:8px;">• <strong>Submit Requests:</strong> Need a specific system built? Submit a custom request.</p>
      <p style="margin-bottom:0;">• <strong>Complete your Profile:</strong> Head to settings to customize your presence.</p>
    </div>

    <p>We're thrilled to have you on board!</p>
  `;

  return await dispatchEmail({
    to: email,
    subject: "Welcome to EduNova 🚀",
    html: getBaseTemplate(content),
    from: `"EduNova Team" <${process.env.SMTP_USER || "noreply@edunova.app"}>`,
  });
};

export const sendLoginAlertEmail = async (
  email: string,
  name: string,
  ip?: string,
  userAgent?: string
): Promise<EmailDispatchResult> => {
  const safeName = escapeHtml(name);
  const safeIp = escapeHtml(ip || "Unknown");
  const safeUserAgent = escapeHtml(userAgent || "Unknown Browser/Device");
  const time = new Date().toLocaleString("en-US", { timeZoneName: "short" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://edunova.app";

  const content = `
    <h1>New Login Detected</h1>
    <p>Hi ${safeName},</p>
    <p>We detected a successful login to your EduNova account (<span style="color:#b026ff">${escapeHtml(email)}</span>).</p>
    
    <div class="card">
      <div class="data-row">
        <span class="data-label">Time:</span>
        <span class="data-value">${time}</span>
      </div>
      <div class="data-row">
        <span class="data-label">IP Address:</span>
        <span class="data-value">${safeIp}</span>
      </div>
      <div class="data-row" style="border:none; padding:0; margin:0;">
        <span class="data-label">Device/Browser:</span>
        <span class="data-value" style="text-align:right; max-width:60%; word-break:break-all;">${safeUserAgent}</span>
      </div>
    </div>

    <p style="color: #ff4757; font-size: 14px; padding-top: 10px;">
      <strong>Security Notice:</strong> If this was you, you can safely ignore this email. If you did not authorize this login, please reset your password immediately and contact support.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/forgot-password" style="display:inline-block; padding:10px 20px; border:1px solid #ff4757; color:#ff4757; text-decoration:none; border-radius:6px; font-size:14px; font-weight:bold;">Secure Account</a>
    </div>
  `;

  return await dispatchEmail({
    to: email,
    subject: "New Login Detected on Your EduNova Account",
    html: getBaseTemplate(content),
    from: `"EduNova Security" <${process.env.SMTP_USER || "security@edunova.app"}>`,
  });
};

export const sendContactNotificationEmail = async (data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  projectRef?: string;
}): Promise<EmailDispatchResult> => {
  const supportEmail = "edunovasupport@gmail.com";
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message);
  const safePhone = data.phone ? escapeHtml(data.phone) : "";
  const safeProjectRef = data.projectRef ? escapeHtml(data.projectRef) : "";

  const content = `
    <h1>New Support Inquiry 📬</h1>
    <p>A new message has been submitted from the <strong>EduNova Contact Form</strong>.</p>
    
    <div class="card">
      <div class="data-row">
        <span class="data-label">Sender Name:</span>
        <span class="data-value">${safeName}</span>
      </div>
      <div class="data-row">
        <span class="data-label">Sender Email:</span>
        <span class="data-value"><a href="mailto:${safeEmail}" style="color:#00d2ff; text-decoration:none;">${safeEmail}</a></span>
      </div>
      ${safePhone ? `
      <div class="data-row">
        <span class="data-label">Phone:</span>
        <span class="data-value">${safePhone}</span>
      </div>` : ""}
      ${safeProjectRef ? `
      <div class="data-row">
        <span class="data-label">Project Ref:</span>
        <span class="data-value">${safeProjectRef}</span>
      </div>` : ""}
      <div class="data-row">
        <span class="data-label">Subject:</span>
        <span class="data-value">${safeSubject}</span>
      </div>
      <div class="data-row" style="border:none; padding-bottom:0;">
        <span class="data-label">Received At:</span>
        <span class="data-value">${time}</span>
      </div>
    </div>

    <div style="background-color: rgba(255,255,255,0.03); border-left: 3px solid #b026ff; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <h3 style="margin-top:0; color:#fff; font-size:14px;">User's Message:</h3>
      <p style="white-space: pre-wrap; color: #e5e5e5; font-size: 14px; margin-bottom: 0;">${safeMessage}</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="mailto:${safeEmail}?subject=Re: ${encodeURIComponent(data.subject)}" class="btn">Reply to ${safeName}</a>
    </div>
  `;

  return await dispatchEmail({
    to: supportEmail,
    replyTo: data.email,
    subject: `[EduNova Support] ${data.subject} - ${data.name}`,
    html: getBaseTemplate(content),
    from: `"EduNova Support Inquiry" <${process.env.SMTP_USER || "edunovasupport@gmail.com"}>`,
  });
};

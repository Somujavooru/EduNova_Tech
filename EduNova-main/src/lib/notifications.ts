// EduNova Email Notification System
// In production, this would connect to a real email service (SendGrid, Resend, etc.)
// Currently simulates notifications and stores them in localStorage for the notification center
import { logger } from "@/lib/logger";

export type NotificationType =
  | "signup"
  | "login"
  | "order_placed"
  | "payment_submitted"
  | "payment_pending"
  | "payment_approved"
  | "payment_rejected"
  | "delivery_ready"
  | "download_unlocked"
  | "invoice_generated"
  | "request_submitted"
  | "request_accepted"
  | "request_rejected"
  | "project_started"
  | "project_completed"
  | "offer_sent"
  | "counter_offered"
  | "awaiting_final_approval"
  | "negotiation_accepted"
  | "project_planning"
  | "project_building"
  | "project_development"
  | "project_testing"
  | "project_final_review"
  | "project_delivered"
  | "project_marketplace_added"
  | "custom_project_access_granted"
  | "referral_success"
  | "contact_received";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  userEmail: string;
  metadata?: Record<string, any>;
}

const NOTIF_STORAGE_KEY = "edunova_notifications";

function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifications));
}

const templates: Record<NotificationType, (data: any) => { title: string; message: string }> = {
  signup: (data) => ({
    title: "Welcome to EduNova! 🎉",
    message: `Hi ${data.userName}, your EduNova account has been created successfully. Browse our premium engineering projects and start building today!`,
  }),
  login: (data) => ({
    title: "Login Successful ✅",
    message: `Hi ${data.userName}, you've successfully logged into EduNova. If this wasn't you, please secure your account immediately.`,
  }),
  order_placed: (data) => ({
    title: "Order Placed Successfully 🛒",
    message: `Your order ${data.orderId} for "${data.projectTitle}" (₹${data.amount?.toLocaleString("en-IN")}) has been placed. We'll verify your payment shortly.`,
  }),
  payment_submitted: (data) => ({
    title: "Payment Proof Received 📄",
    message: `We've received your payment screenshot for order ${data.orderId}. UTR: ${data.utrNumber || "N/A"}. Our team will verify within 24 hours.`,
  }),
  payment_pending: (data) => ({
    title: "Payment Under Review ⏳",
    message: `Your payment for "${data.projectTitle}" is being reviewed by our team. You'll be notified once it's verified.`,
  }),
  payment_approved: (data) => ({
    title: "Payment Approved! ✅",
    message: `Great news! Your payment for "${data.projectTitle}" (Order: ${data.orderId}) has been approved. Your project download is now unlocked!`,
  }),
  payment_rejected: (data) => ({
    title: "Payment Rejected ❌",
    message: `Unfortunately, your payment for "${data.projectTitle}" (Order: ${data.orderId}) could not be verified. Please contact team@edunova.com for assistance.`,
  }),
  delivery_ready: (data) => ({
    title: "Project Ready for Download 📦",
    message: `"${data.projectTitle}" is ready for download. Visit your dashboard to access the project files.`,
  }),
  download_unlocked: (data) => ({
    title: "Download Unlocked 🔓",
    message: `Your download for "${data.projectTitle}" has been unlocked. Go to My Dashboard → My Orders to download.`,
  }),
  invoice_generated: (data) => ({
    title: "Invoice Generated 🧾",
    message: `Your invoice for order ${data.orderId} has been generated. Download it from your dashboard.`,
  }),
  request_submitted: (data) => ({
    title: "Custom Request Submitted 📝",
    message: `We've received your custom project request for "${data.projectTitle}". Our team will review it and get back to you shortly.`,
  }),
  request_accepted: (data) => ({
    title: "Custom Request Accepted! 🎉",
    message: `Great news! Your custom project request for "${data.projectTitle}" has been accepted. We will contact you soon to finalize details.`,
  }),
  request_rejected: (data) => ({
    title: "Custom Request Update ❌",
    message: `Unfortunately, we cannot take on your custom project request for "${data.projectTitle}" at this time.`,
  }),
  offer_sent: (data) => ({
    title: "New Price Offer Received! 💬",
    message: `Admin has sent a proposed price of ₹${data.proposedPrice?.toLocaleString("en-IN")} for your custom project "${data.projectTitle}". Please review it in your dashboard.`,
  }),
  counter_offered: (data) => ({
    title: "Counter Offer Submitted 🔄",
    message: `You have successfully submitted a counter offer for "${data.projectTitle}". Admin will review your offer shortly.`,
  }),
  awaiting_final_approval: (data) => ({
    title: "Awaiting Final Approval ⏳",
    message: `Your acceptance has been recorded for "${data.projectTitle}" and is awaiting final admin approval.`,
  }),
  negotiation_accepted: (data) => ({
    title: "Project Price Agreed! 🤝",
    message: `Awesome! Both parties have agreed on the price for "${data.projectTitle}". The project will now be moved to the active phase.`,
  }),
  project_started: (data) => ({
    title: "Project Started 🚀",
    message: `Work has begun on your custom project "${data.projectTitle}". We'll keep you updated on our progress.`,
  }),
  project_completed: (data) => ({
    title: "Project Completed 🏆",
    message: `Your custom project "${data.projectTitle}" is now complete! Check your dashboard for delivery details.`,
  }),
  project_planning: (data) => ({
    title: "Project Planning Phase 📝",
    message: `Your project "${data.projectTitle}" has entered the planning phase. Architecture and roadmap are being designed.`,
  }),
  project_building: (data) => ({
    title: "Project Building Phase 🛠️",
    message: `Active development has started on "${data.projectTitle}". Your project is being built!`,
  }),
  project_development: (data) => ({
    title: "Development in Progress ⚙️",
    message: `"${data.projectTitle}" is now in active development. Features are being implemented.`,
  }),
  project_testing: (data) => ({
    title: "Testing & QA Phase 🧪",
    message: `"${data.projectTitle}" is undergoing testing and quality assurance. Almost there!`,
  }),
  project_final_review: (data) => ({
    title: "Final Review 🔍",
    message: `"${data.projectTitle}" is in final review. The finishing touches are being applied.`,
  }),
  project_delivered: (data) => ({
    title: "Project Delivered 🚚",
    message: `"${data.projectTitle}" has been delivered! Check your dashboard to access the project files.`,
  }),
  project_marketplace_added: (data) => ({
    title: "Project Listed on Marketplace 🌟",
    message: `"${data.projectTitle}" has been added to the EduNova marketplace and is now available for purchase by the community!`,
  }),
  custom_project_access_granted: (data) => ({
    title: "Free Access Granted 🎁",
    message: `You have been granted free access to "${data.projectTitle}" on the marketplace — this was built from your custom request!`,
  }),
  contact_received: (data) => ({
    title: "Message Received ✉️",
    message: `Hi ${data.userName}, we've received your message and will get back to you shortly.`,
  }),
  referral_success: (data) => ({
    title: "Referral Reward Unlocked! 🎁",
    message: `Congratulations! Your referral for ${data.referredName} has been verified. A discount of ₹${data.rewardAmount?.toLocaleString("en-IN")} has been applied to your remaining payment!`,
  }),
};

export function sendNotification(
  type: NotificationType,
  data: {
    userName?: string;
    userEmail: string;
    orderId?: string;
    projectTitle?: string;
    amount?: number;
    utrNumber?: string;
    [key: string]: any;
  }
): Notification {
  const template = templates[type](data);
  const notifications = getNotifications();
  const notification: Notification = {
    id: `NOTIF-${Date.now().toString(36).toUpperCase()}`,
    type,
    title: template.title,
    message: template.message,
    timestamp: new Date().toISOString(),
    read: false,
    userEmail: data.userEmail,
    metadata: data,
  };
  notifications.push(notification);
  saveNotifications(notifications);

  // In production: send real email via API
  // await fetch('/api/send-email', { method: 'POST', body: JSON.stringify({ to: data.userEmail, subject: template.title, html: generateEmailHTML(template) }) });

  logger.log(`[EduNova Notification] Notification created: ${template.title}`);
  return notification;
}

export function getUserNotifications(userEmail: string): Notification[] {
  return getNotifications()
    .filter(n => n.userEmail === userEmail)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function markNotificationRead(notifId: string): void {
  const notifications = getNotifications();
  const idx = notifications.findIndex(n => n.id === notifId);
  if (idx !== -1) {
    notifications[idx].read = true;
    saveNotifications(notifications);
  }
}

export function markAllRead(userEmail: string): void {
  const notifications = getNotifications();
  notifications.forEach(n => {
    if (n.userEmail === userEmail) n.read = true;
  });
  saveNotifications(notifications);
}

export function getUnreadCount(userEmail: string): number {
  return getNotifications().filter(n => n.userEmail === userEmail && !n.read).length;
}

export function getAllNotifications(): Notification[] {
  return getNotifications().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

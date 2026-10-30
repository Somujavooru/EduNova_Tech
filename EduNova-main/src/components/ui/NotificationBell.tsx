"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Sparkles,
  MessageSquare,
  ChevronRight,
  CheckCheck,
  Trash2,
  CreditCard,
  FileQuestion,
  Mail,
  User,
  Shield,
  ShieldAlert,
  X,
  ExternalLink
} from "lucide-react";
import {
  Notification,
  getUserNotifications,
  getAdminNotifications,
  markNotificationRead,
  markAllRead,
  markAllAdminRead,
  clearNotification,
  clearAllNotifications,
  clearAllAdminNotifications,
} from "@/lib/notifications";
import { getOrdersByUser, getAllOrders, Order } from "@/lib/data/orders";
import { getUserCustomRequests, getAllCustomRequests, CustomRequest } from "@/lib/data/customRequests";
import { getContactMessages } from "@/lib/data/contact";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

interface NotificationBellProps {
  userEmail?: string;
  userName?: string;
  userId?: string;
  userRole?: string;
}

interface BellItem {
  id: string;
  type: Notification["type"] | string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  targetUrl?: string;
}

function getAdminReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("edunova_admin_read_notifs");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAdminReadId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getAdminReadIds();
    current.add(id);
    localStorage.setItem("edunova_admin_read_notifs", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function saveAllAdminReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const current = getAdminReadIds();
    ids.forEach(id => current.add(id));
    localStorage.setItem("edunova_admin_read_notifs", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function getUserReadIds(email?: string): Set<string> {
  if (typeof window === "undefined" || !email) return new Set();
  try {
    const raw = localStorage.getItem(`edunova_read_notifs_${email.toLowerCase().trim()}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveUserReadId(email: string | undefined, id: string) {
  if (typeof window === "undefined" || !email) return;
  try {
    const current = getUserReadIds(email);
    current.add(id);
    localStorage.setItem(`edunova_read_notifs_${email.toLowerCase().trim()}`, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function saveAllUserReadIds(email: string | undefined, ids: string[]) {
  if (typeof window === "undefined" || !email) return;
  try {
    const current = getUserReadIds(email);
    ids.forEach(id => current.add(id));
    localStorage.setItem(`edunova_read_notifs_${email.toLowerCase().trim()}`, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function getAdminClearedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem("edunova_admin_cleared_notifs");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAdminClearedId(id: string) {
  if (typeof window === "undefined") return;
  try {
    const current = getAdminClearedIds();
    current.add(id);
    localStorage.setItem("edunova_admin_cleared_notifs", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function saveAllAdminClearedIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    const current = getAdminClearedIds();
    ids.forEach(id => current.add(id));
    localStorage.setItem("edunova_admin_cleared_notifs", JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function getUserClearedIds(email?: string): Set<string> {
  if (typeof window === "undefined" || !email) return new Set();
  try {
    const raw = localStorage.getItem(`edunova_cleared_notifs_${email.toLowerCase().trim()}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveUserClearedId(email: string | undefined, id: string) {
  if (typeof window === "undefined" || !email) return;
  try {
    const current = getUserClearedIds(email);
    current.add(id);
    localStorage.setItem(`edunova_cleared_notifs_${email.toLowerCase().trim()}`, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}

function saveAllUserClearedIds(email: string | undefined, ids: string[]) {
  if (typeof window === "undefined" || !email) return;
  try {
    const current = getUserClearedIds(email);
    ids.forEach(id => current.add(id));
    localStorage.setItem(`edunova_cleared_notifs_${email.toLowerCase().trim()}`, JSON.stringify(Array.from(current)));
  } catch (e) {
    console.warn(e);
  }
}


export function NotificationBell({ userEmail, userName, userId, userRole }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<BellItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedNotice, setSelectedNotice] = useState<BellItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const ADMIN_EMAILS = [
    "somashekharjavooru@gmail.com",
    "vijayrk0513@gmail.com",
    "somashekhar@edunova.com",
    "vijay@edunova.com",
    "admin@edunova.com",
  ];

  const isAdmin =
    userRole === "admin" ||
    (userEmail ? ADMIN_EMAILS.includes(userEmail.toLowerCase().trim()) : false);

  // Store Firestore real-time collections for admin
  const liveOrdersRef = useRef<BellItem[]>([]);
  const liveReqsRef = useRef<BellItem[]>([]);
  const liveMsgsRef = useRef<BellItem[]>([]);
  const liveDiscussionsRef = useRef<BellItem[]>([]);
  const liveUserDiscussionsRef = useRef<BellItem[]>([]);

  // Function to re-aggregate all admin notifications
  const aggregateAdminNotifications = useCallback(() => {
    const readSet = getAdminReadIds();
    const stored = getAdminNotifications();

    const storedItems: BellItem[] = stored.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read || readSet.has(n.id),
      targetUrl: (n.metadata as any)?.targetUrl || "/admin",
    }));

    // Merge live Firestore alerts + stored notifications
    const all = [
      ...liveOrdersRef.current,
      ...liveReqsRef.current,
      ...liveMsgsRef.current,
      ...liveDiscussionsRef.current,
      ...storedItems,
    ];

    // Deduplicate by ID and filter cleared
    const clearedSet = getAdminClearedIds();
    const seen = new Set<string>();
    const unique: BellItem[] = [];
    for (const item of all) {
      if (!seen.has(item.id) && !clearedSet.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    // Sort newest first
    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setItems(unique);
    setUnreadCount(unique.filter(n => !n.read).length);
  }, []);

  // User notifications aggregator
  const aggregateUserNotifications = useCallback((userOrders: Order[], userRequests: CustomRequest[]) => {
    if (!userEmail) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    const readSet = getUserReadIds(userEmail);
    const stored = getUserNotifications(userEmail);
    const generatedItems: BellItem[] = [];

    userOrders.forEach((order) => {
      const cleanTitle = (order.projectTitle || "Project")
        .replace(/^Final\s*\(\s*75%\s*\)\s*:\s*/i, "")
        .replace(/^Advance\s*\(\s*25%\s*\)\s*:\s*/i, "")
        .trim();

      // 1. Advance Payment Approved / Verified
      if (order.status === "approved" && (order.orderType === "advance_payment" || (!order.orderType && order.amount > 0))) {
        const id = `user-ord-app-${order.id}`;
        generatedItems.push({
          id,
          type: "payment_approved",
          title: "Payment Approved! ✅",
          message: `Your payment for "${cleanTitle}" (₹${(order.amount || 0).toLocaleString("en-IN")}) has been verified! Deliverables & development are in motion.`,
          timestamp: order.updatedAt || order.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 2. Final Payment Pending Verification (75% submitted)
      const hasFinalPending =
        (order.orderType === "final_payment" && order.status === "pending") ||
        (order as any).finalPayment?.status === "pending";

      if (hasFinalPending) {
        const id = `user-ord-final-pend-${order.id}`;
        generatedItems.push({
          id,
          type: "payment_pending",
          title: "Final Payment Under Verification ⏳",
          message: `Your 75% final payment for "${cleanTitle}" was received! Deliverables will unlock immediately upon verification.`,
          timestamp: (order as any).finalPayment?.submittedAt || order.updatedAt || order.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 3. Final Payment Approved (100% Fully Paid)
      const hasFinalApproved =
        (order.orderType === "final_payment" && order.status === "approved") ||
        (order as any).finalPayment?.status === "approved";

      if (hasFinalApproved) {
        const id = `user-ord-final-app-${order.id}`;
        generatedItems.push({
          id,
          type: "project_delivered",
          title: "Project Delivered & Files Unlocked! 🎉",
          message: `100% payment verified for "${cleanTitle}"! Source code, documentation, and files are now available to download.`,
          timestamp: order.updatedAt || order.deliveredAt || order.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 4. Build Stage Updates
      if (order.buildStage && ["building", "testing", "completed"].includes(order.buildStage)) {
        const stageLabel =
          order.buildStage === "building"
            ? "Building & Assembly"
            : order.buildStage === "testing"
            ? "Testing & QA"
            : "Completed & Ready";
        const id = `user-ord-stage-${order.id}-${order.buildStage}`;
        generatedItems.push({
          id,
          type: "project_completed",
          title: `Build Milestone: ${stageLabel} 🔨`,
          message: `"${cleanTitle}" has advanced to stage: ${stageLabel}. Check your live project tracker!`,
          timestamp: order.updatedAt || order.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 5. Payment Rejected
      if (order.status === "rejected" || (order as any).finalPayment?.status === "rejected") {
        const id = `user-ord-rej-${order.id}`;
        generatedItems.push({
          id,
          type: "payment_rejected",
          title: "Payment Verification Issue ❌",
          message: `Payment for "${cleanTitle}" could not be verified. Please check your UTR number or contact support.`,
          timestamp: order.updatedAt || order.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }
    });

    userRequests.forEach((req) => {
      // 1. New Offer Sent by Admin
      if (req.status === "offer_sent" && req.negotiationHistory && req.negotiationHistory.length > 0) {
        const lastOffer = req.negotiationHistory[req.negotiationHistory.length - 1];
        if (lastOffer.sentBy === "admin") {
          const id = `user-req-offer-${req.id}-${lastOffer.price}`;
          generatedItems.push({
            id,
            type: "offer_sent",
            title: "New Price Proposal Received! 💬",
            message: `EduNova team proposed ₹${(lastOffer.price || 0).toLocaleString("en-IN")} for "${req.projectTitle}". Accept or counter in Dashboard.`,
            timestamp: lastOffer.createdAt || req.updatedAt || new Date().toISOString(),
            read: readSet.has(id),
            targetUrl: "/dashboard",
          });
        }
      }

      // 2. Request Accepted
      if (req.status === "accepted") {
        const id = `user-req-acc-${req.id}`;
        generatedItems.push({
          id,
          type: "request_accepted",
          title: "Custom Project Accepted! ✅",
          message: `Your custom request "${req.projectTitle}" has been accepted! You can now proceed with your advance payment.`,
          timestamp: req.updatedAt || req.createdAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 3. Final Payment Pending
      if (req.finalPayment?.status === "pending") {
        const id = `user-req-final-pend-${req.id}`;
        generatedItems.push({
          id,
          type: "payment_pending",
          title: "Final Payment Under Verification ⏳",
          message: `Your final payment for "${req.projectTitle}" is being verified. Deliverables will unlock shortly.`,
          timestamp: req.finalPayment?.submittedAt || req.updatedAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }

      // 4. Final Payment Verified
      if (req.finalPayment?.status === "verified") {
        const id = `user-req-final-ver-${req.id}`;
        generatedItems.push({
          id,
          type: "project_delivered",
          title: "Custom Project Files Unlocked! 🎉",
          message: `Full payment verified for "${req.projectTitle}"! Download links and source files are now available.`,
          timestamp: req.updatedAt || new Date().toISOString(),
          read: readSet.has(id),
          targetUrl: "/dashboard",
        });
      }
    });

    // Stored notifications from notification service
    const storedItems: BellItem[] = stored.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      timestamp: n.timestamp,
      read: n.read || readSet.has(n.id),
      targetUrl: (n.metadata as any)?.targetUrl || "/dashboard",
    }));

    // Deduplicate all by ID
    const all = [...generatedItems, ...liveUserDiscussionsRef.current, ...storedItems];
    const clearedSet = getUserClearedIds(userEmail);
    const seen = new Set<string>();
    const unique: BellItem[] = [];
    for (const item of all) {
      if (!seen.has(item.id) && !clearedSet.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }

    unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setItems(unique);
    setUnreadCount(unique.filter((n) => !n.read).length);
  }, [userEmail]);

  useEffect(() => {
    if (isAdmin) {
      // 1. Initial local admin sync
      aggregateAdminNotifications();

      // Helper to sync local contact messages
      const syncContactMessages = () => {
        try {
          const msgs = getContactMessages().filter((m) => m.status === "new");
          const readSet = getAdminReadIds();
          liveMsgsRef.current = msgs.map((data) => {
            const id = `admin-msg-${data.id}`;
            return {
              id,
              type: "contact_received",
              title: "New Support Message ✉️",
              message: `From ${data.name || data.email}: "${data.subject || (data.message ? data.message.slice(0, 45) + "..." : "New Inquiry")}"`,
              timestamp: data.createdAt || new Date().toISOString(),
              read: readSet.has(id),
              targetUrl: "/admin/messages",
            };
          });
          aggregateAdminNotifications();
        } catch {}
      };
      syncContactMessages();

      // 2. Real-time Firestore Listeners for Admin Action Items
      let unsubOrders = () => {};
      let unsubReqs = () => {};
      let unsubMsgs = () => {};

      try {
        unsubOrders = onSnapshot(
          collection(db, "orders"),
          (snap) => {
            const readSet = getAdminReadIds();
            liveOrdersRef.current = snap.docs
              .filter((d) => d.data().status === "pending")
              .map((d) => {
                const data = d.data();
                const id = `admin-ord-${d.id}`;
                return {
                  id,
                  type: "payment_pending",
                  title: "New Order / Payment Pending 💳",
                  message: `${data.userName || "Customer"} placed order for "${data.projectTitle}" (₹${(data.amount || 0).toLocaleString("en-IN")}). UTR: ${data.utrNumber || "N/A"}.`,
                  timestamp: data.createdAt || new Date().toISOString(),
                  read: readSet.has(id),
                  targetUrl: "/admin/orders",
                };
              });
            aggregateAdminNotifications();
          },
          (err) => {
            console.warn("[NotificationBell] Orders snapshot notice:", err);
            getAllOrders().then((all) => {
              const readSet = getAdminReadIds();
              liveOrdersRef.current = all
                .filter((o) => o.status === "pending")
                .map((o) => {
                  const id = `admin-ord-${o.id}`;
                  return {
                    id,
                    type: "payment_pending",
                    title: "New Order / Payment Pending 💳",
                    message: `${o.userName || "Customer"} placed order for "${o.projectTitle}" (₹${(o.amount || 0).toLocaleString("en-IN")}). UTR: ${o.utrNumber || "N/A"}.`,
                    timestamp: o.createdAt || new Date().toISOString(),
                    read: readSet.has(id),
                    targetUrl: "/admin/orders",
                  };
                });
              aggregateAdminNotifications();
            }).catch(() => {});
          }
        );
      } catch (e) {}

      try {
        unsubReqs = onSnapshot(
          collection(db, "custom_requests"),
          (snap) => {
            const readSet = getAdminReadIds();
            liveReqsRef.current = snap.docs
              .filter((d) => ["pending", "reviewing", "counter_offered"].includes(d.data().status))
              .map((d) => {
                const data = d.data();
                const isCounter = data.status === "counter_offered";
                const id = `admin-req-${d.id}-${data.status}`;
                return {
                  id,
                  type: isCounter ? "counter_offered" : "request_submitted",
                  title: isCounter ? "Counter Offer Received 🔄" : "New Custom Project Request 📝",
                  message: `${data.userName || "Student"} ${isCounter ? "submitted a counter-offer for" : "requested"} "${data.projectTitle}" (Budget: ₹${(data.budget || 0).toLocaleString("en-IN") || "Custom"}).`,
                  timestamp: data.updatedAt || data.createdAt || new Date().toISOString(),
                  read: readSet.has(id),
                  targetUrl: "/admin/custom-requests",
                };
              });
            aggregateAdminNotifications();
          },
          (err) => {
            console.warn("[NotificationBell] Requests snapshot notice:", err);
            getAllCustomRequests().then((all) => {
              const readSet = getAdminReadIds();
              liveReqsRef.current = all
                .filter((r) => ["pending", "reviewing", "counter_offered"].includes(r.status))
                .map((r) => {
                  const isCounter = r.status === "counter_offered";
                  const id = `admin-req-${r.id}-${r.status}`;
                  return {
                    id,
                    type: isCounter ? "counter_offered" : "request_submitted",
                    title: isCounter ? "Counter Offer Received 🔄" : "New Custom Project Request 📝",
                    message: `${r.userName || "Student"} ${isCounter ? "submitted a counter-offer for" : "requested"} "${r.projectTitle}" (Budget: ₹${(r.budget || 0).toLocaleString("en-IN") || "Custom"}).`,
                    timestamp: r.updatedAt || r.createdAt || new Date().toISOString(),
                    read: readSet.has(id),
                    targetUrl: "/admin/custom-requests",
                  };
                });
              aggregateAdminNotifications();
            }).catch(() => {});
          }
        );
      } catch (e) {}

      try {
        unsubMsgs = onSnapshot(
          collection(db, "contact_messages"),
          (snap) => {
            const readSet = getAdminReadIds();
            liveMsgsRef.current = snap.docs
              .filter((d) => d.data().status === "new")
              .map((d) => {
                const data = d.data();
                const id = `admin-msg-${d.id}`;
                return {
                  id,
                  type: "contact_received",
                  title: "New Support Message ✉️",
                  message: `From ${data.name || data.email}: "${data.subject || (data.message ? data.message.slice(0, 45) + "..." : "New Inquiry")}"`,
                  timestamp: data.createdAt || new Date().toISOString(),
                  read: readSet.has(id),
                  targetUrl: "/admin/messages",
                };
              });
            aggregateAdminNotifications();
          },
          () => {
            syncContactMessages();
          }
        );
      } catch (e) {
        syncContactMessages();
      }

      let unsubComments = () => {};
      try {
        unsubComments = onSnapshot(
          collection(db, "comments"),
          (snap) => {
            const readSet = getAdminReadIds();
            liveDiscussionsRef.current = snap.docs
              .filter((d) => {
                const data = d.data();
                return !data.isAdminReply && Boolean((data.text || "").trim());
              })
              .map((d) => {
                const data = d.data();
                const id = `admin-cmt-${d.id}`;
                const projTitle = data.projectTitle || data.projectId?.replace(/^proj-[a-z0-9]+-/i, "").replace(/-/g, " ") || "Project Discussion";
                return {
                  id,
                  type: "discussion_message",
                  title: "New Discussion Question / Comment 💬",
                  message: `${data.userName || "Customer"} in "${projTitle}": "${(data.text || "").slice(0, 70)}"`,
                  timestamp: data.createdAt || new Date().toISOString(),
                  read: readSet.has(id),
                  targetUrl: "/admin/discussions",
                };
              });
            aggregateAdminNotifications();
          },
          (err) => {
            console.warn("[NotificationBell] Comments snapshot notice:", err);
          }
        );
      } catch (e) {}

      const handleUpdate = () => {
        aggregateAdminNotifications();
        syncContactMessages();
      };
      window.addEventListener("edunova_notifications_changed", handleUpdate);
      window.addEventListener("storage", handleUpdate);

      // Admin periodic refresher every 3.5 seconds
      const pollInterval = setInterval(() => {
        aggregateAdminNotifications();
        syncContactMessages();
      }, 3500);

      return () => {
        unsubOrders();
        unsubReqs();
        unsubMsgs();
        unsubComments();
        clearInterval(pollInterval);
        window.removeEventListener("edunova_notifications_changed", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      };
    } else {
      // Regular user real-time Firestore listeners
      let unsubUserOrders = () => {};
      let unsubUserReqs = () => {};
      let unsubUserComments = () => {};

      let cachedOrders: Order[] = [];
      let cachedReqs: CustomRequest[] = [];

      const refreshUserAlerts = () => {
        aggregateUserNotifications(cachedOrders, cachedReqs);
      };

      if (userId) {
        try {
          const qOrders = query(collection(db, "orders"), where("userId", "==", userId));
          unsubUserOrders = onSnapshot(
            qOrders,
            (snap) => {
              cachedOrders = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Order));
              refreshUserAlerts();
            },
            (err) => {
              console.warn("[NotificationBell] User orders snapshot notice:", err);
              getOrdersByUser(userId).then((ords) => {
                cachedOrders = ords;
                refreshUserAlerts();
              }).catch(() => {});
            }
          );
        } catch (e) {
          console.warn("[NotificationBell] Could not attach orders listener:", e);
        }

        try {
          const qReqs = query(collection(db, "custom_requests"), where("userId", "==", userId));
          unsubUserReqs = onSnapshot(
            qReqs,
            (snap) => {
              cachedReqs = snap.docs.map((d) => ({ ...d.data(), id: d.id } as CustomRequest));
              refreshUserAlerts();
            },
            (err) => {
              console.warn("[NotificationBell] User requests snapshot notice:", err);
              getUserCustomRequests(userId).then((reqs) => {
                cachedReqs = reqs;
                refreshUserAlerts();
              }).catch(() => {});
            }
          );
        } catch (e) {
          console.warn("[NotificationBell] Could not attach requests listener:", e);
        }

        // Initial fetch backup to ensure no latency before snapshot
        Promise.all([
          getOrdersByUser(userId).catch(() => []),
          getUserCustomRequests(userId).catch(() => []),
        ]).then(([ords, reqs]) => {
          if (cachedOrders.length === 0) cachedOrders = ords;
          if (cachedReqs.length === 0) cachedReqs = reqs;
          refreshUserAlerts();
        });
      } else {
        refreshUserAlerts();
      }

      const handleSync = () => {
        if (userId) {
          Promise.all([
            getOrdersByUser(userId).catch(() => []),
            getUserCustomRequests(userId).catch(() => []),
          ]).then(([ords, reqs]) => {
            cachedOrders = ords;
            cachedReqs = reqs;
            refreshUserAlerts();
          });
        } else {
          refreshUserAlerts();
        }
      };

      // Listen to all immediate in-app update events
      window.addEventListener("edunova_notifications_changed", handleSync);
      window.addEventListener("edunova_orders_updated", handleSync);
      window.addEventListener("edunova_requests_updated", handleSync);
      window.addEventListener("edunova_inquiries_updated", handleSync);
      window.addEventListener("storage", handleSync);

      // Periodic safety check every 3.5s
      const pollInterval = setInterval(handleSync, 3500);

      return () => {
        unsubUserOrders();
        unsubUserReqs();
        clearInterval(pollInterval);
        window.removeEventListener("edunova_notifications_changed", handleSync);
        window.removeEventListener("edunova_orders_updated", handleSync);
        window.removeEventListener("edunova_requests_updated", handleSync);
        window.removeEventListener("edunova_inquiries_updated", handleSync);
        window.removeEventListener("storage", handleSync);
      };
    }
  }, [isAdmin, userEmail, userId, aggregateAdminNotifications, aggregateUserNotifications]);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = () => {
    if (isAdmin) {
      saveAllAdminReadIds(items.map((n) => n.id));
      markAllAdminRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } else {
      if (!userEmail) return;
      saveAllUserReadIds(userEmail, items.map((n) => n.id));
      markAllRead(userEmail);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const handleClearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = items.map((n) => n.id);
    if (isAdmin) {
      saveAllAdminClearedIds(allIds);
      clearAllAdminNotifications();
    } else {
      if (userEmail) {
        saveAllUserClearedIds(userEmail, allIds);
        clearAllNotifications(userEmail);
      }
    }
    setItems([]);
    setUnreadCount(0);
    setSelectedNotice(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("edunova_notifications_changed"));
    }
  };

  const handleClearItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAdmin) {
      saveAdminClearedId(id);
      clearNotification(id);
    } else {
      if (userEmail) {
        saveUserClearedId(userEmail, id);
        clearNotification(id);
      }
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    setUnreadCount((prev) => {
      const target = items.find((i) => i.id === id);
      return target && !target.read ? Math.max(0, prev - 1) : prev;
    });
    if (selectedNotice?.id === id) {
      setSelectedNotice(null);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("edunova_notifications_changed"));
    }
  };

  const handleItemClick = (item: BellItem) => {
    if (isAdmin) {
      saveAdminReadId(item.id);
      markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsOpen(false);
      setSelectedNotice(item);
    } else {
      saveUserReadId(userEmail, item.id);
      markNotificationRead(item.id);
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setIsOpen(false);
      setSelectedNotice(item);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "payment_approved":
      case "request_accepted":
      case "negotiation_accepted":
      case "custom_project_access_granted":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "payment_rejected":
      case "request_rejected":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "project_delivered":
      case "delivery_ready":
      case "download_unlocked":
      case "project_completed":
        return <Package className="w-4 h-4 text-cyan-400" />;
      case "offer_sent":
      case "counter_offered":
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case "contact_received":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "discussion_message":
      case "discussion_received":
      case "discussion_reply":
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case "payment_submitted":
      case "payment_pending":
      case "awaiting_final_approval":
        return <CreditCard className="w-4 h-4 text-amber-400" />;
      case "request_submitted":
        return <FileQuestion className="w-4 h-4 text-amber-400" />;
      case "signup":
        return <User className="w-4 h-4 text-sky-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-400" />;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={`relative p-2 rounded-xl transition-all duration-200 flex items-center justify-center shadow-sm cursor-pointer ${
          isAdmin
            ? "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-white"
            : "bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-stone-300 hover:text-cyan-300"
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[17px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-red-500 via-rose-500 to-red-600 text-[10px] font-black text-white shadow-[0_0_12px_rgba(239,68,68,0.85)] ring-1 ring-white/20 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 overflow-hidden ${
              isAdmin
                ? "bg-[#0b0a16]/98 border-amber-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(245,158,11,0.15)]"
                : "bg-[#090d16]/95 border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.15)]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <Bell className={`w-4 h-4 ${isAdmin ? "text-amber-400" : "text-cyan-400"}`} />
                <h3 className="text-sm font-bold text-white">
                  {isAdmin ? "Admin Notifications" : "Notifications"}
                </h3>
                {unreadCount > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isAdmin
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                    }`}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className={`text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      isAdmin
                        ? "text-gray-400 hover:text-amber-300"
                        : "text-gray-400 hover:text-cyan-300"
                    }`}
                    title="Mark all notifications as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] font-medium flex items-center gap-1 transition-colors text-gray-400 hover:text-red-400"
                    title="Clear all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-84 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
              {items.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 border ${
                      isAdmin
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400/70"
                        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400/60"
                    }`}
                  >
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-white text-xs font-semibold">
                    {isAdmin ? "No pending admin alerts" : "No notifications yet"}
                  </p>
                  <p className="text-gray-400 text-[11px] mt-1 max-w-xs mx-auto">
                    {isAdmin
                      ? "New orders, custom requests, and contact inquiries will automatically show up here."
                      : "Live updates on your project builds, payment approvals, and counter offers will show up here."}
                  </p>
                </div>
              ) : (
                items.slice(0, 15).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group p-3.5 flex items-start gap-3 cursor-pointer transition-colors relative hover:bg-white/[0.05] ${
                      !item.read
                        ? isAdmin
                          ? "bg-amber-500/[0.06]"
                          : "bg-cyan-500/[0.04]"
                        : ""
                    }`}
                  >
                    <div className="mt-0.5 p-1.5 rounded-lg bg-white/5 border border-white/10 shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-xs font-bold truncate ${!item.read ? "text-white" : "text-gray-300"}`}>
                          {item.title}
                        </p>
                        <span className="text-[10px] text-gray-500 shrink-0 font-medium">
                          {formatTimestamp(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {!item.read && (
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 self-center ${
                          isAdmin
                            ? "bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.85)]"
                            : "bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.85)]"
                        }`}
                      />
                    )}
                    <button
                      onClick={(e) => handleClearItem(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-white/10 text-gray-500 hover:text-red-400 p-1 rounded-md transition-all shrink-0 ml-0.5"
                      title="Clear this notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-white/[0.02] border-t border-white/10 text-center">
              {isAdmin ? (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all duration-200"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Open Admin Panel</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all duration-200"
                >
                  <span>Open Dashboard &amp; Tracking</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Complete Notice Viewer Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {selectedNotice && (
          <div
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-left"
            onClick={() => setSelectedNotice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0c0f1d] border border-cyan-500/35 rounded-2xl max-w-lg w-full p-6 shadow-[0_0_50px_rgba(6,182,212,0.2)] relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400">
                    {getIcon(selectedNotice.type)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {selectedNotice.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {new Date(selectedNotice.timestamp).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Complete Message Content */}
              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-sm text-gray-200 leading-relaxed font-sans select-text">
                  {selectedNotice.message}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                  <span>Verified notification from EduNova Forge official system</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={(e) => {
                    handleClearItem(selectedNotice.id, e);
                    setSelectedNotice(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedNotice(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors"
                >
                  Dismiss
                </button>

                {selectedNotice.targetUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedNotice.targetUrl!;
                      setSelectedNotice(null);
                      router.push(url);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-md hover:shadow-cyan-500/25 transition-all cursor-pointer"
                  >
                    <span>{isAdmin ? "Open in Admin Panel" : "View in Dashboard"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

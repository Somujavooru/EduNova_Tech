"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { EfMonogramLogo } from "@/components/ui/EfMonogramLogo";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { EduNovaForgeLogo } from "@/components/ui/EduNovaForgeLogo";
import {
  Home,
  LayoutDashboard,
  Users,
  PlusCircle,
  CreditCard,
  FolderKanban,
  Flag,
  Settings,
  Shield,
  Crown,
  LogOut,
  ChevronRight,
  FileQuestion,
  Star,
  MessageSquare,
  MessagesSquare,
  ShoppingBag,
  ExternalLink
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getCountFromServer, getDocs, deleteDoc } from "firebase/firestore";
import { getContactMessages, fetchContactMessages } from "@/lib/data/contact";

const sidebarLinks = [
  { href: "/", label: "Home", icon: Home },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/custom-requests", label: "Custom Requests", icon: FileQuestion },
  { href: "/admin/add-project", label: "Add Project", icon: PlusCircle },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/reviews", label: "Reviews & Feedback", icon: Star },
  { href: "/admin/discussions", label: "Discussions & Q&A", icon: MessagesSquare },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Notification badge counts
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});

  const updateStaticBadges = useCallback(() => {
    const messages = getContactMessages();
    const pendingMessages = messages.filter((m) => m.status === "new").length;
    setBadgeCounts((prev) => ({
      ...prev,
      "/admin/messages": pendingMessages,
      "/admin/reports": 0,
    }));

    if (typeof window !== "undefined") {
      fetchContactMessages()
        .then((messages) => {
          if (Array.isArray(messages)) {
            const count = messages.filter((m) => m.status === "new").length;
            setBadgeCounts((prev) => ({
              ...prev,
              "/admin/messages": count,
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    // ── Aggregation counts for Firestore collections ─────────────────────
    // Use getCountFromServer with where filters — returns only a count integer,
    // not full documents. This replaces the previous pattern that fetched all
    // documents in getAllOrders() / getAllCustomRequests() just to count a subset.

    // Initial count load via aggregation (cheap — no document reads)
    const loadInitialCounts = async () => {
      try {
        const [pendingRequestsSnap, pendingOrdersSnap, pendingMessagesSnap] = await Promise.all([
          getCountFromServer(
            query(
              collection(db, "custom_requests"),
              where("status", "in", ["pending", "reviewing", "counter_offered"])
            )
          ),
          getCountFromServer(
            query(collection(db, "orders"), where("status", "==", "pending"))
          ),
          getCountFromServer(
            query(collection(db, "contact_messages"), where("status", "==", "new"))
          ).catch(() => ({ data: () => ({ count: 0 }) })),
        ]);

        let discussionsCount = 0;
        try {
          const commentsSnap = await getDocs(collection(db, "comments"));
          const readRaw = typeof window !== "undefined" ? localStorage.getItem("edunova_admin_read_discussions") : null;
          const readSet = readRaw ? new Set(JSON.parse(readRaw)) : new Set();
          discussionsCount = commentsSnap.docs.filter((d) => {
            const data = d.data();
            const txt = (data.text || "").trim();
            if (!txt || data.isAdminReply) return false;
            return !readSet.has(d.id);
          }).length;
        } catch {}

        setBadgeCounts((prev) => ({
          ...prev,
          "/admin/orders": pendingOrdersSnap.data().count,
          "/admin/custom-requests": pendingRequestsSnap.data().count,
          "/admin/payments": pendingOrdersSnap.data().count,
          "/admin/messages": (pendingMessagesSnap as any).data().count,
          "/admin/discussions": discussionsCount,
        }));
      } catch (error: any) {
        console.warn("[Admin] Badge count fetch notice (using fallback):", error?.code || error?.message);
      }
    };

    loadInitialCounts();
    updateStaticBadges();

    // ── Real-time badge updates via scoped onSnapshot listeners ──────────
    let unsubRequests = () => {};
    let unsubOrders = () => {};
    let unsubMessages = () => {};
    let unsubComments = () => {};

    try {
      unsubComments = onSnapshot(
        collection(db, "comments"),
        (snap) => {
          const readRaw = typeof window !== "undefined" ? localStorage.getItem("edunova_admin_read_discussions") : null;
          const readSet = readRaw ? new Set(JSON.parse(readRaw)) : new Set();
          const unreadCount = snap.docs.filter((d) => {
            const data = d.data();
            const txt = (data.text || "").trim();
            if (!txt || data.isAdminReply) return false;
            return !readSet.has(d.id);
          }).length;
          setBadgeCounts((prev) => ({
            ...prev,
            "/admin/discussions": unreadCount,
          }));
        },
        () => {}
      );
    } catch (e: any) {}

    try {
      unsubRequests = onSnapshot(
        query(
          collection(db, "custom_requests"),
          where("status", "in", ["pending", "reviewing", "counter_offered"])
        ),
        (snap) => {
          setBadgeCounts((prev) => ({
            ...prev,
            "/admin/custom-requests": snap.size,
          }));
        },
        (error) => {
          console.warn("[Admin] custom_requests snapshot notice:", (error as any)?.code || (error as any)?.message);
        }
      );
    } catch (e: any) {
      console.warn("[Admin] custom_requests listener init notice:", e?.code || e?.message);
    }

    try {
      unsubOrders = onSnapshot(
        query(collection(db, "orders"), where("status", "==", "pending")),
        (snap) => {
          setBadgeCounts((prev) => ({
            ...prev,
            "/admin/orders": snap.size,
            "/admin/payments": snap.size,
          }));
        },
        (error) => {
          console.warn("[Admin] orders snapshot notice:", (error as any)?.code || (error as any)?.message);
        }
      );
    } catch (e: any) {
      console.warn("[Admin] orders listener init notice:", e?.code || e?.message);
    }

    try {
      unsubMessages = onSnapshot(
        query(collection(db, "contact_messages"), where("status", "==", "new")),
        (snap) => {
          setBadgeCounts((prev) => ({
            ...prev,
            "/admin/messages": snap.size,
          }));
        },
        (error) => {
          console.warn("[Admin] contact_messages snapshot notice:", (error as any)?.code || (error as any)?.message);
        }
      );
    } catch (e: any) {
      console.warn("[Admin] contact_messages listener init notice:", e?.code || e?.message);
    }

    return () => {
      unsubRequests();
      unsubOrders();
      unsubMessages();
      unsubComments();
    };
  }, [user, updateStaticBadges]);

  // Skip auth check for /admin/login
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !loading && user && user.role !== "admin") {
      router.push("/");
    }
  }, [user, loading, router, isLoginPage]);

  // If on login page, just render children (no sidebar)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // ── Gate on loading: render a spinner until auth resolves ──────────────
  // This is the key fix for Problem 3: without this, child pages mount and
  // fire admin-only queries in useEffect([], []) before user.role is known.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a1a" }}>
        <div className="text-center">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "3px solid rgba(217,119,6,0.3)",
              borderTopColor: "#d97706",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#888", fontSize: 14, fontFamily: "system-ui" }}>Loading admin panel...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // If not logged in at all, show access denied
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">Admin Access Required</h1>
          <p className="text-gray-400 mb-6">Please login with admin credentials.</p>
          <Link href="/admin/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold transition-colors">
            Admin Login <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Not admin
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don&apos;t have permission to view this page.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-gradient-to-br from-[#121026] via-[#0b0918] to-[#06050e]">
      {/* Admin ambient background lighting - optimized GPU composite */}
      <div className="fixed top-0 left-64 w-[380px] h-[380px] bg-indigo-600/10 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="fixed top-40 right-0 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-96 w-[380px] h-[380px] bg-amber-600/10 rounded-full blur-[90px] pointer-events-none z-0" />
      <div className="fixed bottom-20 right-20 w-[320px] h-[320px] bg-cyan-600/10 rounded-full blur-[90px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 bottom-0 z-40 border-r border-white/10 bg-gradient-to-b from-[#0f0e1d]/98 via-[#090814]/98 to-[#05040b]/98 backdrop-blur-2xl flex flex-col shadow-[4px_0_35px_rgba(0,0,0,0.6)]">
        {/* Brand Header */}
        <div className="p-4 pb-3 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2 group hover:opacity-90 transition-opacity">
            <EfMonogramLogo size="sm" className="shrink-0" />
            <EduNovaForgeLogo size="sm" showTagline={false} />
          </Link>
        </div>

        {/* Owner Badge */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/10 to-transparent border border-amber-500/30 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.35)]">
              <Crown className="w-5 h-5 text-stone-950 font-bold" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">{user.name}</p>
              <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Platform Admin
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 flex flex-col gap-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            const count = badgeCounts[link.href] || 0;
            return (
              <Link key={link.href} href={link.href} prefetch={true}>
                <div
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 hover:translate-x-1 ${
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-amber-500/5 text-amber-200 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-amber-400" : ""}`} />
                  <span className="truncate">{link.label}</span>
                  {count > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {count}
                    </span>
                  )}
                  {isActive && count === 0 && <ChevronRight className="w-4 h-4 ml-auto text-amber-400" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Actions */}
        <div className="p-3 border-t border-white/10 flex flex-col gap-1">
          <Link
            href="/marketplace"
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all group"
          >
            <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors" />
            <span>View Marketplace</span>
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 relative z-10 flex flex-col min-h-screen">
        {/* Top Control Bar with Real-time Notification Bell */}
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0f0e1d]/90 backdrop-blur-xl px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">Platform Command Center</span>
            <span className="text-gray-600">•</span>
            <span className="text-amber-400 font-semibold uppercase tracking-wider">
              {pathname === "/admin" ? "Overview Dashboard" : pathname.replace("/admin/", "").replace(/-/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userEmail={user.email} userName={user.name} userId={user.id} userRole={user.role} />
          </div>
        </header>

        <div className="p-6 md:p-8 xl:p-10 max-w-[1400px] flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

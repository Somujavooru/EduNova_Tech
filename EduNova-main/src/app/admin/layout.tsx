"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
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
  ShoppingBag
} from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getCountFromServer, getDocs, deleteDoc } from "firebase/firestore";
import { getContactMessages, fetchContactMessages } from "@/lib/data/contact";

const sidebarLinks = [
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
          const testDocs = commentsSnap.docs.filter((d) => {
            const txt = (d.data().text || "").trim().toLowerCase();
            return txt === "shhhh" || txt === "hi" || txt === "hello" || txt === "test" || !txt;
          });
          if (testDocs.length > 0) {
            await Promise.all(testDocs.map((d) => deleteDoc(d.ref))).catch(() => {});
          }
          discussionsCount = commentsSnap.docs.length - testDocs.length;
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
        async (snap) => {
          const testDocs = snap.docs.filter((d) => {
            const txt = (d.data().text || "").trim().toLowerCase();
            return txt === "shhhh" || txt === "hi" || txt === "hello" || txt === "test" || !txt;
          });
          if (testDocs.length > 0) {
            await Promise.all(testDocs.map((d) => deleteDoc(d.ref))).catch(() => {});
          }
          const validRemaining = snap.docs.filter((d) => {
            const txt = (d.data().text || "").trim().toLowerCase();
            return txt !== "shhhh" && txt !== "hi" && txt !== "hello" && txt !== "test" && txt;
          });
          setBadgeCounts((prev) => ({
            ...prev,
            "/admin/discussions": validRemaining.length,
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
      {/* Admin ambient background lighting */}
      <div className="fixed top-0 left-64 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-40 right-0 w-[550px] h-[550px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-96 w-[600px] h-[600px] bg-amber-600/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed bottom-20 right-20 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 bottom-0 z-40 border-r border-white/10 bg-gradient-to-b from-[#0f0e1d]/98 via-[#090814]/98 to-[#05040b]/98 backdrop-blur-2xl flex flex-col shadow-[4px_0_35px_rgba(0,0,0,0.6)]">
        {/* Owner Badge */}
        <div className="p-4 border-b border-white/10">
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
              <Link key={link.href} href={link.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
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
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
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
      <main className="flex-1 ml-64 relative z-10">
        <div className="p-6 md:p-8 xl:p-10 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}

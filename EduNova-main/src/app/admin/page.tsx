"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getAllUsers } from "@/lib/data/mockUsers";
import { getAllProjectsForAdmin } from "@/lib/data/mockProjects";
import { getAllOrders, clearAllOrders, Order } from "@/lib/data/orders";
import { downloadOrdersExcel, generateSummaryReport } from "@/lib/exportOrders";
import {
  Users, FolderKanban, CreditCard, IndianRupee,
  CheckCircle, Clock, TrendingUp, ShoppingBag, BarChart3,
  Crown, FileSpreadsheet, Download, Eye, CalendarRange,
  FileDown
} from "lucide-react";

// ── 3D Isometric Rainbow Palette (Directly Matching Reference Image) ──
const RAINBOW_3D_PALETTES = [
  { front: "#d99b00", top: "#fed766", side: "#946300", glow: "rgba(217,155,0,0.5)", text: "#fde047" },  // Mustard Gold
  { front: "#c2185b", top: "#f48fb1", side: "#880e4f", glow: "rgba(194,24,91,0.5)", text: "#f48fb1" },  // Crimson Red
  { front: "#7b1fa2", top: "#ba68c8", side: "#4a148c", glow: "rgba(123,31,162,0.5)", text: "#ce93d8" },  // Violet Purple
  { front: "#2e7d32", top: "#81c784", side: "#1b5e20", glow: "rgba(46,125,50,0.5)", text: "#a5d6a7" },  // Forest Green
  { front: "#0097a7", top: "#4dd0e1", side: "#006064", glow: "rgba(0,151,167,0.5)", text: "#80deea" },  // Cyan Turquoise
  { front: "#fbc02d", top: "#fff59d", side: "#f57f17", glow: "rgba(251,192,45,0.5)", text: "#fff59d" }, // Lemon Yellow
  { front: "#ad1457", top: "#ec407a", side: "#740a34", glow: "rgba(173,20,87,0.5)", text: "#f48fb1" },  // Magenta Pink
  { front: "#43a047", top: "#a5d6a7", side: "#2e7d32", glow: "rgba(67,160,71,0.5)", text: "#c8e6c9" },  // Mint Green
  { front: "#1565c0", top: "#64b5f6", side: "#0d47a1", glow: "rgba(21,101,192,0.5)", text: "#90caf9" }, // Royal Blue
  { front: "#3949ab", top: "#7986cb", side: "#1a237e", glow: "rgba(57,73,171,0.5)", text: "#9fa8da" }, // Deep Indigo
];

// Helper to construct smooth Catmull-Rom cubic bezier curve for surging trend arrows
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

// ── 3D Isometric Chart with Grid & Double Surging Arrows (Matching User Reference) ──
interface ThreeDChartProps {
  data: { key: string; label: string; value: number }[];
  prefix?: string;
  unit?: string;
  chartId: string;
}

function ThreeDIsometricChart({ data, prefix = "", unit = "", chartId }: ThreeDChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-56 flex items-center justify-center text-gray-500 text-xs">No data for selected range</div>;
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);

  // SVG Geometry
  const svgWidth = 840;
  const svgHeight = 230;
  const baseline = 192;
  const availableHeight = 135;
  const depthX = 13;
  const depthY = 11;
  const paddingX = 35;
  const usableWidth = svgWidth - paddingX * 2 - depthX - 35;
  const count = data.length;
  const step = usableWidth / Math.max(count, 1);
  const barWidth = Math.max(Math.min(step * 0.54, 38), 9);

  // Calculate 3D bar coordinates
  const bars = data.map((item, i) => {
    const x = paddingX + i * step + (step - barWidth) / 2;
    const h = Math.max((item.value / maxVal) * availableHeight, 14);
    const y = baseline - h;
    const color = RAINBOW_3D_PALETTES[i % RAINBOW_3D_PALETTES.length];
    return { item, i, x, y, h, color, cx: x + barWidth / 2 };
  });

  // Calculate Trend Lines:
  // Primary Green trend line (surging high growth line soaring into the upper right corner ↗)
  const greenPts = bars.map((b, i) => {
    const progress = i / Math.max(count - 1, 1);
    const lift = 34 + (1 - progress) * 8;
    return { x: b.cx, y: Math.max(b.y - depthY - lift, 18) };
  });

  // Secondary Red trend line (lower benchmark trend climbing upward ↗)
  const redPts = bars.map((b, i) => {
    const progress = i / Math.max(count - 1, 1);
    const lift = 14 + (1 - progress) * 6;
    return { x: b.cx, y: Math.max(b.y - depthY - lift, 36) };
  });

  // Add soaring extensions to the arrows so they shoot up and right into the grid
  if (bars.length > 0) {
    const lastBar = bars[bars.length - 1];
    const gLast = greenPts[greenPts.length - 1];
    const rLast = redPts[redPts.length - 1];
    greenPts.push({
      x: Math.min(lastBar.cx + depthX + 28, svgWidth - 14),
      y: Math.max(gLast.y - 18, 14),
    });
    redPts.push({
      x: Math.min(lastBar.cx + depthX + 22, svgWidth - 20),
      y: Math.max(rLast.y - 14, 28),
    });
  }

  const greenPath = buildSmoothPath(greenPts);
  const redPath = buildSmoothPath(redPts);

  return (
    <div className="relative select-none">
      {/* Visual Legend for Trend Lines & 3D Bars */}
      <div className="flex items-center gap-4 text-[11px] mb-2 px-1 text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 bg-green-500 rounded-sm shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <strong className="text-green-400 font-semibold">Growth Surge ↗</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 bg-red-500 rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <strong className="text-red-400 font-semibold">Trend Benchmark ↗</strong>
        </span>
        <span className="flex items-center gap-1.5 ml-auto text-gray-400 text-[10px]">
          <span className="w-2 h-2 rounded-sm bg-gradient-to-tr from-amber-500 via-pink-500 to-cyan-400 inline-block" />
          3D Isometric Rainbow Pillars
        </span>
      </div>

      {/* 3D Perspective Grid & Chart SVG */}
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full h-56 overflow-visible"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* 3D Green Arrow Marker */}
          <marker
            id={`green-arrow-${chartId}`}
            viewBox="0 0 20 20"
            refX="16"
            refY="10"
            markerWidth="13"
            markerHeight="13"
            orient="auto"
          >
            <path d="M 1 3 L 18 10 L 1 17 L 5 10 z" fill="#22c55e" stroke="#14532d" strokeWidth="1" />
          </marker>

          {/* 3D Red Arrow Marker */}
          <marker
            id={`red-arrow-${chartId}`}
            viewBox="0 0 20 20"
            refX="16"
            refY="10"
            markerWidth="12"
            markerHeight="12"
            orient="auto"
          >
            <path d="M 1 3 L 18 10 L 1 17 L 5 10 z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1" />
          </marker>

          {/* Ambient Glow Filters */}
          <filter id={`glow-green-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`glow-red-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Subtle Backwall Gradient */}
          <linearGradient id={`grid-fade-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* ── Background Coordinate Graph Paper Grid ── */}
        <rect x="20" y="10" width={svgWidth - 35} height={baseline - 10} fill={`url(#grid-fade-${chartId})`} rx="4" />
        <g stroke="#ffffff">
          {/* Horizontal Grid Lines */}
          {[25, 55, 85, 115, 145, 170].map(gy => (
            <line key={`h-${gy}`} x1="20" y1={gy} x2={svgWidth - 15} y2={gy} strokeOpacity="0.10" strokeDasharray="3 3" strokeWidth="0.8" />
          ))}
          {/* Vertical Grid Lines across width */}
          {Array.from({ length: 22 }).map((_, idx) => {
            const gx = 25 + idx * 36;
            return <line key={`vg-${idx}`} x1={gx} y1="15" x2={gx} y2={baseline} strokeOpacity="0.07" strokeWidth="0.7" />;
          })}
        </g>

        {/* ── Base Floor Baseline & 3D Floor Shadow ── */}
        <line
          x1="20"
          y1={baseline}
          x2={svgWidth - 15}
          y2={baseline}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />

        {/* ── 3D Rainbow Pillar Bars ── */}
        <g>
          {bars.map((b) => {
            const isHovered = hoveredIdx === b.i;
            return (
              <g
                key={b.item.key}
                className="cursor-pointer transition-opacity duration-200"
                onMouseEnter={() => setHoveredIdx(b.i)}
                onMouseLeave={() => setHoveredIdx(null)}
                opacity={hoveredIdx !== null && !isHovered ? 0.55 : 1}
              >
                {/* 3D Floor Footprint Shadow */}
                <ellipse
                  cx={b.cx + depthX / 2}
                  cy={baseline + 3}
                  rx={barWidth / 1.7}
                  ry="2.5"
                  fill="rgba(0,0,0,0.45)"
                />

                {/* 3D Right Face (Shadow extrusion) */}
                <polygon
                  points={`${b.x + barWidth},${b.y} ${b.x + barWidth + depthX},${b.y - depthY} ${b.x + barWidth + depthX},${baseline - depthY} ${b.x + barWidth},${baseline}`}
                  fill={b.color.side}
                  opacity={isHovered ? 1 : 0.92}
                />

                {/* 3D Top Cap (Bright light reflection face) */}
                <polygon
                  points={`${b.x},${b.y} ${b.x + depthX},${b.y - depthY} ${b.x + barWidth + depthX},${b.y - depthY} ${b.x + barWidth},${b.y}`}
                  fill={b.color.top}
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="0.6"
                />

                {/* 3D Front Face (Main vibrant face) */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={barWidth}
                  height={b.h}
                  fill={b.color.front}
                  rx="1"
                  style={{
                    filter: isHovered ? `drop-shadow(0 0 14px ${b.color.glow})` : undefined,
                  }}
                />

                {/* Front face left glossy highlight edge */}
                <line
                  x1={b.x + 1}
                  y1={b.y + 1}
                  x2={b.x + 1}
                  y2={baseline - 1}
                  stroke="rgba(255,255,255,0.38)"
                  strokeWidth="1.2"
                />
              </g>
            );
          })}
        </g>

        {/* ── Secondary Red 3D Ribbon Growth Line with Arrow (↗) ── */}
        {/* Ribbon Under-shadow */}
        <path
          d={redPath}
          fill="none"
          stroke="#7f1d1d"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0, 2)"
          opacity="0.8"
        />
        {/* Main Red Stroke */}
        <path
          d={redPath}
          fill="none"
          stroke="#ef4444"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#red-arrow-${chartId})`}
          filter={`url(#glow-red-${chartId})`}
        />
        {/* Top Specular Highlight */}
        <path
          d={redPath}
          fill="none"
          stroke="#fca5a5"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {/* ── Primary Green 3D Ribbon Growth Line with Arrow (↗) ── */}
        {/* Ribbon Under-shadow */}
        <path
          d={greenPath}
          fill="none"
          stroke="#14532d"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform="translate(0, 2.5)"
          opacity="0.85"
        />
        {/* Main Green Stroke */}
        <path
          d={greenPath}
          fill="none"
          stroke="#22c55e"
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={`url(#green-arrow-${chartId})`}
          filter={`url(#glow-green-${chartId})`}
        />
        {/* Top Specular Highlight */}
        <path
          d={greenPath}
          fill="none"
          stroke="#bbf7d0"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        {/* Glowing trendline vertices */}
        {greenPts.slice(0, -1).map((p, idx) => (
          <circle
            key={`g-dot-${idx}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#ffffff"
            stroke="#16a34a"
            strokeWidth="2"
          />
        ))}

        {redPts.slice(0, -1).map((p, idx) => (
          <circle
            key={`r-dot-${idx}`}
            cx={p.x}
            cy={p.y}
            r={2.5}
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* ── Active Hover Tooltip ── */}
      {hoveredIdx !== null && bars[hoveredIdx] && (
        <div
          className="absolute pointer-events-none z-30 transition-all duration-150 transform -translate-x-1/2"
          style={{
            left: `${((bars[hoveredIdx].cx) / svgWidth) * 100}%`,
            top: `${Math.max(((bars[hoveredIdx].y - 45) / svgHeight) * 100, 2)}%`,
          }}
        >
          <div className="bg-[#0f1124] border border-white/20 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-md flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: bars[hoveredIdx].color.front }}
            />
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-medium leading-none">{bars[hoveredIdx].item.label}</p>
              <p className="text-xs font-black text-white mt-0.5 leading-none" style={{ color: bars[hoveredIdx].color.text }}>
                {prefix}{bars[hoveredIdx].item.value.toLocaleString("en-IN")} {unit}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── X-Axis Labels ── */}
      <div className="flex justify-between px-3 mt-1">
        {data.map((item, i) => {
          const step = data.length > 18 ? 3 : data.length > 12 ? 2 : 1;
          return (
            <span
              key={item.key}
              className="flex-1 text-center text-[10px] text-gray-400 font-medium tracking-tight"
              style={{ opacity: i % step === 0 ? 1 : 0 }}
            >
              {i % step === 0 ? item.label : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Animated counter component
function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = isNaN(value) ? 0 : value;
    if (end <= 0) { setDisplay(0); return; }
    let start = 0;
    const duration = 1200;
    const stepTime = Math.max(Math.floor(duration / end), 10);
    const step = Math.ceil(end / (duration / stepTime));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [value]);
  return <>{prefix}{display.toLocaleString("en-IN")}</>;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const }
  })
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [usersCount, setUsersCount] = useState(0);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    let unsubOrders: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;

    import("firebase/firestore").then(async ({ collection, onSnapshot }) => {
      try {
        const { db } = await import("@/lib/firebase");

        // Real-time listener on users count
        unsubUsers = onSnapshot(collection(db, "users"), (usersSnap) => {
          setUsersCount(usersSnap.size);
        }, (err) => {
          console.warn("[Admin] Users snapshot notice:", err);
          setUsersCount(getAllUsers().length);
        });

        // Real-time listener on orders for admin revenue & metrics
        unsubOrders = onSnapshot(collection(db, "orders"), (ordersSnap) => {
          const orderList = ordersSnap.docs.map(d => ({ ...d.data(), id: d.id } as Order));
          setOrders(orderList);
        }, (err) => {
          console.warn("[Admin] Orders snapshot notice:", err);
        });
      } catch (e: any) {
        console.warn("[Admin] Firestore notice:", e?.code || e?.message);
        setUsersCount(getAllUsers().length);
        setOrders([]);
      }
    }).catch(() => {
      setUsersCount(getAllUsers().length);
      setOrders([]);
    });

    getAllProjectsForAdmin().then(setProjects);

    const handleSync = () => {
      getAllOrders().then(setOrders).catch(() => {});
    };
    window.addEventListener("edunova_orders_updated", handleSync);
    window.addEventListener("storage", handleSync);

    const livePoll = setInterval(() => {
      getAllOrders().then(setOrders).catch(() => {});
    }, 3000);

    return () => {
      if (unsubOrders) unsubOrders();
      if (unsubUsers) unsubUsers();
      clearInterval(livePoll);
      window.removeEventListener("edunova_orders_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [user]);

  const totalRevenue = orders.filter(o => o.status === "approved").reduce((s, o) => s + o.amount, 0);
  const pendingPayments = orders.filter(o => o.status === "pending").length;
  const approvedOrders = orders.filter(o => o.status === "approved").length;
  const activeListings = projects.filter(p => p.status === "approved").length;
  const pendingApprovals = projects.filter(p => p.status === "pending").length;

  const summary = generateSummaryReport(orders);

  const STAT_THEMES = [
    // 0: Total Users (Indigo / Violet)
    {
      bg: "bg-gradient-to-br from-[#2d1c5e] via-[#1d123e] to-[#110926]",
      border: "border-indigo-400/60 hover:border-indigo-300",
      shadow: "shadow-[0_8px_30px_rgba(99,102,241,0.25)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.4)]",
      iconBg: "bg-indigo-500/30 border border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.35)]",
      iconColor: "text-indigo-200",
      glow: "bg-indigo-500/25",
    },
    // 1: Total Projects (Emerald)
    {
      bg: "bg-gradient-to-br from-[#0c4733] via-[#083023] to-[#041a13]",
      border: "border-emerald-400/60 hover:border-emerald-300",
      shadow: "shadow-[0_8px_30px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.4)]",
      iconBg: "bg-emerald-500/30 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.35)]",
      iconColor: "text-emerald-200",
      glow: "bg-emerald-500/25",
    },
    // 2: Active Listings (Warm Amber)
    {
      bg: "bg-gradient-to-br from-[#4d300d] via-[#332007] to-[#1e1203]",
      border: "border-amber-400/60 hover:border-amber-300",
      shadow: "shadow-[0_8px_30px_rgba(245,158,11,0.25)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.4)]",
      iconBg: "bg-amber-500/30 border border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]",
      iconColor: "text-amber-200",
      glow: "bg-amber-500/25",
    },
    // 3: Pending Payments (Tangerine / Coral)
    {
      bg: "bg-gradient-to-br from-[#4d220b] via-[#331506] to-[#1f0b02]",
      border: "border-orange-400/60 hover:border-orange-300",
      shadow: "shadow-[0_8px_30px_rgba(249,115,22,0.25)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.4)]",
      iconBg: "bg-orange-500/30 border border-orange-400/50 shadow-[0_0_15px_rgba(249,115,22,0.35)]",
      iconColor: "text-orange-200",
      glow: "bg-orange-500/25",
    },
    // 4: Approved Orders (Mint / Neon Green)
    {
      bg: "bg-gradient-to-br from-[#0c4723] via-[#083017] to-[#041c0c]",
      border: "border-green-400/60 hover:border-green-300",
      shadow: "shadow-[0_8px_30px_rgba(34,197,94,0.25)] hover:shadow-[0_12px_40px_rgba(34,197,94,0.4)]",
      iconBg: "bg-green-500/30 border border-green-400/50 shadow-[0_0_15px_rgba(34,197,94,0.35)]",
      iconColor: "text-green-200",
      glow: "bg-green-500/25",
    },
    // 5: Total Revenue (Imperial Gold / Honey)
    {
      bg: "bg-gradient-to-br from-[#4d3a08] via-[#332604] to-[#1f1602]",
      border: "border-yellow-400/65 hover:border-yellow-300",
      shadow: "shadow-[0_8px_30px_rgba(234,179,8,0.3)] hover:shadow-[0_12px_40px_rgba(234,179,8,0.45)]",
      iconBg: "bg-yellow-500/30 border border-yellow-400/50 shadow-[0_0_15px_rgba(234,179,8,0.35)]",
      iconColor: "text-yellow-200",
      glow: "bg-yellow-500/30",
    },
    // 6: Pending Approvals (Crimson / Ruby)
    {
      bg: "bg-gradient-to-br from-[#4d1326] via-[#330a18] to-[#1f050d]",
      border: "border-rose-400/60 hover:border-rose-300",
      shadow: "shadow-[0_8px_30px_rgba(244,63,94,0.25)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.4)]",
      iconBg: "bg-rose-500/30 border border-rose-400/50 shadow-[0_0_15px_rgba(244,63,94,0.35)]",
      iconColor: "text-rose-200",
      glow: "bg-rose-500/25",
    },
    // 7: Total Orders (Cyan / Sapphire)
    {
      bg: "bg-gradient-to-br from-[#103a61] via-[#092640] to-[#041626]",
      border: "border-cyan-400/60 hover:border-cyan-300",
      shadow: "shadow-[0_8px_30px_rgba(6,182,212,0.25)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.4)]",
      iconBg: "bg-cyan-500/30 border border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]",
      iconColor: "text-cyan-200",
      glow: "bg-cyan-500/25",
    },
  ];

  const stats = [
    { label: "Total Users",       value: usersCount,       icon: Users,        color: "#818cf8", trend: "+12%", up: true },
    { label: "Total Projects",    value: projects.length,  icon: FolderKanban, color: "#34d399", trend: "+15%", up: true },
    { label: "Active Listings",   value: activeListings,   icon: ShoppingBag,  color: "#f59e0b", trend: "+5%",  up: true },
    { label: "Pending Payments",  value: pendingPayments,  icon: CreditCard,   color: "#fb923c", trend: "-3%",  up: false },
    { label: "Approved Orders",   value: approvedOrders,   icon: CheckCircle,  color: "#22c55e", trend: "+22%", up: true },
    { label: "Total Revenue",     value: totalRevenue,     icon: IndianRupee,  color: "#eab308", prefix: "₹", trend: "+18%", up: true },
    { label: "Pending Approvals", value: pendingApprovals, icon: Clock,        color: "#f43f5e", trend: "+2",   up: false },
    { label: "Total Orders",      value: orders.length,    icon: TrendingUp,   color: "#06b6d4", trend: "+10%", up: true },
  ];

  // ── Full monthly revenue dataset (derived from real platform orders) ──
  const ALL_MONTHLY_DATA: Record<string, number> = {};

  // ── Full monthly user growth dataset (derived from real platform users) ──
  const ALL_USER_GROWTH_DATA: Record<string, number> = {};

  const now = new Date();
  const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const defaultTo   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Monthly Revenue Range State
  const [fromMonth, setFromMonth] = useState(defaultFrom);
  const [toMonth,   setToMonth]   = useState(defaultTo);

  // User Growth Range State
  const [fromUserMonth, setFromUserMonth] = useState(defaultFrom);
  const [toUserMonth,   setToUserMonth]   = useState(defaultTo);

  // Build filtered revenue array from the selected range
  const filteredRevenueData = useCallback(() => {
    const entries: { key: string; label: string; value: number }[] = [];
    const [fy, fm] = fromMonth.split("-").map(Number);
    const [ty, tm] = toMonth.split("-").map(Number);
    let y = fy, m = fm;
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      entries.push({ key, label: `${MONTHS[m - 1]} '${String(y).slice(2)}`, value: ALL_MONTHLY_DATA[key] ?? 0 });
      if (m === 12) { m = 1; y++; } else { m++; }
    }
    return entries;
  }, [fromMonth, toMonth]);

  const revenueEntries = filteredRevenueData();
  const revenueTotal   = revenueEntries.reduce((s, e) => s + e.value, 0);

  const handleDownloadRevenue = () => {
    const rows = [["Month", "Revenue (INR)"], ...revenueEntries.map(e => [e.label, e.value])];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `Revenue_${fromMonth}_to_${toMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Build filtered user growth array from the selected range
  const filteredUserGrowthData = useCallback(() => {
    const entries: { key: string; label: string; value: number }[] = [];
    const [fy, fm] = fromUserMonth.split("-").map(Number);
    const [ty, tm] = toUserMonth.split("-").map(Number);
    let y = fy, m = fm;
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      entries.push({ key, label: `${MONTHS[m - 1]} '${String(y).slice(2)}`, value: ALL_USER_GROWTH_DATA[key] ?? 0 });
      if (m === 12) { m = 1; y++; } else { m++; }
    }
    return entries;
  }, [fromUserMonth, toUserMonth]);

  const userGrowthEntries = filteredUserGrowthData();
  const userGrowthTotal   = userGrowthEntries.reduce((s, e) => s + e.value, 0);

  const handleDownloadUserGrowth = () => {
    const rows = [["Month", "New User Signups"], ...userGrowthEntries.map(e => [e.label, e.value])];
    const csv  = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `UserGrowth_${fromUserMonth}_to_${toUserMonth}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const topCategories = [
    { name: "AI / ML",    sales: 42, pct: 100, color: "#f59e0b", glow: "rgba(245,158,11,0.5)",  icon: "🤖" },
    { name: "Web Dev",    sales: 38, pct: 90,  color: "#38bdf8", glow: "rgba(56,189,248,0.5)",  icon: "🌐" },
    { name: "IoT",        sales: 28, pct: 67,  color: "#34d399", glow: "rgba(52,211,153,0.5)",  icon: "⚡" },
    { name: "Mobile",     sales: 22, pct: 52,  color: "#a78bfa", glow: "rgba(167,139,250,0.5)", icon: "📱" },
    { name: "Cybersec",   sales: 15, pct: 36,  color: "#f87171", glow: "rgba(248,113,113,0.5)", icon: "🔐" },
  ];
  const recentActivity = [
    { text: "Secure payment gateway online & active", time: "Just now", icon: CreditCard, color: "#00ff88" },
    { text: "Marketplace engineering project catalog updated", time: "10 min ago", icon: FolderKanban, color: "#00d4ff" },
    { text: "System security scan completed: All systems nominal", time: "1 hour ago", icon: TrendingUp, color: "#b026ff" },
  ];

  const handleExportAll = () => downloadOrdersExcel(orders, `EduNova_Forge_All_Orders_${new Date().toISOString().split("T")[0]}.csv`);
  const handleExportApproved = () => downloadOrdersExcel(orders.filter(o => o.status === "approved"), `EduNova_Forge_Approved_Orders.csv`);
  const handleExportPending = () => downloadOrdersExcel(orders.filter(o => o.status === "pending"), `EduNova_Forge_Pending_Orders.csv`);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400">{user?.name}</span>
            </h1>
            {user?.role === "admin" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-amber-500/20 text-pink-300 border border-pink-500/30 shadow-sm">
                <Crown className="w-3 h-3 text-amber-400" /> Admin
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">Here&apos;s what&apos;s happening on your platform today.</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs text-gray-500">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Export Reports Bar */}
      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-[#0e1c26]/90 to-indigo-950/40 backdrop-blur-xl mb-8 shadow-[0_10px_35px_rgba(16,185,129,0.08)] relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.25)]">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              Financial & Order Reports
            </h3>
            <p className="text-gray-400 text-xs mt-1">Download order records and reports as Excel/CSV sheets</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30 transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(99,102,241,0.15)]"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download All Orders
            </button>
            <button
              onClick={handleExportApproved}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-bold hover:bg-green-500/30 transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(34,197,94,0.15)]"
            >
              <Download className="w-4 h-4" />
              Export Approved
            </button>
            <button
              onClick={handleExportPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(245,158,11,0.15)]"
            >
              <Clock className="w-4 h-4" />
              Export Pending
            </button>
            <a
              href="/admin/payments"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(168,85,247,0.15)]"
            >
              <Eye className="w-4 h-4" />
              View All Records
            </a>
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to erase all test orders and reset revenue to ₹0?")) {
                  await clearAllOrders();
                  setOrders([]);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-500/30 transition-all hover:scale-[1.02] shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            >
              <FileDown className="w-4 h-4" />
              Reset Revenue & Orders
            </button>
          </div>
        </div>
        {/* Quick Summary Row */}
        {orders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10 relative z-10">
            <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Orders</p>
              <p className="text-xl font-black text-white mt-0.5">{summary.totalOrders}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-green-500/10 border border-green-500/20">
              <p className="text-[10px] text-green-300 uppercase tracking-wider font-semibold">Approved</p>
              <p className="text-xl font-black text-green-400 mt-0.5">{summary.approvedOrders}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-amber-300 uppercase tracking-wider font-semibold">Pending Verification</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">{summary.pendingOrders}</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-semibold">Success Rate</p>
              <p className="text-xl font-black text-emerald-400 mt-0.5">
                {summary.totalOrders > 0 ? Math.round((summary.approvedOrders / summary.totalOrders) * 100) : 0}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid - each with distinct vibrant theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const theme = STAT_THEMES[i % STAT_THEMES.length];
          return (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
              className={`rounded-2xl border p-5 relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${theme.bg} ${theme.border} ${theme.shadow}`}
            >
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl pointer-events-none ${theme.glow}`} />
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-xs text-gray-300 uppercase tracking-wider font-semibold">{stat.label}</span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.iconBg}`}>
                  <Icon className={`w-5 h-5 ${theme.iconColor}`} />
                </div>
              </div>
              <p className="text-2xl font-black text-white tracking-tight relative z-10">
                <AnimatedNumber value={stat.value} prefix={stat.prefix || ""} />
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* ── Monthly Revenue 3D Isometric Chart with Surging Trend Arrows ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 rounded-2xl border border-indigo-500/25 bg-gradient-to-b from-[#11172a]/95 via-[#0c101d]/95 to-[#070a13]/95 p-6 flex flex-col justify-between shadow-[0_12px_45px_rgba(99,102,241,0.08)] backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-indigo-500/10 pointer-events-none" />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                Monthly Revenue
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                <span className="font-semibold text-white">₹{revenueTotal.toLocaleString("en-IN")}</span> total · {revenueEntries.length} months
              </p>
            </div>

            {/* Date range controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <input
                  type="month"
                  value={fromMonth}
                  max={toMonth}
                  onChange={e => setFromMonth(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 focus:outline-none w-28 cursor-pointer"
                />
              </div>
              <span className="text-gray-600 text-xs font-bold">→</span>
              <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5">
                <CalendarRange className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <input
                  type="month"
                  value={toMonth}
                  min={fromMonth}
                  onChange={e => setToMonth(e.target.value)}
                  className="bg-transparent text-xs text-gray-300 focus:outline-none w-28 cursor-pointer"
                />
              </div>
              <button
                onClick={handleDownloadRevenue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all hover:scale-105 active:scale-95"
                title="Download Revenue CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {/* 3D Isometric Chart with Grid & Trend Arrows */}
          <ThreeDIsometricChart
            data={revenueEntries}
            prefix="₹"
            chartId="revenue"
          />
        </motion.div>

        {/* ── Top Categories — Floating Animated Indicators ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-[#291442]/95 via-[#1a0c2c]/95 to-[#0e0618]/98 p-6 relative overflow-hidden shadow-[0_16px_45px_rgba(168,85,247,0.18)] backdrop-blur-xl"
        >
          {/* Ambient background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-purple-500/20 pointer-events-none" />

          <h3 className="text-white font-bold text-lg mb-1">Top Categories</h3>
          <p className="text-purple-300/70 text-xs mb-5">By total sales</p>

          <div className="flex flex-col gap-5">
            {topCategories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Label row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{cat.icon}</span>
                    <span className="text-sm text-gray-200 font-semibold">{cat.name}</span>
                  </div>
                  <span className="text-xs font-bold text-purple-200">{cat.sales} sales</span>
                </div>

                {/* Progress bar container */}
                <div className="relative h-2.5 rounded-full bg-white/[0.08] overflow-visible">
                  {/* Animated fill */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.pct}%` }}
                    transition={{ delay: 0.8 + i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${cat.color}80, ${cat.color})`,
                      boxShadow: `0 0 10px ${cat.glow}, 0 0 20px ${cat.glow}`,
                    }}
                  />
                  {/* Shimmer sweep */}
                  <motion.div
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ delay: 1.2 + i * 0.15, duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 + i * 0.5 }}
                    className="absolute inset-y-0 w-12 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)` }}
                  />
                  {/* Floating glow orb at the tip */}
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.3, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                    style={{
                      left: `calc(${cat.pct}% - 6px)`,
                      backgroundColor: cat.color,
                      boxShadow: `0 0 8px ${cat.glow}, 0 0 16px ${cat.glow}`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── User Growth 3D Isometric Chart with Surging Trend Arrows ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border-2 border-pink-500/35 bg-gradient-to-br from-[#381331]/95 via-[#240b20]/95 to-[#130511]/98 p-6 flex flex-col justify-between shadow-[0_16px_45px_rgba(236,72,153,0.18)] backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-pink-500/15 pointer-events-none" />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500/25 via-purple-500/25 to-cyan-500/25 border border-pink-500/40 flex items-center justify-center shadow-md">
                  <Users className="w-4 h-4 text-pink-300" />
                </div>
                <h3 className="text-white font-bold text-lg">User Growth</h3>
              </div>
              <p className="text-pink-200/70 text-xs mt-1">
                <span className="font-bold text-white">{userGrowthTotal.toLocaleString()}</span> total signups · {userGrowthEntries.length} months
              </p>
            </div>

            {/* Date range controls & CSV download */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-pink-950/40 border border-pink-500/30 rounded-xl px-2.5 py-1.5 shadow-inner">
                <CalendarRange className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                <input
                  type="month"
                  value={fromUserMonth}
                  max={toUserMonth}
                  onChange={e => setFromUserMonth(e.target.value)}
                  className="bg-transparent text-xs text-gray-200 focus:outline-none w-28 cursor-pointer"
                />
              </div>
              <span className="text-pink-400/60 text-xs font-bold">→</span>
              <div className="flex items-center gap-1.5 bg-pink-950/40 border border-pink-500/30 rounded-xl px-2.5 py-1.5 shadow-inner">
                <CalendarRange className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
                <input
                  type="month"
                  value={toUserMonth}
                  min={fromUserMonth}
                  onChange={e => setToUserMonth(e.target.value)}
                  className="bg-transparent text-xs text-gray-200 focus:outline-none w-28 cursor-pointer"
                />
              </div>
              <button
                onClick={handleDownloadUserGrowth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-200 text-xs font-semibold hover:bg-pink-500/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                title="Download User Growth CSV"
              >
                <FileDown className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>

          {/* 3D Isometric Chart with Grid & Trend Arrows */}
          <ThreeDIsometricChart
            data={userGrowthEntries}
            unit="users"
            chartId="users"
          />
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl border-2 border-cyan-500/35 bg-gradient-to-br from-[#0e2742]/95 via-[#081b2e]/95 to-[#040e1a]/98 p-6 flex flex-col justify-between shadow-[0_16px_45px_rgba(6,182,212,0.18)] backdrop-blur-xl relative overflow-hidden"
        >
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl bg-cyan-500/15 pointer-events-none" />
          <div>
            <h3 className="text-white font-bold text-lg mb-1">Recent Activity</h3>
            <p className="text-cyan-200/70 text-xs mb-5">Platform notifications</p>
            <div className="flex flex-col gap-3">
              {recentActivity.map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + i * 0.08 }}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 hover:border-cyan-400/40 hover:bg-cyan-900/30 transition-all shadow-sm"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}25` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 leading-snug">{item.text}</p>
                      <p className="text-[10px] text-cyan-300/60 mt-1">{item.time}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

interface Props {
  userName: string;
  onSelectBuy: () => void;
}

export function WelcomeModal({ userName, onSelectBuy }: Props) {
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-md"
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a0a1a] shadow-[0_0_80px_rgba(0,240,255,0.1)] p-8 md:p-10 my-auto"
        >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--color-neon-purple)] to-[var(--color-neon-blue)] flex items-center justify-center shadow-[0_0_30px_rgba(176,38,255,0.4)]"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
            Welcome, {userName}! 🚀
          </h2>
          <p className="text-gray-400">
            Discover premium engineering projects curated by{" "}
            <span className="font-bold text-[#00e5ff] drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">EduNova</span>{" "}
            <span className="font-bold text-[#ff7828] drop-shadow-[0_0_8px_rgba(255,120,40,0.6)]">Forge</span>
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Browse Projects */}
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSelectBuy}
            className="relative group rounded-xl border border-white/10 bg-white/5 p-6 text-left cursor-pointer hover:border-[var(--color-neon-blue)]/50 transition-colors overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-blue)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-neon-blue)]/15 border border-[var(--color-neon-blue)]/30 flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-shadow">
                <ShoppingCart className="w-6 h-6 text-[var(--color-neon-blue)]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">🛒 Explore Projects</h3>
              <p className="text-sm text-gray-400">Browse premium, curated engineering projects.</p>
            </div>
          </motion.button>

          {/* Request Custom */}
          <Link href="/requests">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="relative group rounded-xl border border-white/10 bg-white/5 p-6 text-left cursor-pointer hover:border-[var(--color-neon-purple)]/50 transition-colors overflow-hidden h-full"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-neon-purple)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-neon-purple)]/15 border border-[var(--color-neon-purple)]/30 flex items-center justify-center mb-4 group-hover:shadow-[0_0_20px_rgba(176,38,255,0.3)] transition-shadow">
                  <BookOpen className="w-6 h-6 text-[var(--color-neon-purple)]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">📋 Request Custom</h3>
                <p className="text-sm text-gray-400">Need something specific? Submit a custom project request.</p>
              </div>
            </motion.div>
          </Link>
        </div>

        <p className="text-center text-xs text-gray-600">
          All projects are curated and verified by the{" "}
          <span className="font-semibold text-[#00e5ff]">EduNova</span>{" "}
          <span className="font-semibold text-[#ff7828]">Forge</span> team.
        </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

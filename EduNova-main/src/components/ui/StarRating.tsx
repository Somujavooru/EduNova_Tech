"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
}

export function StarRating({ value, onChange, size = "md", readOnly = false, showValue = false }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const displayValue = hoverValue || value;

  const sizeMap = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-7 h-7" };
  const textSize = { sm: "text-xs", md: "text-sm", lg: "text-lg" };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= displayValue;
        return (
          <motion.button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readOnly && setHoverValue(star)}
            onMouseLeave={() => !readOnly && setHoverValue(0)}
            whileHover={readOnly ? {} : { scale: 1.2 }}
            whileTap={readOnly ? {} : { scale: 0.9 }}
            className={`${readOnly ? "cursor-default" : "cursor-pointer"} transition-colors duration-150 outline-none bg-transparent border-none p-0`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`${sizeMap[size]} transition-all duration-200 ${
                filled
                  ? "fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]"
                  : "fill-gray-600"
              }`}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </motion.button>
        );
      })}
      {showValue && (
        <span className={`ml-1 font-bold text-yellow-400 ${textSize[size]}`}>
          {value > 0 ? value.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}

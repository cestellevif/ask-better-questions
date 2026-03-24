"use client";
import { motion, AnimatePresence } from "framer-motion";

interface SplitTextProps {
  text: string;
  animKey: string;
}

export function SplitText({ text, animKey }: SplitTextProps) {
  const chars = text.split("");
  return (
    <AnimatePresence mode="wait">
      <span key={animKey} aria-label={text} style={{ display: "inline" }}>
        {chars.map((char, i) => (
          <span
            key={i}
            style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
          >
            <motion.span
              style={{ display: "inline-block" }}
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "-100%" }}
              transition={{
                duration: 0.35,
                delay: i * 0.025,
                ease: [0.215, 0.61, 0.355, 1],
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          </span>
        ))}
      </span>
    </AnimatePresence>
  );
}

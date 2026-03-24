"use client";
import { motion } from "framer-motion";

interface SplitTextProps {
  text: string;
}

export function SplitText({ text }: SplitTextProps) {
  return (
    <span aria-label={text} style={{ display: "inline" }}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          style={{ display: "inline-block", overflow: "hidden", verticalAlign: "bottom" }}
        >
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.45,
              delay: i * 0.03,
              ease: [0.215, 0.61, 0.355, 1], // power3.out
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

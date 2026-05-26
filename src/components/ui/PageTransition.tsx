"use client";

import { motion } from "framer-motion";

const variants = {
  initial: { opacity: 0, x: 10 },
  enter:   { opacity: 1, x: 0,  transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit:    { opacity: 0, x: -6, transition: { duration: 0.18, ease: "easeIn" as const } },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

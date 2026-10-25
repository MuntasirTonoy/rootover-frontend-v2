"use client";

import { useEffect, useState, useRef } from "react";
import { useInView, animate } from "framer-motion";

interface CountUpProps {
  to: number;
  suffix?: string;
  duration?: number;
}

export default function CountUp({ to, suffix = "", duration = 2 }: CountUpProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, to, {
        duration: duration,
        ease: "easeOut",
        onUpdate: (value) => setCount(Math.floor(value)),
      });
      return () => controls.stop();
    }
  }, [isInView, to, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

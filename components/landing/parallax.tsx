import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Horizontal parallax — element travels along x as it scrolls through the viewport.
 * `from` and `to` are pixel offsets (negative = move left, positive = move right).
 * Default: slides in from the right (+120px) to its rest position (0) as the
 * element scrolls from the bottom of the viewport to the middle.
 */
export function ParallaxX({
  children,
  from = 60,
  className,
}: {
  children: ReactNode;
  /** Pixel offset to start from. Element settles at x:0 once it reaches mid-viewport. */
  from?: number;
  /** Deprecated; kept for backwards compat. Ignored. */
  to?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center center"],
  });
  // Slide in from `from` to 0 as the element scrolls into view, then stay put.
  const x = useTransform(scrollYProgress, [0, 1], [from, 0]);
  return (
    <motion.div ref={ref} style={{ x }} className={className}>
      {children}
    </motion.div>
  );
}

/** Marquee-style horizontal drift driven entirely by page scroll. */
export function ScrollMarquee({
  children,
  speed = 200,
  className,
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const x: MotionValue<number> = useTransform(scrollYProgress, [0, 1], [speed, -speed]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ x }} className="flex">
        {children}
      </motion.div>
    </div>
  );
}

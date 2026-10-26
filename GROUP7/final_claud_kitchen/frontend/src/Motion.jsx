import { useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as = "div",
  ...props
}) {
  const reduced = useReducedMotion();
  const Component = as === "section" ? motion.section : motion.div;
  return (
    <Component
      {...props}
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}

export function Depth({ children, className = "", strength = 5 }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(y, { stiffness: 90, damping: 24 });
  const rotateY = useSpring(x, { stiffness: 90, damping: 24 });
  function move(event) {
    if (reduced || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set(((event.clientX - bounds.left) / bounds.width - 0.5) * strength);
    y.set(-((event.clientY - bounds.top) / bounds.height - 0.5) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }
  return (
    <motion.div
      className={className}
      onPointerMove={move}
      onPointerLeave={reset}
      style={
        reduced ? undefined : { rotateX, rotateY, transformPerspective: 1100 }
      }
    >
      {children}
    </motion.div>
  );
}

export function Atmosphere({ className = "" }) {
  const ref = useRef(null);
  const visible = useInView(ref);
  const reduced = useReducedMotion();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={`atmosphere ${className} ${visible && !reduced ? "is-moving" : ""}`}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <i
          key={i}
          style={{
            "--particle-x": `${9 + ((i * 37) % 83)}%`,
            "--particle-y": `${12 + ((i * 23) % 75)}%`,
            "--particle-size": `${i % 3 === 0 ? 7 : 3}px`,
            "--particle-delay": `${-i * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

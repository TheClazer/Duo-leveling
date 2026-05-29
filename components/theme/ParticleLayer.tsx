"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  size: number; life: number; max: number;
};

export function ParticleLayer() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      // Reset transform first — otherwise scale() compounds on every resize
      // and particles balloon to 8x size after a couple window resizes.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    // Density floor of 12 so mobile (375x800 viewport → would compute 5)
    // still feels alive. Ceiling of 30 to keep GPU cost bounded.
    const target = Math.max(
      12,
      Math.min(30, Math.floor((window.innerWidth * window.innerHeight) / 60000)),
    );

    const isJinwoo = theme === "jinwoo";
    const isShared = theme === "shared";

    function spawn(): Particle {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (isJinwoo) {
        // embers drift upward
        return {
          x: Math.random() * w,
          y: h + Math.random() * 40,
          vx: (Math.random() - 0.5) * 0.2,
          vy: -0.3 - Math.random() * 0.5,
          size: 1 + Math.random() * 2,
          life: 0,
          max: 400 + Math.random() * 400,
        };
      }
      if (isShared) {
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.2 - Math.random() * 0.3,
          size: 1.5 + Math.random() * 2,
          life: 0,
          max: 500 + Math.random() * 300,
        };
      }
      // chahaein: petals drift diagonally
      return {
        x: -20 + Math.random() * (w + 40),
        y: -20,
        vx: 0.3 + Math.random() * 0.4,
        vy: 0.5 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
        life: 0,
        max: 600 + Math.random() * 200,
      };
    }

    while (particles.length < target) particles.push(spawn());

    let raf = 0;
    let last = performance.now();
    let lastDraw = 0;
    // Adaptive fps: 60 on desktop (fine-pointer, hover-capable), 30 on
    // touch/mobile + when prefers-reduced-motion or no hover. Bumping to 60
    // is invisible to GPU on desktop but visible to the eye.
    const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const FRAME_MS = hasHover ? 1000 / 60 : 1000 / 30;

    const root = getComputedStyle(document.documentElement);
    const getColor = (varName: string) => {
      const v = root.getPropertyValue(varName).trim();
      return v ? `rgb(${v})` : "rgb(255,255,255)";
    };

    const colorA = getColor("--particle-a");
    const colorB = getColor("--particle-b");

    function draw(now: number) {
      // Throttle to 30fps regardless of display refresh rate.
      if (now - lastDraw < FRAME_MS) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const dt = Math.min(50, now - last);
      last = now;
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.life += dt;
        const t = p.life / p.max;
        const alpha = t < 0.1 ? t * 10 : t > 0.85 ? (1 - t) * 6.67 : 1;
        const color = i % 2 ? colorA : colorB;
        ctx!.globalAlpha = Math.max(0, Math.min(1, alpha)) * 0.55;
        ctx!.fillStyle = color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        if (p.life > p.max || p.y < -40 || p.y > window.innerHeight + 40 || p.x < -40 || p.x > window.innerWidth + 40) {
          particles[i] = spawn();
        }
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    // Stop animating while the tab / installed PWA is backgrounded — saves
    // battery + GPU on phones instead of drawing to an off-screen canvas.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (raf === 0) {
        last = performance.now();
        lastDraw = 0;
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
    />
  );
}

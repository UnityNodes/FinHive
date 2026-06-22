"use client";

import { useEffect, useRef } from "react";

export function ConstellationBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    let raf = 0;
    const LINK_DIST = 150;
    const LINK_DIST2 = LINK_DIST * LINK_DIST;
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

    type P = { x: number; y: number; vx: number; vy: number; depth: number; r: number; col: number[]; amber: boolean; tw: number; tws: number; sx: number; sy: number };
    let particles: P[] = [];

    function colorFor(t: number): number[] {
      if (t < 0.78) {
        const k = t / 0.78;
        return [
          Math.round(0x8b + (0x6d - 0x8b) * k),
          Math.round(0x7b + (0x5b - 0x7b) * k),
          Math.round(0xff + (0xd0 - 0xff) * k),
        ];
      }
      return Math.random() < 0.5 ? [0xf5, 0xa6, 0x23] : [0xf0, 0xa0, 0x20];
    }

    function makeParticles() {
      particles = [];
      let target = Math.round((W * H) / 13000);
      target = Math.max(40, Math.min(target, 130));
      for (let i = 0; i < target; i++) {
        const depth = 0.35 + Math.random() * 0.65;
        const c = colorFor(Math.random());
        particles.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.16, vy: (Math.random() - 0.5) * 0.16,
          depth, r: 0.7 + depth * 1.9, col: c, amber: c[0] > 200,
          tw: Math.random() * Math.PI * 2, tws: 0.4 + Math.random() * 0.8, sx: 0, sy: 0,
        });
      }
    }

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas!.width = Math.round(W * DPR);
      canvas!.height = Math.round(H * DPR);
      canvas!.style.width = W + "px";
      canvas!.style.height = H + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      makeParticles();
    }

    function onMove(e: MouseEvent) { pointer.tx = e.clientX / W; pointer.ty = e.clientY / H; }
    function onLeave() { pointer.tx = 0.5; pointer.ty = 0.5; }

    let last = performance.now();
    function step(now: number) {
      const dt = Math.min(now - last, 60);
      last = now;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      const px = pointer.x - 0.5, py = pointer.y - 0.5;
      ctx!.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx * dt * 0.96;
        p.y += p.vy * dt * 0.96;
        const m = 40;
        if (p.x < -m) p.x = W + m;
        if (p.x > W + m) p.x = -m;
        if (p.y < -m) p.y = H + m;
        if (p.y > H + m) p.y = -m;
        p.tw += p.tws * dt * 0.001;
        const par = (1 - p.depth) * 26;
        p.sx = p.x - px * par;
        p.sy = p.y - py * par;
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.sx - q.sx, dy = p.sy - q.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK_DIST2) {
            const d = Math.sqrt(d2);
            let a = 1 - d / LINK_DIST; a = a * a;
            const depthFade = (p.depth + q.depth) * 0.5;
            const alpha = a * 0.28 * depthFade;
            if (alpha < 0.012) continue;
            ctx!.strokeStyle = (p.amber || q.amber)
              ? "rgba(241,164,40," + alpha.toFixed(3) + ")"
              : "rgba(130,116,235," + alpha.toFixed(3) + ")";
            ctx!.beginPath();
            ctx!.moveTo(p.sx, p.sy);
            ctx!.lineTo(q.sx, q.sy);
            ctx!.stroke();
          }
        }
      }

      for (const p of particles) {
        const tw = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(p.tw));
        const base = (0.55 + p.depth * 0.45) * tw;
        const c = p.col;
        const hr = p.r * 5;
        const grad = ctx!.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, hr);
        grad.addColorStop(0, "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + (0.16 * base).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(" + c[0] + "," + c[1] + "," + c[2] + ",0)");
        ctx!.fillStyle = grad;
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, hr, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = Math.min(1, base);
        ctx!.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
        ctx!.beginPath();
        ctx!.arc(p.sx, p.sy, p.r, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      raf = requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background:
          "radial-gradient(1200px 800px at 22% 18%, rgba(109,91,208,0.16), transparent 60%)," +
          "radial-gradient(1000px 720px at 82% 82%, rgba(245,166,35,0.10), transparent 60%)," +
          "radial-gradient(900px 900px at 50% 50%, rgba(139,123,255,0.05), transparent 70%)," +
          "linear-gradient(160deg,#0e0b16 0%,#0b0912 55%,#080610 100%)",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 120% at 50% 45%, transparent 52%, rgba(4,3,8,0.55) 100%)" }} />
    </div>
  );
}

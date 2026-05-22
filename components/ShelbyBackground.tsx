"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export const ShelbyBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const animationFrameIdRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const handleGameStart = () => { isPlayingRef.current = true; };
    const handleGameEnd   = () => { isPlayingRef.current = false; };
    window.addEventListener("snake_game_start", handleGameStart);
    window.addEventListener("snake_game_end",   handleGameEnd);
    return () => {
      window.removeEventListener("snake_game_start", handleGameStart);
      window.removeEventListener("snake_game_end",   handleGameEnd);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Resize ──────────────────────────────────────────────────────────────
    const resizeCanvas = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // ── Particles ────────────────────────────────────────────────────────────
    const particles: Particle[] = [];
    const particleCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 14000));

    // Vivid multi-color neon palette — every node gets a distinct color
    const colors = [
      "#00ff88",  // neon green
      "#00e5ff",  // electric cyan
      "#ff007f",  // hot pink
      "#ffdf00",  // neon yellow
      "#a855f7",  // purple
      "#ff6600",  // neon orange
      "#00bfff",  // deep sky blue
      "#ff4dff",  // magenta
      "#39ff14",  // lime green
      "#ff3131",  // neon red
      "#c084fc",  // lavender
      "#ffd700",  // gold
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x:      Math.random() * canvas.width,
        y:      Math.random() * canvas.height,
        vx:     (Math.random() - 0.5) * 0.5,
        vy:     (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2.5 + 1.2,
        color:  colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // ── Mouse ────────────────────────────────────────────────────────────────
    const handleMouseMove  = (e: MouseEvent) => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; };
    const handleMouseLeave = ()              => { mouseRef.current.x = null;       mouseRef.current.y = null; };
    window.addEventListener("mousemove",      handleMouseMove);
    document.addEventListener("mouseleave",   handleMouseLeave);

    // ── Helper: draw the glowing cyber grid ─────────────────────────────────
    const drawGrid = (alpha: number, lineWidth: number, spacing: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = lineWidth;

      // Vertical lines
      for (let x = 0; x <= canvas.width; x += spacing) {
        const grad = ctx.createLinearGradient(x, 0, x, canvas.height);
        grad.addColorStop(0,    "rgba(139, 92, 246, 0.0)");
        grad.addColorStop(0.3,  "rgba(139, 92, 246, 0.7)");
        grad.addColorStop(0.7,  "rgba(168, 85, 247, 0.7)");
        grad.addColorStop(1,    "rgba(139, 92, 246, 0.0)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= canvas.height; y += spacing) {
        const grad = ctx.createLinearGradient(0, y, canvas.width, y);
        grad.addColorStop(0,    "rgba(139, 92, 246, 0.0)");
        grad.addColorStop(0.3,  "rgba(139, 92, 246, 0.7)");
        grad.addColorStop(0.7,  "rgba(168, 85, 247, 0.7)");
        grad.addColorStop(1,    "rgba(139, 92, 246, 0.0)");
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      ctx.restore();
    };

    // ── Render loop ──────────────────────────────────────────────────────────
    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isPlayingRef.current) {
        // Static minimal grid during gameplay
        drawGrid(0.12, 0.6, 60);
        animationFrameIdRef.current = requestAnimationFrame(update);
        return;
      }

      // 1. Full glowing cyber grid
      drawGrid(0.22, 0.8, 60);

      // 2. Particle physics + draw
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Mouse attraction
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx   = mouseRef.current.x - p.x;
          const dy   = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            const force = (200 - dist) / 2000;
            p.x += (dx / dist) * force * 18;
            p.y += (dy / dist) * force * 18;
          }
        }

        // Layer 1 — wide soft outer halo
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.shadowBlur   = 30;
        ctx.shadowColor  = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        // Layer 2 — mid glow ring
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.shadowBlur   = 18;
        ctx.shadowColor  = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        // Layer 3 — bright solid core
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur   = 16;
        ctx.shadowColor  = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        // Tiny white specular highlight
        ctx.globalAlpha = 0.6;
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Constellation connection lines — gradient between node colors
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2   = particles[j];
          const dx   = p1.x - p2.x;
          const dy   = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.55;
            // Gradient line from p1 color → p2 color
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, p1.color);
            grad.addColorStop(1, p2.color);
            ctx.save();
            ctx.globalAlpha  = alpha;
            ctx.strokeStyle  = grad;
            ctx.lineWidth    = 1.0;
            ctx.shadowBlur   = 8;
            ctx.shadowColor  = p1.color;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Line to mouse cursor
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx   = p1.x - mouseRef.current.x;
          const dy   = p1.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const alpha = (1 - dist / 160) * 0.6;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = "#e879f9";
            ctx.shadowBlur  = 10;
            ctx.shadowColor = "#e879f9";
            ctx.lineWidth   = 1.1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animationFrameIdRef.current = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize",    resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        background:
          "radial-gradient(ellipse at 20% 20%, #3b0764 0%, #1e1b4b 35%, #0f0a1e 65%, #030308 100%)",
      }}
    />
  );
};

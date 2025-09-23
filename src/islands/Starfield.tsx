import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleAmplitude: number;
  twinkleSpeed: number;
  phase: number;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const stars: Star[] = [];
    let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function resizeCanvas() {
      const { innerWidth, innerHeight } = window;
      canvas.style.width = innerWidth + 'px';
      canvas.style.height = innerHeight + 'px';
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      generateStars();
      draw(0); // immediate draw after resize
    }

    function generateStars() {
      stars.length = 0;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      // Density-based star count for randomness at different resolutions
      const density = 0.00035; // stars per pixel
      const count = Math.max(150, Math.floor(width * height * density));

      for (let i = 0; i < count; i++) {
        const isBright = Math.random() < 0.08; // a few brighter stars
        const radius = isBright ? 1.4 + Math.random() * 1.2 : 0.6 + Math.random() * 0.9;
        const baseAlpha = isBright ? 0.55 + Math.random() * 0.3 : 0.25 + Math.random() * 0.35;
        const twinkleAmplitude = isBright ? 0.25 + Math.random() * 0.2 : 0.12 + Math.random() * 0.12;
        const twinkleSpeed = isBright ? 0.4 + Math.random() * 0.5 : 0.7 + Math.random() * 0.9; // radians/sec
        const phase = Math.random() * Math.PI * 2;

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius,
          baseAlpha,
          twinkleAmplitude,
          twinkleSpeed,
          phase,
        });
      }
    }

    function draw(elapsedSeconds: number) {
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.clearRect(0, 0, width, height);

      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const alpha = prefersReducedMotion
          ? s.baseAlpha
          : Math.max(0, Math.min(1, s.baseAlpha + s.twinkleAmplitude * Math.sin(s.phase + elapsedSeconds * s.twinkleSpeed)));

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    let start: number | null = null;
    function loop(ts: number) {
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000; // seconds
      draw(elapsed);
      animationRef.current = requestAnimationFrame(loop);
    }

    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    resizeCanvas();

    if (!prefersReducedMotion) {
      animationRef.current = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="starfield-canvas"
      aria-hidden="true"
    />
  );
}



import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function createStarStyle(): CSSProperties {
  const isBright = Math.random() < 0.2;
  const size = isBright ? randomBetween(1.2, 3.2) : randomBetween(0.4, 2.2);
  const avoidStart = 38;
  const avoidEnd = 62;
  const left = (() => {
    const pickLeftBand = Math.random() < ((avoidStart - 0) / 100);
    if (pickLeftBand) return Math.random() * avoidStart;
    return avoidEnd + Math.random() * (100 - avoidEnd);
  })();
  const top = Math.random() * 50;
  const brightness = (Math.random() * 0.7 + 0.25).toFixed(2);
  const twinkle = (Math.random() * 1.8 + 1.6).toFixed(2);
  const delay = (-Math.random() * 2).toFixed(2);
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    ['--star-brightness' as any]: brightness,
    animationDuration: `${twinkle}s`,
    animationDelay: `${delay}s`,
  };
}

function createParticleStyle(isStatic: boolean = false): CSSProperties {
  const size = Math.floor(Math.random() * 8) + 1;
  const posX = Math.floor(Math.random() * 100);
  const posY = Math.floor(Math.random() * 100);
  const delay = Math.random() * 20;
  const duration = Math.random() * 25 + 25;
  const opacity = isStatic ? (Math.random() * 0.15 + 0.02) : (Math.random() * 0.55 + 0.05);
  const blur = Math.random() * 2.5;
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${posX}%`,
    top: `${posY}%`,
    opacity,
    filter: `blur(${blur}px)`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    ['--random-angle' as any]: `${Math.floor(Math.random() * 360)}deg`,
  };
}

function createOrbStyle(isLowPerformance: boolean, isStatic: boolean = false): CSSProperties {
  const size = Math.floor(Math.random() * 200) + 150;
  const posX = Math.floor(Math.random() * 100);
  const posY = Math.floor(Math.random() * 100);
  const delay = Math.random() * 15;
  const duration = Math.random() * 30 + 40;
  const hue = Math.floor(Math.random() * 60) + 200;
  const maxBlur = isLowPerformance ? 20 : 50;
  const minBlur = isLowPerformance ? 5 : 30;
  const blur = Math.floor(Math.random() * (maxBlur - minBlur)) + minBlur;

  let opacity;
  if (isStatic) {
    opacity = 0.12; // Static version with lower opacity
  } else {
    opacity = isLowPerformance ? 0.15 : 0.25;
  }

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${posX}%`,
    top: `${posY}%`,
    filter: `blur(${blur}px)`,
    background: `radial-gradient(circle, hsla(${hue}, 100%, 70%, ${opacity}), hsla(${hue}, 100%, 50%, 0.03))`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

function createBeamStyle(isStatic: boolean = false): CSSProperties {
  const width = Math.floor(Math.random() * 200) + 100;
  const height = Math.floor(Math.random() * 200) + 300; // Tall enough to extend beyond viewport even when rotated
  const posX = Math.floor(Math.random() * 100);
  const posY = -50; // Position top center well above viewport
  const delay = Math.random() * 15;
  const duration = Math.random() * 20 + 40;
  const rotate = Math.floor(Math.random() * 90) - 45;

  // Expanded color range: blues, cyans, purples, magentas, and some warmer tones
  const hue = Math.floor(Math.random() * 120) + 180; // 180-300 degrees
  const saturation = Math.floor(Math.random() * 30) + 70; // 70-100%
  const lightness1 = Math.floor(Math.random() * 20) + 60; // 60-80%
  const lightness2 = Math.floor(Math.random() * 30) + 30; // 30-60%

  // Reduce opacity for static version
  const opacity1 = isStatic ? 0.06 : 0.15;
  const opacity2 = isStatic ? 0.04 : 0.12;
  const opacity3 = isStatic ? 0.03 : 0.08;
  const opacity4 = isStatic ? 0.01 : 0.03;

  return {
    width: `${width}px`,
    height: `${height}vh`,
    left: `${posX}%`,
    top: `${posY}%`,
    ['--rotate' as any]: `${rotate}deg`,
    transform: `rotate(${rotate}deg)`,
    background: `linear-gradient(to bottom,
      hsla(${hue}, ${saturation}%, ${lightness1}%, ${opacity1}) 0%,
      hsla(${hue}, ${saturation}%, ${Math.max(lightness1 - 10, 40)}%, ${opacity2}) 25%,
      hsla(${hue}, ${saturation}%, ${lightness2}%, ${opacity3}) 60%,
      hsla(${hue}, ${Math.min(saturation + 20, 100)}%, ${Math.max(lightness2 - 20, 10)}%, ${opacity4}) 85%,
      hsla(${hue}, ${Math.min(saturation + 30, 100)}%, 5%, 0) 100%)`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  };
}

export default function Starfield() {
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const [isLowPerformance, setIsLowPerformance] = useState(prefersReducedMotion);
  const [animationsOff, setAnimationsOff] = useState(prefersReducedMotion);
  const [manualControl, setManualControl] = useState(false);
  const [particleCount, setParticleCount] = useState<number>(25);
  const [orbCount, setOrbCount] = useState<number>(6);
  const [beamCount, setBeamCount] = useState<number>(3);
  const starsCount = 140;

  const starVarsStyle = useMemo<CSSProperties>(() => {
    const rotOpacity1 = randomBetween(0.4, 0.65).toFixed(2);
    const rotOpacity2 = randomBetween(0.4, 0.65).toFixed(2);
    return {
      ['--rot-stars-opacity-1' as any]: rotOpacity1,
      ['--rot-stars-opacity-2' as any]: rotOpacity2,
    };
  }, []);

  const starStyles = useMemo(() => Array.from({ length: starsCount }, () => createStarStyle()), [starsCount]);
  const particleStyles = useMemo(() => Array.from({ length: particleCount }, () => createParticleStyle(animationsOff)), [particleCount, animationsOff]);
  const orbStyles = useMemo(() => Array.from({ length: orbCount }, () => createOrbStyle(isLowPerformance, animationsOff)), [orbCount, isLowPerformance, animationsOff]);
  const beamStyles = useMemo(() => Array.from({ length: beamCount }, () => createBeamStyle(animationsOff)), [beamCount, animationsOff]);

  const rafRef = useRef<number | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('animations-preference');
      if (saved) {
        try {
          const pref = JSON.parse(saved);
          setManualControl(!pref.auto);
          setAnimationsOff(!pref.enabled);
          setIsLowPerformance(!pref.enabled);
        } catch (e) {
          console.warn('Failed to parse animations preference:', e);
        }
      }

      // Listen for storage changes (when PerformanceToggle updates preference)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'animations-preference' && e.newValue) {
          try {
            const pref = JSON.parse(e.newValue);
            setManualControl(!pref.auto);
            setAnimationsOff(!pref.enabled);
            setIsLowPerformance(!pref.enabled);
          } catch (err) {
            console.warn('Failed to parse animations preference on storage change:', err);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsLowPerformance(true);
      setAnimationsOff(true);
      setOrbCount(3);
      setBeamCount(1);
      return;
    }

    const DISABLE_THRESHOLD_FPS = 30; // More realistic threshold for low-end devices
    const ENABLE_THRESHOLD_FPS = 45; // Higher threshold for re-enabling to prevent flickering
    const SUSTAINED_SECONDS = 3; // consecutive seconds below/above threshold

    let frameCount = 0;
    let lastTime = performance.now();
    let consecutiveBelow = 0;
    let consecutiveAbove = 0;

    const measure = () => {
      const now = performance.now();
      frameCount++;
      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));

        // Only auto-adjust if not in manual control mode
        if (!manualControl) {
          if (!animationsOff) {
            if (fps < DISABLE_THRESHOLD_FPS) {
              consecutiveBelow++;
              consecutiveAbove = 0;
            } else {
              consecutiveAbove++;
              consecutiveBelow = 0;
            }
            if (consecutiveBelow >= SUSTAINED_SECONDS) {
              setAnimationsOff(true);
              setIsLowPerformance(true);
              console.log('🎭 Animations disabled due to low FPS:', fps);
            }
          } else {
            if (fps >= ENABLE_THRESHOLD_FPS) {
              consecutiveAbove++;
              consecutiveBelow = 0;
            } else {
              consecutiveBelow++;
              consecutiveAbove = 0;
            }
            if (consecutiveAbove >= SUSTAINED_SECONDS) {
              setAnimationsOff(false);
              setIsLowPerformance(false);
              console.log('🎭 Animations re-enabled, FPS improved:', fps);
            }
          }
        }

        frameCount = 0;
        lastTime = now;
      }
      rafRef.current = requestAnimationFrame(measure);
    };

    const startId = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(measure);
    });

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(startId);
    };
  }, [prefersReducedMotion, animationsOff, manualControl]);

  useEffect(() => {
    if (animationsOff) {
      // Keep reduced elements visible but without animation
      setParticleCount(8);
      setOrbCount(3);
      setBeamCount(2);
    } else if (isLowPerformance) {
      setParticleCount(15);
      setOrbCount(4);
      setBeamCount(2);
    } else {
      setParticleCount(25);
      setOrbCount(6);
      setBeamCount(3);
    }
  }, [animationsOff, isLowPerformance]);

  return (
    <div className={`animated-background${isLowPerformance ? ' low-performance' : ''}${animationsOff ? ' animations-off' : ''}`} style={starVarsStyle} aria-hidden="true">
      <div className="starfield" aria-hidden="true">
        {starStyles.map((style, idx) => (
          <div key={`star-${idx}`} className="star" style={style} />
        ))}
      </div>
      {particleStyles.map((style, idx) => (
        <div key={`particle-${idx}`} className="particle" style={style} />
      ))}
      {orbStyles.map((style, idx) => (
        <div key={`orb-${idx}`} className="glow-orb" style={style} />
      ))}
      {beamStyles.map((style, idx) => (
        <div key={`beam-${idx}`} className="light-beam" style={style} />
      ))}
    </div>
  );
}



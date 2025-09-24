import { useState, useEffect } from 'react';

interface Props {
  onToggle?: (enabled: boolean) => void;
}

export default function PerformanceToggle({ onToggle }: Props) {
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [currentFps, setCurrentFps] = useState(60);

  // Initialize from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('animations-preference');
      if (saved) {
        try {
          const pref = JSON.parse(saved);
          setPerformanceMode(pref.mode || 'auto');
        } catch (e) {
          console.warn('Failed to parse animations preference:', e);
        }
      }
    }
  }, []);

  // FPS monitoring for display purposes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameCount = 0;
    let lastTime = performance.now();
    let rafId: number;

    const measureFps = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastTime));
        setCurrentFps(fps);
        frameCount = 0;
        lastTime = now;
      }

      rafId = requestAnimationFrame(measureFps);
    };

    rafId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleToggle = () => {
    let newMode: 'auto' | 'on' | 'off';

    if (performanceMode === 'auto') {
      newMode = 'on'; // Auto -> Force ON
    } else if (performanceMode === 'on') {
      newMode = 'off'; // Force ON -> Force OFF
    } else {
      newMode = 'auto'; // Force OFF -> Auto
    }

    setPerformanceMode(newMode);

    // Save to localStorage
    const newState = {
      enabled: newMode === 'off' ? false : true,
      auto: newMode === 'auto',
      mode: newMode
    };

    localStorage.setItem('animations-preference', JSON.stringify(newState));

    // Trigger storage event for same-window communication
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'animations-preference',
      newValue: JSON.stringify(newState),
      storageArea: localStorage
    }));
  };

  const getStatusText = () => {
    if (performanceMode === 'auto') {
      return `Auto (${currentFps} FPS)`;
    }
    return performanceMode === 'on' ? 'Force On' : 'Force Off';
  };

  const getStatusIcon = () => {
    if (performanceMode === 'auto') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zM18.31 16.9L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
        </svg>
      );
    }

    if (performanceMode === 'on') {
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9l-5.91 5.74L17.18 22 12 19.27 6.82 22l1.09-7.26L2 9l6.91-.74L12 2z"/>
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-8h4v4h-4v-4z"/>
      </svg>
    );
  };

  return (
    <div className="selector-group">
      <label className="selector-label" aria-label="Animation selector">
        {getStatusIcon()}
      </label>
      <select
        className="selector-dropdown"
        value={performanceMode}
        onChange={(e) => {
          const newMode = e.target.value as 'auto' | 'on' | 'off';
          setPerformanceMode(newMode);

          // Save to localStorage
          const newState = {
            enabled: newMode === 'off' ? false : true,
            auto: newMode === 'auto',
            mode: newMode
          };

          localStorage.setItem('animations-preference', JSON.stringify(newState));

          // Trigger storage event for same-window communication
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'animations-preference',
            newValue: JSON.stringify(newState),
            storageArea: localStorage
          }));
        }}
        aria-label="Select animation mode"
        title={`Animations: ${getStatusText()}`}
      >
        <option value="auto">Auto</option>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    </div>
  );
}
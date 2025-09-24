import { useState, useEffect } from 'react';
import type { Locale } from '../i18n/utils.js';
import { getTranslations } from '../i18n/utils.js';

interface Props {
  currentLocale: Locale;
}

export default function ThemeLanguageSelector({ currentLocale }: Props) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [locale, setLocale] = useState<Locale>(() => {
    // Always initialize from localStorage first, fallback to 'en'
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-locale') as Locale;
      return stored && ['en', 'fi'].includes(stored) ? stored : 'en';
    }
    return 'en';
  });
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [currentFps, setCurrentFps] = useState(60);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const defaultTheme = prefersDark ? 'dark' : 'light';
      setTheme(defaultTheme);
      document.documentElement.setAttribute('data-theme', defaultTheme);
    }
  }, []);

  // Initialize performance mode from localStorage
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

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLocaleChange = async (newLocale: Locale) => {
    setLocale(newLocale);
    // Store locale in localStorage for persistence
    localStorage.setItem('preferred-locale', newLocale);

    // Load new translations
    const newTranslations = await getTranslations(newLocale);

    // Update HTML lang attribute
    document.documentElement.lang = newLocale;

    // Update page title
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleElement.textContent = newTranslations.page.title;
    }

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', newTranslations.page.subtitle);
    }

    // Update Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', newTranslations.page.title);
    }

    // Update Open Graph description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', newTranslations.page.subtitle);
    }

    // Update main heading
    const mainHeading = document.querySelector('h1.main-card__page-title');
    if (mainHeading) {
      mainHeading.textContent = newTranslations.page.title;
    }

    // Update subtitle
    const subtitle = document.querySelector('.main-card__subtitle');
    if (subtitle) {
      subtitle.textContent = newTranslations.page.subtitle;
    }

    // Update description
    const description = document.querySelector('.main-card__description');
    if (description) {
      description.textContent = newTranslations.header.description;
    }

    // Update feature title
    const featureTitle = document.querySelector('.main-card__feature-title');
    if (featureTitle) {
      featureTitle.textContent = newTranslations.header.featureTitle;
    }

    // Update feature description
    const featureDesc = document.querySelector('.main-card__feature-desc');
    if (featureDesc) {
      featureDesc.textContent = newTranslations.header.featureDesc;
    }

    // Update stats labels
    const releasesLabel = document.querySelector('.stat-card__label');
    if (releasesLabel && releasesLabel.textContent === 'Releases') {
      releasesLabel.textContent = newTranslations.header.stats.releases;
    }

    const starsLabel = document.querySelectorAll('.stat-card__label')[1];
    if (starsLabel && starsLabel.textContent === 'GitHub Stars') {
      starsLabel.textContent = newTranslations.header.stats.stars;
    }

    const uptimeLabel = document.querySelectorAll('.stat-card__label')[2];
    if (uptimeLabel && uptimeLabel.textContent === 'Uptime') {
      uptimeLabel.textContent = newTranslations.header.stats.uptime;
    }

    // Update navigation outline
    const outlineTitle = document.querySelector('.sticky-outline__title');
    if (outlineTitle) {
      outlineTitle.textContent = newTranslations.navigation.outline;
    }
  };

  const handlePerformanceChange = (newMode: 'auto' | 'on' | 'off') => {
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

  const getPerformanceStatusText = () => {
    if (performanceMode === 'auto') {
      return `Auto (${currentFps} FPS)`;
    }
    return performanceMode === 'on' ? 'Force On' : 'Force Off';
  };

  const getPerformanceIcon = () => {
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
    <div className="theme-language-selector">
      {/* Theme Selector */}
      <div className="selector-group">
        <label className="selector-label" aria-label="Theme selector">
          <svg className="selector-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {theme === 'dark' ? (
              <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z"/>
            ) : (
              <path d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"/>
            )}
          </svg>
        </label>
        <select
          className="selector-dropdown"
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
          aria-label="Select theme"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* Language Selector */}
      <div className="selector-group">
        <label className="selector-label" aria-label="Language selector">
          <svg className="selector-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M11,19.93c-3.94-0.49-7-3.85-7-7.93 c0-0.62,0.08-1.21,0.21-1.79L9,15v1c0,1.1,0.9,2,2,2V19.93z M17.9,17.39c-0.26-0.81-1-1.39-1.9-1.39h-1v-3c0-0.55-0.45-1-1-1H8 v-2h2c0.55,0,1-0.45,1-1V7h2c1.1,0,2-0.9,2-2v-0.41c2.93,1.19,5,4.06,5,7.41C20,14.08,19.15,15.97,17.9,17.39z"/>
          </svg>
        </label>
        <select
          className="selector-dropdown"
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value as Locale)}
          aria-label="Select language"
        >
          <option value="en">EN</option>
          <option value="fi">FI</option>
        </select>
      </div>

      {/* Performance/Animation Selector */}
      <div className="selector-group">
        <label className="selector-label" aria-label="Animation selector">
          <svg className="selector-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {performanceMode === 'auto' ? (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 20c-4.41 0-8-3.59-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zM18.31 16.9L7.1 5.69C8.45 4.63 10.15 4 12 4c4.41 0 8 3.59 8 8 0 1.85-.63 3.55-1.69 4.9z"/>
            ) : performanceMode === 'on' ? (
              <path d="M12 2l3.09 6.26L22 9l-5.91 5.74L17.18 22 12 19.27 6.82 22l1.09-7.26L2 9l6.91-.74L12 2z"/>
            ) : (
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-8h4v4h-4v-4z"/>
            )}
          </svg>
        </label>
        <select
          className="selector-dropdown"
          value={performanceMode}
          onChange={(e) => handlePerformanceChange(e.target.value as 'auto' | 'on' | 'off')}
          aria-label="Select animation mode"
          title={`Animations: ${getPerformanceStatusText()}`}
        >
          <option value="auto">Auto</option>
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
        {performanceMode === 'auto' && (
          <span className="fps-counter">{currentFps} FPS</span>
        )}
      </div>
    </div>
  );
}
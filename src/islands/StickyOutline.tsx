import { useState, useEffect, useCallback, useRef } from 'react';
import type { Release } from '../types/release';
import type { Translations } from '../i18n/utils';

// Types for navigation structure
export interface NavigationSection {
  id: 'highlights' | 'features' | 'improvements' | 'bugfixes';
  title: string;
  anchor: string;
}

export interface NavigationRelease {
  version: string;
  anchor: string;
  sections: NavigationSection[];
}

export interface StickyOutlineProps {
  releases: Release[];
  translations: Translations;
  onNavigate?: (anchor: string, releaseVersion?: string, sectionId?: string) => void;
}

interface ScrollState {
  activeRelease: string | null;
  activeSection: string | null;
  passedReleases: Set<string>;
  passedSections: Set<string>;
}

// Custom hook for intersection observer with performance optimizations
function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const targetsRef = useRef<Set<Element>>(new Set());

  const observe = useCallback((element: Element) => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(callback, {
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1],
        ...options,
      });
    }
    observerRef.current.observe(element);
    targetsRef.current.add(element);
  }, [callback, options]);

  const unobserve = useCallback((element: Element) => {
    if (observerRef.current) {
      observerRef.current.unobserve(element);
      targetsRef.current.delete(element);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      targetsRef.current.clear();
      observerRef.current = null;
    }
  }, []);

  return { observe, unobserve, disconnect };
}

// Helper function to get element top position
function getElementTop(id: string): number {
  const element = document.getElementById(id) || document.querySelector(`[data-release="${id}"], [data-section="${id}"]`);
  return element ? element.getBoundingClientRect().top + window.scrollY : Infinity;
}

// Custom hook for scroll tracking with debouncing
function useScrollTracking(releases: NavigationRelease[]) {
  const [scrollState, setScrollState] = useState<ScrollState>({
    activeRelease: null,
    activeSection: null,
    passedReleases: new Set(),
    passedSections: new Set(),
  });

  const updateTimeoutRef = useRef<number | null>(null);

  const debouncedUpdate = useCallback((newState: Partial<ScrollState>) => {
    if (updateTimeoutRef.current !== null) {
      cancelAnimationFrame(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = requestAnimationFrame(() => {
      setScrollState(prev => ({
        ...prev,
        ...newState,
      }));
    });
  }, []);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const viewportTop = 0;
    const viewportHeight = window.innerHeight;
    const centerY = viewportHeight * 0.5; // Consider items in upper 50% as "active"

    let newActiveRelease: string | null = null;
    let newActiveSection: string | null = null;
    const newPassedReleases = new Set<string>();
    const newPassedSections = new Set<string>();

    // Sort entries by their position relative to viewport
    const sortedEntries = entries
      .filter(entry => entry.target.hasAttribute('data-release') || entry.target.hasAttribute('data-section'))
      .sort((a, b) => {
        const rectA = a.boundingClientRect;
        const rectB = b.boundingClientRect;
        return rectA.top - rectB.top;
      });

    for (const entry of sortedEntries) {
      const rect = entry.boundingClientRect;
      const elementTop = rect.top;
      const elementBottom = rect.bottom;

      // Check if element has passed the viewport
      if (elementBottom < centerY) {
        if (entry.target.hasAttribute('data-release')) {
          newPassedReleases.add(entry.target.getAttribute('data-release')!);
        } else if (entry.target.hasAttribute('data-section')) {
          newPassedSections.add(entry.target.getAttribute('data-section')!);
        }
      }

      // Check if element is currently active (visible and near top of viewport)
      if (entry.isIntersecting && elementTop <= centerY && elementBottom > viewportTop) {
        if (entry.target.hasAttribute('data-release')) {
          const releaseVersion = entry.target.getAttribute('data-release')!;
          // Prioritize the release that's highest in the viewport
          if (!newActiveRelease || elementTop < getElementTop(newActiveRelease)) {
            newActiveRelease = releaseVersion;
          }
        } else if (entry.target.hasAttribute('data-section')) {
          const sectionId = entry.target.getAttribute('data-section')!;
          // Prioritize the section that's highest in the viewport
          if (!newActiveSection || elementTop < getElementTop(newActiveSection)) {
            newActiveSection = sectionId;
          }
        }
      }
    }

    debouncedUpdate({
      activeRelease: newActiveRelease,
      activeSection: newActiveSection,
      passedReleases: newPassedReleases,
      passedSections: newPassedSections,
    });
  }, [debouncedUpdate]);

  const { observe, unobserve, disconnect } = useIntersectionObserver(handleIntersection);

  // Set up observers for all release and section elements
  useEffect(() => {
    const setupObservers = () => {
      const releaseElements = document.querySelectorAll('[data-release]');
      const sectionElements = document.querySelectorAll('[data-section]');

      [...releaseElements, ...sectionElements].forEach(element => {
        observe(element);
      });
    };

    // Delay setup to ensure all elements are in DOM
    const timeoutId = setTimeout(setupObservers, 100);

    return () => {
      clearTimeout(timeoutId);
      const releaseElements = document.querySelectorAll('[data-release]');
      const sectionElements = document.querySelectorAll('[data-section]');

      [...releaseElements, ...sectionElements].forEach(element => {
        unobserve(element);
      });
    };
  }, [releases, observe, unobserve]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
      if (updateTimeoutRef.current !== null) {
        cancelAnimationFrame(updateTimeoutRef.current);
      }
    };
  }, [disconnect]);

  return scrollState;
}

export default function StickyOutline({ releases, translations, onNavigate }: StickyOutlineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Convert releases to navigation structure
  const navigationReleases: NavigationRelease[] = releases.map(release => ({
    version: release.version,
    anchor: `release-${release.version.replace(/\./g, '-')}`,
    sections: [
      { id: 'highlights' as const, title: translations.sections.highlights, anchor: `release-${release.version.replace(/\./g, '-')}-highlights` },
      { id: 'features' as const, title: translations.sections.features, anchor: `release-${release.version.replace(/\./g, '-')}-features` },
      { id: 'improvements' as const, title: translations.sections.improvements, anchor: `release-${release.version.replace(/\./g, '-')}-improvements` },
      { id: 'bugfixes' as const, title: translations.sections.bugfixes, anchor: `release-${release.version.replace(/\./g, '-')}-bugfixes` }
    ].filter(section => {
      // Only include sections that have content
      const key: keyof Pick<Release, 'highlights' | 'features' | 'improvements' | 'bugfixes'> = section.id;
      const sectionData = release[key];
      return Array.isArray(sectionData) && sectionData.length > 0;
    })
  }));

  const scrollState = useScrollTracking(navigationReleases);

  // Handle responsive breakpoints
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      setIsTablet(width > 768 && width < 1024);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
  }, []);

  // The sticky behavior is now handled by the container CSS

  // Smooth scroll navigation
  const handleNavigation = useCallback((anchor: string, releaseVersion?: string, sectionId?: string) => {
    const targetElement = document.getElementById(anchor);
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    onNavigate?.(anchor, releaseVersion, sectionId);
  }, [onNavigate]);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, anchor: string, releaseVersion?: string, sectionId?: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigation(anchor, releaseVersion, sectionId);
    }
  }, [handleNavigation]);

  // Mobile chip layout
  if (isMobile) {
    return (
      <div className="sticky-outline sticky-outline--mobile" role="navigation" aria-label={translations.navigation.outline}>
        <div className="sticky-outline__header">
          <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
          <button
            type="button"
            className="sticky-outline__toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-controls="outline-content"
          >
            <svg
              className={`sticky-outline__toggle-icon ${isCollapsed ? 'sticky-outline__toggle-icon--collapsed' : ''}`}
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M4.646 9.646a.5.5 0 0 1 .708 0L8 12.293l2.646-2.647a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>

        {!isCollapsed && (
          <div id="outline-content" className="sticky-outline__content sticky-outline__content--mobile">
            <div className="sticky-outline__chips">
              {navigationReleases.map(release => {
                const isActive = scrollState.activeRelease === release.version;
                const isPassed = scrollState.passedReleases.has(release.version);

                return (
                  <button
                    key={release.version}
                    type="button"
                    className={`sticky-outline__chip ${isActive ? 'sticky-outline__chip--active' : ''} ${isPassed ? 'sticky-outline__chip--passed' : ''}`}
                    onClick={() => handleNavigation(release.anchor, release.version)}
                    onKeyDown={(e) => handleKeyDown(e, release.anchor, release.version)}
                    aria-label={`Navigate to version ${release.version}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {release.version}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Tablet stacked layout
  if (isTablet) {
    return (
      <div className="sticky-outline sticky-outline--tablet" role="navigation" aria-label={translations.navigation.outline}>
        <div className="sticky-outline__header">
          <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
        </div>

        <div className="sticky-outline__content sticky-outline__content--tablet">
          <nav className="sticky-outline__nav">
            {navigationReleases.map(release => {
              const isActiveRelease = scrollState.activeRelease === release.version;
              const isPassedRelease = scrollState.passedReleases.has(release.version);

              return (
                <div key={release.version} className="sticky-outline__release-group">
                  <button
                    type="button"
                    className={`sticky-outline__release ${isActiveRelease ? 'sticky-outline__release--active' : ''} ${isPassedRelease ? 'sticky-outline__release--passed' : ''}`}
                    onClick={() => handleNavigation(release.anchor, release.version)}
                    onKeyDown={(e) => handleKeyDown(e, release.anchor, release.version)}
                    aria-label={`Navigate to version ${release.version}`}
                    aria-current={isActiveRelease ? 'true' : undefined}
                  >
                    {release.version}
                  </button>

                  <div className="sticky-outline__sections">
                    {release.sections.map(section => {
                      const isActiveSection = scrollState.activeSection === section.anchor;
                      const isPassedSection = scrollState.passedSections.has(section.anchor);

                      return (
                        <button
                          key={section.anchor}
                          type="button"
                          className={`sticky-outline__section ${isActiveSection ? 'sticky-outline__section--active' : ''} ${isPassedSection ? 'sticky-outline__section--passed' : ''}`}
                          onClick={() => handleNavigation(section.anchor, release.version, section.id)}
                          onKeyDown={(e) => handleKeyDown(e, section.anchor, release.version, section.id)}
                          aria-label={`Navigate to ${section.title} in version ${release.version}`}
                          aria-current={isActiveSection ? 'true' : undefined}
                        >
                          {section.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    );
  }

  // Desktop sticky layout
  return (
    <div className="sticky-outline sticky-outline--desktop glass" role="navigation" aria-label={translations.navigation.outline}>
      <div className="sticky-outline__header">
        <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
      </div>

      <div className="sticky-outline__content">
        <nav className="sticky-outline__nav">
          {navigationReleases.map(release => {
            const isActiveRelease = scrollState.activeRelease === release.version;
            const isPassedRelease = scrollState.passedReleases.has(release.version);

            return (
              <div key={release.version} className="sticky-outline__release-group">
                <button
                  type="button"
                  className={`sticky-outline__release ${isActiveRelease ? 'sticky-outline__release--active' : ''} ${isPassedRelease ? 'sticky-outline__release--passed' : ''}`}
                  onClick={() => handleNavigation(release.anchor, release.version)}
                  onKeyDown={(e) => handleKeyDown(e, release.anchor, release.version)}
                  aria-label={`Navigate to version ${release.version}`}
                  aria-current={isActiveRelease ? 'true' : undefined}
                >
                  <span className="sticky-outline__release-version">v{release.version}</span>
                </button>

                {release.sections.length > 0 && (
                  <div className="sticky-outline__sections">
                    {release.sections.map(section => {
                      const isActiveSection = scrollState.activeSection === section.anchor;
                      const isPassedSection = scrollState.passedSections.has(section.anchor);

                      return (
                        <button
                          key={section.anchor}
                          type="button"
                          className={`sticky-outline__section ${isActiveSection ? 'sticky-outline__section--active' : ''} ${isPassedSection ? 'sticky-outline__section--passed' : ''}`}
                          onClick={() => handleNavigation(section.anchor, release.version, section.id)}
                          onKeyDown={(e) => handleKeyDown(e, section.anchor, release.version, section.id)}
                          aria-label={`Navigate to ${section.title} in version ${release.version}`}
                          aria-current={isActiveSection ? 'true' : undefined}
                        >
                          <span className="sticky-outline__section-title">{section.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
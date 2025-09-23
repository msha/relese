import { useState, useEffect, useCallback, useRef } from 'react';
import type { Release, FilterState, ReleaseType, DateRange } from '../types/release';
import type { Translations } from '../i18n/utils';
import { getNestedTranslation } from '../i18n/utils';

// Types for navigation structure
export interface NavigationSection {
  id: string;
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
  availableVersions: string[];
  onNavigate?: (anchor: string, releaseVersion?: string, sectionId?: string) => void;
  onFiltersChange?: (filters: FilterState) => void;
}

interface ScrollState {
  activeRelease: string | null;
  activeSection: string | null;
  passedReleases: Set<string>;
  passedSections: Set<string>;
}

const RELEASE_TYPES: ReleaseType[] = ['initial', 'major', 'minor', 'patch', 'hotfix'];
const DATE_RANGES: DateRange[] = ['thisYear', 'lastYear', 'older'];

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
        // Narrower active window to reduce rapid toggling near boundaries
        rootMargin: '-35% 0px -55% 0px',
        // Single threshold to avoid repeated callbacks while ratio changes
        threshold: 0,
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
      // Preserve previous values when incoming fields are null/undefined
      setScrollState(prev => ({
        activeRelease: (newState.activeRelease ?? prev.activeRelease) as string | null,
        activeSection: (newState.activeSection ?? prev.activeSection) as string | null,
        passedReleases: (newState.passedReleases ?? prev.passedReleases) as Set<string>,
        passedSections: (newState.passedSections ?? prev.passedSections) as Set<string>,
      }));
    });
  }, []);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const viewportTop = 0;
    const viewportHeight = window.innerHeight;
    const centerY = viewportHeight * 0.5; // Consider items in upper 50% as "active"

    let newActiveRelease: string | null = null;
    let newActiveSection: string | null = null;
    // Track best (smallest) top position in viewport for active selection
    let bestReleaseTop = Number.POSITIVE_INFINITY;
    let bestSectionTop = Number.POSITIVE_INFINITY;
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
          // Prioritize the release that's highest in the viewport (smallest top)
          if (elementTop < bestReleaseTop) {
            bestReleaseTop = elementTop;
            newActiveRelease = releaseVersion;
          }
        } else if (entry.target.hasAttribute('data-section')) {
          const sectionId = entry.target.getAttribute('data-section')!;
          // Prioritize the section that's highest in the viewport (smallest top)
          if (elementTop < bestSectionTop) {
            bestSectionTop = elementTop;
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

function humanize(key: string): string {
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StickyOutline({ releases, translations, availableVersions, onNavigate, onFiltersChange }: StickyOutlineProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});

  // Convert releases to navigation structure
  const navigationReleases: NavigationRelease[] = releases.map(release => {
    const sections: NavigationSection[] = Object.keys(release.content)
      .map((key) => {
        const t = getNestedTranslation(translations, `sections.${key}`);
        const title = t === `sections.${key}` ? humanize(key) : t;
        return {
          id: key,
          title,
          anchor: `release-${release.version.replace(/\./g, '-')}-${key}`
        };
      })
      .filter(section => Array.isArray(release.content[section.id]) && release.content[section.id].length > 0);

    return {
      version: release.version,
      anchor: `release-${release.version.replace(/\./g, '-')}`,
      sections
    };
  });

  const scrollState = useScrollTracking(navigationReleases);

  // Filter handling functions
  const handleFilterChange = useCallback((key: keyof FilterState, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  // Sync URL params with filter state and apply filtering
  useEffect(() => {
    const updateURL = () => {
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);

      // Clear existing filter params
      params.delete('version');
      params.delete('type');
      params.delete('date');

      // Add current filter params
      if (filters.version) {
        params.set('version', filters.version);
      }
      if (filters.type) {
        params.set('type', filters.type);
      }
      if (filters.dateRange) {
        params.set('date', filters.dateRange);
      }

      // Update URL without page reload
      const newUrl = `${url.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    };

    const applyFilters = () => {
      // Ensure DOM is ready by waiting for release cards to exist
      const checkAndApplyFilters = () => {
        const releaseCards = document.querySelectorAll('[data-release-version]');

        // If no cards found yet, wait a bit more
        if (releaseCards.length === 0) {
          setTimeout(checkAndApplyFilters, 100);
          return;
        }

        let visibleCount = 0;

        releaseCards.forEach((card) => {
          const cardElement = card as HTMLElement;
          const version = cardElement.dataset.releaseVersion;
          const type = cardElement.dataset.releaseType as ReleaseType;
          const dateStr = cardElement.dataset.releaseDate;

          let shouldShow = true;

          // Version filter
          if (filters.version && version !== filters.version) {
            shouldShow = false;
          }

          // Type filter
          if (filters.type && type !== filters.type) {
            shouldShow = false;
          }

          // Date filter
          if (filters.dateRange && dateStr) {
            const releaseDate = new Date(dateStr);
            const currentYear = new Date().getFullYear();
            const releaseYear = releaseDate.getFullYear();

            switch (filters.dateRange) {
              case 'thisYear':
                if (releaseYear !== currentYear) shouldShow = false;
                break;
              case 'lastYear':
                if (releaseYear !== currentYear - 1) shouldShow = false;
                break;
              case 'older':
                if (releaseYear >= currentYear - 1) shouldShow = false;
                break;
            }
          }

          if (shouldShow) {
            cardElement.style.display = '';
            visibleCount++;
          } else {
            cardElement.style.display = 'none';
          }
        });

        // Dispatch filter change event
        const event = new CustomEvent('filtersChanged', {
          detail: { hasResults: visibleCount > 0, visibleCount }
        });
        document.dispatchEvent(event);
      };

      // Start checking immediately
      checkAndApplyFilters();
    };

    updateURL();
    applyFilters();
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  // Read URL params on mount and apply initial filtering
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    const urlFilters: FilterState = {};

    const version = params.get('version');
    const type = params.get('type') as ReleaseType;
    const date = params.get('date') as DateRange;

    if (version && availableVersions.includes(version)) {
      urlFilters.version = version;
    }
    if (type && RELEASE_TYPES.includes(type)) {
      urlFilters.type = type;
    }
    if (date && DATE_RANGES.includes(date)) {
      urlFilters.dateRange = date;
    }

    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }));
    } else {
      // Apply default filtering (show all) on mount
      const showAllCards = () => {
        const releaseCards = document.querySelectorAll('[data-release-version]');
        if (releaseCards.length === 0) {
          setTimeout(showAllCards, 100);
          return;
        }

        releaseCards.forEach((card) => {
          const cardElement = card as HTMLElement;
          cardElement.style.display = '';
        });

        const event = new CustomEvent('filtersChanged', {
          detail: { hasResults: releaseCards.length > 0, visibleCount: releaseCards.length }
        });
        document.dispatchEvent(event);
      };

      showAllCards();
    }
  }, [availableVersions]);

  // Handle clear filters event
  useEffect(() => {
    const handleClearFilters = () => {
      setFilters({});
    };

    document.addEventListener('clearFilters', handleClearFilters);
    
    return () => {
      document.removeEventListener('clearFilters', handleClearFilters);
    };
  }, []);

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

  // Inline filter section component
  const renderInlineFilters = () => {
    if (!isFiltersExpanded) return null;

    return (
      <div className="sticky-outline__filters">
        {/* Version Filter */}
        <div className="filter-group">
          <label htmlFor="version-select" className="filter-label">
            {translations.filters.version}
          </label>
          <select
            id="version-select"
            className="filter-select"
            value={filters.version || ''}
            onChange={(e) => handleFilterChange('version', e.target.value || undefined)}
          >
            <option value="">{translations.filters.version}</option>
            {availableVersions.map(version => (
              <option key={version} value={version}>
                {version}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="filter-group">
          <label htmlFor="date-select" className="filter-label">
            {translations.filters.dateRange}
          </label>
          <select
            id="date-select"
            className="filter-select"
            value={filters.dateRange || ''}
            onChange={(e) => handleFilterChange('dateRange', e.target.value || undefined)}
          >
            <option value="">{translations.filters.dateRange}</option>
            {DATE_RANGES.map(range => (
              <option key={range} value={range}>
                {translations.filters[range]}
              </option>
            ))}
          </select>
        </div>

        {/* Release Type Filter */}
        <div className="filter-group">
          <label htmlFor="type-select" className="filter-label">
            {translations.filters.type}
          </label>
          <select
            id="type-select"
            className="filter-select"
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
          >
            <option value="">{translations.filters.type}</option>
            {RELEASE_TYPES.map(type => (
              <option key={type} value={type}>
                {translations.releaseTypes[type]}
              </option>
            ))}
          </select>
        </div>

        {/* Clear All Button */}
        <div className="filter-group">
          <button
            type="button"
            className="filter-clear-btn"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            {translations.filters.clearAll}
          </button>
        </div>
      </div>
    );
  };

  // Mobile chip layout
  if (isMobile) {
    return (
      <>
        <div className="sticky-outline sticky-outline--mobile" role="navigation" aria-label={translations.navigation.outline}>
          <div className="sticky-outline__header">
            <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
            <div className="sticky-outline__actions">
              <button
                type="button"
                className="sticky-outline__filters-btn"
                onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                aria-expanded={isFiltersExpanded}
                aria-label="Toggle filters"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                </svg>
                Filters
                {hasActiveFilters && <span className="filter-badge">{Object.values(filters).filter(v => v).length}</span>}
              </button>
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

        {/* Inline Filters Section */}
        {renderInlineFilters()}
        </div>
      </>
    );
  }

  // Tablet stacked layout
  if (isTablet) {
    return (
      <>
        <div className="sticky-outline sticky-outline--tablet" role="navigation" aria-label={translations.navigation.outline}>
          <div className="sticky-outline__header">
            <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
            <button
              type="button"
              className="sticky-outline__filters-btn"
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              aria-expanded={isFiltersExpanded}
              aria-label="Toggle filters"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
              </svg>
              Filters
              {hasActiveFilters && <span className="filter-badge">{Object.values(filters).filter(v => v).length}</span>}
            </button>
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

        {/* Inline Filters Section */}
        {renderInlineFilters()}
        </div>
      </>
    );
  }

  // Desktop sticky layout
  return (
    <>
      <div className="sticky-outline sticky-outline--desktop glass" role="navigation" aria-label={translations.navigation.outline}>
        <div className="sticky-outline__header">
          <h2 className="sticky-outline__title">{translations.navigation.outline}</h2>
          <button
            type="button"
            className="sticky-outline__filters-btn"
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            aria-expanded={isFiltersExpanded}
            aria-label="Toggle filters"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
            </svg>
            Filters
            {hasActiveFilters && <span className="filter-badge">{Object.values(filters).filter(v => v).length}</span>}
          </button>
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

      {/* Inline Filters Section */}
      {renderInlineFilters()}
      </div>
    </>
  );
}
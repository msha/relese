import { useState, useEffect, useCallback } from 'react';
import type { FilterState, ReleaseType, DateRange } from '../types/release';
import type { Translations } from '../i18n/utils';

interface FilterPanelProps {
  availableVersions: string[];
  initialFilters?: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  translations: Translations;
  isLoading?: boolean;
}

interface FilterChip {
  key: string;
  label: string;
  value: string;
}

const RELEASE_TYPES: ReleaseType[] = ['initial', 'major', 'minor', 'patch', 'hotfix'];
const DATE_RANGES: DateRange[] = ['thisYear', 'lastYear', 'older'];

export default function FilterPanel({
  availableVersions,
  initialFilters = {},
  onFiltersChange,
  translations,
  isLoading = false
}: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [isMobile, setIsMobile] = useState(false);

  // Sync URL params with filter state
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

    updateURL();
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // Read URL params on mount
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
    }
  }, [availableVersions]);

  // Handle mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Generate filter chips for mobile display
  const getFilterChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];

    if (filters.version) {
      chips.push({
        key: 'version',
        label: translations.filters.version,
        value: filters.version
      });
    }

    if (filters.type) {
      chips.push({
        key: 'type',
        label: translations.filters.type,
        value: translations.releaseTypes[filters.type]
      });
    }

    if (filters.dateRange) {
      chips.push({
        key: 'dateRange',
        label: translations.filters.dateRange,
        value: translations.filters[filters.dateRange]
      });
    }

    return chips;
  };

  const removeChip = (key: string) => {
    handleFilterChange(key as keyof FilterState, undefined);
  };

  const handleChipKeyDown = (event: React.KeyboardEvent, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      removeChip(key);
    }
  };

  return (
    <div className="filter-panel" data-loading={isLoading}>
      {/* Desktop Filter Controls */}
      <div className="filter-controls">
        <div className="filter-grid">
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
              disabled={isLoading}
              aria-describedby="version-help"
            >
              <option value="">{translations.filters.version}</option>
              {availableVersions.map(version => (
                <option key={version} value={version}>
                  {version}
                </option>
              ))}
            </select>
            <span id="version-help" className="sr-only">
              Filter releases by version number
            </span>
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
              disabled={isLoading}
              aria-describedby="date-help"
            >
              <option value="">{translations.filters.dateRange}</option>
              {DATE_RANGES.map(range => (
                <option key={range} value={range}>
                  {translations.filters[range]}
                </option>
              ))}
            </select>
            <span id="date-help" className="sr-only">
              Filter releases by date range
            </span>
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
              disabled={isLoading}
              aria-describedby="type-help"
            >
              <option value="">{translations.filters.type}</option>
              {RELEASE_TYPES.map(type => (
                <option key={type} value={type}>
                  {translations.releaseTypes[type]}
                </option>
              ))}
            </select>
            <span id="type-help" className="sr-only">
              Filter releases by type (major, minor, patch, etc.)
            </span>
          </div>

          {/* Clear All Button */}
          <div className="filter-group">
            <button
              type="button"
              className="filter-clear-btn"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters || isLoading}
              aria-describedby="clear-help"
            >
              {translations.filters.clearAll}
            </button>
            <span id="clear-help" className="sr-only">
              Remove all active filters
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Filter Chips */}
      {isMobile && getFilterChips().length > 0 && (
        <div className="filter-chips" role="region" aria-label="Active filters">
          <div className="filter-chips-container">
            {getFilterChips().map(chip => (
              <button
                key={chip.key}
                type="button"
                className="filter-chip"
                onClick={() => removeChip(chip.key)}
                onKeyDown={(e) => handleChipKeyDown(e, chip.key)}
                aria-label={`Remove ${chip.label}: ${chip.value} filter`}
              >
                <span className="filter-chip-label">{chip.label}:</span>
                <span className="filter-chip-value">{chip.value}</span>
                <svg
                  className="filter-chip-remove"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
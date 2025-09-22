import type { Release, FilterState, DateRange } from '../types/release.js';
import { ReleasesArraySchema } from './validation.js';

export async function loadReleases(): Promise<Release[]> {
  try {
    const response = await import('./releases.json');
    const data = response.default;

    // Validate the data
    const validatedReleases = ReleasesArraySchema.parse(data);

    // Sort by date (newest first) and then by semantic version
    return validatedReleases.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;

      // Secondary sort by version (semantic)
      return compareVersions(b.version, a.version);
    });
  } catch (error) {
    console.error('Failed to load releases:', error);
    throw new Error('Failed to load release data');
  }
}

export function filterReleases(releases: Release[], filters: FilterState): Release[] {
  return releases.filter((release) => {
    // Version filter
    if (filters.version && release.version !== filters.version) {
      return false;
    }

    // Date range filter
    if (filters.dateRange && !isInDateRange(release.date, filters.dateRange)) {
      return false;
    }

    // Type filter
    if (filters.type && release.type !== filters.type) {
      return false;
    }

    return true;
  });
}

export function getUniqueVersions(releases: Release[]): string[] {
  return [...new Set(releases.map((r) => r.version))];
}

export function getCurrentVersion(releases: Release[]): Release | null {
  return releases.length > 0 ? releases[0] : null;
}

export function generateReleaseId(version: string): string {
  return `release-${version.replace(/\./g, '-')}`;
}

export function generateSectionId(version: string, section: string): string {
  return `release-${version.replace(/\./g, '-')}-${section}`;
}

function isInDateRange(dateString: string, range: DateRange): boolean {
  const releaseDate = new Date(dateString);
  const now = new Date();
  const currentYear = now.getFullYear();
  const releaseYear = releaseDate.getFullYear();

  switch (range) {
    case 'thisYear':
      return releaseYear === currentYear;
    case 'lastYear':
      return releaseYear === currentYear - 1;
    case 'older':
      return releaseYear < currentYear - 1;
    default:
      return true;
  }
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }

  return 0;
}
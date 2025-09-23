import type { Release, FilterState, DateRange } from '../types/release.js';
import { ReleasesArraySchema } from './validation.js';

export async function loadReleases(): Promise<Release[]> {
  try {
    const response = await import('./releases.json');
    const rawModule: unknown = response as unknown;
    const rawData: unknown = (rawModule as any)?.default ?? rawModule;

    // Try direct validation first (new format with content)
    const direct = ReleasesArraySchema.safeParse(rawData);
    if (direct.success) {
      return sortReleases(direct.data);
    }

    // Fallback: transform legacy format (top-level highlights/features/improvements/bugfixes) to content
    const legacyArray = Array.isArray(rawData) ? rawData as any[] : [];
    const transformed = legacyArray.map((item) => {
      const { version, date, type } = item ?? {};
      const content: Record<string, string[]> = {};
      if (Array.isArray(item?.highlights)) content.highlights = item.highlights;
      if (Array.isArray(item?.features)) content.features = item.features;
      if (Array.isArray(item?.improvements)) content.improvements = item.improvements;
      if (Array.isArray(item?.bugfixes)) content.bugfixes = item.bugfixes;
      // Include any additional string[] fields under content if present
      for (const [key, value] of Object.entries(item ?? {})) {
        if (['version', 'date', 'type', 'highlights', 'features', 'improvements', 'bugfixes', 'content'].includes(key)) continue;
        if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
          content[key] = value as string[];
        }
      }
      // Prefer existing content if provided
      const finalContent = typeof item?.content === 'object' && item?.content !== null
        ? item.content
        : content;
      return { version, date, type, content: finalContent };
    });

    const transformedResult = ReleasesArraySchema.safeParse(transformed);
    if (transformedResult.success) {
      return sortReleases(transformedResult.data);
    }

    // If still failing, throw detailed error
    const issues = JSON.stringify(direct.error?.issues ?? transformedResult.error?.issues ?? [], null, 2);
    throw new Error(`Release data validation failed. Issues: ${issues}`);
  } catch (error) {
    console.error('Failed to load releases:', error);
    throw new Error('Failed to load release data');
  }
}

function sortReleases(releases: Release[]): Release[] {
  // Sort by date (newest first) and then by semantic version
  return releases.sort((a, b) => {
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateCompare !== 0) return dateCompare;

    // Secondary sort by version (semantic)
    return compareVersions(b.version, a.version);
  });
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
export type ReleaseType = 'initial' | 'major' | 'minor' | 'patch' | 'hotfix';

export type DateRange = 'thisYear' | 'lastYear' | 'older';

export interface Release {
  version: string;
  date: string; // ISO string
  type: ReleaseType;
  highlights: string[];
  features: string[];
  improvements: string[];
  bugfixes: string[];
}

export interface FilterState {
  version?: string;
  dateRange?: DateRange;
  type?: ReleaseType;
}

export interface ReleaseSection {
  id: 'highlights' | 'features' | 'improvements' | 'bugfixes';
  items: string[];
}
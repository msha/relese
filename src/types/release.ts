export type ReleaseType = 'initial' | 'major' | 'minor' | 'patch' | 'hotfix';

export type DateRange = 'thisYear' | 'lastYear' | 'older';

export interface ReleaseContentSections {
  [sectionKey: string]: string[];
}

export interface Release {
  version: string;
  date: string; // ISO string
  type: ReleaseType;
  content: ReleaseContentSections;
}

export interface FilterState {
  version?: string;
  dateRange?: DateRange;
  type?: ReleaseType;
}

export interface ReleaseSection {
  id: string;
  items: string[];
}
import type { JSONValue } from 'astro/types';
import configData from '../config.json';

export interface CompanyConfig {
  name: string;
  icon: string;
  tagline: string;
  description: string;
}

export interface FeatureConfig {
  title: string;
  description: string;
  icon: string;
}

export interface MiscInfoConfig {
  title: string;
  desc: string;
  link?: string;
  icon: string;
  style?: {
    gradient?: [string, string];
    background?: string;
    color?: string;
  };
}

export interface AppConfig {
  company: CompanyConfig;
  features: FeatureConfig[];
  miscInfo: MiscInfoConfig[];
}

/**
 * Load application configuration from config.json
 */
export function getConfig(): AppConfig {
  return configData as AppConfig;
}

/**
 * Get dynamic version from latest release
 */
export function getVersionFromReleases(releases: any[]): string {
  if (!releases || releases.length === 0) {
    return 'v1.0.0';
  }

  // Get the latest release (first in the array)
  const latestRelease = releases[0];
  return latestRelease.version || 'v1.0.0';
}

/**
 * Generate CSS custom properties for a misc info item's styling
 */
export function generateMiscInfoStyle(item: MiscInfoConfig): string {
  if (!item.style) return '';

  const styles: string[] = [];

  if (item.style.gradient && item.style.gradient.length === 2) {
    const [start, end] = item.style.gradient;
    // Make gradients more subtle by reducing opacity
    styles.push(`--card-gradient: linear-gradient(135deg, ${start}20, rgba(25, 27, 43, 0.6) 30%, ${end}30)`);
  }

  if (item.style.background) {
    styles.push(`--card-background: ${item.style.background}`);
  }

  if (item.style.color) {
    styles.push(`--card-color: ${item.style.color}`);
  }

  return styles.join('; ');
}

/**
 * Validate that config has required fields
 */
export function validateConfig(config: unknown): config is AppConfig {
  if (!config || typeof config !== 'object') return false;

  const cfg = config as any;

  // Check company info
  if (!cfg.company || typeof cfg.company !== 'object') return false;
  if (!cfg.company.name || !cfg.company.icon || !cfg.company.tagline || !cfg.company.description) {
    return false;
  }

  // Check features array
  if (!Array.isArray(cfg.features)) return false;
  for (const feature of cfg.features) {
    if (!feature.title || !feature.description || !feature.icon) return false;
  }

  // Check miscInfo array
  if (!Array.isArray(cfg.miscInfo)) return false;
  for (const item of cfg.miscInfo) {
    if (!item.title || !item.desc || !item.icon) return false;
  }

  return true;
}
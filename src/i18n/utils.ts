export type Locale = 'en' | 'fi';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES: Locale[] = ['en', 'fi'];

// Removed unused interface

export interface Translations {
  page: {
    title: string;
    subtitle: string;
  };
  navigation: {
    skipToContent: string;
    outline: string;
  };
  filters: {
    version: string;
    dateRange: string;
    type: string;
    clearAll: string;
    thisYear: string;
    lastYear: string;
    older: string;
  };
  releaseTypes: {
    initial: string;
    major: string;
    minor: string;
    patch: string;
    hotfix: string;
  };
  sections: {
    highlights: string;
    features: string;
    improvements: string;
    bugfixes: string;
  };
  states: {
    loading: string;
    error: string;
    retry: string;
    empty: string;
    emptyDescription: string;
    support: string;
  };
  currentVersion: {
    latest: string;
    releasedOn: string;
  };
}

const translations: Record<Locale, Translations> = {
  en: {} as Translations,
  fi: {} as Translations,
};

export async function getTranslations(locale: Locale = DEFAULT_LOCALE): Promise<Translations> {
  if (!translations[locale] || Object.keys(translations[locale]).length === 0) {
    let translationModule;

    switch (locale) {
      case 'en':
        translationModule = await import('./en.json');
        break;
      case 'fi':
        translationModule = await import('./fi.json');
        break;
      default:
        translationModule = await import('./en.json');
        break;
    }

    translations[locale] = translationModule.default;
  }
  return translations[locale];
}

export function getNestedTranslation(
  translations: Translations,
  key: string
): string {
  const keys = key.split('.');
  let result: unknown = translations;

  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key; // Return the key if translation not found
    }
  }

  return typeof result === 'string' ? result : key;
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'fi' ? 'fi-FI' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
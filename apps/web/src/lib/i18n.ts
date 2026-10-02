import en from '@/locales/en.json';
import ml from '@/locales/ml.json';

export type Locale = 'en' | 'ml';
const DICTS = { en, ml } as const;

export type Dict = typeof en;

export function getDict(locale: Locale): Dict {
  return DICTS[locale] ?? en;
}

/** Resolve a dotted key like "checkout.payNow" from the dictionary. */
export function t(dict: Dict, key: string): string {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict) as string ?? key;
}

/** Pick a localized field: prefers the *_ml variant when locale is ml. */
export function localized<T extends Record<string, unknown>>(obj: T, field: string, locale: Locale): string {
  if (locale === 'ml') {
    const mlVal = obj[`${field}Ml`];
    if (typeof mlVal === 'string' && mlVal) return mlVal;
  }
  return (obj[field] as string) ?? '';
}

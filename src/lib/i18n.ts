import 'server-only';
import { cookies, headers } from 'next/headers';
import { translations, type Language } from './translations';
import { portalTranslations } from './translations-portal';

/**
 * Server-side language resolution.
 *
 * The language used to live only in localStorage, read in an effect. That had
 * two consequences: every page flashed English before switching, and Server
 * Components — which is what every page showing money is — could not read it at
 * all, so there was no way to render Swahili on the server.
 *
 * A cookie is readable in both places, so the first paint is already correct.
 */

export const LOCALE_COOKIE = 'tsa_lang';

/**
 * Swahili is the default.
 *
 * The constitution requires association business to be conducted in Swahili and
 * most members are older Tanzanians, so English is the opt-in.
 */
export const DEFAULT_LANGUAGE: Language = 'sw';

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'sw';
}

/** The viewer's language: their saved choice, else their browser, else Swahili. */
export async function getLocale(): Promise<Language> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLanguage(saved)) return saved;

  const accept = (await headers()).get('accept-language')?.toLowerCase() ?? '';
  return accept.startsWith('en') ? 'en' : DEFAULT_LANGUAGE;
}

/** The translation dictionary for this request. */
export async function getTranslations() {
  return translations[await getLocale()];
}

/** Strings for the portal, claims, payments and officers' tools. */
export async function getPortalStrings() {
  return portalTranslations[await getLocale()];
}

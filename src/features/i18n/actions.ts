'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE } from '@/lib/i18n';

/**
 * Persist the viewer's language choice.
 *
 * Not httpOnly: the client provider reads it to stay in step after navigation
 * without a round trip. It carries no secret — only "en" or "sw".
 */
export async function setLocale(language: 'en' | 'sw') {
  if (language !== 'en' && language !== 'sw') return;

  (await cookies()).set(LOCALE_COOKIE, language, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  });
}

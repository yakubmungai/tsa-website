'use client';

import { useLanguage } from '@/components/language-context';
import { portalTranslations } from '@/lib/translations-portal';

/** Portal strings in the viewer's language, for client components. */
export function usePortalStrings() {
  const { language } = useLanguage();
  return portalTranslations[language];
}

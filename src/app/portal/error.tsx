'use client';

import { useEffect } from 'react';
import { ErrorPanel } from '@/components/portal/error-panel';

export default function PortalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[portal error]', error.digest, error);
  }, [error]);
  return <ErrorPanel kind="error" home="/portal" retry={retry} digest={error.digest} />;
}

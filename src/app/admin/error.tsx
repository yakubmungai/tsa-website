'use client';

import { useEffect } from 'react';
import { ErrorPanel } from '@/components/portal/error-panel';

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error('[admin error]', error.digest, error);
  }, [error]);
  return <ErrorPanel kind="error" home="/admin" retry={retry} digest={error.digest} />;
}

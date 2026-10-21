import { ErrorPanel } from '@/components/portal/error-panel';

export default function AdminNotFound() {
  return <ErrorPanel kind="notFound" home="/admin" />;
}

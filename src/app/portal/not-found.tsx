import { ErrorPanel } from '@/components/portal/error-panel';

export default function PortalNotFound() {
  return <ErrorPanel kind="notFound" home="/portal" />;
}

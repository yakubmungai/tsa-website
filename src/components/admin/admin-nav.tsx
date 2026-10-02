'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarCheck,
  FileText,
  FlaskConical,
  HandHeart,
  MessageCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  today: CalendarCheck,
  claims: HandHeart,
  payments: Wallet,
  members: Users,
  forms: FileText,
  broadcast: MessageCircle,
  demo: FlaskConical,
} as const;

export interface AdminTab {
  key: keyof typeof ICONS;
  href: string;
  label: string;
  count?: number;
}

/**
 * The officers' tabs. Lives in the admin layout, so it stays on screen while
 * pages change; the active tab follows the URL. Scrolls sideways on a phone
 * rather than wrapping into a wall of buttons.
 */
export function AdminNav({ tabs, label }: { tabs: AdminTab[]; label: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = ICONS[tab.key];
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {tab.label}
                {tab.count ? (
                  <span
                    className={cn(
                      'min-w-6 rounded-full px-2 py-0.5 text-center text-sm font-bold',
                      active ? 'bg-primary-foreground/20' : 'bg-warning/15 text-warning'
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

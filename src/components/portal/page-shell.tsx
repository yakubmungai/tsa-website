import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { cn } from '@/lib/utils';

/**
 * The frame every portal and admin page sits in: the site's own navbar and
 * footer, on the site's background, so signing in does not feel like leaving
 * tansha.org for a different product.
 */
export function PageShell({
  children,
  width = 'wide',
  className,
}: {
  children: React.ReactNode;
  width?: 'narrow' | 'wide';
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main
        className={cn(
          'mx-auto w-full flex-grow px-4 pb-16 pt-28 sm:px-6',
          width === 'narrow' ? 'max-w-2xl' : 'max-w-6xl',
          className
        )}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

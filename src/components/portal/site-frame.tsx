import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

/**
 * The site's navbar and footer around a section, rendered by the section's
 * layout rather than by each page.
 *
 * Layouts persist across navigation, so moving between portal or admin pages
 * swaps only the content: the frame stays on screen and a loading skeleton
 * appears the instant a link is tapped, instead of a blank wait.
 */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}

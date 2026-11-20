import Link from "next/link";
import { BRAND } from "@/lib/site";

// One header for every page. Before this existed each page hand-rolled its own
// back-link, which is how the board ended up unreachable from the homepage.
//
// Two items on purpose. "Where to look" is the front door, so the logo covers it;
// "Destinations" pointed at a single country hub that 404s below three live offers;
// "Find a trip" is the superseded V0 funnel. Those routes stay live — they are just
// not promises the header should make yet.
const link =
  "whitespace-nowrap text-sm text-muted-foreground hover:text-foreground transition-colors";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold">
          {BRAND}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
          <Link href="/deals" className={link}>
            Offers
          </Link>
          <Link href="/blog" className={link}>
            Guides
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-(--container-page) flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-subtle">
        <p>
          {BRAND} — verified package holiday offers. You book directly with the
          tour operator.
        </p>
        <nav className="flex items-center gap-4">
          <Link href="/deals" className="hover:text-foreground">
            Offers
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Guides
          </Link>
        </nav>
      </div>
    </footer>
  );
}

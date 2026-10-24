import Link from "next/link";
import { BRAND } from "@/lib/site";

// One header for every page. Before this existed each page hand-rolled its own
// back-link, which is how the board ended up unreachable from the homepage.

const link = "text-sm text-muted-foreground hover:text-foreground transition-colors";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-(--container-page) items-center justify-between gap-6 px-4 py-3">
        <Link href="/" className="font-display text-lg font-extrabold">
          {BRAND}
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/deals" className={link}>
            Offers
          </Link>
          <Link href="/holidays/spain" className={link}>
            Destinations
          </Link>
          <Link href="/anfrage" className={link}>
            Find a trip
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
          <Link href="/anfrage" className="hover:text-foreground">
            Find a trip
          </Link>
        </nav>
      </div>
    </footer>
  );
}

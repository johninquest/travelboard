import Link from "next/link";
import { FindForm, BeatForm } from "@/components/forms";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-(--container-page) px-4 pt-16 pb-12">
        <p className="text-sm text-subtle mb-3">
          AI can help you explore. We help you decide.
        </p>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold max-w-[22ch]">
          Tell us your budget. We&apos;ll tell you which holiday to book.
        </h1>
        <p className="text-base text-muted-foreground mt-4 max-w-[65ch]">
          Not a search engine with 10,000 results. Three to five complete trips,
          each with a price, a reason, and a link — verified before we recommend it.
        </p>
      </section>

      <section className="bg-surface-warm border-y border-border">
        <div className="mx-auto max-w-(--container-page) px-4 py-12 grid md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-bold">
              Can I beat this holiday?
            </h2>
            <p className="text-sm text-muted-foreground">
              Found a package deal? Paste it here. We check whether a better
              combination exists — cheaper, or same price and clearly better.
            </p>
            <BeatForm />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-bold">Find me a holiday</h2>
            <p className="text-sm text-muted-foreground">
              Give us your constraints. We search every viable flight + hotel
              combination and return only the ones worth booking.
            </p>
            <FindForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-4 py-12">
        <h2 className="text-lg font-semibold mb-4">How it works</h2>
        <ol className="grid md:grid-cols-3 gap-6 text-sm text-muted-foreground list-none">
          <li>
            <strong className="text-foreground">1 · You give constraints.</strong>{" "}
            Departure, dates, budget. That&apos;s it.
          </li>
          <li>
            <strong className="text-foreground">2 · We verify.</strong> Real
            flights, real hotels, real prices — checked today, not estimated.
          </li>
          <li>
            <strong className="text-foreground">3 · You decide.</strong> 3–5
            trips, ranked, each with a stated reason. Book with one click.
          </li>
        </ol>
        <p className="text-xs text-subtle mt-8">
          No account needed. Your result page is a private link:{" "}
          <Link href="/r/pending" className="text-primary underline">
            /r/your-token
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

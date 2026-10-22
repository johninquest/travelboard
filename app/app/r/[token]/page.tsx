import Link from "next/link";
import { notFound } from "next/navigation";
import { pbPublic } from "@/lib/pb";
import { TripCard } from "@/components/trip-card";
import type { Trip } from "@/lib/trip";
import { toTrip } from "@/lib/trip-mapper";
import { freshness } from "@/lib/trip";

// Blocking route: fulfilled trips appear live on the shared link.
export const instant = false;

// Public result page. Reads only fulfilled trips (anon view rule).
// While the request is open, shows the "we're on it" state.
export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (token === "pending") {
    return (
      <main className="mx-auto max-w-(--container-page) px-4 py-16">
        <h1 className="font-display text-3xl font-extrabold mb-4">Got it.</h1>
        <p className="text-muted-foreground max-w-(--measure,65ch)">
          Your request is recorded. We&apos;re searching now — your trips will appear
          on this page within a day. No email needed: bookmark this address.
        </p>
      </main>
    );
  }

  const pb = pbPublic();
  let request: Record<string, unknown> | null = null;
  let trips: Trip[] = [];
  try {
    const list = await pb
      .collection("travel_requests")
      .getList(1, 1, { filter: `token="${token}"` });
    request = list.items[0] ?? null;
    if (request) {
      const t = await pb.collection("travel_trips").getList(1, 5, {
        filter: `request="${request["id"]}" && fulfilled=true`,
        sort: "rank",
      });
      trips = t.items.map(toTrip);
    }
  } catch {
    notFound();
  }

  if (!request) {
    // Not a server error: the shell is already streamed by the time we know.
    return (
      <main className="mx-auto max-w-(--container-page) px-4 py-16">
        <h1 className="font-display text-3xl font-extrabold mb-4">
          This link doesn&apos;t exist.
        </h1>
        <p className="text-muted-foreground">
          Tokens are random and requests expire. Double-check the address, or
          start a new search.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 rounded-(--radius-input) bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Find me a trip
        </Link>
      </main>
    );
  }

  if (trips.length === 0) {
    return (
      <main className="mx-auto max-w-(--container-page) px-4 py-16">
        <h1 className="font-display text-3xl font-extrabold mb-4">
          We&apos;re on it.
        </h1>
        <p className="text-muted-foreground">
          Your request is in. We&apos;re checking flights, hotels and prices — the
          answer appears on this page as soon as it&apos;s verified. Come back
          tomorrow.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-12 flex flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-extrabold">
          {trips.length} trips worth booking.
        </h1>
        <p className="text-sm text-subtle mt-1">
          We looked at every viable combination for your criteria. These are the
          ones we&apos;d actually take — ranked, with reasons.
        </p>
      </header>
      <div className="flex flex-col gap-6">
        {trips.map((t, i) => (
          <TripCard key={t.id} trip={t} rank={i + 1} />
        ))}
      </div>
      <p className="text-xs text-subtle tnum">
        {freshness(trips[0].lastChecked).label}
      </p>
    </main>
  );
}

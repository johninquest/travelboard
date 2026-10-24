import type { Trip } from "@/lib/trip";

export function TripCard({ trip, rank }: { trip: Trip; rank: number }) {
  return (
    <article className="rounded-(--radius-card) border border-border bg-surface shadow-(--shadow-card) p-6 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-subtle">
            #{rank} · from {trip.departureAirport} · {trip.nights} nights
          </p>
          <h3 className="font-display text-2xl font-bold">{trip.destination}</h3>
        </div>
        {rank === 1 && (
          <span className="rounded-full bg-primary-soft text-primary px-3 py-1 text-xs font-medium">
            Best overall
          </span>
        )}
      </header>

      <p className="text-base tnum">
        <span className="font-semibold">{fmt(trip.priceTotalEur)}</span> total ·{" "}
        <span className="font-semibold">{fmt(trip.pricePppEur)}</span> / person
      </p>

      <FactSheet trip={trip} />

      <p className="text-sm text-muted-foreground border-t border-border pt-4">
        {trip.justification}
      </p>
    </article>
  );
}

export function FactSheet({ trip }: { trip: Trip }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <Fact
        label="Flight"
        value={trip.flight.direct ? "Direct" : "1 stop"}
        sub={trip.flight.outbound}
      />
      <Fact
        label="Hotel"
        value={`${trip.hotel.name}, ${trip.hotel.rating}/5`}
        sub={trip.hotel.breakfast ? "breakfast included" : "no breakfast"}
      />
      <Fact
        label="Transfer"
        value={`${trip.logistics.transferMinutes} min`}
        sub={`beach ${km(trip.logistics.beachDistanceM)}`}
      />
      <Fact
        label="Dates"
        value={`${trip.startDate} → ${trip.endDate}`}
        sub={`${trip.travellers} travellers`}
      />
    </dl>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="font-medium tnum">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

function fmt(n: number) {
  return `€${n.toLocaleString("en-GB")}`;
}

function km(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km away` : `${m} m away`;
}

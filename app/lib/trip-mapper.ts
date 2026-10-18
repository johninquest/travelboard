import type { Trip } from "@/lib/trip";

// Pocketbase stores trips with snake_case field names (see pocketbase/schema.md).
// The normalized Trip model (Layer 2) is camelCase. This is the single mapping
// point — nothing else in the app reads raw PB field names.

type Raw = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const num = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const bool = (v: unknown): boolean => v === true;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

// PB date fields come back as "2026-09-14 00:00:00.000Z"; normalize to ISO.
const iso = (v: unknown): string => {
  const s = str(v);
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? s : d.toISOString();
};

const dateOnly = (v: unknown): string => iso(v).slice(0, 10);

export function toTrip(raw: Raw): Trip {
  const flight = obj(raw.flight);
  const hotel = obj(raw.hotel);
  const chars = obj(raw.characteristics);
  const logistics = obj(raw.logistics);
  const nights = num(raw.nights);
  const startDate = dateOnly(raw.start_date);
  const endDate = dateOnly(raw.end_date) || addDays(startDate, nights);

  return {
    id: str(raw.id),
    destination: str(raw.destination),
    destinationCode: str(raw.destination_code),
    country: str(raw.country),
    departureAirport: str(raw.departure_airport),
    nights,
    startDate,
    endDate,
    travellers: num(raw.travellers),
    priceTotalEur: num(raw.price_total_eur),
    pricePppEur: num(raw.price_ppp_eur),
    currency: "EUR",
    flight: {
      direct: bool(flight.direct),
      outbound: str(flight.outbound),
      return: str(flight.return),
      airline: str(flight.airline) || undefined,
    },
    hotel: {
      name: str(hotel.name),
      rating: num(hotel.rating),
      reviewCount: hotel.review_count == null ? undefined : num(hotel.review_count),
      nights: num(hotel.nights) || nights,
      roomType: str(hotel.room_type),
      breakfast: bool(hotel.breakfast),
      location: str(hotel.location),
    },
    characteristics: {
      beach: num(chars.beach),
      food: num(chars.food),
      nightlife: num(chars.nightlife),
      family: num(chars.family),
      romance: num(chars.romance),
    },
    logistics: {
      transferMinutes: num(logistics.transfer_minutes),
      beachDistanceM: num(logistics.beach_distance_m),
      notes: str(logistics.notes) || undefined,
    },
    justification: str(raw.justification),
    supplier: str(raw.supplier),
    supplierRef: str(raw.supplier_ref),
    lastChecked: iso(raw.last_checked),
    fulfilled: bool(raw.fulfilled),
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

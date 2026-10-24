// Layer-2 normalized trip model — the core asset.
// Everything downstream (cards, fact sheets, JSON endpoints, ranking) reads Trip.
// Supplier quirks stay in the JSON fields on the Pocketbase `trips` collection.

export type Trip = {
  id: string;
  destination: string; // display name, e.g. "Crete"
  destinationCode: string; // e.g. "HER"
  country: string;
  departureAirport: string; // MUC/NUE/STR/FRA
  nights: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  travellers: number;
  priceTotalEur: number;
  pricePppEur: number;
  currency: "EUR";
  flight: Flight;
  hotel: Hotel;
  characteristics: Characteristics;
  logistics: Logistics;
  justification: string; // why we'd book this one
  supplier: string;
  supplierRef: string;
  lastChecked: string; // ISO timestamp — staleness must be visible
  fulfilled: boolean;
};

export type Flight = {
  direct: boolean;
  outbound: string; // e.g. "MUC → HER, 06:45, 2h 55m"
  return: string;
  airline?: string;
};

export type Hotel = {
  name: string;
  rating: number; // 1-5, from supplier; null data renders as "not verified"
  reviewCount?: number;
  nights: number;
  roomType: string;
  breakfast: boolean;
  location: string;
};

export type Characteristics = {
  beach: number; // 0-10
  food: number;
  nightlife: number;
  family: number;
  romance: number;
};

export type Logistics = {
  transferMinutes: number;
  beachDistanceM: number;
  notes?: string;
};

// Price formatting — total + per person on one line, tabular figures.
export function formatEur(n: number): string {
  return `€${n.toLocaleString("en-GB")}`;
}

export function priceLine(t: Pick<Trip, "priceTotalEur" | "pricePppEur">): string {
  return `${formatEur(t.priceTotalEur)} total · ${formatEur(t.pricePppEur)} / person`;
}

export function freshness(iso: string, now: Date = new Date()): {
  label: string;
  stale: boolean;
} {
  const hours = (now.getTime() - new Date(iso).getTime()) / 3.6e6;
  if (hours < 24) return { label: `price checked ${Math.max(1, Math.round(hours))}h ago`, stale: false };
  const days = Math.round(hours / 24);
  return { label: `price last checked ${days} days ago — may have changed`, stale: true };
}

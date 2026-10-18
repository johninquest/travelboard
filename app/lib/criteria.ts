import { z } from "zod";

// The only two entry points of the product (see ideation_session.txt).
// A: "Find me a holiday" — inspiration. B: "Can I beat this holiday?" — optimization.
// B is the primary funnel; A is secondary. Both create a `requests` row.

export const DEPARTURE_AIRPORTS = ["MUC", "NUE", "STR", "FRA"] as const;
export const DESTINATION_COUNTRIES = [
  "ES",
  "GR",
  "TR",
  "PT",
  "IT",
  "CY",
  "MT",
] as const;

export const criteriaSchema = z.object({
  source: z.enum(["find", "beat"]),
  departure: z.enum(DEPARTURE_AIRPORTS),
  country: z.enum(DESTINATION_COUNTRIES).optional(),
  nights: z.number().int().min(4).max(10),
  budgetEur: z.number().int().min(400).max(2000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  travellers: z.number().int().min(1).max(6).default(2),
  // Entry B only: the offer the user wants to beat.
  offer: z
    .object({
      url: z.string().url().optional(),
      description: z.string().max(2000).optional(),
      priceTotalEur: z.number().int().min(100).max(20000).optional(),
    })
    .optional(),
  notes: z.string().max(2000).optional(),
});

export type Criteria = z.infer<typeof criteriaSchema>;

export const COUNTRY_NAMES: Record<(typeof DESTINATION_COUNTRIES)[number], string> = {
  ES: "Spain",
  GR: "Greece",
  TR: "Turkey",
  PT: "Portugal",
  IT: "Italy",
  CY: "Cyprus",
  MT: "Malta",
};

export const AIRPORT_NAMES: Record<(typeof DEPARTURE_AIRPORTS)[number], string> = {
  MUC: "Munich",
  NUE: "Nuremberg",
  STR: "Stuttgart",
  FRA: "Frankfurt",
};

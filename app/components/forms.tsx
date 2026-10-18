import { z } from "zod";
import {
  AIRPORT_NAMES,
  COUNTRY_NAMES,
  criteriaSchema,
  DEPARTURE_AIRPORTS,
  DESTINATION_COUNTRIES,
} from "@/lib/criteria";

const field =
  "w-full rounded-(--radius-input) border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-2 focus:outline-primary focus:outline-offset-2";

export function FindForm() {
  return (
    <form action="/api/requests" method="post" className="flex flex-col gap-4">
      <input type="hidden" name="source" value="find" />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Flying from</span>
          <select name="departure" className={field} defaultValue="MUC">
            {DEPARTURE_AIRPORTS.map((a) => (
              <option key={a} value={a}>
                {AIRPORT_NAMES[a]} ({a})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Anywhere / pick one</span>
          <select name="country" className={field} defaultValue="">
            <option value="">No preference</option>
            {DESTINATION_COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_NAMES[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Nights (4–10)</span>
          <input type="number" name="nights" min={4} max={10} defaultValue={7} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Budget € (400–2000, total)</span>
          <input type="number" name="budgetEur" min={400} max={2000} step={50} defaultValue={1200} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm col-span-2">
          <span className="text-muted-foreground">When (optional)</span>
          <input type="date" name="startDate" className={field} />
        </label>
      </div>
      <button type="submit" className="rounded-(--radius-input) bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
        Find me a holiday
      </button>
    </form>
  );
}

export function BeatForm() {
  return (
    <form action="/api/requests" method="post" className="flex flex-col gap-4">
      <input type="hidden" name="source" value="beat" />
      <input type="hidden" name="departure" value="MUC" />
      <input type="hidden" name="nights" value="7" />
      <input type="hidden" name="budgetEur" value="2000" />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Paste the offer URL</span>
        <input
          type="url"
          name="offer.url"
          placeholder="https://…all-inclusive for 2, €1,499"
          className={field}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">…or describe it</span>
        <textarea
          name="offer.description"
          rows={3}
          placeholder="TUI 7 nights, Mallorca, 4★ hotel w/ breakfast, 2 adults, €1,499 total, June"
          className={field}
        />
      </label>
      <button type="submit" className="rounded-(--radius-input) bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors">
        Can I beat this holiday?
      </button>
    </form>
  );
}

export function parseCriteria(fd: FormData) {
  const num = (name: string) => {
    const v = fd.get(name);
    return v && typeof v === "string" && v !== "" ? Number(v) : undefined;
  };
  const str = (name: string) => {
    const v = fd.get(name);
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const raw: Record<string, unknown> = {
    source: str("source") ?? "find",
    departure: str("departure"),
    country: str("country"),
    nights: num("nights"),
    budgetEur: num("budgetEur"),
    startDate: str("startDate"),
    travellers: num("travellers") ?? 2,
    notes: str("notes"),
  };
  const offerUrl = str("offer.url");
  const offerDesc = str("offer.description");
  const offerPrice = num("offer.priceTotalEur");
  if (offerUrl || offerDesc || offerPrice) {
    raw.offer = {
      ...(offerUrl && { url: offerUrl }),
      ...(offerDesc && { description: offerDesc }),
      ...(offerPrice && { priceTotalEur: offerPrice }),
    };
  }
  return criteriaSchema.safeParse(raw);
}

export type ParsedCriteria = z.infer<typeof criteriaSchema>;

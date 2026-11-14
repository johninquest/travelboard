# Product principles — the reasoning behind the board

Moved verbatim from [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
on 2026-11-14 so the always-on instructions file stays short. Nothing here was deleted or
rewritten; it is the record of *why* the project is shaped the way it is.

Read this before changing direction, and before proposing a feature the current rules seem to
be missing. Some of what follows describes the pre-pivot "decision product" framing — that is
kept deliberately, so the reasoning stays auditable even after the framing changed.
[`../ideation_session.txt`](../ideation_session.txt) remains the source of truth.

---

## Product thesis

The product is **not** an AI travel agent and **not** a better travel aggregator. It is a
travel *decision* product: the user supplies constraints, and the product returns a small
number of complete trips it would actually book, each with an explicit justification.

The current implementation of that thesis is the **deals board**: rather than asking the
user for constraints, it curates verified package offers and lets the user narrow by
destination, airport, theme and month. The decision work happens in the curation and
ranking, not in a form.

- The differentiator is the **decision model** (ranking + explanation), not the AI.
- Positioning: *"AI can help you explore. We help you decide."* Later: *"We verify the trip
  before we recommend it."*
- Travel is a bad domain for hallucination — a wrong price or impossible connection costs
  the user real money. Never present unverified or estimated figures as confirmed facts.
- AI is deliberately deferred. It becomes the *interface* (interpreting free-text
  preferences) only after the workflow is proven valuable. The agent is the consequence of
  a discovered workflow, not the hypothesis.

## MVP wedge: "Can I beat this holiday?"

The first thing to build is the **optimization** entry point, not the inspiration entry
point. The user pastes an existing package-holiday offer (URL or screenshot) and the product
returns cheaper/better alternatives with a stated saving.

Rationale: the user has already decided to buy, so acquisition is far easier, and the
backend only has to answer *"can I find a better combination than this?"* rather than
*"what does every human want from a holiday?"*

The inspiration entry point ("find me a holiday") is a secondary entry point on the same
homepage. Build both, but treat the beat-this-deal flow as the primary funnel.

*Status: this wedge is not built. `/anfrage` holds its forms. The board became the front
door instead — see [`strategy.md`](strategy.md) for the current test.*

## Recommended stack

From the ideation doc, if starting fresh:

| Concern | Choice |
| --- | --- |
| Frontend | Next.js (server-rendered — see answerability below) |
| Database | Supabase / Postgres |
| Flight & hotel discovery | Amadeus Self-Service APIs |
| Affiliate / monetization layer | Travelpayouts |
| Analytics | PostHog |
| AI | None initially; OpenAI API later for preference interpretation only |
| Payments | None — redirect to supplier for booking |

*Status: the shipped app uses committed JSON read through `lib/store.ts`, not Supabase, and
structured log lines rather than PostHog. That is a deliberate deferral, not an oversight —
see [`data-sources.md`](data-sources.md).*

## Data sources and their limits

- **Amadeus Self-Service** — flights, hotels, destinations, activities. Free test quota;
  start here.
- **Travelpayouts** — affiliate infrastructure across multiple brands; auto-connects
  relevant programs. Use for the monetization layer, not inventory.
- **Booking.com Demand API** — sandbox only until approved as a Managed Affiliate Partner.
  Do not make it a dependency for the first experiment.
- **Duffel** — good flight infrastructure, but sandbox prices are not real. Postpone.
- **Viator** — tours/activities affiliate.

Free-for-development is not free-for-production. Keep a supplier abstraction so a source can
be swapped without rewriting the ranking layer.

*Current, enforced list of what may be used and under what licence:
[`data-sources.md`](data-sources.md).*

## Architecture: the layered model

```
Layer 1  Data          Amadeus / affiliate partners
Layer 2  Normalized trip model   Trip, Destination, Dates, Price, Flight, Hotel,
                                 Activities, Constraints, Scores, Last checked
Layer 3  Decision engine         Which trips are actually good?
Layer 4  Public pages            Human-readable + machine-readable
Layer 5  Personalized interface  "Find me my trip."
Layer 6  Affiliate transaction   Book -> commission
```

The normalized trip model (Layer 2) is the core asset. Everything downstream — ranking,
pages, JSON endpoints, future agents — reads from it. Invest in getting it right rather than
in adding suppliers.

*In the shipped app, Layer 2 is `Listing` in [`../app/lib/listing.ts`](../app/lib/listing.ts)
and Layer 6 is [`../app/app/api/deal-click/[id]/route.ts`](../app/app/api/deal-click/%5Bid%5D/route.ts).
Layers 3 and 5 are not built.*

## Answerability over SEO

The guiding principle: **optimize for answerability, not for search rankings.** For every
page ask — *if ChatGPT had to answer a user's question using only this page, would it have
everything it needs?* If yes, it is probably a good SEO page too.

Conventions that follow from this:

- **Server-render the facts.** Core information (price, nights, flight type, hotel rating)
  must be in the initial HTML, never behind a click → spinner → API call. The interactive
  app sits on top of crawlable HTML.
- **Every page contains explicit answers.** Write "Direct flights from Munich: yes",
  "Typical 7-night budget: €X–€Y", "Avoid if: you want very quiet beaches" — not
  "Mallorca is a beautiful island with diverse attractions".
- **Standardized "Trip Fact Sheet"** on every trip/destination page: Trip (destination,
  departure, dates, duration, travellers), Cost (flight / hotel / transfer / estimated
  total), Characteristics (beach, food, nightlife, family, romance — scored out of 10),
  Logistics (direct flight, flight time, transfer time), Recommendation (best for,
  confidence).
- **URL architecture follows intent, not inventory:**
  `/holidays/`, `/holidays/beach/`, `/holidays/under-1000/`, `/holidays/from-munich/`,
  `/holidays/september/`, `/destinations/crete/`, `/compare/crete-vs-mallorca/`, `/deals/`,
  and eventually combinations like `/holidays/from-munich/beach/under-1000/september/`.
- **Only create an indexable page when it has enough real data to justify existing.** Start
  with 50–200 genuinely useful pages; do not mass-generate near-identical pages.
- **Schema.org structured data** where it accurately describes the content (Google has
  travel-entity support including `VacationRental`). Structured data is not the strategy —
  it makes already-useful content machine-legible.
- **Expose a machine-readable layer** (JSON endpoints such as `/api/trips/...`) with fields
  like `destination`, `departure`, `duration_nights`, `travel_month`, `price_total`,
  `currency`, `direct_flight`, `hotel_rating`, `beach_distance_m`, `breakfast`,
  `last_checked`. Build this only after there is evidence it is used.
- **robots.txt must allow `OAI-SearchBot`** (search/citation). Treat `GPTBot` (training) as a
  separate, independent decision.
- **Use IndexNow** to notify participating engines of new/updated URLs, and **Bing Webmaster
  Tools** from day one for its AI Performance report (grounding queries, cited URLs,
  citation share).

- `/blog` is for **decision-bound guides**, not articles. Every post declares a hub
  (`lib/blog.ts`) and the page renders that hub's live verified offers beneath the
  prose. A post with fewer than three live offers says so. Never put a price in
  prose — prices come from the board, where they are dated and expire. Do not add
  tag archives, related-post lists, pagination, search or a CMS until there are
  enough posts to need them.
- The market is German and the site is English. Language is an open product
  decision — do not "fix" it in code without the ideation doc changing first.

## Content flywheel

Travel data → trip comparisons → useful pages → Google traffic + AI citations → user
arrives → personalized search → affiliate click → booking → more travel data → better
recommendations → more useful pages.

Do **not** build an affiliate SEO farm (`/blog/best-beaches-in-mallorca` × 10,000). Build
live decision pages around decisions instead.

## Roadmap

| Version | Scope | AI |
| --- | --- | --- |
| V0 | Human-fulfilled: form → manual search → recommendation → affiliate links | none |
| V1 | Automate: form → APIs → database → simple ranking → result page | 0–10% |
| V2 | AI interprets free-text preferences into structured criteria | interface only |
| V3 | Agentic: shows elimination reasoning ("47 viable, 32 eliminated for bad flight times") | workflow |
| V4 | Monitor the market for the user | — |
| V5 | Book and manage on the user's behalf | — |

*Status: the project is between V0 and V1 — a curated board with automated feed discovery and
manual verification. The 12-week content test in [`strategy.md`](strategy.md) runs in
parallel with V1 and is what decides whether V2 is ever built.*

## Explicitly out of scope for month one

Do not build these unless the ideation doc changes: GPUs, vector databases, agent
frameworks, sophisticated orchestration, huge datasets, scraping infrastructure, an own
booking engine, payment infrastructure, multi-agent architecture, RAG, or an
MCP-enabled "autonomous travel API".

What is in scope: landing page, form, API calls, ranking, affiliate links.

## Metrics that decide whether to continue

Track the full funnel and compute **revenue per visitor** and **revenue per
recommendation**:

```
visitors -> submit a request -> receive recommendations -> click an offer -> book -> revenue
```

Decision tree after ~30 days: nobody wants it → kill it; want it but don't click →
recommendations aren't compelling; click but don't book → offers/pricing/trust/UX are wrong;
book but revenue tiny → need higher-value categories or better monetization; users come back
→ now build the agent.

*The current numeric keep/kill/double-down rules for the content test are in
[`strategy.md`](strategy.md). They supersede nothing here — they are the same idea, made
falsifiable.*

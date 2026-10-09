# Copilot Instructions — travel

## Repository status

This repository currently contains **no application code**. It holds a single ideation
transcript, [ideation_session.txt](/ideation_session.txt), which defines the product thesis,
market, MVP scope, and roadmap for a solo-founder travel decision product.

There are no build, test, or lint commands yet. When the first app is scaffolded, add them
here (full suite, single test, lint, typecheck) as the authoritative entry points.

**Before writing code, read [ideation_session.txt](/ideation_session.txt).** It is the source
of truth for product decisions. Do not invent requirements that contradict it.

## Product thesis

The product is **not** an AI travel agent and **not** a better travel aggregator. It is a
travel *decision* product: the user supplies constraints, and the product returns a small
number of complete trips it would actually book, each with an explicit justification.

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

## Constrained market (do not generalize)

Scope is deliberately narrow so one person can attack it. Keep these bounds unless the
ideation doc is updated:

- **Departures:** Munich, Nuremberg, Stuttgart, Frankfurt (Germany)
- **Destinations:** Spain, Greece, Turkey, Portugal, Italy, Cyprus, Malta
- **Trip length:** 4–10 nights
- **Budget:** €400–€2,000, prices in EUR, quoted **per person** and as a total
- **Travellers:** typically 2 adults

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

## Working conventions

- Prices are EUR. Always show the total and the per-person figure, and state `last_checked`
  so staleness is visible.
- Every recommendation carries a justification (why this trip, why this one over the
  alternative) and, where relevant, the budget headroom left over.
- Prefer 3–5 recommendations over long lists. The product's value is narrowing choices, not
  enumerating them.
- Never fabricate prices, availability, or ratings. If data is missing or stale, say so.
- Keep supplier integrations behind an abstraction so sources can be swapped or added
  without touching the ranking layer.

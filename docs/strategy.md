# Strategy — the 12-week content test

Status: **active**. This is the live experiment plan. [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md)
points here; it does not repeat this.

Updated: 2026-11-14. Decisions and their reasons are in [`decision-log.md`](decision-log.md).

---

## The one-sentence version

The board is the **instrument** that makes testing cheap; the **writing** is the test.
We are finding which audience earns an affiliate commission, not building a better board.

## Status: the niche focus is paused (2026-11-20)

The niche pages need research the owner does not have — airline pet policy, accessibility
audits, single-supplement data — and produced 1 article in 6 weeks. A season × platform page
needs none of it. So the next page is [`/where-to-look`](../app/app/where-to-look/page.tsx):
which destinations are in season this month, and which *kind* of source carries that
inventory.

It is a **source guide, not an offer page**. It shows no price and makes no availability
claim, which is why it can ship with zero verified offers. Its job is to answer the question
the board cannot yet answer: **which platform do people actually leave for?** That tells you
where to spend verification effort.

The niche lenses are paused, not killed. The three published picks stand. See the 2026-11-20
entry in [`decision-log.md`](decision-log.md) for the reasoning and the deliberate exception
to the ≥3-offers rule.

## What the board is for

It does three jobs, and none of them is "be a product":

1. **Generate a recurring, data-led content hook** that does not depend on having a new
   opinion every week.
2. **Give you something linkable and shareable** — the thing a new domain lacks most.
3. **Act as a common lens across niches**, so this is one site with filters, not five
   disconnected sites with five voices.

Positioning follows timing and data: *when and where, for people who travel differently.*
Not positioning around one niche, because the niche is what the test has not yet chosen.

## The two axes, and why they do not conflict

The repo locks the **supply**: departures from Munich, Nuremberg, Stuttgart, Frankfurt →
Spain, Greece, Turkey, Portugal, Italy, Cyprus, Malta; 4–10 nights; €400–2,000; typically
two adults. That constraint is still in force — see
[`../.github/copilot-instructions.md`](../.github/copilot-instructions.md).

The candidate niches are **audience**: mobility, dogs, solo travel at 50+, dark skies.

Different axes. An audience niche is a lens pointed at the inventory the board already
holds — "Munich → Crete with a walker" is a guide about offers that exist here. It is not
a new site with new inventory.

**Why this matters, in one line:** the expensive rule in this project is *"a feed item is
discovery, not a fact — nothing goes live until a human has verified the price on the
source page."* Audience lenses reuse that verification for free. A second site restarts it
from zero, per niche. At the capacity below, restart is not affordable.

## Where the niche claim lives: prose, not labels

The board **cannot** assert "this offer is dog-friendly" or "this hotel is wheelchair
accessible" as a verified fact. `travel_listings.themes`
([`../app/lib/listing.ts`](../app/lib/listing.ts)) is a fixed vocabulary of trip types, and
nothing in the ingest or review flow checks pet policy, step-free access, or breed and size
limits.

So:

- The **article** carries the niche claim. It is prose you researched, and you can stand
  behind it.
- The **offers rendered underneath** stay generic hub offers, used as live price context.
  This is exactly what [`../app/app/blog/[slug]/page.tsx`](../app/app/blog/%5Bslug%5D/page.tsx)
  already does.
- **No `themes` values and no PocketBase schema change** for niches. Labelling an offer
  "dog-friendly" without verifying the supplier's pet policy would be the exact failure this
  project's hardest rule exists to prevent.

## Capacity: 8 hours a week, and the cap

Real budget: **8 h/week**. Split:

| | Hours | What it is |
| --- | --- | --- |
| Writing | ~4 | The thing that produces the answer |
| Board curation | ~2 | Verifying and publishing offers, so pages have live offers under them |
| Admin | ~2 | Audit, affiliate terms, tracking, publishing mechanics |

**Hard cap: no more than 30% of hours on dashboard code.**

The risk named in the ideation session is the real one: building the dashboard is more fun
than writing, so you hide in it. The cap exists because a board with no audience cannot be
judged, and more code does not change that.

*Trigger to revisit the cap:* a niche clears the **keep** bar at week 12. Until then, the
board is finished enough.

## Timeline: 14 Nov 2026 → 5 Feb 2027

The ideation session proposed 12 pieces in 8 weeks. At 8 h/week that is 64 hours for 12
decision pages, each needing research, verification, and live offers underneath it. It is
not reachable, and a plan that is not reachable at the start is abandoned by week 4.

**This plan: 6 pieces. Two per niche, three niches.**

| Weeks | Dates | Work |
| --- | --- | --- |
| 1–2 | 14–27 Nov | Audit all 5 candidates. Market-fit gate first (~15 min each — a paper test against the board), then SERP + program terms (~2 h each). **Pick 3.** Set up tracking, confirm affiliate terms in writing. |
| 3–8 | 28 Nov – 8 Jan | 6 money pages, 2 per niche. No listicles. Publish alongside the board. |
| 9–10 | 9–22 Jan | Pinterest + community answers. Optional $50–100 demand test, one money page per niche. |
| 11–12 | 23 Jan – 5 Feb | Score against the rules below. Cut one, double down on one, keep one. |

**Known collision:** weeks 6–7 span Christmas (19 Dec – 1 Jan), when writing hours will
drop. That is a fact about the calendar, not a failure. If output slips there, extend weeks
3–8 rather than cutting the audit or the review — the audit and the verdict are what make
the writing worth doing.

## What to write

Skip "Top 10" listicles in the first batch — the lowest-converting format in travel. Write
decision and problem pages:

- "Is [specific thing] worth it?" and "X vs Y"
- Hyper-specific logistics: "Airport to old town with a walker: exactly what works"
- Constraint-driven queries: coverage for pre-existing conditions, for 65+, for a specific
  activity. This is where high commission and high intent overlap, and where big sites give
  vague answers.

Per niche, 2 pieces: **one money-intent page** (is X worth it / X vs Y / the constraint
query) and **one hyper-specific logistics page**. The ideation plan's third and fourth
variants — a data-led dashboard piece and a community-answer piece — are deferred with the
monthly report (below).

Every page must satisfy the repo's answerability rule: server-rendered facts, explicit
answers, dated prices, live offers underneath, and the disclosure block.

## Keep / kill / double-down — set now, not after

Agreed before a single page is written, because the rules will be uncomfortable in week 12
and unfalsifiable in week 12 is how niches become permanent.

**Keep** a niche at week 12 if **all** of:
- ≥300 visits across its two money pages
- ≥3% outbound affiliate clicks per 100 visits on at least one page
- ≥1 human response — a reply, a share, or an email sign-up

**Kill** a niche if, after both pages are live: <100 visits **and** <1% click rate.

**Double down** on a niche if **either**: ≥5% click rate, or a confirmed booking.

**One sale in one niche is noise, not proof, and must not set direction.**

The 3% bar is a starting guess, not industry truth. Recalibrate it after week 6 against
whatever the actual numbers look like — and write the recalibration into the decision log
with the reason.

## The metric that decides everything

**Earnings per visit**, estimated from outbound click rate until real sales arrive.
Secondary signals, in order of usefulness:

1. Outbound affiliate clicks per 100 visits on money pages
2. Queries where you rank in the top 20, by niche
3. Email sign-ups per 100 visits
4. Whether anyone replies, shares, or asks a follow-up

Attribution requires the sub-ID convention — `niche_article_listing` — implemented in
[`../app/lib/affiliate.ts`](../app/lib/affiliate.ts) and carried from the page the click
came from. Without it, "which niche earns" is unanswerable and the test cannot produce a
verdict. See [`data-sources.md`](data-sources.md).

## Traffic: do not rely on Google alone

A new domain waits months. Test demand in parallel:

- **Pinterest** — travel is a top category, no sandbox, and pins keep driving traffic for
  months. Suits the solo-50+ angle especially.
- **Reddit and niche Facebook groups** — answer questions for a few weeks before linking
  anything. Linking early is how you get banned from the only place that could validate the
  niche.
- **Small paid demand test (optional, $50–100)** — Pinterest or Meta traffic to one money
  page per niche. You will not profit. You will learn which niche clicks through to affiliate
  offers without waiting months for SEO. That is the whole point.

## Deferred, with the trigger to revisit

| Deferred | Trigger to revisit |
| --- | --- |
| Monthly data-led report (Open-Meteo, fare calendars, moon phase, OSM) | A niche is **kept** at week 12 — i.e. evidence that computed content earns anything |
| Skills and `/prompt` files for Copilot | You have written the same *type* of page twice |
| Pre-commit hook / CI link checker | A mistake of that kind actually slips through once. `npm test` already gates it. |
| Medical tourism | A kept niche **and** weekly capacity above 8 h. It cannot reuse the board — see [`niche-audits.md`](niche-audits.md). |
| New markets, new languages, new domains | Never during this test. |
| A CMS, tag archives, related posts, search, pagination | Not before there is enough content to need them. |

## Explicitly out of scope

New domains. New markets. A second site. An AI writing pipeline. Scraping. Mass-generated
pages. Anything that adds a second verification loop.

The failure mode to avoid is the affiliate SEO farm — the repo already refuses it
([`../README.md`](../README.md): "no evergreen article archive: every guide is tied to the
live offers it is about"). The niches do not change that. They are angles on the same
decision pages.

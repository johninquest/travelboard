# Decision log

The format the [`value-challenger`](../.github/skills/value-challenger/SKILL.md) skill emits
at the end of a session. Kept in the repo because memory does not carry between sessions, and
because an agent that knows *why* a decision was made makes better judgement calls than one
that is only told what was decided.

Newest first. Do not edit old entries — add a new one that supersedes them.

---

## 2026-11-21 — `/where-to-look` becomes the front door, and the nav drops to two

**Goal and who pays:** unchanged. Affiliate commission from package-holiday clicks.

**Evidence so far (numbers):** unchanged from 2026-11-20 — 14 rows in `listings.json`,
all placeholders, 0 verified supplier prices, 0 traffic, 0 clicks, 0 revenue.

**What prompted this:** the board was the front door. A front door that shows 14
placeholder rows with no verified price is the weakest possible first impression, and
the one page that answers a question with data we actually hold — the season × platform
guide — was one nav click away.

**Decisions made and why:**

1. **`/` renders the source guide; the board moves to `/deals` only.** The guide needs no
   curation, so it can be the front door today. The board is still the instrument, just
   not the shop window while it is empty.
2. **`/where-to-look` stays a live URL and canonicalises to `/`.** A redirect would throw
   away the URL the 2026-11-20 entry argued for; a duplicate without a canonical would
   split the signal. Same body, one canonical.
3. **The body is extracted to `components/where-to-look.tsx`.** Two pages rendering the
   same content must not be able to drift — the same reason `Board` is shared.
4. **The header drops to `Offers · Guides`.** *Where to look* is the home page, so the
   logo covers it. *Destinations* pointed at `/holidays/spain`, a single country hub that
   404s below three live offers — a nav item that promises a page we may not have.
   *Find a trip* is the V0 decision funnel, superseded by the board.
5. **Unlinked is not deleted.** `/anfrage`, `/holidays/*` and `/admin` all still resolve.
   Removing a nav item is reversible in one line; deleting a route is not.
6. **No board strip on the landing page.** The guide already links to `/deals` with the
   live offer count. A second offer list is machinery before a niche is kept.
7. **The sitemap drops `/where-to-look` and raises `/` to 1.0.** Listing a URL that
   canonicalises elsewhere contradicts the canonical.

**Cut or deferred (with trigger):**

| Deferred | Trigger |
| --- | --- |
| Board back on the front door | ≥10 verified, non-placeholder offers |
| `Destinations` back in the nav | A hub that clears the ≥3-offer gate for a month |
| `/anfrage` relinked or deleted | A decision to run the form funnel again, or a decision to kill it |

---

## 2026-11-20 — A season × platform page, and why the niche focus is paused

**Goal and who pays:** unchanged. Affiliate commission from package-holiday clicks. Nobody
pays for the board itself.

**Evidence so far (numbers):** 1 guide published, 14 rows in `listings.json` — **all
placeholders** (`affiliate_network: "none"`, notes "SAMPLE DATA - delete before launch"), 0
verified supplier prices, 0 traffic, 0 clicks, 0 revenue. Unchanged from 2026-11-19.

**What prompted this:** the owner brought a macro market-sizing document (UN Tourism 2025,
Eurostat) and proposed walking away from the niche focus to build around it.

**What the document actually says, and what it does not.** It confirms the locked market
rather than replacing it: Germany is the #3 outbound spender ($120.3bn, 2024) with 114M+
international trips/year; Germans travel to Spain, Italy, Austria, Turkey, Greece, Croatia —
five of which the board already covers (Austria is drive-to, correctly excluded); German
demand peaks Jul–Aug with shoulders May–Jun and Sep–Oct. Its one genuinely new idea is that
the useful commercial unit is a **corridor × month**, not a country.

It contains **no query data, no platform data, no price data and no affiliate data.** It
therefore cannot support a "which platform has what" page on its own. That page needed a
different source: what each platform actually sells.

**Decisions made and why:**

1. **The niche focus is paused, not killed.** The niche pages need research the owner does
   not have (airline pet policy, accessibility audits, single-supplement data) and have
   produced 1 article in 6 weeks. A corridor/season page needs none of it. The reason to
   reorder is **cost per page**, not market size — the document did not change the
   bottleneck, it changed the shape of the pages worth writing once the bottleneck clears.
2. **The new page is a source guide, not an offer page.** `/where-to-look` answers which
   destinations are in season this month and which *kind* of source carries that inventory.
   It needs zero verified offers, which is the whole point: the owner has no time to curate
   right now, and a page that waits for curation ships never.
3. **It makes no availability claim and shows no price.** "TUI sells its own package
   inventory" is a business-model fact, checkable on TUI's own site. "TUI has Crete in
   November" is an unverified claim about stock. The word "probably" does not make the
   second one safe. Every platform row carries `sells`, `limitation` and `lastVerified`, and
   the page states the distinction in prose above the content rather than in a footer.
4. **Season rows carry a `basis` field: `corridor` or `market`.** The source states a season
   for Germany→Spain and Germany→Turkey specifically, but only lists Greece and Italy among
   German destinations without a separate season. Rendering both as the same claim would
   overstate the weaker one, so the page says which is which.
5. **Portugal, Cyprus and Malta are absent from the matrix, deliberately.** The research
   does not cover them. The page names them under "We cannot answer for these yet" so the
   gap is visible instead of silent. Inventing a season for them would be the exact failure
   the project's hardest rule exists to prevent.
6. **Platform links are plain, not affiliate-wrapped.** The owner's choice, and the right
   one: this is a pure demand test. Which platform do people actually leave for? That tells
   you where to spend verification effort — the real bottleneck. Wrapping them would
   confound the signal with commission differences.
7. **The platform list renders once, not per destination.** Platforms are not
   destination-specific today. Seven identical blocks under four destinations would be
   duplicate content and would make the click data unreadable.
8. **The page reads the live offer count instead of asserting the board is empty.** A
   hardcoded "the board is currently empty" becomes a lie the first time an offer is
   published, and a page whose premise is not overstating things cannot afford one.

**The deliberate exception, recorded so it can be reversed on purpose:** the repo rule is
*"only create an indexable page that has enough real data to justify existing (≥3 live
offers)."* `/where-to-look` has **zero offers**. The rule exists to stop thin *offer* pages;
this page's data is a sourced season matrix and a verified platform registry — real,
checkable, not padded. It is a source guide that links to the board rather than substituting
for it. If the page earns nothing by the next review, delete it rather than defend it.

**Cut or deferred (with trigger):**

| Deferred | Trigger |
| --- | --- |
| UK / second origin market | A German page earns a commission. It needs new airports, GBP, new affiliate programs, new sources and a second verification loop — a second site in everything but name |
| A page per month (12 pages) | The single page shows traffic. Twelve thin month pages is the affiliate-farm shape the repo refuses |
| Affiliate wrapping on platform links | The plain-link click data shows which platform earns attention |
| Season rows for PT, CY, MT | A named source is found. Not before |
| The niche pages (offseason / solo / timing) | Unchanged: a lens is kept at the next review. The three published picks are not withdrawn |

**Unverified assumptions:**

- That a season × platform page earns anything at all. It is the cheapest page to write and
  the least proven. The click data is the first evidence either way.
- That the platform `sells` sentences are accurate. They were read from each company's own
  site on 2026-11-20, but a business model can change and `lastVerified` is the only guard.
- That "in season" is a question anyone searches for. It is a real question; whether it is a
  *searched* question is untested.
- Affiliate terms still unconfirmed in writing. Unchanged, and still the thing that makes
  every click earn nothing.

**Next action (one, with deadline and success metric):** publish `/where-to-look` and drive
any traffic to it — a Pinterest pin, a Reddit answer, or a single post — by **4 Dec 2026**.
Success metric: at least one outbound platform click is logged, which tells you which source
to verify offers from first. Zero clicks is also an answer, and a cheap one.

---

## 2026-11-19 — The first three articles, and widening the lens pool

**Goal and who pays:** unchanged. Affiliate commission from package-holiday clicks; the board
is the instrument, the writing is the test.

**Evidence so far (numbers):** 1 guide published, 14 rows in `listings.json` — **all
placeholders** (`affiliate_network: "none"`, notes "SAMPLE DATA - delete before launch"), 0
verified supplier prices, 0 traffic, 0 clicks, 0 revenue. Unchanged from 2026-11-14 except
that the placeholder status is now confirmed rather than assumed.

**Decisions made and why:**

1. **Three articles, not six, and they are an audition rather than the test.** The strategy
   designs 6 pages (2 per niche) to produce a keep/kill verdict. Three pages cannot run that
   design. So the first three test three *different lenses*, and 5 Feb decides which lens
   gets pages 4–6. Stated plainly because a three-page result read as a six-page verdict is
   how a niche gets killed for the wrong reason.
2. **The lens pool is widened with seasonal lenses.** The five candidates were all audience
   niches. Timing is the strongest lever a package-holiday board has: it reuses the same
   inventory, needs no new verification loop, and answers a question the buyer is asking this
   week. Added `offseason` and `timing` alongside `solo`.
3. **Audience and seasonal tokens are kept distinguishable in code.** `NICHE_KIND` in
   `lib/niche.ts` marks each token `audience` or `seasonal`, and `lib/niche.test.ts` fails if
   a token is added without a kind. Without this, a timing page's clicks would be read as
   evidence that an audience niche earns — the one inference the test must not make.
4. **The three picks, and why each slot is where it is.** Greek winter (10 Dec) because
   winter-sun intent peaks in the darkest weeks and the board's cheapest offers are exactly
   those; single supplement (7 Jan) because German booking volume peaks Jan–Mar and single
   rooms are the scarcest inventory; early Easter (21 Jan) because Easter 2027 falls on 28
   March and booking peaks in February. Each publishes *before* its demand peak, not during.
5. **Christmas-market and school-holiday pages were cut, not deferred.** Both have a useful
   life shorter than a new domain's time-to-rank. A page that cannot rank inside its own
   season is a page that never earns.
6. **No lived experience in any candidate niche** (confirmed by the owner). The right-to-win
   gate stays unproven for all of them, so every page must earn authority from named sources.
   This is recorded because the audit doc says lived experience outranks every other gate —
   it does not apply here, and future-you should not assume it was overlooked.
7. **English stays.** The single-supplement query is strongest in German
   ("Einzelzimmerzuschlag Pauschalreise"), so that page will lean on Pinterest and community
   answers rather than Google. Accepted as a cost of not changing language mid-test.
8. **Verdict date stays 5 Feb 2027**, accepting that the third article gets ~2 weeks of data.
   The limitation goes in the log before the numbers are read.

**Cut or deferred (with trigger):**

| Deferred | Trigger |
| --- | --- |
| "Book summer now or wait?" | A lens is kept at 5 Feb — it is the highest-volume seasonal page and needs the authority a kept lens would give |
| All-inclusive vs half board, real cost | Page 4, if the 5 Feb read favours seasonal lenses |
| Summer 2027 early booking | Price history exists (two seasons of dated offers) |
| Dog-friendly, mobility | A lens is kept **and** the airline/accessibility research is done with named sources |
| Dark sky | Unchanged: weak market fit |

**Unverified assumptions:**

- That a seasonal lens can earn at all. It is the cheapest page to write and the least
  proven — the 5 Feb read is the first evidence either way.
- That Cyprus can carry ≥3 verified late-March offers by 20 Jan. It has 1 placeholder row
  today; if curation fails, Article 3 falls back to the `greece` hub.
- That the single-supplement page can state a supplement without stating a price. The plan is
  a dated percentage range; if no supplier states one, the page must say so rather than
  estimate.
- Affiliate terms still unconfirmed in writing. Without a marker, every click earns nothing
  and the test measures nothing.

**Next action (one, with deadline and success metric):** replace the 14 placeholder rows with
real, human-verified offers — at least 3 for the `greece` hub — by **9 Dec 2026**. Success
metric: Article 1 renders a real selection instead of the "not enough verified offers"
message, and no placeholder price is publicly visible.

---

## 2026-11-14 — Integrating the ideation-session content plan

**Goal and who pays:** earn affiliate commission from package-holiday clicks. The board is
the instrument; the writing is the test. Nobody pays for the board itself.

**Evidence so far (numbers):** 1 guide published, 0 live offers verified as real supplier
data (the 14 rows in `listings.json` are `affiliate_network: "none"` sample data), 0 traffic,
0 clicks, 0 revenue. The board is pre-audience. This is the honest starting point.

**Decisions made and why:**

1. **Niches are audience lenses on existing inventory, not second sites.** The locked market
   is *supply*; the niches are *audience*; different axes, so no conflict. The reason is cost:
   the expensive rule is human price verification, and lenses reuse it while a second site
   restarts it per niche. At 8 h/week, restart is unaffordable.
2. **Which three niches is not decided now.** All five go through the week-1–2 audit; the
   audit picks. No code assumes the outcome — `lib/niche.ts` ships with `general` only.
   Deciding this before the evidence is exactly the failure the ideation session warned about.
3. **The niche claim lives in article prose, not offer labels.** No `themes` values and no
   PocketBase schema change, because the board cannot verify pet policy or step-free access
   per listing and must not imply it can. Offers under a post stay generic hub price context.
4. **Medical tourism parked.** Highest stated commission on the list and the only candidate
   that cannot reuse the board. Trigger to revisit: a kept niche **and** capacity above 8 h/week.
5. **6 money pages, not 12.** The session's 12-in-8-weeks plan needs ~64 hours for 12
   research-and-verify pages at 8 h/week. A plan that is not reachable is abandoned by week 4.
6. **Keep/kill/double-down set before writing.** ≥300 visits + ≥3% click rate + ≥1 human
   response to keep; <100 visits and <1% to kill; ≥5% or a booking to double down. One sale
   is noise, not proof. Set now because the rules must not be written after falling in love
   with a niche.
7. **30% hard cap on dashboard code.** The known failure mode is that building is more fun
   than writing. Cap lifts only when a niche is kept.
8. **Monthly data-led report deferred.** No Open-Meteo, OSM or fare-calendar integration now.
   Trigger: a kept niche — i.e. evidence that computed content earns anything.
9. **Sub-ID extended to `niche_article_listing`.** The only genuinely new capability the
   session asked for that this repo lacks. Without it the test cannot produce a verdict.
10. **Enforcement via vitest, not git hooks or CI.** `npm test` is already the gate. Add a
    pre-commit runner only if a mistake actually slips through once.
11. **`copilot-instructions.md` slimmed ~230 → ~100 lines**, stale pre-pivot material moved
    verbatim to [`product-principles.md`](product-principles.md). It is loaded every request;
    the reasoning belongs in docs read on demand. Nothing deleted.

**Cut or deferred (with trigger):** see [`strategy.md`](strategy.md) §"Deferred, with the
trigger to revisit" — the monthly report, skills/prompt files, pre-commit hooks, medical
tourism, OSM/Open-Meteo/Trends integration.

**Unverified assumptions:**

- The 15–25% insurance and 8–12% niche-tour commission figures from the session are ballpark
  and probably optimistic. Must be read off live program cards in the money-page gate.
- The 3% outbound-click-rate bar is a starting guess, not industry truth. Recalibrate after
  week 6 and log the recalibration with its reason.
- Whether any of mobility / dog-friendly / solo-50+ has a joinable program that accepts a
  German new domain is unknown. A niche can look perfect until the only good program will not
  take you.
- Preliminary market-fit judgements in [`niche-audits.md`](niche-audits.md) are my reading of
  the inventory, not an audit.
- No lived experience recorded for any candidate niche. If it exists, it outranks every other
  gate — say so.

**Next action (one, with deadline and success metric):** run the market-fit gate on all five
candidates and the SERP + money-page gates on the survivors, by **27 Nov 2026**. Success
metric: three niches chosen, each with 3 named joinable programs and their real terms written
down, and nothing written before then.

---

## Before this session

The decisions that shaped the board are recorded in
[`../ideation_session.txt`](../ideation_session.txt) (source of truth for product decisions)
and the stable rules in [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md).
No earlier decision logs exist in the repo; if you have one from a previous session, put it
here rather than starting fresh.

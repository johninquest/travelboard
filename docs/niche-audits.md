# Niche audits

The gate before any writing. **Nothing in the code assumes which niches were chosen** —
this file decides, and [`../app/lib/niche.ts`](../app/lib/niche.ts) is updated when it does.

Rule from [`strategy.md`](strategy.md): audit **all five** candidates, then **pick three**.
Run the market-fit gate first — it takes 15 minutes and can drop a candidate before you
spend 2 hours on SERP research it could never convert.

## The four gates

### 1. Market fit (15 min) — the repo-specific gate

*Can a page about this niche be grounded in offers already on the board?*

The board holds package holidays from MUC/NUE/STR/FRA to ES/GR/TR/PT/IT/CY/MT, 4–10 nights,
€400–2,000. If the niche needs inventory the board cannot show, the answer is no — and the
cost of "yes" is a second site with a second verification loop, which 8 h/week cannot carry.

Also check: the niche claim must be **prose you researched**, not an offer label. The board
cannot verify pet policy or step-free access per listing.

### 2. SERP audit (2 h)

Search 10 real questions people in the niche ask. For each, record:

- **Who ranks.** Big publishers (Condé Nast, Lonely Planet, Tripadvisor) → skip the query.
  Forums, Reddit, Quora, thin small blogs → opportunity, because Google cannot find better.
- **How good.** Outdated, thin, or vague answers you can beat with something specific.
- **What the page is.** Mostly affiliate listicles → monetizable but competitive. No
  commercial pages at all → possibly no buyers.

### 3. Money-page check

Name **3 programs you could actually join**, and for each:

| Field | Why it matters |
| --- | --- |
| Payout per customer | Traffic with nothing to sell is a hobby |
| Cookie window | Viator is ~30 days on its current affiliate offering; others are hours |
| Minimum traffic requirement | Some programs will not accept a domain this new |
| Accepts your country | A niche can look perfect until you find the only good program will not take you |
| Real terms, read from the live program card | Do not rely on the ballpark figures below |

### 4. Right to win

One sentence you can say that a generic writer cannot. If you cannot write it, the niche is
not yours — unless you have lived experience in it, which is recorded here because it
changes the ranking of every other gate.

---

## Commission figures: unverified

The ideation session quoted **15–25% for insurance** and **8–12% for niche tours**. Treat
these as **ballpark and probably optimistic.** Verify each against live program terms during
gate 3 and replace the number here with the figure plus the date and source you read it from.

Do not let a ballpark justify a niche.

---

## Candidates — preliminary market-fit, unaudited

Statuses below are **my reading of the board's inventory, not a verified audit.** They exist
so the week-1–2 work starts from analysis rather than a blank page. Correct them with
evidence.

### Mobility / accessible travel — preliminary fit: **yes**

- **Why it fits:** the logistics are destination-specific and the offers already exist.
  "Airport to old town with a walker: exactly what works" is a Crete page, not a new market.
- **Angle:** hyper-specific logistics. Direct flights, transfer distances, step-free claims
  that suppliers make and do not verify.
- **Data idea (deferred):** OpenStreetMap carries `wheelchair=yes/limited/no` on hotels,
  restaurants and stations. Legal under ODbL with attribution, patchy, and almost nobody
  turns it into a decision tool. Do **not** build this now — it is a kept-niche project.
- **Risk:** accessibility claims are the easiest place in this whole plan to be wrong, and
  being wrong here harms a disabled traveller. Every claim needs a named source or it does
  not get published.
- **Right to win:** unproven. Requires either lived experience or real audits.

### Dog-friendly travel — preliminary fit: **yes**

- **Why it fits:** rules-and-costs pages about existing destinations. "Taking a dog on a
  package holiday from Stuttgart — the rules before the price."
- **Angle:** the constraint query. Airline pet policy, in-cabin vs hold, breed and size
  limits, quarantine, resort pet fees, and the fact that most tour operators will not tell
  you until you ask.
- **Data idea (deferred):** OSM `dog=yes` tags help but are incomplete; breed and size
  limits need manual verification.
- **Risk:** few dedicated affiliate programs. Likely monetises through general booking and
  activity programs, so the payout per customer may be low. Check this in gate 3 before
  committing.

### Solo travel, women 50+ — preliminary fit: **yes**

- **Why it fits:** single rooms and single supplements are a real feature of existing
  package offers. "Solo from Nuremberg: single rooms, single supplements, what they cost."
- **Angle:** the single supplement is a genuine, specific, poorly-documented price problem.
  High-intent, money-adjacent, and big sites answer it vaguely.
- **Distribution:** the strongest Pinterest fit of the five, which matters because a new
  domain cannot wait on Google.
- **Risk:** insurance and safety angles monetise well but drift toward the listicle. Hold
  the line on decision pages.
- **Right to win:** unproven without lived experience in the demographic.

### Dark sky / stargazing travel — preliminary fit: **weak**

- **Why it is weak:** the market only partially covers it. Madeira, Cyprus and parts of
  Sardinia qualify; the Spanish and Greek mainland beach destinations mostly do not. That is
  a handful of destinations, not a niche with two pages each.
- **Verdict to test:** treat it as **one data-led article at most**, not a test niche.
- **Data idea (deferred):** moon phase + Open-Meteo cloud cover + light-pollution maps gives
  "best dates and places to see the sky this month." Computed content, not opinion, and
  nearly unserved. This is exactly the deferred monthly-report work — it does not get built
  before a niche is kept.
- **Risk:** no clear affiliate path. Stargazing tours are specialist operators, mostly
  outside the package-holiday inventory the board holds.

### Medical tourism — preliminary fit: **no. Parked.**

- **Why it does not fit:** it is not a package holiday. Different inventory, different
  buyer, different affiliate programs, and a verification loop the board cannot provide.
- **The uncomfortable part:** it is the highest-commission candidate on this list. That is
  precisely why it needs to be parked rather than chased — high commission on a niche you
  cannot ground in existing offers means a second site, a second data source, and a second
  verification loop, at 8 h/week. The 12-week test would not finish.
- **Also:** the credibility bar is severe. A wrong claim about a medical procedure is not a
  wrong price, and no amount of curation on the current board earns the authority to write
  it.
- **Trigger to revisit:** a niche **kept** at week 12 **and** weekly capacity above 8 h.
  Reversible; the decision is about sequencing, not about the niche being bad.

---

## Template for each audit

Copy per candidate. Fill it in during weeks 1–2.

```
### <niche>
Date audited:            Auditor:
1. MARKET FIT
   Offers on the board that ground it:   (how many, which hubs)
   Niche claim as prose, not a label?    (yes/no, and what needs a source)
   Verdict: fits | weak | no
2. SERP AUDIT — 10 questions
   Q | who ranks | how thin | commercial pages present?
   Score: open | contested | closed
3. MONEY-PAGE CHECK
   Program | payout | cookie | min traffic | accepts DE? | source + date read
   Can I name 3 I could actually join?  yes/no
4. RIGHT TO WIN
   The one sentence a generic writer cannot produce:
   Lived experience in this niche:        (yes/no — say what)
VERDICT: pick | hold | drop
Reason (one paragraph, so future-you cannot reinterpret it):
```

## Outcome

| Niche | Market fit | SERP | Money | Right to win | Verdict |
| --- | --- | --- | --- | --- | --- |
| Mobility / accessible | yes | — | — | — | pending |
| Dog-friendly | yes | — | — | — | pending |
| Solo women 50+ | yes | — | — | — | pending |
| Dark sky / stargazing | weak | — | — | — | pending |
| Medical tourism | no | — | — | — | **parked** |

When three are picked: record them in [`decision-log.md`](decision-log.md), add their tokens
to the `NICHE_CODES` map in [`../app/lib/niche.ts`](../app/lib/niche.ts), and name them in
[`../.github/copilot-instructions.md`](../.github/copilot-instructions.md).

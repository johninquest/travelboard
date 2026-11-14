# Decision log

The format the [`value-challenger`](../.github/skills/value-challenger/SKILL.md) skill emits
at the end of a session. Kept in the repo because memory does not carry between sessions, and
because an agent that knows *why* a decision was made makes better judgement calls than one
that is only told what was decided.

Newest first. Do not edit old entries — add a new one that supersedes them.

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

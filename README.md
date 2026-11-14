# travelboard

*Working title. The brand in the code (`travelboard`, `travelboard.johnxlabs.de`) is a
placeholder, not a decision.*

## What it is

A board of package-holiday offers for a deliberately narrow market: departures from German
airports; Spain, Greece, Turkey, Portugal, Italy, Cyprus, Malta; 4â€“10 nights; â‚¬400â€“â‚¬2,000;
typically two adults. Narrow on purpose, so that one person can actually verify what is on it.

Every offer on the board was found in a public travel feed and then checked by a human
before it went live. Prices are the supplier's, shown as a total and per person, with the
date they were last verified. Booking happens at the supplier; the board earns an affiliate
commission on the click.

## Why it exists

Travel sites are good at search and terrible at deciding. An aggregator answers "here are
2,843 hotels"; nobody answers "given what you told me, this is the trip I'd book, and here
is why."

The bet is that this is not a discovery problem but a **decision** problem â€” and that a
small, curated, honestly-labelled board beats an exhaustive one. So the product's value is
neither the data (public feeds, anyone can read them) nor the AI (deliberately deferred).
It is the judgement applied on the way in: what is worth showing, what is a real price,
what is stale, what should be dropped.

The corollary is the hardest rule in the project: **a feed item is discovery, not a fact.**
An offer is never live until a person has verified the price on the source page. Travel is a
bad domain in which to be wrong â€” a fake â‚¬549 holiday costs someone real money and costs the
board its only asset, which is trust. Never present an estimate as a confirmed price.

## The goal

Prove that curated decision-making is worth something on its own: that people arrive, read
the board, and click through to a supplier. If the curation is good, the rest â€” more sources,
better ranking, an interface that interprets free-text preferences â€” is mechanical. If it is
not, no amount of machinery fixes it.

So the goal right now is a small board with a real audience and an honest click-through, not
a complete platform. Build the least that can be judged, then let the judging change it.

The board is now also the **instrument for a 12-week content test**: audience niches
(mobility, dogs, solo travel at 50+) are written as guides about the offers already on this
board, and every affiliate click is attributed as `niche_article_listing` so "which niche
earns" is answerable. The plan, the weekly hours budget and the keep/kill rules are in
[docs/strategy.md](./docs/strategy.md); the reasoning behind each decision is in
[docs/decision-log.md](./docs/decision-log.md). The cap that matters: no more than 30% of
effort on dashboard code. Building the board is more fun than writing, and the writing is
what produces the answer.

## What this is not

- Not an AI travel planner. AI is the interface later, never the hypothesis now.
- Not an aggregator. It does not try to hold every offer, only the ones worth a look.
- Not an affiliate SEO farm. No mass-generated, near-identical pages, and no
  evergreen article archive: every guide is tied to the live offers it is about.
- Not a booking engine. No payments, no inventory, no supplier contracts.

## In this repo

| Path | What's there |
| --- | --- |
| [`app/`](./app) | The Next.js site â€” board, deal pages, hubs, guides, curation admin, ingest worker |
| [`docs/`](./docs) | The live experiment: strategy and keep/kill rules, niche audits, approved data sources, decision log, and the older product principles |
| [`pocketbase/`](./pocketbase) | Collections and schema for sources, listings and clicks |
| [`ideation_session.txt`](./ideation_session.txt) | Source of truth for product decisions â€” read before changing direction |

Setup, routes, commands and architecture: [`app/README.md`](./app/README.md).

## Deploying

The site is `app/`; the rest of the repo is sibling material (`pocketbase/`,
`specs/`, the ideation doc). Nothing needs to move â€” every host supports a **base
directory**, and that is the supported way to deploy a monorepo member.

Keep these in step when you touch them: `app/package.json` (`engines.node`),
`app/.nvmrc`, `netlify.toml` (`NODE_VERSION`). Next 16.4 requires Node â‰¥ 20.9.

### Netlify

[`netlify.toml`](./netlify.toml) is committed, so a fresh site picks up the right
settings: `base = "app"`. Connect the repo and deploy â€” nothing to configure in
the dashboard.

### Vercel

Set **Root Directory** to `app` in project settings. Vercel reads `app/.nvmrc`.

### Docker (VPS)

[`Dockerfile`](./Dockerfile) uses the `output: "standalone"` build already set in
[`app/next.config.ts`](./app/next.config.ts), so the runtime image carries no
`node_modules` or build toolchain.

```bash
docker build -t travelboard --build-arg NEXT_PUBLIC_SITE_URL=https://example.com .
docker run --rm -p 3000:3000 --env-file app/.env.local travelboard
```

`NEXT_PUBLIC_*` variables are inlined at build time, so they must be build args.
Everything else (`PB_URL`, `TRAVELPAYOUTS_*`) is read at request time and can be
passed at run.

### Why not move the app to the repo root

It would break every `@/*` import and the relative paths to `public/fonts` and
`scripts/`, for no deployment benefit â€” a base directory is the documented answer
on all three targets. The only thing that actually made monorepo detection
unreliable was the stray empty `package-lock.json` at the root, which has been
removed. Do not add a root `package.json`: that would create a second Node project
for hosting platforms to pick up by mistake.

### Running from the repo root

```bash
npm --prefix app run dev
npm --prefix app test
```

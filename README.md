# travelboard

*Working title. The brand in the code (`travelboard`, `travelboard.johnxlabs.de`) is a
placeholder, not a decision.*

## What it is

A board of package-holiday offers for a deliberately narrow market: departures from German
airports; Spain, Greece, Turkey, Portugal, Italy, Cyprus, Malta; 4–10 nights; €400–€2,000;
typically two adults. Narrow on purpose, so that one person can actually verify what is on it.

Every offer on the board was found in a public travel feed and then checked by a human
before it went live. Prices are the supplier's, shown as a total and per person, with the
date they were last verified. Booking happens at the supplier; the board earns an affiliate
commission on the click.

## Why it exists

Travel sites are good at search and terrible at deciding. An aggregator answers "here are
2,843 hotels"; nobody answers "given what you told me, this is the trip I'd book, and here
is why."

The bet is that this is not a discovery problem but a **decision** problem — and that a
small, curated, honestly-labelled board beats an exhaustive one. So the product's value is
neither the data (public feeds, anyone can read them) nor the AI (deliberately deferred).
It is the judgement applied on the way in: what is worth showing, what is a real price,
what is stale, what should be dropped.

The corollary is the hardest rule in the project: **a feed item is discovery, not a fact.**
An offer is never live until a person has verified the price on the source page. Travel is a
bad domain in which to be wrong — a fake €549 holiday costs someone real money and costs the
board its only asset, which is trust. Never present an estimate as a confirmed price.

## The goal

Prove that curated decision-making is worth something on its own: that people arrive, read
the board, and click through to a supplier. If the curation is good, the rest — more sources,
better ranking, an interface that interprets free-text preferences — is mechanical. If it is
not, no amount of machinery fixes it.

So the goal right now is a small board with a real audience and an honest click-through, not
a complete platform. Build the least that can be judged, then let the judging change it.

## What this is not

- Not an AI travel planner. AI is the interface later, never the hypothesis now.
- Not an aggregator. It does not try to hold every offer, only the ones worth a look.
- Not an affiliate SEO farm. No mass-generated, near-identical pages.
- Not a booking engine. No payments, no inventory, no supplier contracts.

## In this repo

| Path | What's there |
| --- | --- |
| [`app/`](./app) | The Next.js site — board, deal pages, hubs, curation admin, ingest worker |
| [`pocketbase/`](./pocketbase) | Collections and schema for sources, listings and clicks |
| [`ideation_session.txt`](./ideation_session.txt) | Source of truth for product decisions — read before changing direction |

Setup, routes, commands and architecture: [`app/README.md`](./app/README.md).

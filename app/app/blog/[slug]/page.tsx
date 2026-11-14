import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { allPosts, formatDate, getPost, postUrl, type BlogPost } from "@/lib/blog";
import { BODIES } from "@/lib/blog-bodies";
import { findHub, type HubDef } from "@/lib/hubs";
import { getHubListings } from "@/lib/store";
import { BRAND, RSS_ALTERNATE } from "@/lib/site";
import { DealRow } from "@/components/deal-row";

// Same gate as the hub pages: an article is only allowed to show offers it can
// actually stand behind, so below three live offers it says so instead of
// presenting a sample of one as a selection.
const MIN_OFFERS = 3;

type Props = { params: Promise<{ slug: string }> };

// The registry is the route table: only declared posts exist. `getPost()`
// returns null for anything else and the page 404s, so a stray .mdx file or a
// mistyped URL never becomes a public page.
//
// Cache Components rejects an empty generateStaticParams, hence the placeholder
// for the "no articles yet" state. It is unreachable: getPost("__none__") is
// null, so the page calls notFound().
export function generateStaticParams() {
  const params = allPosts().map((p) => ({ slug: p.slug as string }));
  return params.length > 0 ? params : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return { title: "Guide not found" };
  return {
    title: post.title,
    description: post.summary,
    alternates: { canonical: postUrl(post.slug), types: RSS_ALTERNATE },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.summary,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      url: postUrl(post.slug),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav className="mb-6 text-sm">
        <Link href="/blog" className="text-muted-foreground hover:text-foreground">
          ← All guides
        </Link>
      </nav>
      {/* params is URL data the shell cannot know, so it is read inside a
          boundary — otherwise the route blocks navigation instead of painting
          the shell first. Same shape as /deal/[slug] and /holidays/[slug]. */}
      <Suspense fallback={<PostSkeleton />}>
        <PostBody params={params} />
      </Suspense>
    </main>
  );
}

function PostSkeleton() {
  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="h-8 w-3/4 animate-pulse rounded-input bg-surface-warm" />
      <div className="h-4 w-1/3 animate-pulse rounded-input bg-surface-warm" />
      <div className="h-64 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}

async function PostBody({ params }: { params: Props["params"] }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const hub = findHub(post.hub);
  const Body = BODIES[post.slug];

  return (
    <>
      <article>
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">{post.title}</h1>
        <p className="mt-2 text-xs text-subtle">
          {formatDate(post.publishedAt)}
          {post.updatedAt ? ` · updated ${formatDate(post.updatedAt)}` : ""}
          {hub ? (
            <>
              {" · "}
              <Link href={`/holidays/${hub.slug}`} className="underline hover:text-foreground">
                {hub.name}
              </Link>
            </>
          ) : null}
        </p>
        <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
          {post.summary}
        </p>

        <div className="mt-2">
          <Body />
        </div>
      </article>

      {/* Nested boundary: the prose paints before the live board is read, so a
          slow store read never delays the article itself. */}
      {hub && (
        <Suspense fallback={<OffersSkeleton />}>
          <GroundedOffers hub={hub} post={post} />
        </Suspense>
      )}

      <ArticleJsonLd post={post} />

      <p className="mt-10 border-t border-border pt-6 text-xs text-subtle">
        Prices on this page come from the board and are re-checked on every read;
        an offer disappears as soon as it goes stale. Editorial judgement is ours,
        the offers are the suppliers&apos;.{" "}
        <Link href="/deals" className="underline hover:text-foreground">
          See all current offers
        </Link>
        .
      </p>
    </>
  );
}

function OffersSkeleton() {
  return (
    <div className="mt-10">
      <div className="h-24 animate-pulse rounded-card border border-border bg-surface" />
    </div>
  );
}

// The part that makes an article a decision page rather than an SEO article: the
// live offers for the hub the piece is about. Reads at request time so staleness
// is evaluated against now, not against the deploy date.
async function GroundedOffers({ hub, post }: { hub: HubDef; post: BlogPost }) {
  await connection();
  const offers = await getHubListings(hub).catch(() => []);
  const linked = post.deals.length
    ? offers.filter((l) => post.deals.includes(l.slug))
    : [];
  const shown = linked.length ? linked : offers;

  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-lg font-bold">
        {shown.length ? `${hub.name}: offers that pass these checks` : hub.name}
      </h2>

      {shown.length < MIN_OFFERS ? (
        <p className="mt-3 max-w-[70ch] text-sm text-muted-foreground">
          We do not currently have enough verified offers in this category to put
          a selection below this guide, and we will not pad it with unchecked
          feed items. The full board is{" "}
          <Link href="/deals" className="text-primary underline">
            here
          </Link>
          ; it grows as editorial review continues.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Checked prices, as stated by the supplier. Each offer shows the date it
            was last verified.
          </p>
          <div className="mt-4 border-t border-border">
            {shown.map((l) => (
              <DealRow key={l.id} listing={l} from={`blog_${post.slug}`} />
            ))}
          </div>
          {/* Commercial-purpose disclosure, next to the links rather than in a page
              footer — the same UWG § 5a Abs. 4 / Anhang Nr. 11 reasoning the deal
              page follows. These rows lead to affiliate-wrapped outbound clicks
              attributed to this article, so this is where a reader must be told. */}
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-subtle">
            Advertising · affiliate link
          </p>
          <p className="mt-1 text-[11px] text-subtle">
            Offers link to the tour operator. We may receive a commission on
            referred bookings — this does not change the price.
          </p>
        </>
      )}
    </section>
  );
}

function ArticleJsonLd({ post }: { post: BlogPost }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    url: postUrl(post.slug),
    publisher: { "@type": "Organization", name: BRAND },
    isAccessibleForFree: true,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, RSS_ALTERNATE } from "@/lib/site";
import { allPosts, formatDate, postPath } from "@/lib/blog";
import { findHub } from "@/lib/hubs";

// The article index. Deliberately plain: date, title, one-sentence summary, and
// the decision each piece is about. No tags page, no pagination, no excerpts —
// those are deferred until there are enough posts to need them.

export const metadata: Metadata = {
  title: "Guides",
  description: `How to judge a package-holiday offer: the checks ${BRAND} applies before an offer goes on the board.`,
  alternates: {
      types: RSS_ALTERNATE,
  },
};

export default function BlogIndexPage() {
  const posts = allPosts();

  return (
    <main className="mx-auto max-w-(--container-page) px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold md:text-3xl">Guides</h1>
      <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
        How to read a package-holiday offer — what a price actually means, what it
        excludes, and when a discount is not one. Each guide is tied to the live
        offers it is about.
      </p>

      {posts.length === 0 ? (
        <p className="mt-6 rounded-card border border-border bg-surface-warm p-6 text-sm text-muted-foreground">
          No guides published yet.
        </p>
      ) : (
        <div className="mt-8 border-t border-border">
          {posts.map((post) => {
            const hub = findHub(post.hub);
            return (
              <article key={post.slug} className="border-b border-border py-5">
                <p className="text-xs text-subtle">
                  {formatDate(post.publishedAt)}
                  {post.updatedAt ? ` · updated ${formatDate(post.updatedAt)}` : ""}
                  {hub ? ` · ${hub.name}` : ""}
                </p>
                <h2 className="font-display mt-1 text-lg font-bold">
                  <Link href={postPath(post.slug)} className="hover:text-primary">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-1 max-w-[70ch] text-sm text-muted-foreground">
                  {post.summary}
                </p>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-subtle">
        <a href="/blog/feed.xml" className="underline hover:text-foreground">
          RSS feed
        </a>
      </p>
    </main>
  );
}
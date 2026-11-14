import Link from "next/link";
import { formatDate, latestPosts, postPath } from "@/lib/blog";

// "Latest guides" for the landing page. The board stays the hero, so this is a
// short three-item strip underneath it — the point is to make the guides
// discoverable, not to turn the front door into a blog.
//
// Renders nothing when there are no posts: an empty "Latest guides" heading
// would be worse than no section at all.
export function LatestGuides() {
  const posts = latestPosts(3);
  if (posts.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-bold">Latest guides</h2>
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
          All guides
        </Link>
      </div>

      <ul className="mt-3 border-t border-border">
        {posts.map((post) => (
          <li key={post.slug} className="border-b border-border">
            <Link href={postPath(post.slug)} className="group block py-3">
              <p className="text-xs text-subtle">{formatDate(post.publishedAt)}</p>
              <p className="font-display mt-0.5 text-base font-bold group-hover:text-primary">
                {post.title}
              </p>
              <p className="mt-0.5 max-w-[70ch] text-sm text-muted-foreground">
                {post.summary}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
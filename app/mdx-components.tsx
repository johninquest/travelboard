import type { MDXComponents } from "mdx/types";

// Styling for article prose. Deliberately hand-mapped to the tokens already in
// globals.css rather than pulling in @tailwindcss/typography: the blog should
// look like the rest of the board, not like a documentation site, and adding a
// plugin would restyle every element on every page.
//
// These are the only components MDX articles get. Anything more (a live offer
// block, a comparison table) is composed in the article page, not invented per
// article, so the writing stays plain prose.
const components: MDXComponents = {
  h1: ({ children }) => (
    <h2 className="font-display mt-10 text-xl font-extrabold md:text-2xl">{children}</h2>
  ),
  h2: ({ children }) => (
    <h2 className="font-display mt-10 text-xl font-extrabold md:text-2xl">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-display mt-8 text-base font-bold md:text-lg">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 max-w-[70ch] text-sm leading-relaxed text-foreground">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 max-w-[70ch] list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 max-w-[70ch] list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline underline-offset-2 hover:text-primary-hover">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="mt-6 max-w-[70ch] border-l-2 border-border-strong pl-4 text-sm text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="mt-10 max-w-[70ch] border-border" />,
  code: ({ children }) => (
    <code className="rounded bg-surface-warm px-1 py-0.5 text-[0.9em]">{children}</code>
  ),
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full max-w-[70ch] border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border-strong py-2 pr-4 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border py-2 pr-4">{children}</td>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
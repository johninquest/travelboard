// Body map for blog articles. Separate from lib/blog.ts so that module stays
// plain, testable TypeScript: vitest never has to compile MDX.
//
// Every post declared in lib/blog.ts must appear here — `Record<PostSlug, …>`
// makes a missing or misspelled entry a type error.

import type { MDXContent } from "mdx/types";
import type { PostSlug } from "./blog";
import HowToSpotAGoodPackageDeal from "@/content/blog/how-to-spot-a-good-package-deal.mdx";
import CheapGreekWinterWhatIsOpen from "@/content/blog/cheap-greek-winter-what-is-open.mdx";

export const BODIES: Record<PostSlug, MDXContent> = {
  "how-to-spot-a-good-package-deal": HowToSpotAGoodPackageDeal,
  "cheap-greek-winter-what-is-open": CheapGreekWinterWhatIsOpen,
};
import { Suspense } from "react";
import type { Metadata } from "next";
import { inter, cabinetGrotesk } from "@/lib/fonts";
import { GoogleAnalytics } from "@/components/google-analytics";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { BRAND, RSS_ALTERNATE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND} — where to look for a package holiday`,
    template: `%s · ${BRAND}`,
  },
  description:
    "Which destinations are in season this month, and which kind of booking site carries that inventory — plus verified package offers from German airports.",
    alternates: {
      types: RSS_ALTERNATE,
    },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cabinetGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* usePathname() is URL data, which Next refuses to read in a Client Component
            outside a Suspense boundary — without this the build fails at prerender. The
            fallback is null: the tracker renders nothing and measures nothing. */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <GoogleAnalytics />
      </body>
    </html>
  );
}

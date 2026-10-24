import type { Metadata } from "next";
import { inter, cabinetGrotesk } from "@/lib/fonts";
import { PageViewTracker } from "@/components/page-view-tracker";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { BRAND } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND} — verified package holiday offers`,
    template: `%s · ${BRAND}`,
  },
  description:
    "Curated package holiday offers departing from German airports: price, trip length, departure airport and travel dates — no fluff.",
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
        <PageViewTracker />
      </body>
    </html>
  );
}

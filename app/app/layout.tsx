import type { Metadata } from "next";
import { inter, cabinetGrotesk } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "sunwise. — AI can help you explore. We help you decide.",
    template: "%s · sunwise.",
  },
  description:
    "Tell us your budget and dates. We return 3–5 complete trips we'd actually book — each with a price, a reason, and a link.",
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
        {children}
      </body>
    </html>
  );
}

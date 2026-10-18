import localFont from "next/font/local";

// Body/UI face. Inter variable, latin-subset (~75KB), self-hosted.
// Used for everything except display headlines - including all prices (tnum).
export const inter = localFont({
  src: "../public/fonts/inter-variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
  fallback: ["system-ui", "sans-serif"],
});

// Display face. Cabinet Grotesk static 700/800 only (~7.5KB each).
// Headlines, destination names, logo. Never used for prices or data.
export const cabinetGrotesk = localFont({
  src: [
    { path: "../public/fonts/cabinet-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/cabinet-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["var(--font-body)", "system-ui", "sans-serif"],
});
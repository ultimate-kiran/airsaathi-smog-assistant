import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Noto_Sans_Devanagari, Public_Sans } from "next/font/google";
// Global styles, split by area; the import order is the cascade order.
import "./styles/01-base.css";
import "./styles/02-controls.css";
import "./styles/03-hero.css";
import "./styles/04-page.css";
import "./styles/05-form.css";
import "./styles/06-plan.css";
import "./styles/07-footer-responsive.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
  variable: "--font-display",
  display: "swap",
});
const body = Public_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: "AirSaathi: smog plans for your family",
  description:
    "A GenAI assistant that turns today's air quality into a plan for your household: low-emission routines, indoor air fixes and cleaner swaps, with the impact of each choice explained in numbers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F3F5F6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${deva.variable}`}>
      <body>{children}</body>
    </html>
  );
}

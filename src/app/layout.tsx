import type { Metadata } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

const onest = Onest({ variable: "--font-onest", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hindsight — trade post-mortem",
  description:
    "Load a trade history and get a behavioural post-mortem: the patterns you repeat, the trades that prove it, and a checklist for the next one.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${onest.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full">
        <div hidden aria-hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}

const CONTRACT = `
  THESIS: Your trade history rendered as a landscape you look back across — the valley floor
  is your real equity curve — then interrogated until every claim points at a trade.
  Refuses the trading-journal dashboard of stat tiles and candlestick chrome.
  OWN-WORLD: Pure black, monochrome greys and white, one muted loss red inside data only.
  Line-field terrain in canvas, dark glass panels lit from above with a travelling top-edge
  highlight, pill actions with a soft white glow, dust drifting in the beam. Onest for type,
  JetBrains Mono for every measured figure.
  STORY: The visitor sees their losses as terrain, learns the model cannot invent a number,
  watches four working diagrams of the mechanism, then runs it on their own file and clicks
  the verdict's trade IDs to watch it prove itself.
  FIRST VIEWPORT: Full-height canvas terrain; centred two-line headline and one-line lead at
  the top; white pill "Run the post-mortem" beside a ghost "See how it works"; the glowing
  mark tile sitting in the valley with a light beam falling from it.
  FORM: Pinned by the user's reference image hin.jpg; grounded candidate 1 of 7. Seed 64dd9ee0.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review.
`;

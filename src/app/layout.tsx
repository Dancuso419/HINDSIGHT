import type { Metadata } from "next";
import { Archivo, Archivo_Black, Azeret_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const archivoBlack = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });
const azeret = Azeret_Mono({ variable: "--font-azeret", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hindsight — trade post-mortem",
  description:
    "Load a trade history and get a behavioural post-mortem: the patterns you repeat, the trades that prove it, and a checklist for the next one.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${archivoBlack.variable} ${azeret.variable} h-full`}>
      <body className="min-h-full">
        <div hidden aria-hidden dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }} />
        {children}
      </body>
    </html>
  );
}

const CONTRACT = `
          THESIS: A verdict on your own trading, set at poster scale and provable on contact.
          Refuses the dashboard-of-cards this category always ships.
          OWN-WORLD: Warm near-black ground, one gold, bone text, clay and sage for sign.
          Full-height hairline columns, oversized Archivo Black display, Azeret Mono for every
          measured figure. No cards, no tiles — rules and space do the dividing.
          STORY: The trader arrives suspecting a pattern, states their question, and is handed a
          sentence they cannot argue with — then clicks the trade IDs and watches it prove itself.
          FIRST VIEWPORT: Masthead rule with the read-only vow; one display sentence at 8-10vw
          holding the left two-thirds; load controls sitting on the baseline beneath it.
          After analysis the same slot carries the generated verdict.
          FORM: Pinned by the user's reference image; grounded candidate 1 of 7. Seed 6362759c.
          FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review.
`;

import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import "./globals.css";

/* Beide Schriften werden von next/font zur Bauzeit heruntergeladen und danach
   vom eigenen Server ausgeliefert. Aus ihrem Browser geht kein Aufruf an Google —
   siehe CLAUDE.md §4 (LG München I, Az. 3 O 17493/20). */

const schriftUi = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--schrift-sans",
  display: "swap",
});

const schriftMail = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--schrift-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "E-Mail",
  description: "Dein Werkzeug fürs Schreiben.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#EDE7DA",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${schriftUi.variable} ${schriftMail.variable}`}>
      <body>{children}</body>
    </html>
  );
}

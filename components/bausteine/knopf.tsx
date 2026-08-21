import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Knopf — DESIGN.md §4.
 *
 * `haupt`  Grün, weiße Schrift, Innenabstand 14/28 px. Es gibt pro Bildschirm genau einen.
 * `neben`  Transparent, grüne Schrift, 1 px grüner Rand.
 * `text`   Nur Schrift in Grün, unterstrichen beim Überfahren. Für alles Untergeordnete.
 *
 * Die 14 px Innenabstand stehen so im Designdokument und sind deshalb als
 * fester Wert notiert, nicht als Abstandsstufe.
 */
type Art = "haupt" | "neben" | "text";

const arten: Record<Art, string> = {
  haupt:
    "bg-gruen text-weiss rounded-knopf px-[28px] py-[14px] hover:bg-gruen-tief active:bg-gruen-tief",
  neben:
    "bg-transparent text-gruen border border-gruen rounded-knopf px-[28px] py-[14px] hover:bg-grund-tief",
  text: "bg-transparent text-gruen hover:underline",
};

type Eigenschaften = ButtonHTMLAttributes<HTMLButtonElement> & {
  art?: Art;
};

const grundstil =
  "font-ui text-m font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Knopf({
  art = "haupt",
  className = "",
  ...rest
}: Eigenschaften) {
  return (
    <button
      {...rest}
      className={`${grundstil} ${arten[art]} ${className}`}
    />
  );
}

/**
 * Sieht aus wie ein Knopf, ist aber ein Link. Für Wege durch die App —
 * ein Knopf, der nur woanders hinführt, gehört als Link ausgezeichnet,
 * damit Tastatur und Vorleseprogramme ihn richtig einordnen.
 */
export function KnopfLink({
  art = "haupt",
  className = "",
  href,
  children,
}: {
  art?: Art;
  className?: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-block ${grundstil} ${arten[art]} ${className}`}
    >
      {children}
    </Link>
  );
}

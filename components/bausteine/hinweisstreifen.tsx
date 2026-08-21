import type { ReactNode } from "react";

/**
 * Hinweisstreifen — DESIGN.md §4.
 * Fläche --hinweis-flae, linke Kante 3 px --hinweis, kein Symbol, kein Rahmen.
 * Der Text erklärt, was zu tun ist, nicht was passiert ist.
 *
 * `art="fehler"` nur bei echten Fehlern — Rot erscheint sonst nirgends (DESIGN.md §1).
 */
export function Hinweisstreifen({
  children,
  art = "hinweis",
}: {
  children: ReactNode;
  art?: "hinweis" | "fehler";
}) {
  const kante = art === "fehler" ? "border-fehler" : "border-hinweis";
  const schrift = art === "fehler" ? "text-fehler" : "text-text";

  return (
    <div
      role={art === "fehler" ? "alert" : "status"}
      className={`bg-hinweis-flae border-l-[3px] ${kante} ${schrift} px-4 py-3 text-m`}
    >
      {children}
    </div>
  );
}

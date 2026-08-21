/**
 * Was zwischen Klick und fertiger Seite dasteht.
 *
 * **Kein Ladekreis und keine Prozentzahl** — dasselbe Prinzip wie beim
 * Formulieren (`DESIGN.md` §5): eine Zeile Text, die sagt, was passiert. Ein
 * Kreisel sagt nur „warte", ein Satz sagt „es passiert etwas, und zwar das".
 *
 * Seit Phase 9 bis 12 holen die Bildschirme echte Daten aus der Datenbank.
 * Ohne diese Datei bliebe der vorige Bildschirm stehen, bis alles da ist —
 * und ein Klick, auf den sekundenlang nichts folgt, fühlt sich an, als wäre
 * er nicht angekommen.
 *
 * `role="status"` sorgt dafür, dass ein Vorleseprogramm die Zeile ansagt
 * (`DESIGN.md` §8: „Statusänderungen für Vorleseprogramme angekündigt").
 */
export default function Laedt() {
  return (
    <main className="max-w-inhalt px-5 py-6">
      <p className="text-m text-text-leise" role="status">
        Einen Moment.
      </p>
    </main>
  );
}

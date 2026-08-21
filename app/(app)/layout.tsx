import { Seitenleiste } from "@/components/seitenleiste";

/**
 * Rahmen für alles, was hinter der Anmeldung liegt: Seitenleiste links,
 * Inhalt rechts daneben.
 *
 * Die Anmeldung liegt bewusst außerhalb dieser Gruppe — dort gibt es noch
 * nichts zu navigieren, und eine Leiste mit Bereichen, die sie noch nicht
 * betreten darf, wäre nur Beiwerk.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen">
      <Seitenleiste />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

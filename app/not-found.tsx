import Link from "next/link";

export default function NichtGefunden() {
  return (
    <main className="mx-auto max-w-inhalt px-4 py-8">
      <h1 className="text-xl font-semibold mb-3">Diese Seite gibt es nicht.</h1>
      <p className="text-m text-text-leise mb-6">
        Vermutlich ein alter Link. Von vorn anfangen ist der kürzeste Weg.
      </p>
      <Link
        href="/"
        className="font-ui text-m font-semibold text-gruen hover:underline"
      >
        Zur Startseite
      </Link>
    </main>
  );
}

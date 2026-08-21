"use client";

/**
 * Die letzte Auffangebene: greift, wenn schon das Grundgerüst der Seite bricht.
 * Bringt eigene <html>- und <body>-Elemente mit, weil das Layout hier nicht mehr steht —
 * deshalb stehen die Farben ausnahmsweise direkt am Element und nicht als Klasse.
 * Werte weiterhin aus DESIGN.md §1.
 */
export default function GlobalerFehler({ reset }: { reset: () => void }) {
  return (
    <html lang="de">
      <body
        style={{
          backgroundColor: "#EDE7DA",
          color: "#241F19",
          fontFamily: "system-ui, sans-serif",
          fontSize: "18px",
          lineHeight: "28px",
          margin: 0,
          padding: "96px 24px",
        }}
      >
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          <h1 style={{ fontSize: "26px", lineHeight: "34px", fontWeight: 600 }}>
            Da ist etwas hängengeblieben.
          </h1>
          <p style={{ color: "#6B6055", marginBottom: "48px" }}>
            Dein Text ist nicht verloren. Probier es gleich nochmal — wenn es
            wieder klemmt, warte eine Minute.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              backgroundColor: "#23402F",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              padding: "14px 28px",
              fontSize: "18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Nochmal versuchen
          </button>
        </div>
      </body>
    </html>
  );
}

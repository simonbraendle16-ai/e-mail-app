"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Feld } from "@/components/bausteine/feld";
import { Knopf } from "@/components/bausteine/knopf";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { linkAnfordern, type AnmeldeErgebnis } from "./aktionen";

function Absenden() {
  const { pending } = useFormStatus();
  return (
    <Knopf type="submit" disabled={pending}>
      {pending ? "Einen Moment noch." : "Link schicken"}
    </Knopf>
  );
}

export function Anmeldeformular() {
  const [ergebnis, absenden] = useActionState<AnmeldeErgebnis, FormData>(
    linkAnfordern,
    { stand: "leer" },
  );

  if (ergebnis.stand === "geschickt") {
    return (
      <div className="animate-auftauchen">
        <p className="text-m mb-3">
          Der Link ist unterwegs an <strong>{ergebnis.adresse}</strong>.
        </p>
        <p className="text-m text-text-leise">
          Öffne die Mail und klick auf den Link — dann bist du drin. Du kannst
          dieses Fenster offen lassen.
        </p>
      </div>
    );
  }

  return (
    <form action={absenden} className="flex flex-col gap-4">
      <Feld
        beschriftung="Deine E-Mail-Adresse"
        hilfe="Du bekommst einen Link zugeschickt. Ein Passwort brauchst du nicht."
        name="adresse"
        type="email"
        autoComplete="email"
        required
        placeholder="name@beispiel.de"
        /* Nach einem Fehler steht ihre Eingabe wieder da — korrigieren
           statt neu tippen. */
        defaultValue={ergebnis.stand === "fehler" ? ergebnis.adresse : ""}
        key={ergebnis.stand === "fehler" ? ergebnis.adresse : "leer"}
      />

      {ergebnis.stand === "fehler" ? (
        <Hinweisstreifen art="fehler">{ergebnis.text}</Hinweisstreifen>
      ) : null}

      <div>
        <Absenden />
      </div>
    </form>
  );
}

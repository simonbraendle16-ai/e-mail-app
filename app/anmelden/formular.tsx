"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Feld } from "@/components/bausteine/feld";
import { Knopf } from "@/components/bausteine/knopf";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { anmelden, type AnmeldeErgebnis } from "./aktionen";

function Absenden() { const { pending } = useFormStatus(); return <Knopf type="submit" disabled={pending}>{pending ? "Einen Moment noch." : "Anmelden"}</Knopf>; }
export function Anmeldeformular() {
  const [ergebnis, absenden] = useActionState<AnmeldeErgebnis, FormData>(anmelden, { stand: "leer" });
  return <form action={absenden} className="flex flex-col gap-4">
    <Feld beschriftung="Dein Name" hilfe="Beim ersten Mal wird dein Konto damit angelegt." name="name" type="text" autoComplete="username" required placeholder="Vor- und Nachname" defaultValue={ergebnis.stand === "fehler" ? ergebnis.name : ""} />
    <Feld beschriftung="Dein Passwort" hilfe="Mindestens 8 Zeichen." name="passwort" type="password" autoComplete="current-password" required />
    {ergebnis.stand === "fehler" ? <Hinweisstreifen art="fehler">{ergebnis.text}</Hinweisstreifen> : null}
    <div><Absenden /></div>
  </form>;
}

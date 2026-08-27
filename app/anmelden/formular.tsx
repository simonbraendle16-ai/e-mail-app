"use client";
import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Feld } from "@/components/bausteine/feld";
import { Knopf } from "@/components/bausteine/knopf";
import { Hinweisstreifen } from "@/components/bausteine/hinweisstreifen";
import { anmelden, type AnmeldeErgebnis } from "./aktionen";

function Absenden() { const { pending } = useFormStatus(); return <div className="flex flex-col gap-3 sm:flex-row"><Knopf name="modus" value="anmelden" type="submit" disabled={pending}>{pending ? "Einen Moment noch." : "Anmelden"}</Knopf><Knopf name="modus" value="neu" type="submit" disabled={pending} art="neben">Neues Konto erstellen</Knopf></div>; }
export function Anmeldeformular() {
  const router = useRouter();
  const [ergebnis, absenden] = useActionState<AnmeldeErgebnis, FormData>(anmelden, { stand: "leer" });
  useEffect(() => {
    if (ergebnis.stand === "angemeldet") router.replace("/");
  }, [ergebnis.stand, router]);
  return <form action={absenden} className="flex flex-col gap-4">
    <Feld beschriftung="Dein Name" hilfe="Beim ersten Mal wird dein Konto damit angelegt." name="name" type="text" autoComplete="username" required placeholder="Vor- und Nachname" defaultValue={ergebnis.stand === "fehler" ? ergebnis.name : ""} />
    <Feld beschriftung="Dein Passwort" hilfe="Mindestens 8 Zeichen." name="passwort" type="password" autoComplete="current-password" required />
    {ergebnis.stand === "fehler" ? <Hinweisstreifen art="fehler">{ergebnis.text}</Hinweisstreifen> : null}
    <div><Absenden /></div>
  </form>;
}

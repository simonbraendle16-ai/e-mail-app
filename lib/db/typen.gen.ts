/**
 * ERZEUGT — nicht von Hand ändern.
 *
 * Spiegelt das tatsächliche Schema in Supabase. Nach jeder Migration neu
 * erzeugen, sonst laufen Typen und Datenbank auseinander und der Compiler
 * merkt es nicht mehr.
 *
 * Neu erzeugen: siehe `lib/db/typen.ts`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      boilerplates: {
        Row: {
          erstellt_am: string;
          id: string;
          kategorie: string;
          name: string;
          nutzer_id: string;
          text_de: string;
          text_en: string | null;
        };
        Insert: {
          erstellt_am?: string;
          id?: string;
          kategorie?: string;
          name: string;
          nutzer_id: string;
          text_de: string;
          text_en?: string | null;
        };
        Update: {
          erstellt_am?: string;
          id?: string;
          kategorie?: string;
          name?: string;
          nutzer_id?: string;
          text_de?: string;
          text_en?: string | null;
        };
        Relationships: [];
      };
      chunks: {
        Row: {
          aus_archiv: boolean;
          einbettung: string | null;
          erstellt_am: string;
          id: string;
          inhalt: string;
          kunde_id: string | null;
          merkmale: Json;
          nutzer_id: string;
          quelle_art: string;
          quelle_id: string;
          tsv: unknown;
        };
        Insert: {
          aus_archiv?: boolean;
          einbettung?: string | null;
          erstellt_am?: string;
          id?: string;
          inhalt: string;
          kunde_id?: string | null;
          merkmale?: Json;
          nutzer_id: string;
          quelle_art: string;
          quelle_id: string;
          tsv?: unknown;
        };
        Update: {
          aus_archiv?: boolean;
          einbettung?: string | null;
          erstellt_am?: string;
          id?: string;
          inhalt?: string;
          kunde_id?: string | null;
          merkmale?: Json;
          nutzer_id?: string;
          quelle_art?: string;
          quelle_id?: string;
          tsv?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "chunks_kunde_id_fkey";
            columns: ["kunde_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      customer_facts: {
        Row: {
          bestaetigt: boolean;
          erstellt_am: string;
          fakt: string;
          id: string;
          kategorie: string;
          kunde_id: string;
          nutzer_id: string;
          quelle_mail_id: string | null;
          sicherheit: number;
        };
        Insert: {
          bestaetigt?: boolean;
          erstellt_am?: string;
          fakt: string;
          id?: string;
          kategorie?: string;
          kunde_id: string;
          nutzer_id: string;
          quelle_mail_id?: string | null;
          sicherheit?: number;
        };
        Update: {
          bestaetigt?: boolean;
          erstellt_am?: string;
          fakt?: string;
          id?: string;
          kategorie?: string;
          kunde_id?: string;
          nutzer_id?: string;
          quelle_mail_id?: string | null;
          sicherheit?: number;
        };
        Relationships: [
          {
            foreignKeyName: "customer_facts_kunde_id_fkey";
            columns: ["kunde_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_facts_quelle_fk";
            columns: ["quelle_mail_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          aktualisiert_am: string;
          ansprechpartner_geheim: string | null;
          ansprechpartner_such: string | null;
          anzeigename_geheim: string;
          anzeigename_such: string;
          branche: string | null;
          erstellt_am: string;
          firma_geheim: string | null;
          firma_such: string | null;
          id: string;
          land: string | null;
          letzter_kontakt_am: string | null;
          notizen: string | null;
          nutzer_id: string;
          sprache: string;
          tonalitaet: string | null;
        };
        Insert: {
          aktualisiert_am?: string;
          ansprechpartner_geheim?: string | null;
          ansprechpartner_such?: string | null;
          anzeigename_geheim: string;
          anzeigename_such: string;
          branche?: string | null;
          erstellt_am?: string;
          firma_geheim?: string | null;
          firma_such?: string | null;
          id?: string;
          land?: string | null;
          letzter_kontakt_am?: string | null;
          notizen?: string | null;
          nutzer_id: string;
          sprache?: string;
          tonalitaet?: string | null;
        };
        Update: {
          aktualisiert_am?: string;
          ansprechpartner_geheim?: string | null;
          ansprechpartner_such?: string | null;
          anzeigename_geheim?: string;
          anzeigename_such?: string;
          branche?: string | null;
          erstellt_am?: string;
          firma_geheim?: string | null;
          firma_such?: string | null;
          id?: string;
          land?: string | null;
          letzter_kontakt_am?: string | null;
          notizen?: string | null;
          nutzer_id?: string;
          sprache?: string;
          tonalitaet?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          ablage_pfad: string | null;
          art: string;
          erkannter_text: string | null;
          erstellt_am: string;
          id: string;
          kunde_id: string | null;
          nutzer_id: string;
          titel: string;
          verarbeitet_am: string | null;
        };
        Insert: {
          ablage_pfad?: string | null;
          art?: string;
          erkannter_text?: string | null;
          erstellt_am?: string;
          id?: string;
          kunde_id?: string | null;
          nutzer_id: string;
          titel: string;
          verarbeitet_am?: string | null;
        };
        Update: {
          ablage_pfad?: string | null;
          art?: string;
          erkannter_text?: string | null;
          erstellt_am?: string;
          id?: string;
          kunde_id?: string | null;
          nutzer_id?: string;
          titel?: string;
          verarbeitet_am?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_kunde_id_fkey";
            columns: ["kunde_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      email_versions: {
        Row: {
          anweisung: string | null;
          ausloeser: string;
          erstellt_am: string;
          id: string;
          mail_id: string;
          nummer: number;
          nutzer_id: string;
          text_de: string | null;
          text_en: string | null;
        };
        Insert: {
          anweisung?: string | null;
          ausloeser?: string;
          erstellt_am?: string;
          id?: string;
          mail_id: string;
          nummer: number;
          nutzer_id: string;
          text_de?: string | null;
          text_en?: string | null;
        };
        Update: {
          anweisung?: string | null;
          ausloeser?: string;
          erstellt_am?: string;
          id?: string;
          mail_id?: string;
          nummer?: number;
          nutzer_id?: string;
          text_de?: string | null;
          text_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "email_versions_mail_id_fkey";
            columns: ["mail_id"];
            isOneToOne: false;
            referencedRelation: "emails";
            referencedColumns: ["id"];
          },
        ];
      };
      emails: {
        Row: {
          aktualisiert_am: string;
          betreff: string | null;
          bewertung: number | null;
          eingehender_text: string | null;
          erstellt_am: string;
          id: string;
          ihre_stichworte: string | null;
          kunde_id: string | null;
          nutzer_id: string;
          skill: string | null;
          status: string;
          text_de: string | null;
          text_en: string | null;
          verdichtet_am: string | null;
          verdichtung: string | null;
        };
        Insert: {
          aktualisiert_am?: string;
          betreff?: string | null;
          bewertung?: number | null;
          eingehender_text?: string | null;
          erstellt_am?: string;
          id?: string;
          ihre_stichworte?: string | null;
          kunde_id?: string | null;
          nutzer_id: string;
          skill?: string | null;
          status?: string;
          text_de?: string | null;
          text_en?: string | null;
          verdichtet_am?: string | null;
          verdichtung?: string | null;
        };
        Update: {
          aktualisiert_am?: string;
          betreff?: string | null;
          bewertung?: number | null;
          eingehender_text?: string | null;
          erstellt_am?: string;
          id?: string;
          ihre_stichworte?: string | null;
          kunde_id?: string | null;
          nutzer_id?: string;
          skill?: string | null;
          status?: string;
          text_de?: string | null;
          text_en?: string | null;
          verdichtet_am?: string | null;
          verdichtung?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "emails_kunde_id_fkey";
            columns: ["kunde_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      glossary: {
        Row: {
          begriff_de: string;
          begriff_en: string;
          bereich: string;
          erstellt_am: string;
          herkunft: string;
          id: string;
          notiz: string | null;
          nutzer_id: string;
          sicherheit: number;
          verbindlich: boolean;
        };
        Insert: {
          begriff_de: string;
          begriff_en: string;
          bereich?: string;
          erstellt_am?: string;
          herkunft?: string;
          id?: string;
          notiz?: string | null;
          nutzer_id: string;
          sicherheit?: number;
          verbindlich?: boolean;
        };
        Update: {
          begriff_de?: string;
          begriff_en?: string;
          bereich?: string;
          erstellt_am?: string;
          herkunft?: string;
          id?: string;
          notiz?: string | null;
          nutzer_id?: string;
          sicherheit?: number;
          verbindlich?: boolean;
        };
        Relationships: [];
      };
      style_rules: {
        Row: {
          aktualisiert_am: string;
          art: string;
          belege: number;
          erstellt_am: string;
          herkunft: string;
          id: string;
          kunde_id: string | null;
          muster: string | null;
          nutzer_id: string;
          regel: string;
          status: string;
        };
        Insert: {
          aktualisiert_am?: string;
          art?: string;
          belege?: number;
          erstellt_am?: string;
          herkunft?: string;
          id?: string;
          kunde_id?: string | null;
          muster?: string | null;
          nutzer_id: string;
          regel: string;
          status?: string;
        };
        Update: {
          aktualisiert_am?: string;
          art?: string;
          belege?: number;
          erstellt_am?: string;
          herkunft?: string;
          id?: string;
          kunde_id?: string | null;
          muster?: string | null;
          nutzer_id?: string;
          regel?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "style_rules_kunde_id_fkey";
            columns: ["kunde_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_log: {
        Row: {
          erstellt_am: string;
          id: string;
          kosten_eur: number;
          modell: string;
          nutzer_id: string;
          token_aus: number;
          token_ein: number;
          zweck: string;
        };
        Insert: {
          erstellt_am?: string;
          id?: string;
          kosten_eur?: number;
          modell: string;
          nutzer_id: string;
          token_aus?: number;
          token_ein?: number;
          zweck: string;
        };
        Update: {
          erstellt_am?: string;
          id?: string;
          kosten_eur?: number;
          modell?: string;
          nutzer_id?: string;
          token_aus?: number;
          token_ein?: number;
          zweck?: string;
        };
        Relationships: [];
      };
      weckruf: {
        Row: {
          gelaufen_am: string;
          id: number;
          quelle: string;
        };
        Insert: {
          gelaufen_am?: string;
          id?: never;
          quelle?: string;
        };
        Update: {
          gelaufen_am?: string;
          id?: never;
          quelle?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      abschnitte_suchen: {
        Args: {
          anzahl?: number;
          archiv_einbeziehen?: boolean;
          frage_einbettung: string;
          frage_text: string;
          nur_kunde?: string;
        };
        Returns: {
          aus_archiv: boolean;
          id: string;
          inhalt: string;
          kunde_id: string;
          punkte: number;
          quelle_art: string;
          quelle_id: string;
        }[];
      };
      faellige_verdichtungen: {
        Args: { hoechstens?: number };
        Returns: Database["public"]["Tables"]["emails"]["Row"][];
      };
      kunde_finden: {
        Args: { such_wert: string };
        Returns: Database["public"]["Tables"]["customers"]["Row"][];
      };
      mail_verdichten: {
        Args: { text_verdichtung: string; ziel_mail_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

-- Grundlage der Aehnlichkeitssuche (RAG). Siehe SUPABASE-SETUP.md Abschnitt 4.
-- Das Datenmodell selbst entsteht in Phase 2; diese Migration steht schon hier,
-- damit das Repo von Anfang an die Wahrheit ueber das Schema haelt.
create extension if not exists vector with schema extensions;

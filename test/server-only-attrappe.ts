/**
 * Attrappe für `server-only` in Tests.
 *
 * Das echte Paket wirft beim Import und schützt damit im Bau davor, dass
 * Servergeheimnisse in einer Client-Komponente landen. Genau dieser Schutz
 * bricht die Tests, die die betroffenen Module ja gerade prüfen sollen.
 *
 * Ersetzt wird das Paket nur hier, über einen Alias in vitest.config.ts —
 * im Bau bleibt der Schutz unverändert scharf.
 */
export {};

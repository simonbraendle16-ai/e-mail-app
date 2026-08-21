import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Auslieferung auf Cloudflare Workers.
 *
 * Kein zusätzlicher Zwischenspeicher (R2, KV): Diese App hat nichts, was sich
 * zu speichern lohnt. Jede Seite hängt an ihrer Anmeldung und wird pro Anfrage
 * erzeugt. Ein Cache wäre hier eine zweite Fehlerquelle ohne Gegenwert —
 * und eine weitere Stelle, an der Kundendaten liegen könnten.
 */
export default defineCloudflareConfig();

/**
 * Genera un id univoco (UUID v4) senza dipendere dal pacchetto "uuid" (rimosso: evita una
 * vulnerabilità nota nelle versioni <11.1.1 e riduce le dipendenze). Usa crypto.randomUUID()
 * quando disponibile; altrimenti (contesti non sicuri, es. accesso via IP di rete locale su
 * http invece di https/localhost — come quando si apre l'app dal telefono sulla stessa
 * Wi-Fi) genera l'UUID a mano con crypto.getRandomValues(), sempre disponibile.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes =
    typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
      ? crypto.getRandomValues(new Uint8Array(16))
      : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versione 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

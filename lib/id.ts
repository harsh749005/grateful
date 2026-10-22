/**
 * Creates a random UUID. `crypto.randomUUID` is missing on plain-http pages
 * (for example a phone opening a local dev server), so fall back to
 * `getRandomValues`, which is always available.
 */
export function createId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (placeholder) => {
    const random = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
    const digit = placeholder === 'x' ? random : (random & 3) | 8;
    return digit.toString(16);
  });
}
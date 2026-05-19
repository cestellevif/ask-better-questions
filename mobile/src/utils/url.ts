export function isHttpUrl(s?: string): s is string {
  return !!s && /^https?:\/\//i.test(s);
}

/** Extract the first http/https URL from a string (handles "text before URL" shares). */
export function extractUrl(s?: string): string | undefined {
  if (!s) return undefined;
  const match = s.match(/https?:\/\/\S+/i);
  return match ? match[0] : undefined;
}

export function normalizeUrl(s: string): string {
  const trimmed = s.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
}

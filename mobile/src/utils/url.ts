export function isHttpUrl(s?: string): s is string {
  return !!s && /^https?:\/\//i.test(s);
}

export function normalizeUrl(s: string): string {
  const trimmed = s.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
}

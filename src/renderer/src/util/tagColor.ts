/** Deterministic color for a tag: stable across sessions from its name. */
export function tagColor(name: string, stored?: string | null): string {
  if (stored) return stored
  let h = 0
  for (const ch of name) h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  return `hsl(${h % 360}, 55%, 45%)`
}

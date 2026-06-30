/** Join truthy class-name parts. Server- and client-safe (no "use client"). */
export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

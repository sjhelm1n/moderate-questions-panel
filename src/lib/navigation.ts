// SPDX-License-Identifier: Apache-2.0

export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  const hasControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.charCodeAt(0);
    return codePoint <= 31 || codePoint === 127;
  });
  if (value.includes("\\") || hasControlCharacter) return fallback;
  return value;
}

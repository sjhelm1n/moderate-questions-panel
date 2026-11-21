// SPDX-License-Identifier: Apache-2.0

function startsSpreadsheetFormula(value: string): boolean {
  let index = 0;
  while (index < value.length && value.charCodeAt(index) <= 32) index += 1;
  const firstVisibleCharacter = value[index];
  return firstVisibleCharacter === "="
    || firstVisibleCharacter === "+"
    || firstVisibleCharacter === "-"
    || firstVisibleCharacter === "@";
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  const neutralized = startsSpreadsheetFormula(text) ? `'${text}` : text;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function serializeCsvRow(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCsvCell).join(",");
}

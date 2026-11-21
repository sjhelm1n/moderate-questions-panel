import { describe, expect, it } from "vitest";
import { escapeCsvCell, serializeCsvRow } from "./csv";

describe("escapeCsvCell", () => {
  it("quotes text and doubles embedded quotes", () => {
    expect(escapeCsvCell('A "quoted" value')).toBe('"A ""quoted"" value"');
  });

  it.each(["=1+1", "+cmd", "-2+3", "@SUM(A1:A2)", "\t=HYPERLINK(\"https://example.com\")"])(
    "neutralizes spreadsheet formula input %s",
    (value) => {
      expect(escapeCsvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
    },
  );

  it("serializes every value as a quoted cell", () => {
    expect(serializeCsvRow(["Question", 5, null])).toBe('"Question","5",""');
  });
});

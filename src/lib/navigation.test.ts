import { describe, expect, it } from "vitest";
import { safeInternalPath } from "./navigation";

describe("safeInternalPath", () => {
  it("accepts local absolute paths", () => {
    expect(safeInternalPath("/session/example?tab=questions")).toBe(
      "/session/example?tab=questions",
    );
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil", "/bad\npath", "relative"]) (
    "rejects unsafe redirect value %s",
    (value) => {
      expect(safeInternalPath(value, "/safe")).toBe("/safe");
    },
  );
});

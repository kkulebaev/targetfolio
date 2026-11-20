import { describe, expect, it } from "vitest";

import { deviationLevel } from "./deviation";

describe("deviationLevel", () => {
  it("treats deviations up to 1 p.p. as ok", () => {
    expect(deviationLevel(0)).toBe("ok");
    expect(deviationLevel(1)).toBe("ok");
    expect(deviationLevel(-0.8)).toBe("ok");
  });

  it("warns between 1 and 3 p.p.", () => {
    expect(deviationLevel(1.1)).toBe("warn");
    expect(deviationLevel(-2.16)).toBe("warn");
    expect(deviationLevel(3)).toBe("warn");
  });

  it("flags deviations above 3 p.p. in both directions", () => {
    expect(deviationLevel(3.71)).toBe("high");
    expect(deviationLevel(-8.52)).toBe("high");
  });
});

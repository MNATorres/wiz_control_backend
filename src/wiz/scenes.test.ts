import { describe, expect, it } from "vitest";
import { SCENES } from "./scenes.js";

describe("SCENES", () => {
  it("maps known WiZ scene ids to names", () => {
    expect(SCENES[1]).toBe("Ocean");
    expect(SCENES[1000]).toBe("Rhythm");
  });

  it("has no duplicate scene names", () => {
    const names = Object.values(SCENES);
    expect(new Set(names).size).toBe(names.length);
  });
});

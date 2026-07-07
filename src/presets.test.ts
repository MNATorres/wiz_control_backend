import { describe, expect, it } from "vitest";
import { colorForIndex, getPreset, PRESETS } from "./presets.js";

describe("getPreset", () => {
  it("returns the preset matching the given key", () => {
    const preset = getPreset("blues");
    expect(preset?.name).toBe("Blues");
  });

  it("returns undefined for an unknown key", () => {
    expect(getPreset("does-not-exist")).toBeUndefined();
  });
});

describe("colorForIndex", () => {
  const preset = getPreset("blue-red-mix")!;

  it("cycles through the palette by index", () => {
    expect(colorForIndex(preset, 0)).toBe(preset.colors[0]);
    expect(colorForIndex(preset, 1)).toBe(preset.colors[1]);
  });

  it("wraps around when the index exceeds the palette length", () => {
    expect(colorForIndex(preset, preset.colors.length)).toBe(preset.colors[0]);
    expect(colorForIndex(preset, preset.colors.length + 1)).toBe(preset.colors[1]);
  });
});

describe("PRESETS", () => {
  it("has a unique key for every preset", () => {
    const keys = PRESETS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every preset at least one color", () => {
    for (const preset of PRESETS) {
      expect(preset.colors.length).toBeGreaterThan(0);
    }
  });
});

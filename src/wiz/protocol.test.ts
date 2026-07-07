import { describe, expect, it } from "vitest";
import { getPilotMessage, setPilotMessage } from "./protocol.js";

describe("getPilotMessage", () => {
  it("builds a getPilot request with no params", () => {
    expect(getPilotMessage()).toEqual({ method: "getPilot", params: {} });
  });
});

describe("setPilotMessage", () => {
  it("wraps the given params in a setPilot request", () => {
    const params = { state: true, r: 255, g: 0, b: 0, dimming: 50 };
    expect(setPilotMessage(params)).toEqual({ method: "setPilot", params });
  });

  it("passes params through unchanged, including an empty object", () => {
    expect(setPilotMessage({})).toEqual({ method: "setPilot", params: {} });
  });
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.js", () => ({
  listBulbs: vi.fn(),
}));
vi.mock("../wiz/udp.js", () => ({
  sendUnicast: vi.fn(),
}));

import { listBulbs } from "../store.js";
import { sendUnicast } from "../wiz/udp.js";
import { presetsRouter } from "./presets.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(presetsRouter);
  return app;
}

describe("GET /presets", () => {
  it("lists all built-in presets", async () => {
    const res = await request(buildApp()).get("/presets");

    expect(res.status).toBe(200);
    expect(res.body.map((p: { key: string }) => p.key)).toContain("blues");
  });
});

describe("POST /presets/:key/apply", () => {
  beforeEach(() => {
    vi.mocked(listBulbs).mockReset();
    vi.mocked(sendUnicast).mockReset();
  });

  it("returns 404 for an unknown preset", async () => {
    const res = await request(buildApp()).post("/presets/not-a-preset/apply");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Unknown preset" });
    expect(listBulbs).not.toHaveBeenCalled();
  });

  it("applies the preset to every known bulb and reports per-bulb success", async () => {
    vi.mocked(listBulbs).mockResolvedValue([
      { mac: "aa", ip: "192.168.1.10", lastSeen: "now" },
      { mac: "bb", ip: "192.168.1.11", lastSeen: "now" },
    ]);
    vi.mocked(sendUnicast).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("timeout"));

    const res = await request(buildApp()).post("/presets/blues/apply");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { mac: "aa", ok: true },
      { mac: "bb", ok: false },
    ]);
    expect(sendUnicast).toHaveBeenCalledTimes(2);
  });
});

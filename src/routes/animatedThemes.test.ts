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
import { animatedThemesRouter } from "./animatedThemes.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(animatedThemesRouter);
  return app;
}

describe("GET /animated-themes", () => {
  it("lists all built-in animated themes", async () => {
    const res = await request(buildApp()).get("/animated-themes");

    expect(res.status).toBe(200);
    expect(res.body.map((t: { key: string }) => t.key)).toContain("fireplace");
  });
});

describe("POST /animated-themes/:key/apply", () => {
  beforeEach(() => {
    vi.mocked(listBulbs).mockReset();
    vi.mocked(sendUnicast).mockReset();
  });

  it("returns 404 for an unknown theme", async () => {
    const res = await request(buildApp()).post("/animated-themes/not-a-theme/apply");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Unknown animated theme" });
    expect(listBulbs).not.toHaveBeenCalled();
  });

  it("sets the theme's scene on every known bulb and reports per-bulb success", async () => {
    vi.mocked(listBulbs).mockResolvedValue([
      { mac: "aa", ip: "192.168.1.10", lastSeen: "now" },
      { mac: "bb", ip: "192.168.1.11", lastSeen: "now" },
    ]);
    vi.mocked(sendUnicast).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("timeout"));

    const res = await request(buildApp()).post("/animated-themes/fireplace/apply");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { mac: "aa", ok: true },
      { mac: "bb", ok: false },
    ]);
    expect(sendUnicast).toHaveBeenCalledWith("192.168.1.10", {
      method: "setPilot",
      params: { state: true, sceneId: 5, speed: 110 },
    });
  });
});

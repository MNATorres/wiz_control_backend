import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../store.js", () => ({
  getBulb: vi.fn(),
  listBulbs: vi.fn(),
  renameBulb: vi.fn(),
  upsertBulbs: vi.fn(),
}));
vi.mock("../wiz/udp.js", () => ({
  sendBroadcast: vi.fn(),
  sendUnicast: vi.fn(),
}));

import { getBulb, listBulbs, renameBulb, upsertBulbs } from "../store.js";
import { sendBroadcast, sendUnicast } from "../wiz/udp.js";
import { bulbsRouter } from "./bulbs.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(bulbsRouter);
  return app;
}

const bulb = { mac: "aa:bb", ip: "192.168.1.10", lastSeen: "now" };

beforeEach(() => {
  vi.mocked(getBulb).mockReset();
  vi.mocked(listBulbs).mockReset();
  vi.mocked(renameBulb).mockReset();
  vi.mocked(upsertBulbs).mockReset();
  vi.mocked(sendBroadcast).mockReset();
  vi.mocked(sendUnicast).mockReset();
});

describe("GET /bulbs", () => {
  it("returns the known bulbs without making any network call", async () => {
    vi.mocked(listBulbs).mockResolvedValue([bulb]);

    const res = await request(buildApp()).get("/bulbs");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([bulb]);
    expect(sendBroadcast).not.toHaveBeenCalled();
  });
});

describe("POST /bulbs/discover", () => {
  it("upserts bulbs found via broadcast and returns the persisted list", async () => {
    vi.mocked(sendBroadcast).mockResolvedValue([
      { address: "192.168.1.10", message: { result: { mac: "aa:bb" } } },
      { address: "192.168.1.11", message: { result: {} } },
      { address: "192.168.1.12", message: {} },
    ]);
    vi.mocked(upsertBulbs).mockResolvedValue([bulb]);

    const res = await request(buildApp()).post("/bulbs/discover");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([bulb]);
    expect(upsertBulbs).toHaveBeenCalledWith([{ mac: "aa:bb", ip: "192.168.1.10" }]);
  });
});

describe("GET /bulbs/:mac/pilot", () => {
  it("returns 404 for an unknown bulb", async () => {
    vi.mocked(getBulb).mockResolvedValue(undefined);

    const res = await request(buildApp()).get("/bulbs/nope/pilot");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Unknown bulb" });
  });

  it("returns the bulb's live pilot state", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({ result: { state: true } });

    const res = await request(buildApp()).get(`/bulbs/${bulb.mac}/pilot`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ result: { state: true } });
  });

  it("returns 504 when the bulb does not respond", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockRejectedValue(new Error("timeout"));

    const res = await request(buildApp()).get(`/bulbs/${bulb.mac}/pilot`);

    expect(res.status).toBe(504);
    expect(res.body).toEqual({ error: "Bulb did not respond" });
  });
});

describe("POST /bulbs/:mac/state", () => {
  it("coerces the on flag and forwards a setPilot command", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    const res = await request(buildApp()).post(`/bulbs/${bulb.mac}/state`).send({ on: true });

    expect(res.status).toBe(200);
    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ method: "setPilot", params: { state: true } }),
    );
  });

  it("returns 404 for an unknown bulb", async () => {
    vi.mocked(getBulb).mockResolvedValue(undefined);

    const res = await request(buildApp()).post("/bulbs/nope/state").send({ on: true });

    expect(res.status).toBe(404);
  });
});

describe("POST /bulbs/:mac/dimming", () => {
  it("coerces value to a number", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    await request(buildApp()).post(`/bulbs/${bulb.mac}/dimming`).send({ value: "60" });

    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ params: { dimming: 60 } }),
    );
  });
});

describe("POST /bulbs/:mac/color", () => {
  it("sends rgb params when no temp is given", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    await request(buildApp()).post(`/bulbs/${bulb.mac}/color`).send({ r: 10, g: 20, b: 30 });

    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ params: { r: 10, g: 20, b: 30 } }),
    );
  });

  it("sends a color temperature when temp is given", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    await request(buildApp()).post(`/bulbs/${bulb.mac}/color`).send({ temp: 4000 });

    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ params: { temp: 4000 } }),
    );
  });
});

describe("POST /bulbs/:mac/scene", () => {
  it("sends a sceneId, omitting speed when not given", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    await request(buildApp()).post(`/bulbs/${bulb.mac}/scene`).send({ sceneId: 3 });

    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ params: { sceneId: 3 } }),
    );
  });

  it("includes speed when given", async () => {
    vi.mocked(getBulb).mockResolvedValue(bulb);
    vi.mocked(sendUnicast).mockResolvedValue({});

    await request(buildApp()).post(`/bulbs/${bulb.mac}/scene`).send({ sceneId: 3, speed: 80 });

    expect(sendUnicast).toHaveBeenCalledWith(
      bulb.ip,
      expect.objectContaining({ params: { sceneId: 3, speed: 80 } }),
    );
  });
});

describe("PATCH /bulbs/:mac", () => {
  it("renames a known bulb", async () => {
    vi.mocked(renameBulb).mockResolvedValue({ ...bulb, name: "Kitchen" });

    const res = await request(buildApp()).patch(`/bulbs/${bulb.mac}`).send({ name: "Kitchen" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Kitchen");
    expect(renameBulb).toHaveBeenCalledWith(bulb.mac, "Kitchen");
  });

  it("returns 404 for an unknown bulb", async () => {
    vi.mocked(renameBulb).mockResolvedValue(undefined);

    const res = await request(buildApp()).patch("/bulbs/nope").send({ name: "Kitchen" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Unknown bulb" });
  });
});

import { Router, type Request, type Response } from "express";
import { getPilotMessage, setPilotMessage, type PilotParams } from "../wiz/protocol.js";
import { sendBroadcast, sendUnicast } from "../wiz/udp.js";
import { getBulb, listBulbs, renameBulb, upsertBulbs } from "../store.js";

export const bulbsRouter = Router();

bulbsRouter.get("/bulbs", async (_req, res) => {
  res.json(await listBulbs());
});

bulbsRouter.post("/bulbs/discover", async (_req, res) => {
  const responses = await sendBroadcast(getPilotMessage());
  const found = responses
    .map((r) => {
      const result = (r.message as { result?: { mac?: string } } | undefined)?.result;
      return result?.mac ? { mac: result.mac, ip: r.address } : null;
    })
    .filter((x): x is { mac: string; ip: string } => x !== null);

  res.json(await upsertBulbs(found));
});

bulbsRouter.get("/bulbs/:mac/pilot", async (req, res) => {
  const bulb = await getBulb(req.params.mac);
  if (!bulb) {
    res.status(404).json({ error: "Unknown bulb" });
    return;
  }

  try {
    res.json(await sendUnicast(bulb.ip, getPilotMessage()));
  } catch {
    res.status(504).json({ error: "Bulb did not respond" });
  }
});

async function control(
  req: Request<{ mac: string }>,
  res: Response,
  buildParams: (body: Record<string, unknown>) => PilotParams,
) {
  const bulb = await getBulb(req.params.mac);
  if (!bulb) {
    res.status(404).json({ error: "Unknown bulb" });
    return;
  }

  try {
    res.json(await sendUnicast(bulb.ip, setPilotMessage(buildParams(req.body))));
  } catch {
    res.status(504).json({ error: "Bulb did not respond" });
  }
}

bulbsRouter.post("/bulbs/:mac/state", (req, res) =>
  control(req, res, (body) => ({ state: Boolean(body.on) })),
);

bulbsRouter.post("/bulbs/:mac/dimming", (req, res) =>
  control(req, res, (body) => ({ dimming: Number(body.value) })),
);

bulbsRouter.post("/bulbs/:mac/color", (req, res) =>
  control(req, res, (body) =>
    "temp" in body
      ? { temp: Number(body.temp) }
      : { r: Number(body.r), g: Number(body.g), b: Number(body.b) },
  ),
);

bulbsRouter.post("/bulbs/:mac/scene", (req, res) =>
  control(req, res, (body) => ({
    sceneId: Number(body.sceneId),
    ...(body.speed ? { speed: Number(body.speed) } : {}),
  })),
);

bulbsRouter.patch("/bulbs/:mac", async (req, res) => {
  const bulb = await renameBulb(req.params.mac, String(req.body.name ?? ""));
  if (!bulb) {
    res.status(404).json({ error: "Unknown bulb" });
    return;
  }
  res.json(bulb);
});

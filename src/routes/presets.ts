import { Router } from "express";
import { colorForIndex, getPreset, PRESETS } from "../presets.js";
import { setPilotMessage } from "../wiz/protocol.js";
import { sendUnicast } from "../wiz/udp.js";
import { listBulbs } from "../store.js";

export const presetsRouter = Router();

presetsRouter.get("/presets", (_req, res) => {
  res.json(PRESETS);
});

presetsRouter.post("/presets/:key/apply", async (req, res) => {
  const preset = getPreset(req.params.key);
  if (!preset) {
    res.status(404).json({ error: "Unknown preset" });
    return;
  }

  const bulbs = await listBulbs();
  const results = await Promise.allSettled(
    bulbs.map((bulb, index) => {
      const color = colorForIndex(preset, index);
      return sendUnicast(
        bulb.ip,
        setPilotMessage({ state: true, r: color.r, g: color.g, b: color.b, dimming: color.dimming }),
      );
    }),
  );

  res.json(
    bulbs.map((bulb, index) => ({
      mac: bulb.mac,
      ok: results[index].status === "fulfilled",
    })),
  );
});

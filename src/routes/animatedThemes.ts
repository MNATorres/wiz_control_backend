import { Router } from "express";
import { ANIMATED_THEMES, getAnimatedTheme } from "../animatedThemes.js";
import { setPilotMessage } from "../wiz/protocol.js";
import { sendUnicast } from "../wiz/udp.js";
import { listBulbs } from "../store.js";

export const animatedThemesRouter = Router();

animatedThemesRouter.get("/animated-themes", (_req, res) => {
  res.json(ANIMATED_THEMES);
});

animatedThemesRouter.post("/animated-themes/:key/apply", async (req, res) => {
  const theme = getAnimatedTheme(req.params.key);
  if (!theme) {
    res.status(404).json({ error: "Unknown animated theme" });
    return;
  }

  const bulbs = await listBulbs();
  const results = await Promise.allSettled(
    bulbs.map((bulb) =>
      sendUnicast(
        bulb.ip,
        setPilotMessage({ state: true, sceneId: theme.sceneId, speed: theme.speed }),
      ),
    ),
  );

  res.json(
    bulbs.map((bulb, index) => ({
      mac: bulb.mac,
      ok: results[index].status === "fulfilled",
    })),
  );
});

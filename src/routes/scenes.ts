import { Router } from "express";
import { SCENES } from "../wiz/scenes.js";

export const scenesRouter = Router();

scenesRouter.get("/scenes", (_req, res) => {
  res.json(Object.entries(SCENES).map(([id, name]) => ({ id: Number(id), name })));
});

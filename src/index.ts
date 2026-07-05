import cors from "cors";
import express from "express";
import { bulbsRouter } from "./routes/bulbs.js";
import { scenesRouter } from "./routes/scenes.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", bulbsRouter);
app.use("/api", scenesRouter);

app.listen(port, () => {
  console.log(`wiz_control_backend listening on http://localhost:${port}`);
});

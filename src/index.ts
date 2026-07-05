import cors from "cors";
import express from "express";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`wiz_control_backend listening on http://localhost:${port}`);
});

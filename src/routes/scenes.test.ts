import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { scenesRouter } from "./scenes.js";

function buildApp() {
  const app = express();
  app.use(scenesRouter);
  return app;
}

describe("GET /scenes", () => {
  it("returns every built-in scene as {id, name}", async () => {
    const res = await request(buildApp()).get("/scenes");

    expect(res.status).toBe(200);
    expect(res.body).toContainEqual({ id: 1, name: "Ocean" });
    expect(res.body.length).toBeGreaterThan(30);
  });
});

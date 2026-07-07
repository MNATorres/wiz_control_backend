import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

describe("store", () => {
  let tmpDir: string;
  let originalCwd: string;
  let store: typeof import("./store.js");

  beforeAll(async () => {
    originalCwd = process.cwd();
    tmpDir = await mkdtemp(path.join(tmpdir(), "wiz-store-test-"));
    process.chdir(tmpDir);
    store = await import("./store.js");
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await rm(tmpDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    await rm(path.join(tmpDir, "data"), { recursive: true, force: true });
  });

  it("returns an empty list when no bulbs have been persisted", async () => {
    expect(await store.listBulbs()).toEqual([]);
  });

  it("upserts a new bulb and persists it", async () => {
    const bulbs = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    expect(bulbs).toHaveLength(1);
    expect(bulbs[0]).toMatchObject({ mac: "aa:bb", ip: "192.168.1.10" });
    expect(bulbs[0].lastSeen).toEqual(expect.any(String));
    expect(await store.listBulbs()).toEqual(bulbs);
  });

  it("updates ip/lastSeen for an already-known bulb instead of duplicating it", async () => {
    const [first] = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    const [updated] = await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.99" }]);

    expect(await store.listBulbs()).toHaveLength(1);
    expect(updated.ip).toBe("192.168.1.99");
    expect(updated.lastSeen).not.toBe(first.lastSeen);
  });

  it("finds a bulb by mac", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    expect((await store.getBulb("aa:bb"))?.ip).toBe("192.168.1.10");
  });

  it("returns undefined for an unknown mac", async () => {
    expect(await store.getBulb("nope")).toBeUndefined();
  });

  it("renames a known bulb", async () => {
    await store.upsertBulbs([{ mac: "aa:bb", ip: "192.168.1.10" }]);
    const renamed = await store.renameBulb("aa:bb", "Kitchen");

    expect(renamed?.name).toBe("Kitchen");
    expect((await store.getBulb("aa:bb"))?.name).toBe("Kitchen");
  });

  it("returns undefined when renaming an unknown bulb", async () => {
    expect(await store.renameBulb("nope", "X")).toBeUndefined();
  });
});

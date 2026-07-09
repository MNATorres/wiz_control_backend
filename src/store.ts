import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredBulb {
  mac: string;
  ip: string;
  name?: string;
  lastSeen: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "bulbs.json");

async function readStore(): Promise<StoredBulb[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StoredBulb[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeStore(bulbs: StoredBulb[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(bulbs, null, 2));
}

export function listBulbs(): Promise<StoredBulb[]> {
  return readStore();
}

export async function getBulb(mac: string): Promise<StoredBulb | undefined> {
  const bulbs = await readStore();
  return bulbs.find((b) => b.mac === mac);
}

export async function upsertBulbs(found: { mac: string; ip: string }[]): Promise<StoredBulb[]> {
  const bulbs = await readStore();
  const now = new Date().toISOString();

  for (const { mac, ip } of found) {
    const existing = bulbs.find((b) => b.mac === mac);
    if (existing) {
      existing.ip = ip;
      existing.lastSeen = now;
    } else {
      bulbs.push({ mac, ip, lastSeen: now });
    }
  }

  await writeStore(bulbs);
  return bulbs;
}

export async function renameBulb(mac: string, name: string): Promise<StoredBulb | undefined> {
  const bulbs = await readStore();
  const bulb = bulbs.find((b) => b.mac === mac);
  if (!bulb) return undefined;
  bulb.name = name;
  await writeStore(bulbs);
  return bulb;
}

export async function removeBulb(mac: string): Promise<boolean> {
  const bulbs = await readStore();
  const remaining = bulbs.filter((b) => b.mac !== mac);
  if (remaining.length === bulbs.length) return false;
  await writeStore(remaining);
  return true;
}

# CLAUDE.md

This file gives Claude Code (and other agents) context for working in this repository.

## What this is

A small Node.js/TypeScript HTTP backend that bridges browsers to WiZ (Philips/Signify)
smart bulbs on the local network. Browsers can't open raw UDP sockets, so this service
discovers bulbs via UDP broadcast and controls them via UDP unicast on port 38899,
exposing everything as a JSON REST API on port 3001.

It is the companion service for the sibling `wiz_control_frontend` repo, which talks to
this API over HTTP and expects it running on `localhost:3001`.

There is no database, no cloud dependency, and no auth — everything assumes local-network
trust. Known bulbs are persisted to a gitignored `data/bulbs.json` file.

## Stack

- Node.js 20+, TypeScript 6, ESM (`"type": "module"`)
- Express 5
- `tsx` for dev hot-reload
- `vitest` + `supertest` for tests, `oxlint` for linting — a change isn't done until
  `npm run lint`, `npm run build`, and `npm test` all pass. CI runs all three on every PR
  against `main` (`.github/workflows/ci.yml`).

## Commands

```bash
npm install     # setup
npm run dev     # tsx watch src/index.ts — hot-reload dev server, port 3001 (or $PORT)
npm run build   # tsc -> dist/
npm start        # node dist/index.js
npm run lint    # oxlint
npm test        # vitest run
```

## Structure

```
src/
├── index.ts            # Express app bootstrap, mounts routers under /api
├── store.ts            # JSON-file persistence for known bulbs (data/bulbs.json)
├── presets.ts           # curated multi-bulb color presets (data + helpers)
├── animatedThemes.ts    # WiZ dynamic-scene themes (data + helpers)
├── routes/
│   ├── bulbs.ts        # discovery + control endpoints
│   ├── scenes.ts       # WiZ built-in scene list endpoint
│   ├── presets.ts      # preset list + apply-to-all endpoint
│   └── animatedThemes.ts # animated theme list + apply-to-all endpoint
└── wiz/
    ├── udp.ts          # raw UDP transport (node:dgram): unicast + broadcast helpers
    ├── protocol.ts     # WiZ getPilot/setPilot message builders + types
    └── scenes.ts       # WiZ built-in scene id -> name map
```

Each router file in `routes/` owns one resource area and calls directly into
`store.ts` / `wiz/` — there is no separate controller/service layer. Keep new
endpoints in this same shape rather than introducing new abstractions.

Tests are colocated as `<name>.test.ts` next to the file they cover (e.g.
`src/store.test.ts`, `src/routes/bulbs.test.ts`) and excluded from the `tsc` build via
`tsconfig.json`'s `exclude`.

## Conventions

- Internal imports use explicit `.js` extensions (NodeNext module resolution), even
  though source files are `.ts` — e.g. `import { bulbsRouter } from "./routes/bulbs.js"`.
- Named exports only (routers exported as `<name>Router`), no default exports.
- PascalCase for interfaces/types (`StoredBulb`, `PilotParams`, `Preset`), camelCase for
  functions/variables.
- Double quotes, semicolons, 2-space indentation, `async`/`await` throughout.
- Route error convention: UDP timeout -> `504 { error: "Bulb did not respond" }`; unknown
  bulb/preset -> `404 { error: "Unknown ..." }`.
- No schema validation library — request bodies are coerced manually
  (`Number(body.value)`, `Boolean(body.on)`). Match this style rather than introducing
  Zod/Joi unless asked.
- Only `process.env.PORT` is read; no dotenv. `.env` is gitignored but nothing loads it
  automatically.

## Notes for making changes

- WiZ UDP port (38899) is hardcoded in `wiz/udp.ts` — this is a protocol constant, not
  configuration.
- Route tests mock `store.js` and `wiz/udp.js` with `vi.mock` and drive the router with
  `supertest` — no real UDP/network or filesystem access. `store.ts` itself is tested
  against a temp directory (`process.chdir` before a dynamic import), not real `data/`.
  There's no hardware in CI, so discovery/control against a real bulb still needs manual
  verification: run `npm run dev` and hit the endpoint (e.g. with `curl`).
- The README documents the full API surface (routes, request/response shapes) — keep it
  in sync when adding or changing endpoints.

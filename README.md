# wiz_control_backend

Node.js backend that will talk the local UDP protocol used by WiZ (Philips/Signify) smart bulbs. It exists because browsers can't open raw UDP sockets, so this service is the piece that discovers and controls the bulbs on the local network; the [wiz_control_frontend](https://github.com/MNATorres/wiz_control_frontend) app talks to it over HTTP.

It discovers bulbs by broadcasting on the local subnet and controls them by unicast, both over UDP port 38899, and persists known bulbs (by MAC address) to a local JSON file so you don't need to re-discover them on every restart.

## API

All routes are prefixed with `/api`.

| Method | Route | Body | Description |
| --- | --- | --- | --- |
| GET | `/health` | | Health check |
| GET | `/bulbs` | | List known bulbs (no network call) |
| POST | `/bulbs/discover` | | Broadcast-discover bulbs on the local subnet, persist and return them |
| GET | `/bulbs/:mac/pilot` | | Live state of one bulb |
| POST | `/bulbs/:mac/state` | `{ on }` | Turn on/off |
| POST | `/bulbs/:mac/dimming` | `{ value }` | Brightness, 10–100 |
| POST | `/bulbs/:mac/color` | `{ r, g, b }` or `{ temp }` | RGB color or white color temperature (Kelvin) |
| POST | `/bulbs/:mac/scene` | `{ sceneId, speed? }` | Apply a scene (see `/scenes` for the list) |
| PATCH | `/bulbs/:mac` | `{ name }` | Rename a bulb |
| GET | `/scenes` | | List of scene ids and names |
| GET | `/presets` | | List predetermined multi-bulb presets |
| POST | `/presets/:key/apply` | | Apply a preset to every known bulb at once |

A bulb that doesn't respond returns `504`.

## Presets

Presets (`src/presets.ts`) are relaxing, low-brightness color combinations applied to every known bulb at once — cycling a small palette across bulbs by index, unlike `/scenes` which are WiZ's built-in single-bulb effects:

- **Soft Pastels** — warm pastel tones (peach, pink, lavender)
- **Blues** — a range of blue shades
- **Blue & Red Mix** — alternates muted blue and red/wine across bulbs
- **Modern Greens** — an elegant range of emerald, sage, forest, and mint greens
- **Golden Yellows** — warm golden, amber, and pale yellow tones
- **Turquoise** — a range of turquoise and teal shades

## Stack

- Node.js (ESM)
- Express 5
- TypeScript 6
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript directly in development

## Requirements

- Node.js 20+ and npm
- This machine must be on the same local network as the WiZ bulbs (no cloud/account involved)

## Setup

```bash
npm install
```

## Running in development

```bash
npm run dev
```

Starts the server with hot-reload on [http://localhost:3001](http://localhost:3001) (override with a `PORT` env var).

Verify it's up:

```bash
curl http://localhost:3001/api/health
# {"status":"ok"}
```

## Building for production

```bash
npm run build   # compiles src/ to dist/
npm start       # runs the compiled server from dist/
```

## Troubleshooting

`POST /bulbs/discover` returning an empty list, on Windows, usually means the Wi-Fi network is categorized as **Public** — Windows Firewall restricts UDP broadcast/inbound traffic more aggressively on that profile. Switch it to **Private**: Settings → Network & Internet → Wi-Fi → your network → Network profile type, or as Administrator:

```powershell
Set-NetConnectionProfile -InterfaceAlias "Wi-Fi" -NetworkCategory Private
```

## Project structure

```
src/
  index.ts        # Express app entry point
  store.ts        # JSON-file persistence for known bulbs (data/bulbs.json, gitignored)
  presets.ts      # predetermined relaxing multi-bulb presets
  routes/
    bulbs.ts      # discovery + control endpoints
    scenes.ts     # scene list endpoint
    presets.ts    # preset list + apply-to-all endpoint
  wiz/
    udp.ts        # low-level UDP send/broadcast helpers
    protocol.ts   # WiZ getPilot/setPilot message builders
    scenes.ts     # scene id -> name mapping
```

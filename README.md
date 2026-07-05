# wiz_control_backend

Node.js backend that will talk the local UDP protocol used by WiZ (Philips/Signify) smart bulbs. It exists because browsers can't open raw UDP sockets, so this service is the piece that discovers and controls the bulbs on the local network; the [wiz_control_frontend](https://github.com/MNATorres/wiz_control_frontend) app talks to it over HTTP.

Currently this only exposes a health check endpoint. Bulb discovery and control are not implemented yet.

## Stack

- Node.js (ESM)
- Express 5
- TypeScript 6
- [tsx](https://github.com/privatenumber/tsx) for running TypeScript directly in development

## Requirements

- Node.js 20+ and npm

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

## Project structure

```
src/
  index.ts   # Express app entry point
```

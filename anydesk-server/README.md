# AnyDesk — Signaling Server

WebRTC signaling server for the AnyDesk remote desktop application. Handles room code management and SDP/ICE relay between host and viewer peers.

## Tech Stack

- **Node.js + Express + TypeScript**
- **Socket.io** — WebSocket transport for signaling
- **Redis** — Room code storage with TTL (via Docker)
- **nanoid** — Room code generation

## Quick Start

### 1. Start Redis

```bash
# Requires Docker
npm run redis:up
```

### 2. Install & Run

```bash
npm install
npm run dev
```

Server starts on `http://localhost:3001`.

### 3. Health Check

```
GET http://localhost:3001/health
```

## Environment Variables

See [.env.example](.env.example) for all available configuration.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `CORS_ORIGINS` | `http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `ROOM_CODE_LENGTH` | `6` | Length of generated room codes |
| `ROOM_CODE_TTL_SECONDS` | `300` | Room code expiry time (5 minutes) |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `create-room` | Host → Server | Request a new room code |
| `room-created` | Server → Host | Returns generated room code |
| `join-room` | Viewer → Server | Submit room code to connect |
| `connection-request` | Server → Host | Notifies host of incoming viewer |
| `connection-response` | Host → Server | Host approves/denies viewer |
| `connection-approved` | Server → Viewer | Viewer cleared to begin WebRTC |
| `connection-denied` | Server → Viewer | Viewer rejected |
| `sdp-offer` | Host → Server → Viewer | WebRTC SDP offer relay |
| `sdp-answer` | Viewer → Server → Host | WebRTC SDP answer relay |
| `ice-candidate` | Both ↔ Server | ICE candidate exchange |
| `session-ended` | Either → Server → Other | Clean session teardown |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run redis:up` | Start Redis via Docker Compose |
| `npm run redis:down` | Stop Redis container |

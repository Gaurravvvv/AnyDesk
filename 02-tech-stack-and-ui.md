# Tech Stack & UI Design — Web-Based Remote Desktop

## Tech Stack

### Frontend (Viewer Web App)
- **React + Vite + TypeScript** — matches existing portfolio stack
- **Tailwind CSS** — utility-first, keeps styling minimal and consistent
- Native browser **WebRTC APIs** (`RTCPeerConnection`, `RTCDataChannel`) — used raw, no wrapper library, so the mechanics stay fully explainable
- **Socket.io-client** — for signaling communication

### Backend (Signaling Server)
- **Node.js + Express + Socket.io** — handles SDP offer/answer relay, ICE candidate exchange, room join requests
- **Redis** — stores active room codes with TTL, same pattern as the host-queue system used in CodeShare

### Host Agent (Native Component)
- **Electron** (Chromium + Node) — packages into a real installable desktop app
- **robotjs or nut.js** — OS-level mouse/keyboard input injection (try both early; robotjs native bindings can be flaky on newer Node versions, nut.js is more actively maintained)
- **Electron `desktopCapturer` API** — screen capture, more reliable than plain browser `getDisplayMedia()` inside an Electron context
- **Electron `Tray` + `Menu`** — system tray UI for room code display, connection status, Allow/Deny prompts, and Disconnect

### Infra / NAT Traversal
- **Metered.ca managed TURN (free tier)** — STUN + TURN credentials for WebRTC; used only as a fallback when direct P2P fails
- No self-hosted coturn for MVP — adds infra complexity that doesn't showcase the core skills being demonstrated here; can be added later as a "v2 infra" upgrade

### Security
- TLS on the signaling server
- Room codes are single-use and short-lived (Redis TTL)
- Host explicitly approves every incoming connection (native Allow/Deny popup)
- Control events are validated on the Electron agent before being passed to the OS input layer

### Deployment
- **Signaling server** → Render
- **Viewer web app** → Vercel
- **Electron agent** → packaged via `electron-builder`, distributed through GitHub Releases
- Future: Dockerize signaling server, reuse existing CI/CD template (GitHub Actions, Trivy scan, GHCR)

---

## UI Design Direction

**Principle: the UI should disappear once a session starts. The remote screen is the interface.**

### Visual Language
- Neutral, dark charcoal base palette
- **One accent color only** — used sparingly (connect button, active-session status dot). Nothing else gets color.
- No gradients, no glassmorphism, no decorative elements
- Clean sans-serif font (Inter or system font stack), generous whitespace
- Room codes displayed large and monospace — easy to read and type across

### Motion
- **Zero animation except functional feedback.**
- A status dot that changes color (idle → connecting → connected)
- A subtle spinner only while the peer connection is being established
- No hover transitions, no slide-ins, no easing curves anywhere

### Screens

**Viewer — Pre-session**
- Single input: room code
- Connect button
- Connection status line ("Requesting access...", "Connected", "Denied")

**Viewer — In-session**
- Remote screen fills nearly the entire viewport
- Thin, auto-hiding control bar (Disconnect, Fullscreen toggle) — appears on mouse-move near the edge, hides after a few seconds of inactivity

**Host — Tray UI**
- Plain text room code display
- Status line: "Waiting for connection..." / "Connected to [session]"
- Native Allow/Deny popup on incoming request
- Disconnect option in the tray menu

### Design Rationale (for interview talking points)
For a remote-desktop tool, motion and decoration are pure distraction — the primary interface *is* the remote screen itself, not the chrome around it. Every animation skipped is also one less thing that can visually stutter under real screen-share load. Minimalism here is a functional choice, not just an aesthetic one.

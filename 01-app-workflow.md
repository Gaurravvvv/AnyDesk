# App Workflow — Web-Based Remote Desktop

## Overview
A browser-to-browser remote desktop tool. Viewer connects from any browser, no install. Host runs a lightweight Electron agent that streams its screen and accepts remote mouse/keyboard input.

Two things happen in parallel over WebRTC once a session starts:
- **Video stream**: Host → Viewer (screen capture)
- **Control stream**: Viewer → Host (mouse/keyboard events over a data channel)

The signaling server only brokers the initial handshake (SDP + ICE). It never touches video or input data once the peer connection is live — that's direct P2P (or relayed via TURN if P2P fails).

---

## Host User Journey (person being controlled)

1. Downloads and runs the Electron agent (one-time install).
2. App launches straight to the system tray — no window opens.
3. Clicks tray icon → sees a freshly generated **single-use room code** (large, monospace) + status: "Waiting for connection..."
4. Shares the code with the viewer out-of-band (call, chat, etc.) — app doesn't handle this part.
5. Viewer enters the code and requests to connect → host gets a native OS popup: **"X wants to connect. Allow / Deny."**
6. Host clicks Allow → session starts. Tray icon flips to a "Connected" state.
7. Screen is now visible and controllable by the viewer.
8. Host can hit **Disconnect** in the tray at any time → session ends immediately, room code is invalidated (never reusable).

## Viewer User Journey (person controlling)

1. Opens the web app in any browser.
2. Sees a single input: "Enter room code."
3. Enters the code → clicks Connect → sees "Requesting access..." while waiting on host approval.
4. Host approves → remote screen fills the viewport. A thin, auto-hiding control bar sits at the edge (Disconnect, Fullscreen toggle).
5. Viewer's mouse/keyboard input is captured, serialized, and streamed to the host in real time.
6. Viewer disconnects (button or tab close) → session ends cleanly on both sides.

---

## Session Lifecycle Rules

- **Room codes are single-use.** A new code is generated for every session, whether it succeeded, failed, or was denied. No static/reusable codes.
- **No persistent "being controlled" banner.** Host relies on the initial Allow prompt and the tray Disconnect button — kept deliberately minimal for MVP.
- **Connection drop (network blip, etc.) ends the session outright.** No auto-reconnect in MVP. Viewer must re-enter a new room code to start a fresh session.
- **Host-side input validation.** Since there's no server in the middle of the P2P data channel, the Electron agent itself validates/sanitizes incoming control events before passing them to the OS input layer (robotjs/nut.js) — protects against malformed or malicious payloads.

---

## Detailed Technical Flow

### 1. Room Creation
- Host agent boots → connects to signaling server via Socket.io.
- Requests a room → server generates a single-use code, stores it in Redis with a short TTL.
- Code is returned to host agent and displayed in the tray UI.

### 2. Connection Request
- Viewer submits the room code via the web app → Socket.io emits a `join-room` event to the signaling server.
- Server validates the code exists and is unused → notifies the host agent of an incoming request.
- Host agent shows the native Allow/Deny popup.

### 3. Signaling (SDP + ICE Exchange)
- On Allow, host generates a WebRTC offer (SDP) → sent to viewer via the signaling server.
- Viewer responds with an answer (SDP) → relayed back through the server.
- Both sides exchange ICE candidates via the server until a direct P2P path is found (or TURN relay is used as fallback via Metered.ca).
- Once the peer connection is established, **the signaling server's job for this session is done.**

### 4. Media & Data Channels
- **Video**: Host captures the screen via `desktopCapturer` (Electron) → streamed to viewer over the WebRTC media stream.
- **Control**: An `RTCDataChannel` is opened between viewer and host. Viewer's mouse/keyboard events are serialized to JSON and sent over this channel.
- Host agent receives control events, validates them, and calls `robotjs`/`nut.js` to inject real OS-level input (move cursor, click, type).

### 5. Session Teardown
- Triggered by: host clicking Disconnect, viewer clicking Disconnect/closing tab, or connection drop.
- Peer connection closes on both ends.
- Room code is invalidated in Redis (already single-use, so this is just cleanup).
- Host agent returns to idle state, ready to generate a new code for the next session.

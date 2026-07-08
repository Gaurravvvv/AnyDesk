# AnyDesk Clone

A modern, web-based remote desktop application. This project allows a user to control a remote Windows computer directly from a web browser via WebRTC, without requiring the viewer to install any desktop applications.

## 🏗️ Project Structure

The project is divided into three distinct components:

```text
AnyDesk/
├── start.bat                 # Windows launcher script for local development
│
├── anydesk-server/           # 🧠 Signaling Server
│   │                         # Node.js + Socket.io server that relays WebRTC SDP 
│   │                         # offers, answers, and ICE candidates. Stores active 
│   │                         # room codes in an in-memory Map.
│   └── src/
│
├── anydesk-viewer/           # 🌐 Viewer Web App (Controller)
│   │                         # React + Vite frontend hosted on Vercel. 
│   │                         # Connects to the host using a 6-digit room code, 
│   │                         # renders the screen, and captures mouse/keyboard input.
│   └── src/
│
└── anydesk-host/             # 💻 Host Agent (Target Computer)
    │                         # Electron desktop app that sits in the Windows System 
    │                         # Tray. Uses `@nut-tree-fork/nut-js` to inject simulated 
    │                         # mouse and keyboard events received from the Viewer.
    └── src/
```

## 🚀 Tech Stack

- **Viewer**: React, TypeScript, Vite, TailwindCSS
- **Host**: Electron, TypeScript, `@nut-tree-fork/nut-js`, WebRTC (Desktop capture)
- **Signaling Server**: Node.js, Express, Socket.io
- **Networking**: WebRTC (Peer-to-Peer Video/Data), Metered.ca (TURN Server)

## 🛠️ How to Run Locally

To test the entire system on a single Windows machine:

1. Clone the repository.
2. Ensure you have Node.js installed.
3. Open a terminal in the root directory and run:
   ```batch
   .\start.bat
   ```
4. The script will automatically start the Server, the Viewer, and the Host Agent.
5. Look in your **Windows System Tray** (bottom right) for the AnyDesk icon. Right-click it to find your **6-digit Room Code**.
6. Open your browser to `http://localhost:5173` (the Viewer).
7. Enter the code and click Connect. A prompt will appear on your desktop asking you to "Allow" or "Deny" the connection. Click **Allow**.

## 📦 Building for Production

### 1. Deploy the Server
Deploy the `anydesk-server` folder to a service like Render or Heroku. Make sure it supports WebSockets. A `render.yaml` file is included.

### 2. Deploy the Viewer
Deploy the `anydesk-viewer` folder to Vercel or Netlify. Set the `VITE_SIGNALING_SERVER_URL` environment variable to your deployed server's URL.

### 3. Build the Host Agent (The .exe file)
To distribute the Host Agent to users so they can be controlled:
1. Open a terminal in `anydesk-host`.
2. Run `npm install` and then `npm run build`.
3. `electron-builder` will generate an `AnyDesk-Setup.exe` file inside `anydesk-host/dist/`.
4. Create a GitHub Release and upload this `.exe` file. The Viewer web app contains a download link that points to this release.

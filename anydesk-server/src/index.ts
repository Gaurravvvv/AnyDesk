import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config';

import { initializeSocketHandlers } from './socket';
import { disconnectRedis } from './services/redisClient';

async function main(): Promise<void> {
  // ── Express ──────────────────────────────────────────
  const app = express();
  app.use(cors({ origin: config.cors.origins }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // ── HTTP + Socket.io ─────────────────────────────────
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.cors.origins,
      methods: ['GET', 'POST'],
    },
    // Ping every 25s, timeout after 20s of no pong — detects dead connections quickly
    pingInterval: 25000,
    pingTimeout: 20000,
  });



  // ── Socket handlers ──────────────────────────────────
  initializeSocketHandlers(io);

  // ── Start server ─────────────────────────────────────
  server.listen(config.port, () => {
    console.log(`\n🚀 Signaling server running on http://localhost:${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   CORS origins: ${Array.isArray(config.cors.origins) ? config.cors.origins.join(', ') : config.cors.origins}\n`);
  });

  // ── Graceful shutdown ────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    // Close all socket connections
    io.close();
    await disconnectRedis();
    // Close HTTP server
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });

    // Force exit after 5s if graceful shutdown hangs
    setTimeout(() => {
      console.error('Forced exit after timeout');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});

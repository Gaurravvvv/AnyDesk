import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import promClient from 'prom-client';
import { config } from './config';

import { initializeSocketHandlers } from './socket';
import { getRedisClient, disconnectRedis } from './services/redisClient';
import { createAdapter } from '@socket.io/redis-adapter';

async function main(): Promise<void> {
  // ── Express ──────────────────────────────────────────
  const app = express();
  app.use(cors({ origin: config.cors.origins }));
  app.use(express.json());

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Prometheus Metrics
  promClient.collectDefaultMetrics();
  app.get('/metrics', async (_req: Request, res: Response) => {
    res.set('Content-Type', promClient.register.contentType);
    res.send(await promClient.register.metrics());
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

  // ── Redis Adapter for Horizontal Scaling ─────────────
  const pubClient = await getRedisClient();
  const subClient = pubClient.duplicate();
  await subClient.connect();
  io.adapter(createAdapter(pubClient, subClient));

  // ── Socket handlers ──────────────────────────────────
  initializeSocketHandlers(io);

  // ── Start server ─────────────────────────────────────
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`\n🚀 Signaling server running on http://localhost:${config.port} and http://<YOUR_IP>:${config.port}`);
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

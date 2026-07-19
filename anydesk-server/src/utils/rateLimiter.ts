/**
 * Sliding-window rate limiter for Socket.io events.
 * Tracks event timestamps per socket ID and rejects requests
 * exceeding the configured threshold.
 */
const windows = new Map<string, number[]>();

const DEFAULTS = {
  maxEvents: 10,
  windowMs: 60_000, // 1 minute
};

export function isRateLimited(
  socketId: string,
  opts: { maxEvents?: number; windowMs?: number } = {}
): boolean {
  const { maxEvents, windowMs } = { ...DEFAULTS, ...opts };
  const now = Date.now();
  
  let timestamps = windows.get(socketId);
  if (!timestamps) {
    timestamps = [];
    windows.set(socketId, timestamps);
  }
  
  // Remove expired entries
  const cutoff = now - windowMs;
  while (timestamps.length > 0 && timestamps[0] < cutoff) {
    timestamps.shift();
  }
  
  if (timestamps.length >= maxEvents) {
    return true; // rate limited
  }
  
  timestamps.push(now);
  return false;
}

/**
 * Clean up tracking for a disconnected socket.
 */
export function clearRateLimit(socketId: string): void {
  windows.delete(socketId);
}

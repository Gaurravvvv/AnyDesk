import type { ControlEvent } from '../types';

const MOUSE_BUTTON_MAP: Record<number, 'left' | 'right' | 'middle'> = {
  0: 'left',
  1: 'middle',
  2: 'right',
};

// Phase 3: Track last sent position for delta encoding
let lastSentX = -1;
let lastSentY = -1;
let lastAbsSyncTime = 0;
const ABS_SYNC_INTERVAL_MS = 500; // Send full absolute position every 500ms

/**
 * Serializes a native browser MouseEvent into a control event.
 * Phase 3: Uses delta encoding (dx, dy) for most moves,
 * falls back to absolute sync every 500ms or when last position is unknown.
 */
export function serializeMouseMove(
  e: MouseEvent,
  rect: DOMRect
): ControlEvent {
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  const now = Date.now();

  // Send absolute sync if: first move, or periodic sync interval elapsed
  const needsAbsSync = lastSentX < 0 || (now - lastAbsSyncTime >= ABS_SYNC_INTERVAL_MS);

  if (needsAbsSync) {
    lastSentX = x;
    lastSentY = y;
    lastAbsSyncTime = now;
    return {
      type: 'mousemove',
      x,
      y,
      timestamp: now,
    };
  }

  // Otherwise send delta
  const dx = x - lastSentX;
  const dy = y - lastSentY;
  lastSentX = x;
  lastSentY = y;

  return {
    type: 'mousedelta',
    dx,
    dy,
    timestamp: now,
  };
}

/**
 * Mouse button events always include absolute position (acts as sync point).
 */
export function serializeMouseButton(
  e: MouseEvent,
  type: 'mousedown' | 'mouseup',
  rect: DOMRect
): ControlEvent {
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  // Phase 3: Click events act as absolute sync points
  lastSentX = x;
  lastSentY = y;
  lastAbsSyncTime = Date.now();

  return {
    type,
    button: MOUSE_BUTTON_MAP[e.button] || 'left',
    x,
    y,
    timestamp: Date.now(),
  };
}

export function serializeWheel(
  e: WheelEvent,
  rect: DOMRect
): ControlEvent {
  return {
    type: 'wheel',
    deltaX: e.deltaX,
    deltaY: e.deltaY,
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
    timestamp: Date.now(),
  };
}

export function serializeKeyboard(
  e: KeyboardEvent,
  type: 'keydown' | 'keyup'
): ControlEvent {
  return {
    type,
    key: e.key,
    code: e.code,
    modifiers: {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey,
    },
    timestamp: Date.now(),
  };
}

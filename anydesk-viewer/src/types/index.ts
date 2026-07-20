// ── Connection State ──────────────────────────────────
export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'requesting'
  | 'approved'
  | 'denied'
  | 'connected'
  | 'disconnected'
  | 'error';

// ── Control Events (Viewer → Host) ───────────────────
export interface MouseMoveEvent {
  type: 'mousemove';
  x: number; // 0-1 relative
  y: number; // 0-1 relative
  timestamp: number;
}

export interface MouseButtonEvent {
  type: 'mousedown' | 'mouseup';
  button: 'left' | 'right' | 'middle';
  x: number;
  y: number;
  timestamp: number;
}

export interface MouseWheelEvent {
  type: 'wheel';
  deltaX: number;
  deltaY: number;
  x: number;
  y: number;
  timestamp: number;
}

export interface KeyboardEvent_ {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
  };
  timestamp: number;
}

// Phase 3: Delta-encoded mouse movement (smaller payload, prevents drift via periodic absolute sync)
export interface MouseDeltaEvent {
  type: 'mousedelta';
  dx: number; // pixel delta (normalized 0-1 space)
  dy: number;
  timestamp: number;
}

export type ControlEvent =
  | MouseMoveEvent
  | MouseDeltaEvent
  | MouseButtonEvent
  | MouseWheelEvent
  | KeyboardEvent_;

// ── Signaling Events ─────────────────────────────────
export interface RoomCreatedPayload {
  code: string;
}

export interface ConnectionRequestPayload {
  viewerId: string;
  roomCode: string;
}

export interface SessionEndedPayload {
  reason: string;
}

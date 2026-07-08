import type { ControlEvent } from '../types';

const MOUSE_BUTTON_MAP: Record<number, 'left' | 'right' | 'middle'> = {
  0: 'left',
  1: 'middle',
  2: 'right',
};

/**
 * Serializes a native browser MouseEvent into a control event
 * with coordinates normalized to 0-1 range relative to the target element.
 */
export function serializeMouseMove(
  e: MouseEvent,
  rect: DOMRect
): ControlEvent {
  return {
    type: 'mousemove',
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
    timestamp: Date.now(),
  };
}

export function serializeMouseButton(
  e: MouseEvent,
  type: 'mousedown' | 'mouseup',
  rect: DOMRect
): ControlEvent {
  return {
    type,
    button: MOUSE_BUTTON_MAP[e.button] || 'left',
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
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

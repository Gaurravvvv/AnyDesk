import { useCallback, useRef } from 'react';
import type { ControlEvent } from '../types';
import {
  serializeMouseMove,
  serializeMouseButton,
  serializeWheel,
  serializeKeyboard,
} from '../services/inputSerializer';
import { config } from '../config';

/**
 * Captures mouse and keyboard input on a target element,
 * serializes events, and sends them through the provided callback.
 *
 * Mouse coordinates are normalized to 0-1 relative to the video element.
 * Mousemove events are throttled to ~60fps.
 */
export function useInputCapture(
  onSendEvent: (event: ControlEvent) => void
) {
  const lastMoveTime = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const attachListeners = useCallback(
    (container: HTMLDivElement) => {
      containerRef.current = container;

      const getRect = () => container.getBoundingClientRect();

      // ── Mouse move (throttled) ──
      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();
        if (now - lastMoveTime.current < config.inputThrottleMs) return;
        lastMoveTime.current = now;

        onSendEvent(serializeMouseMove(e, getRect()));
      };

      // ── Mouse buttons ──
      const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        onSendEvent(serializeMouseButton(e, 'mousedown', getRect()));
      };

      const handleMouseUp = (e: MouseEvent) => {
        onSendEvent(serializeMouseButton(e, 'mouseup', getRect()));
      };

      // ── Scroll wheel ──
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        onSendEvent(serializeWheel(e, getRect()));
      };

      // ── Keyboard ──
      const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        onSendEvent(serializeKeyboard(e, 'keydown'));
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        e.preventDefault();
        onSendEvent(serializeKeyboard(e, 'keyup'));
      };

      // ── Disable context menu on the video area ──
      const handleContextMenu = (e: Event) => {
        e.preventDefault();
      };

      // Attach all listeners
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mousedown', handleMouseDown);
      container.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('wheel', handleWheel, { passive: false });
      container.addEventListener('contextmenu', handleContextMenu);

      // Keyboard events need the element to be focusable
      container.setAttribute('tabindex', '0');
      container.addEventListener('keydown', handleKeyDown);
      container.addEventListener('keyup', handleKeyUp);

      // Return cleanup function
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('contextmenu', handleContextMenu);
        container.removeEventListener('keydown', handleKeyDown);
        container.removeEventListener('keyup', handleKeyUp);
      };
    },
    [onSendEvent]
  );

  return { attachListeners };
}

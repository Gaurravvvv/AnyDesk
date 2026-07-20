import { useCallback, useRef } from 'react';
import type { ControlEvent } from '../types';
import {
  serializeMouseMove,
  serializeMouseButton,
  serializeWheel,
  serializeKeyboard,
} from '../services/inputSerializer';

// Phase 3: Adaptive throttle thresholds
const THROTTLE_FAST_MS = 16;   // ~60Hz
const THROTTLE_SLOW_MS = 33;   // ~30Hz
const BUFFER_THRESHOLD = 16384; // 16KB — switch to slow mode above this

/**
 * Captures mouse and keyboard input on a target element,
 * serializes events, and sends them through the provided callback.
 *
 * Mouse coordinates are normalized to 0-1 relative to the video element.
 * Phase 3: Adaptive throttling — 60Hz normally, 30Hz when DataChannel buffer backs up.
 */
export function useInputCapture(
  onSendEvent: (event: ControlEvent) => void,
  getMouseBufferedAmount?: () => number
) {
  const lastMoveTime = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isThrottledRef = useRef(false); // Phase 3: track current throttle mode

  const attachListeners = useCallback(
    (container: HTMLDivElement) => {
      containerRef.current = container;

      const getRect = () => container.getBoundingClientRect();

      // ── Mouse move (adaptively throttled) ──
      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();

        // Phase 3: Adaptive throttle based on DataChannel buffer
        let throttleMs = THROTTLE_FAST_MS;
        if (getMouseBufferedAmount) {
          const buffered = getMouseBufferedAmount();
          if (buffered > BUFFER_THRESHOLD) {
            throttleMs = THROTTLE_SLOW_MS;
            if (!isThrottledRef.current) {
              console.log(`[Phase3] DataChannel buffer high (${buffered}B) — throttling to ${THROTTLE_SLOW_MS}ms`);
              isThrottledRef.current = true;
            }
          } else if (isThrottledRef.current) {
            console.log(`[Phase3] DataChannel buffer drained (${buffered}B) — restoring ${THROTTLE_FAST_MS}ms`);
            isThrottledRef.current = false;
          }
        }

        if (now - lastMoveTime.current < throttleMs) return;
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
        // Allow standard browser shortcuts
        if (
          e.key === 'F5' || 
          e.key === 'F12' || 
          (e.ctrlKey && (e.key === 'w' || e.key === 'r')) ||
          (e.ctrlKey && e.shiftKey && e.key === 'I')
        ) {
          return;
        }
        e.preventDefault();
        onSendEvent(serializeKeyboard(e, 'keydown'));
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (
          e.key === 'F5' || 
          e.key === 'F12' || 
          (e.ctrlKey && (e.key === 'w' || e.key === 'r')) ||
          (e.ctrlKey && e.shiftKey && e.key === 'I')
        ) {
          return;
        }
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
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // Return cleanup function
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('contextmenu', handleContextMenu);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    },
    [onSendEvent, getMouseBufferedAmount]
  );

  return { attachListeners };
}

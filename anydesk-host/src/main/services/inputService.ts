import { mouse, keyboard, Point, Button, Key, screen } from '@nut-tree-fork/nut-js';

// Setup nut.js config for lower delay
mouse.config.mouseSpeed = 1000;
mouse.config.autoDelayMs = 0;
mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

interface ValidatedEvent {
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'wheel' | 'keydown' | 'keyup';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  deltaX?: number;
  deltaY?: number;
  key?: string;
  code?: string;
  modifiers?: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
  timestamp?: number;
}

const VALID_TYPES = new Set(['mousemove', 'mousedown', 'mouseup', 'wheel', 'keydown', 'keyup']);
const VALID_BUTTONS = new Set(['left', 'right', 'middle']);

function validateEvent(payload: any): ValidatedEvent | null {
  if (!payload || typeof payload !== 'object') return null;
  if (!VALID_TYPES.has(payload.type)) return null;
  
  // Validate numeric ranges for mouse events
  if (['mousemove', 'mousedown', 'mouseup', 'wheel'].includes(payload.type)) {
    if (typeof payload.x !== 'number' || typeof payload.y !== 'number') return null;
    if (payload.x < -0.1 || payload.x > 1.1 || payload.y < -0.1 || payload.y > 1.1) return null;
  }
  
  // Validate button field
  if (['mousedown', 'mouseup'].includes(payload.type)) {
    if (!VALID_BUTTONS.has(payload.button)) return null;
  }
  
  // Validate key code (prevent prototype pollution via __proto__, constructor, etc.)
  if (['keydown', 'keyup'].includes(payload.type)) {
    if (typeof payload.code !== 'string') return null;
    if (payload.code.startsWith('__') || payload.code === 'constructor') return null;
    if (payload.code.length > 30) return null; // no valid key code is this long
  }
  
  return payload as ValidatedEvent;
}

export class InputService {
  private screenWidth = 1920;
  private screenHeight = 1080;
  private pressedKeys = new Set<Key>();
  private pressedMouseButtons = new Set<Button>();

  constructor() {
    this.init();
  }

  async init() {
    const width = await screen.width();
    const height = await screen.height();
    this.screenWidth = width;
    this.screenHeight = height;
    console.log(`Initialized InputService with screen size: ${width}x${height}`);
  }

  async handleEvent(payload: any) {
    const validated = validateEvent(payload);
    if (!validated) {
      console.warn('[InputService] Rejected invalid event:', payload?.type);
      return;
    }
    try {
      switch (validated.type) {
        case 'mousemove':
          const x = Math.max(0, Math.min(this.screenWidth, validated.x! * this.screenWidth));
          const y = Math.max(0, Math.min(this.screenHeight, validated.y! * this.screenHeight));
          await mouse.setPosition(new Point(x, y));
          break;

        case 'mousedown':
          const btnDown = this.mapMouseButton(validated.button!);
          this.pressedMouseButtons.add(btnDown);
          await mouse.pressButton(btnDown);
          break;

        case 'mouseup':
          const btnUp = this.mapMouseButton(validated.button!);
          this.pressedMouseButtons.delete(btnUp);
          await mouse.releaseButton(btnUp);
          break;

        case 'wheel':
          // Normalize: browser sends ~100 per "notch" for wheel, ~1-3 for trackpad
          const scrollAmount = Math.max(1, Math.round(Math.abs(validated.deltaY!) / 100));
          if (validated.deltaY! < 0) {
            await mouse.scrollUp(scrollAmount);
          } else {
            await mouse.scrollDown(scrollAmount);
          }
          break;

        case 'keydown':
          const downKey = this.mapKey(validated.code!);
          if (downKey !== null) {
            this.pressedKeys.add(downKey);
            await keyboard.pressKey(downKey);
          }
          break;

        case 'keyup':
          const upKey = this.mapKey(validated.code!);
          if (upKey !== null) {
            this.pressedKeys.delete(upKey);
            await keyboard.releaseKey(upKey);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling input event:', error);
    }
  }

  async releaseAllInputs() {
    for (const key of this.pressedKeys) {
      try { await keyboard.releaseKey(key); } catch (e) {}
    }
    this.pressedKeys.clear();

    for (const btn of this.pressedMouseButtons) {
      try { await mouse.releaseButton(btn); } catch (e) {}
    }
    this.pressedMouseButtons.clear();
    console.log('Released all stuck inputs during cleanup.');
  }

  private mapMouseButton(button: 'left' | 'right' | 'middle'): Button {
    switch (button) {
      case 'right': return Button.RIGHT;
      case 'middle': return Button.MIDDLE;
      case 'left':
      default: return Button.LEFT;
    }
  }

  private mapKey(code: string): Key | null {
    // Comprehensive key mapping
    const keyMap: Record<string, Key> = {
      'Backspace': Key.Backspace,
      'Tab': Key.Tab,
      'Enter': Key.Enter,
      'ShiftLeft': Key.LeftShift,
      'ShiftRight': Key.RightShift,
      'ControlLeft': Key.LeftControl,
      'ControlRight': Key.RightControl,
      'AltLeft': Key.LeftAlt,
      'AltRight': Key.RightAlt,
      'MetaLeft': Key.LeftSuper,
      'MetaRight': Key.RightSuper,
      'Escape': Key.Escape,
      'Space': Key.Space,
      'ArrowLeft': Key.Left,
      'ArrowUp': Key.Up,
      'ArrowRight': Key.Right,
      'ArrowDown': Key.Down,
      'PageUp': Key.PageUp,
      'PageDown': Key.PageDown,
      'Home': Key.Home,
      'End': Key.End,
      'Insert': Key.Insert,
      'Delete': Key.Delete,
      // Alphabet
      'KeyA': Key.A, 'KeyB': Key.B, 'KeyC': Key.C, 'KeyD': Key.D, 'KeyE': Key.E,
      'KeyF': Key.F, 'KeyG': Key.G, 'KeyH': Key.H, 'KeyI': Key.I, 'KeyJ': Key.J,
      'KeyK': Key.K, 'KeyL': Key.L, 'KeyM': Key.M, 'KeyN': Key.N, 'KeyO': Key.O,
      'KeyP': Key.P, 'KeyQ': Key.Q, 'KeyR': Key.R, 'KeyS': Key.S, 'KeyT': Key.T,
      'KeyU': Key.U, 'KeyV': Key.V, 'KeyW': Key.W, 'KeyX': Key.X, 'KeyY': Key.Y, 'KeyZ': Key.Z,
      // Digits
      'Digit0': Key.Num0, 'Digit1': Key.Num1, 'Digit2': Key.Num2, 'Digit3': Key.Num3,
      'Digit4': Key.Num4, 'Digit5': Key.Num5, 'Digit6': Key.Num6, 'Digit7': Key.Num7,
      'Digit8': Key.Num8, 'Digit9': Key.Num9,
      // Function keys
      'F1': Key.F1, 'F2': Key.F2, 'F3': Key.F3, 'F4': Key.F4, 'F5': Key.F5, 'F6': Key.F6,
      'F7': Key.F7, 'F8': Key.F8, 'F9': Key.F9, 'F10': Key.F10, 'F11': Key.F11, 'F12': Key.F12,
      // Symbols
      'Minus': Key.Minus,
      'Equal': Key.Equal,
      'BracketLeft': Key.LeftBracket,
      'BracketRight': Key.RightBracket,
      'Backslash': Key.Backslash,
      'Semicolon': Key.Semicolon,
      'Quote': Key.Quote,
      'Comma': Key.Comma,
      'Period': Key.Period,
      'Slash': Key.Slash,
      'Backquote': Key.Grave,
      // Numpad
      'Numpad0': Key.Num0, 'Numpad1': Key.Num1, 'Numpad2': Key.Num2, 'Numpad3': Key.Num3,
      'Numpad4': Key.Num4, 'Numpad5': Key.Num5, 'Numpad6': Key.Num6, 'Numpad7': Key.Num7,
      'Numpad8': Key.Num8, 'Numpad9': Key.Num9,
      'NumpadAdd': Key.Add, 'NumpadSubtract': Key.Subtract, 'NumpadMultiply': Key.Multiply, 'NumpadDivide': Key.Divide,
      'NumpadDecimal': Key.Decimal
    };
    return keyMap[code] ?? null;
  }
}

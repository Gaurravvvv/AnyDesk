import { mouse, keyboard, Point, Button, Key, screen } from '@nut-tree-fork/nut-js';

// Setup nut.js config for lower delay
mouse.config.mouseSpeed = 1000;
mouse.config.autoDelayMs = 0;
keyboard.config.autoDelayMs = 0;

export class InputService {
  private screenWidth = 1920;
  private screenHeight = 1080;

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
    try {
      switch (payload.type) {
        case 'mousemove':
          const x = Math.max(0, Math.min(this.screenWidth, payload.x * this.screenWidth));
          const y = Math.max(0, Math.min(this.screenHeight, payload.y * this.screenHeight));
          await mouse.setPosition(new Point(x, y));
          break;

        case 'mousedown':
          await mouse.pressButton(this.mapMouseButton(payload.button));
          break;

        case 'mouseup':
          await mouse.releaseButton(this.mapMouseButton(payload.button));
          break;

        case 'wheel':
          if (payload.deltaY < 0) {
            await mouse.scrollUp(Math.abs(payload.deltaY));
          } else {
            await mouse.scrollDown(payload.deltaY);
          }
          break;

        case 'keydown':
          const downKey = this.mapKey(payload.code);
          if (downKey !== null) {
            await keyboard.pressKey(downKey);
          }
          break;

        case 'keyup':
          const upKey = this.mapKey(payload.code);
          if (upKey !== null) {
            await keyboard.releaseKey(upKey);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling input event:', error);
    }
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
    // Basic mapping for MVP. In a production app, this would be comprehensive.
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
      'Escape': Key.Escape,
      'Space': Key.Space,
      'ArrowLeft': Key.Left,
      'ArrowUp': Key.Up,
      'ArrowRight': Key.Right,
      'ArrowDown': Key.Down,
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
    };
    return keyMap[code] || null;
  }
}

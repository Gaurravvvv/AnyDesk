import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '../types';
import { StatusIndicator } from './StatusIndicator';

interface ConnectScreenProps {
  status: ConnectionStatus;
  onConnect: (code: string) => void;
  errorMessage?: string;
}

export function ConnectScreen({ status, onConnect, errorMessage }: ConnectScreenProps) {
  const [code, setCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    setCode(cleaned);
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (code.length === 6 && status === 'idle') {
        onConnect(code);
      }
    },
    [code, status, onConnect]
  );

  // Auto-focus the input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const isLoading = status === 'connecting' || status === 'requesting' || status === 'approved';
  const isDisabled = code.length !== 6 || isLoading;

  // Total 6 slots representing the 6-character room code
  const renderSlots = () => {
    const slots = [];
    const totalSlots = 6;
    const cursorIndex = code.length;

    for (let i = 0; i < totalSlots; i++) {
      let char = '';
      let hasChar = false;

      if (code[i] !== undefined) {
        char = code[i];
        hasChar = true;
      }

      const showCursor = isFocused && i === cursorIndex;

      slots.push(
        <div
          key={i}
          className="relative w-8 h-16 flex items-center justify-center select-none"
        >
          {/* Cursor (blinking vertical line) */}
          {showCursor && (
            <div className="absolute left-[-2px] top-1/4 bottom-1/4 w-[1px] bg-white cursor-blink" />
          )}

          {/* Character or Underline */}
          {hasChar ? (
            <span className="text-3xl font-light text-white font-sans tracking-normal uppercase">
              {char}
            </span>
          ) : (
            <div className="absolute bottom-2 left-0 right-0 h-[1px] bg-zinc-700" />
          )}
        </div>
      );
    }

    // Special case for cursor at the end when input is fully filled
    if (isFocused && code.length === totalSlots) {
      slots.push(
        <div key="end-cursor" className="relative w-0 h-16 flex items-center select-none">
          <div className="absolute left-[-2px] top-1/4 bottom-1/4 w-[1px] bg-white cursor-blink" />
        </div>
      );
    }

    return slots;
  };

  return (
    <div className="h-full w-full flex flex-col justify-between items-center bg-zinc-950 p-6">
      {/* Top Spacer */}
      <div className="flex-1" />

      {/* Main Content */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center justify-center">
        {/* Title Group */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-light text-white tracking-wide select-none">
            Remote Desktop
          </h1>
          <p className="text-sm font-light text-zinc-500 tracking-wider mt-4">
            Enter room code
          </p>
        </div>

        {/* Custom Input Block */}
        <div className="relative my-8 cursor-text" onClick={handleContainerClick}>
          {/* Hidden real input */}
          <input
            ref={inputRef}
            id="room-code-input"
            type="text"
            value={code}
            onChange={handleCodeChange}
            disabled={isLoading}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            spellCheck={false}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
          />

          {/* Styled Slots Row */}
          <div className="flex items-center gap-4 px-2">
            {renderSlots()}
          </div>
        </div>

        {/* Connect Button */}
        <form onSubmit={handleSubmit} className="w-full flex justify-center mt-6">
          <button
            id="connect-button"
            type="submit"
            disabled={isDisabled}
            className="w-44 py-2.5 rounded-full border border-white/20 hover:border-white/45
                       text-white font-light text-sm bg-transparent hover:bg-white/5
                       disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-white/20
                       transition-all duration-200 focus:outline-none"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner" />
                <span>Connecting</span>
              </span>
            ) : (
              'Connect'
            )}
          </button>
        </form>
      </div>

      {/* Bottom Status Block */}
      <div className="flex-1 w-full flex flex-col justify-end items-center pb-6">
        <StatusIndicator status={status} label={errorMessage || undefined} />
        
        {/* Download Link */}
        <div className="mt-8 text-center">
          <a
            href="https://github.com/yourusername/anydesk/releases/latest/download/AnyDesk-Setup.exe"
            className="text-xs font-light text-zinc-500 hover:text-zinc-300 underline-offset-4 hover:underline transition-all duration-200"
            title="Download the Host Agent to allow others to control your computer"
          >
            Need to share your screen? Download the Host Agent
          </a>
        </div>
      </div>
    </div>
  );
}

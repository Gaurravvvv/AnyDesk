import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '../types';
import { StatusIndicator } from './StatusIndicator';
import Lightfall from '../Lightfall';

interface ConnectScreenProps {
  status: ConnectionStatus;
  onConnect: (code: string) => void;
  onCancel: () => void;
  errorMessage?: string;
}

export function ConnectScreen({ status, onConnect, onCancel, errorMessage }: ConnectScreenProps) {
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

  const handleClearOrCancel = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    const isLoading = status === 'connecting' || status === 'requesting' || status === 'approved';
    if (isLoading) {
      onCancel();
    } else {
      setCode('');
      inputRef.current?.focus();
    }
  }, [status, onCancel]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Allow submit if not already loading and we have 6 chars.
      // (Even if status is 'error' or 'denied', submitting again should be allowed)
      if (code.length === 6 && status !== 'connecting' && status !== 'requesting' && status !== 'approved') {
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
            <span className="text-3xl font-light text-white font-sans tracking-normal uppercase relative z-10">
              {char}
            </span>
          ) : (
            <div className="absolute bottom-2 left-0 right-0 h-[1px] bg-zinc-400/50" />
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
    <div className="relative h-full w-full overflow-hidden">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0">
        <Lightfall
          colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
          backgroundColor="#0A29FF"
          speed={0.5}
          streakCount={2}
          streakWidth={1}
          streakLength={1}
          glow={1}
          density={0.6}
          twinkle={1}
          zoom={3}
          backgroundGlow={0.5}
          opacity={1}
          mouseInteraction
          mouseStrength={0.5}
          mouseRadius={1}
        />
      </div>

      {/* Foreground Content */}
      <div className="relative z-10 h-full w-full flex flex-col justify-between items-center p-6 bg-transparent">
        
        {/* Top Right Download Icon */}
        <a
          href="https://github.com/Gaurravvvv/AnyDesk/releases/download/v1.0.0/AnyDesk.Host.Setup.1.0.0.exe"
          className="absolute top-6 right-6 p-2.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300 shadow-lg group flex items-center justify-center focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {/* Custom Tooltip */}
          <span className="absolute right-full mr-3 whitespace-nowrap bg-black/60 backdrop-blur-sm text-xs text-zinc-200 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-white/10 shadow-lg">
            Download Host Agent
          </span>
        </a>

        {/* Top Spacer */}
        <div className="flex-1" />

        {/* Main Content (Wrapped in Form for Enter to submit) */}
        <form 
          onSubmit={handleSubmit} 
          className="w-full max-w-lg mx-auto flex flex-col items-center justify-center"
        >
          {/* Title Group */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-light text-white tracking-wide select-none drop-shadow-lg">
              Remote Desktop
            </h1>
            <p className="text-sm font-light text-zinc-200 tracking-wider mt-4 drop-shadow-md">
              Enter room code
            </p>
          </div>

          {/* Custom Input Block */}
          <div className="relative mb-10 cursor-text px-4" onClick={handleContainerClick}>
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
              className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
            />

            {/* Styled Slots Row */}
            <div className="flex items-center gap-4">
              {renderSlots()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 w-full px-4">
            <button
              id="clear-button"
              type="button"
              onClick={handleClearOrCancel}
              disabled={(!isLoading && code.length === 0)}
              className="w-32 py-3 rounded-full border border-white/20 hover:border-white text-zinc-300 hover:text-white font-medium text-sm bg-black/20 hover:bg-black/40 backdrop-blur-md shadow-xl disabled:opacity-20 disabled:hover:bg-black/20 disabled:hover:border-white/20 transition-all duration-300 focus:outline-none"
            >
              {isLoading ? 'Cancel' : 'Clear'}
            </button>

            <button
              id="connect-button"
              type="submit"
              disabled={isDisabled}
              className="w-44 py-3 rounded-full border border-white/40 hover:border-white text-white font-medium text-sm bg-white/10 hover:bg-white/20 backdrop-blur-md shadow-xl disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:border-white/40 transition-all duration-300 focus:outline-none"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner border-t-white" />
                  <span>Connecting</span>
                </span>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>

        {/* Bottom Status Block */}
        <div className="flex-1 w-full flex flex-col justify-end items-center pb-6">
          <div className="mb-4">
            <StatusIndicator status={status} label={errorMessage || undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}


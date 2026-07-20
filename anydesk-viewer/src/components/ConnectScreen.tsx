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
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
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
        try {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
              console.warn('[Fullscreen] Could not enter fullscreen:', err);
            });
          }
        } catch (e) {
          // ignore
        }
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
        
        {/* Top Left Info Icon */}
        <button
          type="button"
          onClick={() => setIsInfoModalOpen(true)}
          className="absolute top-6 left-6 p-2.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300 shadow-lg group flex items-center justify-center focus:outline-none z-20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          {/* Custom Tooltip */}
          <span className="absolute left-full ml-3 whitespace-nowrap bg-black/60 backdrop-blur-sm text-xs text-zinc-200 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none border border-white/10 shadow-lg">
            How to Use
          </span>
        </button>

        {/* Top Right Download Icon */}
        <a
          href="https://github.com/Gaurravvvv/AnyDesk/releases/download/v1.0.0/AnyDesk.Host.Setup.1.0.0.exe"
          className="absolute top-6 right-6 p-2.5 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-md border border-white/10 transition-all duration-300 shadow-lg group flex items-center justify-center focus:outline-none z-20"
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

      {/* Info Modal Overlay */}
      {isInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-300" style={{ padding: '2rem' }}>
          <div className="bg-zinc-950/90 border border-white/10 shadow-2xl relative w-full max-w-2xl backdrop-blur-xl" style={{ padding: '3rem', borderRadius: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <button 
              onClick={() => setIsInfoModalOpen(false)}
              className="absolute text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all focus:outline-none"
              style={{ top: '1.5rem', right: '1.5rem', padding: '0.5rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            
            <h2 className="text-3xl font-light text-white flex items-center gap-4" style={{ marginBottom: '2.5rem' }}>
              <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </span>
              How to Use Remote Desktop
            </h2>
            
            <div className="text-zinc-300 font-light text-base">
              <div className="bg-white/5 border border-white/5" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <h3 className="text-white font-medium text-lg flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                  <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Step 1</span> 
                  Want to Share Your Screen?
                </h3>
                <p style={{ lineHeight: '1.8', opacity: 0.9 }}>
                  Click the download icon in the top right corner to download the <strong>Host Agent</strong>. Install and run it on your Windows machine. It will automatically generate a secure 6-character room code for you to share.
                </p>
              </div>
              
              <div className="bg-white/5 border border-white/5" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderRadius: '1rem' }}>
                <h3 className="text-white font-medium text-lg flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                  <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Step 2</span> 
                  Want to Control a Screen?
                </h3>
                <p style={{ lineHeight: '1.8', opacity: 0.9 }}>
                  Get the 6-character room code from the person running the Host Agent. Enter it into the center boxes on this page and click <strong>Connect</strong>.
                </p>
              </div>
              
              <div className="bg-white/5 border border-white/5" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                <h3 className="text-white font-medium text-lg flex items-center gap-3" style={{ marginBottom: '1rem' }}>
                  <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-1 rounded-md uppercase tracking-wider font-bold">Step 3</span> 
                  Start the Session
                </h3>
                <p style={{ lineHeight: '1.8', opacity: 0.9 }}>
                  Once you click Connect, the Host Agent will ask the owner to approve your request. After approval, you will instantly see their screen and be able to control their mouse and keyboard!
                </p>
              </div>
            </div>
            
            <div className="flex justify-end" style={{ marginTop: '2.5rem' }}>
              <button 
                onClick={() => setIsInfoModalOpen(false)}
                className="text-white font-medium text-base bg-white/10 hover:bg-white/20 transition-all focus:outline-none shadow-lg backdrop-blur-md"
                style={{ padding: '0.8rem 2.5rem', borderRadius: '9999px', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


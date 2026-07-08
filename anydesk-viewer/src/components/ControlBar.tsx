import { useState, useEffect, useRef, useCallback } from 'react';
import { config } from '../config';

interface ControlBarProps {
  onDisconnect: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

export function ControlBar({ onDisconnect, onFullscreen, isFullscreen }: ControlBarProps) {
  const [visible, setVisible] = useState(false);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showBar = useCallback(() => {
    setVisible(true);
    clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      setVisible(false);
    }, config.controlBarHideDelay);
  }, []);

  // Show bar when mouse is near the top edge
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= config.controlBarTriggerZone) {
        showBar();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(hideTimeout.current);
    };
  }, [showBar]);

  return (
    <div
      className={`control-bar fixed top-0 left-0 right-0 z-50
                  flex items-center justify-between px-4 h-10
                  bg-bg-overlay/90 backdrop-blur-sm border-b border-border/50
                  ${visible ? 'visible' : ''}`}
      onMouseEnter={showBar}
    >
      {/* Left — session info */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-success" />
        <span className="text-xs text-text-muted">Remote session active</span>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-2">
        <button
          id="fullscreen-toggle"
          onClick={onFullscreen}
          className="h-7 px-3 text-xs text-text-muted hover:text-text-primary
                     bg-bg-surface/50 hover:bg-bg-surface
                     rounded-md border border-border/50
                     transition-colors duration-100"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
        <button
          id="disconnect-button"
          onClick={onDisconnect}
          className="h-7 px-3 text-xs text-white
                     bg-danger hover:bg-danger-hover
                     rounded-md transition-colors duration-100"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { ControlBar } from './ControlBar';
import { useInputCapture } from '../hooks/useInputCapture';
import type { ControlEvent } from '../types';

interface SessionScreenProps {
  remoteStream: MediaStream;
  onSendEvent: (event: ControlEvent) => void;
  onDisconnect: () => void;
}

export function SessionScreen({ remoteStream, onSendEvent, onDisconnect }: SessionScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { attachListeners } = useInputCapture(onSendEvent);

  // Attach the remote stream to the video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().catch(e => console.warn('[Video] Play prevented:', e));
    }
  }, [remoteStream]);

  // Attach input capture listeners to the container
  useEffect(() => {
    if (containerRef.current) {
      const cleanup = attachListeners(containerRef.current);
      // Focus the container so keyboard events are captured
      containerRef.current.focus();
      return cleanup;
    }
  }, [attachListeners]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('[Fullscreen] Error:', err);
    }
  }, []);

  // Listen for fullscreen changes (e.g. Escape key)
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  return (
    <div className="h-full w-full bg-black relative">
      {/* Control bar */}
      <ControlBar
        onDisconnect={onDisconnect}
        onFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Remote video */}
      <div
        ref={containerRef}
        className="h-full w-full relative cursor-default outline-none bg-black"
        tabIndex={0}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-contain"
          style={{ pointerEvents: 'none' }}
        />
      </div>
    </div>
  );
}

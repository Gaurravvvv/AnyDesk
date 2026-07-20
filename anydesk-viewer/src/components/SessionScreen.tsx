import { useEffect, useRef } from 'react';
import { DraggableDisconnect } from './DraggableDisconnect';
import { useInputCapture } from '../hooks/useInputCapture';
import type { ControlEvent } from '../types';

interface SessionScreenProps {
  remoteStream: MediaStream;
  onSendEvent: (event: ControlEvent) => void;
  onDisconnect: () => void;
  getMouseBufferedAmount: () => number;
}

export function SessionScreen({ remoteStream, onSendEvent, onDisconnect, getMouseBufferedAmount }: SessionScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { attachListeners } = useInputCapture(onSendEvent, getMouseBufferedAmount);

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

  return (
    <div className="h-full w-full bg-black relative">
      <DraggableDisconnect onDisconnect={onDisconnect} />

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

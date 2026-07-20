import { useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { config } from '../config';
import type { ControlEvent, ConnectionStatus } from '../types';

/**
 * Manages the WebRTC peer connection lifecycle for the viewer side.
 *
 * Handles:
 * - RTCPeerConnection creation with ICE servers
 * - SDP answer generation in response to host's offer
 * - ICE candidate exchange via signaling
 * - Remote video stream attachment
 * - RTCDataChannel for sending control events
 */
export function useWebRTC(socket: Socket | null) {
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const mouseChannelRef = useRef<RTCDataChannel | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  // Phase 2: Cursor callback for overlay
  const cursorCallbackRef = useRef<((x: number, y: number, cursor: string) => void) | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionStatus>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  /**
   * Initializes the WebRTC peer connection and sets up signaling listeners.
   * Called after the host approves the connection.
   */
  const initConnection = useCallback(
    (roomCode: string, onStreamReady?: (stream: MediaStream) => void) => {
      if (!socket) {
        console.error('[WebRTC] No socket available');
        return;
      }

      // Create peer connection
      const pc = new RTCPeerConnection({ iceServers: config.iceServers });
      peerConnectionRef.current = pc;

      const pendingCandidates: RTCIceCandidateInit[] = [];

      setConnectionState('connecting');

      // ── Handle incoming media tracks (host's screen) ──
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);
        const stream = event.streams[0];
        if (stream) {
          remoteStreamRef.current = stream;
          setRemoteStream(stream);
          setConnectionState('connected');
          onStreamReady?.(stream);

          // Phase 4: Minimize playout/jitter buffer for lowest latency
          // playoutDelayHint tells the browser to render frames ASAP rather than buffering
          // for smoothness. Freshness > smoothness for a remote control app.
          const receiver = event.receiver;
          if (receiver && 'playoutDelayHint' in receiver) {
            try {
              (receiver as any).playoutDelayHint = 0;
              console.log('[Phase4] Set playoutDelayHint to 0 (minimum latency mode)');
            } catch (e) {
              console.warn('[Phase4] Failed to set playoutDelayHint:', e);
            }
          } else {
            // playoutDelayHint is not universally supported — Chromium 94+ only.
            // When unavailable, the browser uses its default jitter buffer (~100-200ms).
            console.log('[Phase4] playoutDelayHint not supported — using default jitter buffer');
          }
        }
      };

      // ── Handle ICE candidates — send to host via signaling ──
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            candidate: event.candidate.toJSON(),
            roomCode,
          });
        }
      };

      // ── Monitor connection state ──
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setConnectionState('connected');
            break;
          case 'disconnected':
          case 'failed':
          case 'closed':
            setConnectionState('disconnected');
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      };

      // ── Handle incoming data channels from host ──
      pc.ondatachannel = (event) => {
        console.log('[WebRTC] Data channel received:', event.channel.label);
        const dc = event.channel;
        dc.onopen = () => console.log(`[WebRTC] Data channel '${dc.label}' open`);
        dc.onclose = () => console.log(`[WebRTC] Data channel '${dc.label}' closed`);
        
        if (dc.label === 'mouse') {
          mouseChannelRef.current = dc;
        } else if (dc.label === 'keys') {
          dataChannelRef.current = dc;
        } else if (dc.label === 'cursor') {
          // Phase 2: Cursor feedback channel from host
          dc.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              if (data.type === 'cursor' && cursorCallbackRef.current) {
                cursorCallbackRef.current(data.x, data.y, data.cursor || 'default');
              }
            } catch (e) {
              // ignore malformed cursor data
            }
          };
          console.log('[Phase2] Cursor feedback channel connected');
        }
      };

      // ── Listen for SDP offer from host ──
      socket.on('sdp-offer', async (data: { sdp: RTCSessionDescriptionInit; roomCode: string }) => {
        try {
          console.log('[WebRTC] Received SDP offer');
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

          // Flush any ICE candidates that arrived before the offer
          for (const candidate of pendingCandidates) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.length = 0;

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('sdp-answer', {
            sdp: pc.localDescription,
            roomCode: data.roomCode,
          });
          console.log('[WebRTC] Sent SDP answer');
        } catch (err) {
          console.error('[WebRTC] Error handling SDP offer:', err);
          setConnectionState('error');
        }
      });

      // ── Listen for ICE candidates from host ──
      socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
        try {
          if (!data.candidate) return;
          if (!pc.remoteDescription) {
            // Buffer candidate — will be flushed after setRemoteDescription
            pendingCandidates.push(data.candidate);
            return;
          }
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      });
    },
    [socket]
  );

  /**
   * Sends a control event to the host via the data channel.
   */
  const sendControlEvent = useCallback((event: ControlEvent) => {
    // Route mouse moves to the unreliable channel, everything else to reliable
    const isMouseMove = event.type === 'mousemove';
    const dc = isMouseMove ? mouseChannelRef.current : dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(event));
    } else {
      console.warn('[WebRTC] Data channel not ready, readyState:', dc?.readyState);
    }
  }, []);

  /**
   * Tears down the peer connection and data channel.
   */
  const disconnect = useCallback(() => {
    if (mouseChannelRef.current) {
      mouseChannelRef.current.close();
      mouseChannelRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    remoteStreamRef.current = null;
    setRemoteStream(null);
    setConnectionState('disconnected');

    // Clean up socket listeners
    if (socket) {
      socket.off('sdp-offer');
      socket.off('ice-candidate');
    }
  }, [socket]);

  return {
    connectionState,
    remoteStream,
    initConnection,
    sendControlEvent,
    disconnect,
    // Phase 2: Set callback for cursor overlay updates
    setCursorCallback: (cb: ((x: number, y: number, cursor: string) => void) | null) => {
      cursorCallbackRef.current = cb;
    },
    // Phase 3: Expose mouse channel buffered amount for adaptive throttling
    getMouseBufferedAmount: () => mouseChannelRef.current?.bufferedAmount ?? 0,
  };
}

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
  const remoteStreamRef = useRef<MediaStream | null>(null);

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

      // ── Handle incoming data channel (control channel from host) ──
      pc.ondatachannel = (event) => {
        console.log('[WebRTC] Data channel received:', event.channel.label);
        if (event.channel.label === 'control') {
          dataChannelRef.current = event.channel;
        }
      };

      // ── Create a data channel from viewer side as well ──
      const dc = pc.createDataChannel('control', { ordered: true });
      dc.onopen = () => console.log('[WebRTC] Data channel open');
      dc.onclose = () => console.log('[WebRTC] Data channel closed');
      dataChannelRef.current = dc;

      // ── Listen for SDP offer from host ──
      socket.on('sdp-offer', async (data: { sdp: RTCSessionDescriptionInit; roomCode: string }) => {
        try {
          console.log('[WebRTC] Received SDP offer');
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

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
          if (data.candidate && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
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
    const dc = dataChannelRef.current;
    if (dc && dc.readyState === 'open') {
      dc.send(JSON.stringify(event));
    }
  }, []);

  /**
   * Tears down the peer connection and data channel.
   */
  const disconnect = useCallback(() => {
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
  };
}

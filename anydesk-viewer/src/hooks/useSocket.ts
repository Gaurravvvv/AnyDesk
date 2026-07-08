import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/signalingService';

/**
 * Manages the Socket.io connection lifecycle.
 * Auto-connects on mount, disconnects on unmount.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    const onConnect = () => {
      console.log('[Socket] Connected:', socket.id);
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // If already connected (reconnect scenario)
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, []);

  const getSocket = useCallback(() => socketRef.current, []);

  return { socket: socketRef.current, isConnected, getSocket };
}

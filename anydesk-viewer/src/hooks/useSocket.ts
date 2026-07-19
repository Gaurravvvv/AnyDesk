import { useEffect, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, disconnectSocket } from '../services/signalingService';

/**
 * Manages the Socket.io connection lifecycle.
 * Initializes socket synchronously via getSocket(), connects on mount.
 */
export function useSocket() {
  // getSocket() is synchronous — creates the instance once, returns it thereafter
  const [socket] = useState<Socket>(() => getSocket());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
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

    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, [socket]);

  const getSocketRef = useCallback(() => socket, [socket]);

  return { socket, isConnected, getSocket: getSocketRef };
}

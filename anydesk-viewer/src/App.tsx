import { useState, useCallback } from 'react';
import './App.css';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { ConnectScreen } from './components/ConnectScreen';
import { SessionScreen } from './components/SessionScreen';
import type { ConnectionStatus } from './types';

function App() {
  const { socket } = useSocket();
  const { connectionState, remoteStream, initConnection, sendControlEvent, disconnect } =
    useWebRTC(socket);

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>();

  /**
   * Called when the user submits a room code.
   * Sends join-room to the signaling server and listens for host response.
   */
  const handleConnect = useCallback(
    (code: string) => {
      if (!socket) {
        setErrorMessage('Not connected to server');
        setStatus('error');
        return;
      }

      setStatus('requesting');
      setErrorMessage(undefined);

      // Ask to join the room
      socket.emit('join-room', { code });

      // ── Listen for host's response ──

      // Host approved — start WebRTC
      const onApproved = (data: { roomCode: string }) => {
        console.log('[App] Connection approved, starting WebRTC...');
        setStatus('approved');
        initConnection(data.roomCode);
        cleanup();
      };

      // Host denied
      const onDenied = (data: { reason: string }) => {
        console.log('[App] Connection denied:', data.reason);
        setStatus('denied');
        setErrorMessage(data.reason);
        cleanup();
      };

      // Session ended by the other side
      const onSessionEnded = (data: { reason: string }) => {
        console.log('[App] Session ended:', data.reason);
        setStatus('disconnected');
        setErrorMessage(data.reason);
        disconnect();
        cleanup();
      };

      const cleanup = () => {
        socket.off('connection-approved', onApproved);
        socket.off('connection-denied', onDenied);
      };

      socket.on('connection-approved', onApproved);
      socket.on('connection-denied', onDenied);
      socket.on('session-ended', onSessionEnded);
    },
    [socket, initConnection, disconnect]
  );

  /**
   * Disconnect from the remote session.
   */
  const handleDisconnect = useCallback(() => {
    if (socket) {
      socket.emit('session-ended', {});
    }
    disconnect();
    setStatus('idle');
    setErrorMessage(undefined);
  }, [socket, disconnect]);

  // ── Determine current view ──
  const isInSession = connectionState === 'connected' && remoteStream;

  // Sync WebRTC connection state to our status
  const displayStatus: ConnectionStatus =
    connectionState === 'connected' ? 'connected' : status;

  return (
    <>
      {isInSession ? (
        <SessionScreen
          remoteStream={remoteStream}
          onSendEvent={sendControlEvent}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <ConnectScreen
          status={displayStatus}
          onConnect={handleConnect}
          errorMessage={errorMessage}
        />
      )}
    </>
  );
}

export default App;

import type { ConnectionStatus } from '../types';

interface StatusIndicatorProps {
  status: ConnectionStatus;
  label?: string;
}

const STATUS_CLASSES: Record<ConnectionStatus, string> = {
  idle: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
  connecting: 'bg-amber-500 shadow-[0_0_10px_#f59e0b] status-connecting',
  requesting: 'bg-amber-500 shadow-[0_0_10px_#f59e0b] status-connecting',
  approved: 'bg-amber-500 shadow-[0_0_10px_#f59e0b] status-connecting',
  connected: 'bg-emerald-500 shadow-[0_0_10px_#10b981]',
  denied: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
  disconnected: 'bg-zinc-500',
  error: 'bg-red-500 shadow-[0_0_10px_#ef4444]',
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: 'Ready to connect',
  connecting: 'Connecting to server...',
  requesting: 'Requesting access...',
  approved: 'Access granted — establishing connection...',
  connected: 'Connected',
  denied: 'Connection denied',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${STATUS_CLASSES[status]}`}
      />
      <span className="text-sm font-light text-zinc-500">
        {label || STATUS_LABELS[status]}
      </span>
    </div>
  );
}


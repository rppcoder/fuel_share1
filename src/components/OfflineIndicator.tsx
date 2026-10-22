import React, { useEffect, useState } from 'react';
import { WifiOff, CloudAlert, RefreshCw } from 'lucide-react';
import { getOfflineDrafts } from '../lib/offlineDrafts';

interface OfflineIndicatorProps {
  onSyncDrafts?: () => void;
  isSyncing?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  onSyncDrafts,
  isSyncing = false,
}) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    const checkDrafts = () => {
      setDraftCount(getOfflineDrafts().length);
    };

    checkDrafts();
    const interval = setInterval(checkDrafts, 3000);

    const handleOnline = () => {
      setIsOnline(true);
      checkDrafts();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkDrafts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && draftCount === 0) {
    return null;
  }

  return (
    <div className="w-full px-3 py-1.5 flex items-center justify-between shadow-xs transition-all duration-300 text-xs font-medium bg-amber-500 text-slate-950 border-b border-amber-600/40">
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-slate-950 animate-pulse shrink-0" />
            <span>
              <strong>Offline Mode</strong> — New trips saved locally until reconnect.
            </span>
          </>
        ) : (
          <>
            <CloudAlert className="w-4 h-4 text-slate-950 shrink-0" />
            <span>
              <strong>{draftCount} trip draft{draftCount > 1 ? 's' : ''}</strong> waiting to sync to Supabase.
            </span>
          </>
        )}
      </div>

      {isOnline && draftCount > 0 && onSyncDrafts && (
        <button
          onClick={onSyncDrafts}
          disabled={isSyncing}
          className="flex items-center gap-1.5 bg-slate-950 text-white px-2.5 py-1 rounded-md text-xs font-semibold hover:bg-slate-800 active:scale-95 transition disabled:opacity-60"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { X, CloudCheck, LogOut, RefreshCw, Heart, ListMusic } from 'lucide-react';
import type { UserProfile } from '../services/authService';
import { cloudSyncService } from '../services/cloudSyncService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  likedSongsCount: number;
  playlistsCount: number;
  onSignOut: () => void;
  onManualSync: () => Promise<void>;
}

export const UserProfileModal: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  likedSongsCount,
  playlistsCount,
  onSignOut,
  onManualSync,
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncSuccessMsg(null);
    try {
      await onManualSync();
      setSyncSuccessMsg('Cloud backup updated successfully!');
      setTimeout(() => setSyncSuccessMsg(null), 3000);
    } catch {
      setSyncSuccessMsg('Sync error. Local backup retained.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#0e1015',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '28px 24px',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a1a1aa',
            cursor: 'pointer',
          }}
          title="Close (Esc)"
        >
          <X size={15} />
        </button>

        {/* User Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '22px' }}>
          <img
            src={user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`}
            alt={user.displayName || 'User'}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              objectFit: 'cover',
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>
              {user.displayName}
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email || 'Google Connected'}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Cloud Sync Active</span>
            </div>
          </div>
        </div>

        {/* Sync Telemetry Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', marginBottom: '6px' }}>
              <Heart size={14} fill="#ef4444" />
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Liked Songs</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{likedSongsCount}</div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', marginBottom: '6px' }}>
              <ListMusic size={14} />
              <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Playlists</span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{playlistsCount}</div>
          </div>
        </div>

        {/* Cloud Security Indicator */}
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CloudCheck size={18} color="#10b981" />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#e4e4e7' }}>Google Cloud Protected</div>
              <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                Last synced: {cloudSyncService.getLastSyncText()}
              </div>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
            }}
            title="Force sync current library with cloud"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>

        {syncSuccessMsg && (
          <div
            style={{
              padding: '8px 12px',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '6px',
              color: '#34d399',
              fontSize: '12px',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            {syncSuccessMsg}
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

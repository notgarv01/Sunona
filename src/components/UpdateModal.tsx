import React from 'react';
import { X, RefreshCw, Sparkles, CheckCircle2, ArrowUpCircle, ShieldCheck } from 'lucide-react';

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';
  currentVersion: string;
  availableVersion?: string;
  progressPercent?: number;
  transferredBytes?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
  error?: string;
  releaseNotes?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  updateState: UpdateState;
  onCheckForUpdates: () => void;
  onRestartAndInstall: () => void;
}

export const UpdateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  updateState,
  onCheckForUpdates,
  onRestartAndInstall,
}) => {
  if (!isOpen) return null;

  const formatMB = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0.0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSpeed = (bps?: number) => {
    if (!bps || bps <= 0) return '';
    return `${(bps / (1024 * 1024)).toFixed(1)} MB/s`;
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
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(10px)',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#0d0f14',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '18px',
          padding: '28px 24px',
          position: 'relative',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
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

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#070a0f',
            }}
          >
            <ArrowUpCircle size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Software Updates</h3>
            <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '2px' }}>
              Current Version: <strong style={{ color: '#38bdf8' }}>v{updateState.currentVersion}</strong>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '18px',
          }}
        >
          {updateState.status === 'checking' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#38bdf8' }}>
              <RefreshCw size={18} className="animate-spin" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Checking GitHub for latest releases...</span>
            </div>
          )}

          {updateState.status === 'downloading' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#38bdf8' }}>
                  Downloading v{updateState.availableVersion || 'Update'}...
                </span>
                <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#a1a1aa' }}>
                  {Math.round(updateState.progressPercent || 0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '10px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, updateState.progressPercent || 0))}%`,
                    background: 'linear-gradient(90deg, #38bdf8, #818cf8)',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#71717a' }}>
                <span>
                  {formatMB(updateState.transferredBytes)} / {formatMB(updateState.totalBytes)}
                </span>
                {updateState.bytesPerSecond && <span>{formatSpeed(updateState.bytesPerSecond)}</span>}
              </div>
            </div>
          )}

          {updateState.status === 'ready' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399', marginBottom: '8px' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                  Update Ready (v{updateState.availableVersion || 'Latest'})!
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                The update package ({formatMB(updateState.totalBytes || 146241467)}) has been downloaded in the background. Restart now to install instantly.
              </p>
            </div>
          )}

          {updateState.status === 'not-available' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#34d399' }}>
              <CheckCircle2 size={18} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                You're on the latest version of SunoNa!
              </span>
            </div>
          )}

          {updateState.status === 'available' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
              <Sparkles size={18} />
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                New Version v{updateState.availableVersion} is available! Downloading...
              </span>
            </div>
          )}

          {updateState.status === 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#e4e4e7' }}>
              <ShieldCheck size={18} style={{ color: '#38bdf8' }} />
              <span style={{ fontSize: '0.86rem' }}>
                SunoNa checks for background updates on startup.
              </span>
            </div>
          )}

          {updateState.status === 'error' && (
            <div style={{ color: '#f87171', fontSize: '0.82rem' }}>
              {updateState.error || 'Failed to check for updates. Please try again later.'}
            </div>
          )}
        </div>

        {/* Changelog & What's New */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e4e4e7', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} style={{ color: '#fbbf24' }} />
            <span>Highlights in Latest Updates:</span>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '10px',
              padding: '12px 14px',
              fontSize: '0.78rem',
              color: '#a1a1aa',
              lineHeight: 1.5,
              maxHeight: '130px',
              overflowY: 'auto',
            }}
          >
            <div style={{ marginBottom: '6px', color: '#f4f4f5' }}>• <strong>Permanent Login:</strong> Google and Gmail sessions stay logged in across app restarts.</div>
            <div style={{ marginBottom: '6px', color: '#f4f4f5' }}>• <strong>Spotless Clean Dashboard:</strong> Fresh accounts and guests start with 0 liked songs, 0 playlists, and blank history.</div>
            <div style={{ marginBottom: '6px', color: '#f4f4f5' }}>• <strong>Account-Isolated History:</strong> Listening records and Daily Discover recommendations are strictly private to your ID.</div>
            <div style={{ color: '#f4f4f5' }}>• <strong>Silent Auto-Updater:</strong> Seamless background delta updates with real-time progress tracking.</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {updateState.status === 'ready' ? (
            <button
              onClick={onRestartAndInstall}
              style={{
                flex: 1,
                height: '42px',
                borderRadius: '9px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
              <span>Restart & Install Now</span>
            </button>
          ) : (
            <button
              onClick={onCheckForUpdates}
              disabled={updateState.status === 'checking' || updateState.status === 'downloading'}
              style={{
                flex: 1,
                height: '42px',
                borderRadius: '9px',
                background: updateState.status === 'checking' ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #38bdf8, #2563eb)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: updateState.status === 'checking' ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={updateState.status === 'checking' ? 'animate-spin' : ''} />
              <span>{updateState.status === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              padding: '0 18px',
              height: '42px',
              borderRadius: '9px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
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

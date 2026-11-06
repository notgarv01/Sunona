import React, { useState } from 'react';
import { Moon, Volume2, X, Plus, Check, WifiOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  activeRemainingSeconds: number | null;
  isEndOfTrack: boolean;
  onSetTimer: (minutes: number) => void;
  onSetEndOfTrack: () => void;
  onCancelTimer: () => void;
  onAddMinutes: (minutes: number) => void;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<Props> = ({
  isOpen,
  activeRemainingSeconds,
  isEndOfTrack,
  onSetTimer,
  onSetEndOfTrack,
  onCancelTimer,
  onAddMinutes,
  onClose,
}) => {
  const [customMinutes, setCustomMinutes] = useState<string>('20');

  if (!isOpen) return null;

  const isTimerActive = (activeRemainingSeconds !== null && activeRemainingSeconds > 0) || isEndOfTrack;

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinutes, 10);
    if (!isNaN(val) && val > 0 && val <= 300) {
      onSetTimer(val);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="sleep-timer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sleep-modal-header">
          <div className="sleep-header-left">
            <div className="sleep-moon-icon-wrap">
              <Moon size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 className="sleep-modal-title">Sleep Mode & Timer</h2>
              <p className="sleep-modal-sub">Music fade-out & streaming data cutoff</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Active Countdown Card (If Timer is running) */}
        {isTimerActive && (
          <div className="active-sleep-card">
            <div className="active-sleep-top">
              <div className="active-sleep-badge">
                <span className="pulse-dot" />
                <span>Timer Active</span>
              </div>
              <button className="sleep-cancel-btn" onClick={onCancelTimer}>
                Turn Off Timer
              </button>
            </div>

            <div className="active-sleep-time">
              {isEndOfTrack ? (
                <span className="end-track-time">End of current track 🎵</span>
              ) : (
                <span>{formatRemaining(activeRemainingSeconds || 0)}</span>
              )}
            </div>

            {!isEndOfTrack && (
              <div className="sleep-quick-extend-row">
                <span className="extend-label">Add time:</span>
                <button className="sleep-extend-btn" onClick={() => onAddMinutes(5)}>
                  <Plus size={12} /> 5m
                </button>
                <button className="sleep-extend-btn" onClick={() => onAddMinutes(15)}>
                  <Plus size={12} /> 15m
                </button>
                <button className="sleep-extend-btn" onClick={() => onAddMinutes(30)}>
                  <Plus size={12} /> 30m
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preset Duration Buttons */}
        <div className="sleep-presets-section">
          <label className="sleep-section-label">Choose Duration:</label>
          <div className="sleep-presets-grid">
            <button
              className={`sleep-preset-btn ${!isEndOfTrack && activeRemainingSeconds && Math.abs(activeRemainingSeconds - 15 * 60) < 5 ? 'active' : ''}`}
              onClick={() => onSetTimer(15)}
            >
              <span className="preset-time">15 min</span>
              <span className="preset-desc">Power Nap ⚡</span>
            </button>

            <button
              className={`sleep-preset-btn ${!isEndOfTrack && activeRemainingSeconds && Math.abs(activeRemainingSeconds - 30 * 60) < 5 ? 'active' : ''}`}
              onClick={() => onSetTimer(30)}
            >
              <span className="preset-time">30 min</span>
              <span className="preset-desc">Bedtime Relax ☕</span>
            </button>

            <button
              className={`sleep-preset-btn ${!isEndOfTrack && activeRemainingSeconds && Math.abs(activeRemainingSeconds - 45 * 60) < 5 ? 'active' : ''}`}
              onClick={() => onSetTimer(45)}
            >
              <span className="preset-time">45 min</span>
              <span className="preset-desc">Night Wind-Down 🌙</span>
            </button>

            <button
              className={`sleep-preset-btn ${!isEndOfTrack && activeRemainingSeconds && Math.abs(activeRemainingSeconds - 60 * 60) < 5 ? 'active' : ''}`}
              onClick={() => onSetTimer(60)}
            >
              <span className="preset-time">60 min</span>
              <span className="preset-desc">Deep Sleep 💤</span>
            </button>
          </div>

          {/* End of Current Track Option */}
          <button
            className={`sleep-end-track-btn ${isEndOfTrack ? 'active' : ''}`}
            onClick={onSetEndOfTrack}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>🎵</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>End of current track</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  Stop playback as soon as this song finishes
                </div>
              </div>
            </div>
            {isEndOfTrack && <Check size={16} color="var(--primary)" />}
          </button>
        </div>

        {/* Custom Duration Input */}
        <form onSubmit={handleCustomSubmit} className="sleep-custom-row">
          <input
            type="number"
            min="1"
            max="300"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="sleep-custom-input"
            placeholder="Min"
          />
          <button type="submit" className="sleep-custom-submit-btn">
            Set Custom Minutes
          </button>
        </form>

        {/* Sleep Protection Features Banner */}
        <div className="sleep-features-box">
          <div className="sleep-feature-item">
            <Volume2 size={14} color="#38bdf8" />
            <span>Smooth 30s volume fade-out (no sudden wakeup)</span>
          </div>
          <div className="sleep-feature-item">
            <WifiOff size={14} color="#f43f5e" />
            <span>Terminates media buffer & streaming (0 MB data consumed)</span>
          </div>
          <div className="sleep-feature-item">
            <Moon size={14} color="#a855f7" />
            <span>Dark AMOLED sleep screen saves display battery</span>
          </div>
        </div>
      </div>
    </div>
  );
};

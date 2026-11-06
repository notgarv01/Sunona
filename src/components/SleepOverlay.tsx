import React, { useState, useEffect } from 'react';
import { Moon, Sun, WifiOff, VolumeX } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onWakeUp: () => void;
}

export const SleepOverlay: React.FC<Props> = ({ isOpen, onWakeUp }) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="deep-sleep-overlay" onClick={onWakeUp}>
      <div className="sleep-star-particles" />
      
      <div className="sleep-content-card" onClick={(e) => e.stopPropagation()}>
        <div className="sleep-moon-glow">
          <Moon size={54} color="#facc15" className="floating-moon" />
        </div>

        <div className="sleep-time-display">{timeStr}</div>

        <h1 className="sleep-title">Shhh... SunoNa is asleep 💤</h1>
        <p className="sleep-quote">
          Music gently faded out and streaming data halted. Zero internet used. Goodnight, Garv! 😴
        </p>

        <div className="sleep-status-pills">
          <div className="sleep-status-pill">
            <VolumeX size={13} color="#38bdf8" />
            <span>Volume Faded</span>
          </div>
          <div className="sleep-status-pill">
            <WifiOff size={13} color="#f43f5e" />
            <span>Stream Cutoff</span>
          </div>
        </div>

        <button className="sleep-wake-btn" onClick={onWakeUp}>
          <Sun size={16} />
          <span>Wake Up ☀️</span>
        </button>
      </div>
    </div>
  );
};

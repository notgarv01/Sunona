import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Mic2 } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExpand: () => void;
  onToggleLyrics: () => void;
}

export const MiniPlayer: React.FC<Props> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onExpand,
  onToggleLyrics,
}) => {
  if (!currentSong) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mini-player-overlay">
      <div className="mini-player-header">
        <span className="mini-player-title-bar">Mini-Player • PiP</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button className="icon-btn" style={{ width: '26px', height: '26px' }} onClick={onToggleLyrics} title="Lyrics">
            <Mic2 size={12} />
          </button>
          <button className="icon-btn" style={{ width: '26px', height: '26px' }} onClick={onExpand} title="Expand back to SunoNa!!">
            <Maximize2 size={12} />
          </button>
        </div>
      </div>

      <img src={currentSong.coverUrl} alt={currentSong.title} className="mini-player-art" />

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentSong.title}
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
          {currentSong.artist}
        </div>
      </div>

      {/* Mini Progress */}
      <div style={{ width: '100%', height: '3px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)' }} />
      </div>

      {/* Mini Transport */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <button className="transport-btn" onClick={onPrev}>
          <SkipBack size={16} />
        </button>
        <button className="play-pause-btn" style={{ width: '36px', height: '36px' }} onClick={onTogglePlay}>
          {isPlaying ? <Pause size={16} fill="#0b0914" /> : <Play size={16} fill="#0b0914" style={{ marginLeft: '1px' }} />}
        </button>
        <button className="transport-btn" onClick={onNext}>
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
};

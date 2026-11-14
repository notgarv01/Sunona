import React, { useState, useRef } from 'react';
import {
  X, PlusCircle, Volume2, VolumeX, Shuffle, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1
} from 'lucide-react';
import type { Song } from '../types';

export const SpotifyMiniplayerIcon = ({ size = 16, color = "currentColor" }: { size?: number, color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke={color} strokeWidth="1.5" />
    <rect x="8.5" y="7.5" width="5" height="5" rx="1" fill={color} />
  </svg>
);

function formatTime(secs: number) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function copyStylesToPip(pipWin: Window) {
  // 1. Copy linked and style elements from opener document head
  const styleNodes = document.querySelectorAll('link[rel="stylesheet"], style');
  styleNodes.forEach((node) => {
    try {
      pipWin.document.head.appendChild(node.cloneNode(true));
    } catch {
      // Ignored if restricted
    }
  });

  // 2. Clone active CSS rules for instant rendering without flash
  try {
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        if (sheet.cssRules && (!sheet.href || sheet.href.startsWith(window.location.origin))) {
          const styleEl = pipWin.document.createElement('style');
          styleEl.textContent = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
          pipWin.document.head.appendChild(styleEl);
        }
      } catch {}
    });
  } catch {}

  // 3. Fallback CSS ensuring proper background, typography, and viewport reset
  const baseStyle = pipWin.document.createElement('style');
  baseStyle.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 0;
      background: #181818 !important;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
    }
  `;
  pipWin.document.head.appendChild(baseStyle);
}

export interface MiniPlayerProps {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isCurrentSongLiked: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat?: () => void;
  onToggleLike: (songId: string) => void;
  onToggleMute: () => void;
  onClose: () => void;
  onExpand?: () => void;
  isPipWindow?: boolean;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode = 'off',
  isCurrentSongLiked,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onToggleMute,
  onClose,
  onExpand: _onExpand,
  isPipWindow = false,
}) => {
  // Draggable floating state for in-app overlay (when not in native OS PiP window)
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleDragStart = (e: React.MouseEvent) => {
    if (isPipWindow) return; // Native OS window moves via its own window frame
    e.preventDefault();
    const pipEl = (e.currentTarget as HTMLElement).closest('.spotify-mini-player-pip') as HTMLElement;
    if (!pipEl) return;
    const rect = pipEl.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      const newX = Math.max(10, Math.min(window.innerWidth - 330, dragRef.current.initX + dx));
      const newY = Math.max(10, Math.min(window.innerHeight - 390, dragRef.current.initY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const applyWindowSize = (w: number, h: number) => {
    const targetWin = (rootRef.current?.ownerDocument?.defaultView || window) as Window;
    const isNativePip = isPipWindow && targetWin !== window;
    if (isNativePip) {
      try {
        targetWin.resizeTo(w, h);
      } catch (err) {
        console.warn('PiP resizeTo failed:', err);
      }
    } else {
      setCustomSize({ width: w, height: h });
    }
  };

  const handleGripClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const targetWin = (rootRef.current?.ownerDocument?.defaultView || window) as Window;
    const isNativePip = isPipWindow && targetWin !== window;

    const currentW = isNativePip
      ? (targetWin.outerWidth || targetWin.innerWidth || 320)
      : (rootRef.current?.offsetWidth || 320);

    // Instant cycle: S (290) -> M (350) -> L (440) -> S (290)
    if (currentW < 330) {
      applyWindowSize(350, 420);
    } else if (currentW < 400) {
      applyWindowSize(440, 530);
    } else {
      applyWindowSize(290, 345);
    }
  };

  if (!currentSong) return null;

  return (
    <div
      ref={rootRef}
      className={`spotify-mini-player-pip ${isPipWindow ? 'pip-native-window' : ''}`}
      style={{
        ...(!isPipWindow && position ? { right: 'auto', bottom: 'auto', left: `${position.x}px`, top: `${position.y}px` } : {}),
        ...(!isPipWindow && customSize ? { width: `${customSize.width}px`, height: `${customSize.height}px` } : {})
      }}
    >
      {/* 1. Header Bar: Hidden in PiP window to eliminate duplicate top bar per user request */}
      {!isPipWindow && (
        <div className="sp-pip-header" onMouseDown={handleDragStart}>
          <div className="sp-pip-drag-dots" title="Drag to reposition">
            <span /><span /><span /><span /><span /><span />
          </div>
          <button className="sp-pip-close-btn" onClick={onClose} title="Close Miniplayer">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. Album Cover Box with Hover Overlay (Images 3 & 4) */}
      <div className="sp-pip-cover-box">
        <img
          src={currentSong.coverUrl}
          alt={currentSong.title}
          className="sp-pip-cover-img"
        />

        {/* Hover Controls Overlay (Image 4 & User Reference) */}
        <div className="sp-pip-overlay-controls">
          {/* Top-left volume / speaker button */}
          <button
            className="sp-pip-vol-btn"
            onClick={onToggleMute}
            title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>

          {/* Center playback transport controls: Shuffle, Prev, Play/Pause, Next, Repeat */}
          <div className="sp-pip-transport-row">
            <button
              className={`sp-pip-ctrl ${isShuffle ? 'active-green' : ''}`}
              onClick={onToggleShuffle}
              title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
              style={{ position: 'relative' }}
            >
              <Shuffle size={14} color={isShuffle ? '#1ed760' : '#ffffff'} />
              {isShuffle && <span className="sp-pb-dot" style={{ bottom: '-3px', width: '3px', height: '3px' }} />}
            </button>

            <button className="sp-pip-ctrl" onClick={onPrev} title="Previous track">
              <SkipBack size={16} fill="currentColor" />
            </button>

            <button
              className="sp-pip-play-btn"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} fill="#000000" color="#000000" />
              ) : (
                <Play size={18} fill="#000000" color="#000000" style={{ marginLeft: '2px' }} />
              )}
            </button>

            <button className="sp-pip-ctrl" onClick={onNext} title="Next track">
              <SkipForward size={16} fill="currentColor" />
            </button>

            <button
              className={`sp-pip-ctrl ${repeatMode !== 'off' ? 'active-green' : ''}`}
              onClick={onToggleRepeat}
              title={`Repeat: ${repeatMode}`}
              style={{ position: 'relative' }}
            >
              {repeatMode === 'one' ? (
                <Repeat1 size={14} color="#1ed760" />
              ) : (
                <Repeat size={14} color={repeatMode === 'all' ? '#1ed760' : '#ffffff'} />
              )}
              {repeatMode !== 'off' && <span className="sp-pb-dot" style={{ bottom: '-3px', width: '3px', height: '3px' }} />}
            </button>
          </div>

          {/* Bottom of cover: Seek Bar with Timestamps (Image 4) */}
          <div className="sp-pip-seek-row">
            <span className="sp-pip-time">{formatTime(currentTime)}</span>
            <div
              className="sp-pip-seek-track"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(ratio * duration);
              }}
            >
              <div className="sp-pip-seek-fill" style={{ width: `${progressPercent}%` }} />
              <div className="sp-pip-seek-thumb" style={{ left: `${progressPercent}%` }} />
            </div>
            <span className="sp-pip-time">{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Track Info Row (Images 3 & 4) */}
      <div className="sp-pip-info-row">
        <div className="sp-pip-titles">
          <span className="sp-pip-title" title={currentSong.title}>{currentSong.title}</span>
          <span className="sp-pip-artist" title={currentSong.artist}>{currentSong.artist}</span>
        </div>
        <div className="sp-pip-actions">
          <button
            className="sp-pip-action-btn"
            onClick={onClose}
            title="Dismiss"
          >
            <X size={15} color="#a7a7a7" />
          </button>
          <button
            className={`sp-pip-action-btn ${isCurrentSongLiked ? 'active' : ''}`}
            onClick={() => onToggleLike(currentSong.id)}
            title={isCurrentSongLiked ? 'Remove from Your Library' : 'Save to Your Library'}
          >
            <PlusCircle size={18} color={isCurrentSongLiked ? '#1ed760' : '#ffffff'} />
          </button>
        </div>
      </div>

      {/* 4. Bottom-Right Resize Grip Handle */}
      <div
        className="sp-pip-resize-grip"
        onClick={handleGripClick}
        title="Click to toggle size (Compact / Standard / Large)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M12 2L2 12M13 6L6 13M13 10L10 13" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
  Maximize2,
  Disc,
  ListPlus,
  Moon,
  PanelRight,
  Tv2,
  PlusCircle,
  PictureInPicture2,
} from 'lucide-react';
import type { Song, ThemePreset } from '../types';
import { AudioVisualizer } from './AudioVisualizer';

interface Props {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  currentTheme: ThemePreset;
  uiMode?: 'sunona' | 'spotify';
  isNowPlayingViewOpen?: boolean;
  onToggleNowPlayingView?: () => void;
  onOpenNowPlaying?: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  isSleepTimerActive?: boolean;
  sleepRemainingText?: string | null;
  onOpenSleepTimer?: () => void;
}

export const PlayerBar: React.FC<Props> = ({
  currentSong,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  isLyricsOpen,
  isQueueOpen,
  currentTheme,
  uiMode = 'sunona',
  isNowPlayingViewOpen = false,
  onToggleNowPlayingView,
  onOpenNowPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLyrics,
  onToggleQueue,
  onToggleLike,
  onAddToPlaylist,
  isSleepTimerActive = false,
  sleepRemainingText = null,
  onOpenSleepTimer,
}) => {
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgressRatio, setDragProgressRatio] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const calculateRatioFromEvent = useCallback((clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    return Math.max(0, Math.min(1, clickX / rect.width));
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSong || duration <= 0) return;
    e.preventDefault();
    setIsDragging(true);
    const ratio = calculateRatioFromEvent(e.clientX);
    setDragProgressRatio(ratio);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || duration <= 0) return;
      const ratio = calculateRatioFromEvent(e.clientX);
      setDragProgressRatio(ratio);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current && duration > 0) {
        const ratio = calculateRatioFromEvent(e.clientX);
        onSeek(ratio * duration);
      }
      setIsDragging(false);
      setDragProgressRatio(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [calculateRatioFromEvent, duration, onSeek]);

  // Touch support for touchscreens / laptops
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!currentSong || duration <= 0 || !e.touches[0]) return;
    setIsDragging(true);
    const ratio = calculateRatioFromEvent(e.touches[0].clientX);
    setDragProgressRatio(ratio);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || duration <= 0 || !e.touches[0]) return;
      const ratio = calculateRatioFromEvent(e.touches[0].clientX);
      setDragProgressRatio(ratio);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef.current && duration > 0) {
        const touch = e.changedTouches[0];
        if (touch) {
          const ratio = calculateRatioFromEvent(touch.clientX);
          onSeek(ratio * duration);
        }
      }
      setIsDragging(false);
      setDragProgressRatio(null);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [calculateRatioFromEvent, duration, onSeek]);

  const handleMouseMoveContainer = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setHoverPosition({ x, time: ratio * duration });
  };

  const handleMouseLeaveContainer = () => {
    setHoverPosition(null);
  };

  const activeRatio = dragProgressRatio !== null 
    ? dragProgressRatio 
    : duration > 0 
    ? (currentTime / duration) 
    : 0;
  const progressPercent = Math.max(0, Math.min(100, activeRatio * 100));

  if (uiMode === 'spotify') {
    return (
      <footer className="player-bar spotify-desktop-player-bar">
        {/* Left: Track Details */}
        <div className="spotify-pb-left">
          {currentSong ? (
            <>
              <div
                className="spotify-pb-thumb-wrap"
                onClick={onOpenNowPlaying}
                title="Expand Now Playing"
              >
                <img
                  src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                  alt={currentSong.title}
                  className="spotify-pb-thumb"
                />
              </div>
              <div className="spotify-pb-meta">
                <span
                  className="spotify-pb-title"
                  onClick={onOpenNowPlaying}
                  title={currentSong.title}
                >
                  {currentSong.title}
                </span>
                <span className="spotify-pb-artist">{currentSong.artist}</span>
              </div>
              <button
                className={`spotify-pb-icon-btn ${currentSong.isLiked ? 'liked' : ''}`}
                onClick={() => {
                  onToggleLike(currentSong.id);
                  if (onAddToPlaylist) onAddToPlaylist(currentSong);
                }}
                title={currentSong.isLiked ? 'Saved to Your Library' : 'Save to Your Library'}
              >
                <PlusCircle size={20} />
              </button>
            </>
          ) : (
            <div className="spotify-pb-empty">
              <Disc size={20} style={{ opacity: 0.4 }} />
              <span>No track playing</span>
            </div>
          )}
        </div>

        {/* Center: Controls & Embedded Progress Scrubber */}
        <div className="spotify-pb-center">
          <div className="spotify-pb-controls-row">
            <button
              className={`spotify-pb-ctrl-btn ${isShuffle ? 'active' : ''}`}
              onClick={onToggleShuffle}
              title="Enable shuffle"
            >
              <Shuffle size={16} />
              {isShuffle && <span className="spotify-pb-dot" />}
            </button>
            <button
              className="spotify-pb-ctrl-btn"
              onClick={onPrev}
              title="Previous (Left Arrow)"
            >
              <SkipBack size={18} />
            </button>
            <button
              className="spotify-pb-circle-play"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause size={18} fill="#000000" />
              ) : (
                <Play size={18} fill="#000000" style={{ marginLeft: 2 }} />
              )}
            </button>
            <button
              className="spotify-pb-ctrl-btn"
              onClick={onNext}
              title="Next (Right Arrow)"
            >
              <SkipForward size={18} />
            </button>
            <button
              className={`spotify-pb-ctrl-btn ${repeatMode !== 'off' ? 'active' : ''}`}
              onClick={onToggleRepeat}
              title={`Enable repeat (${repeatMode})`}
            >
              {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
              {repeatMode !== 'off' && <span className="spotify-pb-dot" />}
            </button>
          </div>

          {/* Scrubber row */}
          <div className="spotify-pb-timeline-row">
            <span className="spotify-pb-time">{formatTime(currentTime)}</span>
            <div
              ref={progressBarRef}
              className={`spotify-pb-scrubber ${isDragging ? 'is-dragging' : ''}`}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onMouseMove={handleMouseMoveContainer}
              onMouseLeave={handleMouseLeaveContainer}
            >
              <div className="spotify-pb-track">
                <div
                  className="spotify-pb-fill"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="spotify-pb-thumb-handle" />
                </div>
              </div>
            </div>
            <span className="spotify-pb-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Actions & Volume */}
        <div className="spotify-pb-right">
          {onToggleNowPlayingView && (
            <button
              className={`spotify-pb-icon-btn ${isNowPlayingViewOpen ? 'active' : ''}`}
              onClick={onToggleNowPlayingView}
              title="Now Playing View"
            >
              <PanelRight size={17} />
            </button>
          )}

          <button
            className={`spotify-pb-icon-btn ${isLyricsOpen ? 'active' : ''}`}
            onClick={onToggleLyrics}
            title="Lyrics (L)"
          >
            <Mic2 size={16} />
          </button>

          <button
            className={`spotify-pb-icon-btn ${isQueueOpen ? 'active' : ''}`}
            onClick={onToggleQueue}
            title="Queue (Q)"
          >
            <ListMusic size={17} />
          </button>

          <button className="spotify-pb-icon-btn" title="Connect to a device">
            <Tv2 size={16} />
          </button>

          {/* Volume Control */}
          <div className="spotify-pb-volume-box">
            <button className="spotify-pb-icon-btn" onClick={onToggleMute}>
              {isMuted || volume === 0 ? (
                <VolumeX size={17} />
              ) : volume < 0.5 ? (
                <Volume1 size={17} />
              ) : (
                <Volume2 size={17} />
              )}
            </button>
            <div className="spotify-pb-vol-slider-wrap">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="spotify-pb-vol-slider"
                title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />
            </div>
          </div>

          <button
            className="spotify-pb-icon-btn"
            onClick={onOpenNowPlaying}
            title="Miniplayer"
          >
            <PictureInPicture2 size={16} />
          </button>

          <button
            className="spotify-pb-icon-btn"
            onClick={onOpenNowPlaying}
            title="Full screen"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="player-bar">
      {/* Top Scrub Progress Bar with Smooth Drag & Tooltip */}
      <div
        ref={progressBarRef}
        className={`player-progress-bar-container ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseMove={handleMouseMoveContainer}
        onMouseLeave={handleMouseLeaveContainer}
        title={currentSong ? "Click or drag to seek" : "No active track"}
        style={{ cursor: currentSong ? 'pointer' : 'default' }}
      >
        <div className="player-progress-track">
          <div className="player-progress-fill" style={{ width: `${progressPercent}%` }}>
            {currentSong && <div className="player-progress-handle" />}
          </div>
        </div>

        {/* Hover Time Preview Tooltip */}
        {(hoverPosition || isDragging) && duration > 0 && (
          <div
            className="player-progress-tooltip"
            style={{
              left: `${isDragging ? progressPercent : (hoverPosition ? (hoverPosition.x / (progressBarRef.current?.getBoundingClientRect().width || 1)) * 100 : 0)}%`,
            }}
          >
            {formatTime(isDragging && dragProgressRatio !== null ? dragProgressRatio * duration : (hoverPosition ? hoverPosition.time : 0))}
          </div>
        )}
      </div>

      {/* Left: Track Metadata */}
      {currentSong ? (
        <div
          className="player-track-info"
          onClick={onOpenNowPlaying}
          style={{ cursor: 'pointer' }}
          title="Click to open Now Playing (Esc to close)"
        >
          <div className="player-track-thumb-box">
            <img
              src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
              alt={currentSong.title || 'Track'}
              className="player-track-thumb"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
              }}
            />
          </div>
          <div className="player-track-meta">
            <div className="player-track-title">{currentSong.title || 'Untitled Track'}</div>
            <div className="player-track-artist">
              {currentSong.artist || 'Unknown Artist'}{currentSong.album ? ` • ${currentSong.album}` : ''}
            </div>
          </div>
          <Heart
            size={18}
            className={`like-btn ${currentSong.isLiked ? 'liked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLike(currentSong.id);
            }}
            fill={currentSong.isLiked ? 'var(--accent)' : 'none'}
          />
          <button
            className="icon-btn"
            style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToPlaylist?.(currentSong);
            }}
            title="Add to Playlist"
          >
            <ListPlus size={16} />
          </button>
        </div>
      ) : (
        <div className="player-track-info" style={{ opacity: 0.7 }}>
          <div
            className="player-track-thumb-box"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <Disc size={20} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="player-track-meta">
            <div className="player-track-title" style={{ color: 'var(--text-secondary)' }}>
              No track playing
            </div>
            <div className="player-track-artist" style={{ color: 'var(--text-muted)' }}>
              Select a song to start listening
            </div>
          </div>
        </div>
      )}

      {/* Center: Transport Controls & Time */}
      <div className="player-controls-center">
        <div className="transport-buttons">
          <button
            className={`transport-btn ${isShuffle ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          <button className="transport-btn" onClick={onPrev} title="Previous (Left Arrow)">
            <SkipBack size={18} />
          </button>
          <button
            className="play-pause-btn"
            onClick={onTogglePlay}
            title="Play / Pause (Spacebar)"
          >
            {isPlaying ? <Pause size={20} fill="#0b0914" /> : <Play size={20} fill="#0b0914" style={{ marginLeft: '2px' }} />}
          </button>
          <button className="transport-btn" onClick={onNext} title="Next (Right Arrow)">
            <SkipForward size={18} />
          </button>
          <button
            className={`transport-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
          </button>
        </div>

        <div className="time-readout">
          <span>{formatTime(currentTime)}</span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Audio Visualizer & Quick Toggles */}
      <div className="player-tools-right">
        {/* Real-time Frequency Analyser Canvas */}
        <AudioVisualizer
          isPlaying={isPlaying}
          primaryColor={currentTheme.primary}
          accentColor={currentTheme.accent}
        />

        {/* Volume Slider */}
        <div className="volume-control-box">
          <button className="transport-btn" onClick={onToggleMute}>
            {isMuted || volume === 0 ? (
              <VolumeX size={17} />
            ) : volume < 0.5 ? (
              <Volume1 size={17} />
            ) : (
              <Volume2 size={17} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="volume-slider"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>

        {/* Sleep Mode & Timer Button */}
        <button
          className={`icon-btn ${isSleepTimerActive ? 'active sleep-timer-active' : ''}`}
          onClick={onOpenSleepTimer}
          title={sleepRemainingText ? `Sleep Timer: ${sleepRemainingText} left` : 'Sleep Timer & Data Cutoff'}
        >
          <Moon size={16} />
          {sleepRemainingText && (
            <span className="player-sleep-mini-pill">{sleepRemainingText}</span>
          )}
        </button>

        {/* Live Synced Lyrics Button */}
        <button
          className={`icon-btn ${isLyricsOpen ? 'active' : ''}`}
          onClick={onToggleLyrics}
          title="Live Synced Lyrics (L)"
        >
          <Mic2 size={16} />
        </button>

        {/* Queue Drawer Button */}
        <button
          className={`icon-btn ${isQueueOpen ? 'active' : ''}`}
          onClick={onToggleQueue}
          title="Play Queue (Q)"
        >
          <ListMusic size={16} />
        </button>

        {/* Full-Screen Now Playing Button */}
        <button
          className="icon-btn"
          onClick={onOpenNowPlaying}
          title="Expand Now Playing (Full-screen Art & Karaoke Lyrics)"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
};

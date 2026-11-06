import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
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
  MessageSquareText,
  ListMusic,
  ChevronLeft,
  ChevronRight,
  Disc,
} from 'lucide-react';
import type { Song, ThemePreset } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  currentTheme: ThemePreset;
  onPlaySong: (song: Song) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (songId: string) => void;
}

export const NowPlayingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentSong,
  queue,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isShuffle,
  repeatMode,
  currentTheme: _currentTheme,
  onPlaySong,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
}) => {
  const [viewMode, setViewMode] = useState<'flow' | 'lyrics'>('flow');
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isVolumeHovered, setIsVolumeHovered] = useState<boolean>(false);
  const scrubberRef = useRef<HTMLDivElement | null>(null);

  // Active lyric line index
  const lyrics = currentSong?.lyrics || [];
  let activeLyricIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeLyricIndex = i;
    } else {
      break;
    }
  }

  // Keyboard navigation inside Now Playing
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onTogglePlay, onNext, onPrev]);

  // Find index of current song in queue
  const currentIndex = useMemo(() => {
    if (!currentSong || queue.length === 0) return 0;
    const idx = queue.findIndex((s) => s.id === currentSong.id);
    return idx >= 0 ? idx : 0;
  }, [currentSong, queue]);

  // Compute 3D Cover Flow visible cards (-3 to +3)
  const visibleCards = useMemo(() => {
    if (!currentSong) return [];
    if (queue.length === 0) return [{ song: currentSong, offset: 0, index: 0 }];

    const items: { song: Song; offset: number; index: number }[] = [];
    const maxOffset = 3;

    for (let offset = -maxOffset; offset <= maxOffset; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < queue.length) {
        items.push({ song: queue[idx], offset, index: idx });
      }
    }
    return items;
  }, [queue, currentIndex, currentSong]);

  if (!isOpen || !currentSong) return null;

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [isScrubDragging, setIsScrubDragging] = useState(false);
  const [scrubDragRatio, setScrubDragRatio] = useState<number | null>(null);
  const isScrubDraggingRef = useRef(false);
  isScrubDraggingRef.current = isScrubDragging;

  const calculateScrubRatio = useCallback((clientX: number): number => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleScrubMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubDragging(true);
    setScrubDragRatio(calculateScrubRatio(e.clientX));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubDraggingRef.current || duration <= 0) return;
      setScrubDragRatio(calculateScrubRatio(e.clientX));
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isScrubDraggingRef.current && duration > 0) {
        const ratio = calculateScrubRatio(e.clientX);
        onSeek(ratio * duration);
      }
      setIsScrubDragging(false);
      setScrubDragRatio(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [calculateScrubRatio, duration, onSeek]);

  const activeScrubRatio = scrubDragRatio !== null ? scrubDragRatio : (duration > 0 ? currentTime / duration : 0);
  const progressPercent = Math.max(0, Math.min(100, activeScrubRatio * 100));

  return (
    <div className="coverflow-fullscreen-overlay">
      {/* Ambient Atmospheric Backdrop */}
      <div
        className="coverflow-ambient-bg"
        style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
      />
      <div className="coverflow-smoke-overlay" />

      {/* Top Header Bar */}
      <header className="coverflow-header">
        <div className="coverflow-header-title">
          <Disc className={isPlaying ? 'spinning-disc-icon' : ''} size={20} style={{ color: 'var(--primary)' }} />
          <span>Now Playing</span>
        </div>

        <div className="coverflow-header-actions">
          <div className="coverflow-toggle-group">
            <button
              className={`coverflow-toggle-btn ${viewMode === 'flow' ? 'active' : ''}`}
              onClick={() => setViewMode('flow')}
            >
              Cover Flow
            </button>
            <button
              className={`coverflow-toggle-btn ${viewMode === 'lyrics' ? 'active' : ''}`}
              onClick={() => setViewMode('lyrics')}
            >
              Synced Lyrics
            </button>
          </div>

          <button className="coverflow-close-btn" onClick={onClose} title="Close (Esc)">
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Showcase: Cover Flow 3D or Synced Lyrics */}
      {viewMode === 'flow' ? (
        <main className="coverflow-stage">
          {/* Previous / Next Arrow Floaters */}
          <button
            className="coverflow-nav-arrow left"
            onClick={onPrev}
            title="Previous Song (Left Arrow)"
          >
            <ChevronLeft size={32} />
          </button>

          <div className="coverflow-carousel-container">
            {visibleCards.map(({ song, offset, index }) => {
              const isCenter = offset === 0;

              return (
                <div
                  key={`${song.id}_${index}`}
                  className={`coverflow-card pos-${offset} ${isCenter ? 'is-center' : ''}`}
                  onClick={() => {
                    if (!isCenter) {
                      onPlaySong(song);
                    }
                  }}
                  title={isCenter ? 'Now Playing' : `Click to play ${song.title}`}
                >
                  <div className="coverflow-card-cover-wrap">
                    <img
                      src={song.coverUrl}
                      alt={song.title}
                      className="coverflow-card-img"
                    />
                  </div>
                  <div className="coverflow-card-meta">
                    <div className="coverflow-card-title">{song.title}</div>
                    <div className="coverflow-card-artist">{song.artist}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="coverflow-nav-arrow right"
            onClick={onNext}
            title="Next Song (Right Arrow)"
          >
            <ChevronRight size={32} />
          </button>
        </main>
      ) : (
        <main className="coverflow-lyrics-stage">
          <div className="coverflow-lyrics-scroll">
            {lyrics.length > 0 ? (
              lyrics.map((line, idx) => {
                const isActive = idx === activeLyricIndex;
                return (
                  <div
                    key={idx}
                    className={`coverflow-lyric-line ${isActive ? 'active' : ''}`}
                    onClick={() => onSeek(line.time)}
                  >
                    {line.text}
                  </div>
                );
              })
            ) : (
              <div className="coverflow-lyrics-empty">
                <MessageSquareText size={38} style={{ color: 'var(--text-muted)', marginBottom: '14px', opacity: 0.6 }} />
                <h3>No Synced Lyrics Found</h3>
                <p>Instrumental track or lyrics unavailable</p>
              </div>
            )}
          </div>
        </main>
      )}

      {/* Slide-over Queue Overlay */}
      {isQueueOpen && (
        <aside className="coverflow-queue-drawer">
          <div className="coverflow-queue-header">
            <h3>Up Next ({queue.length})</h3>
            <button className="coverflow-close-btn" onClick={() => setIsQueueOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="coverflow-queue-list">
            {queue.map((song, i) => {
              const isCurrent = song.id === currentSong.id;
              return (
                <div
                  key={`${song.id}_${i}`}
                  className={`coverflow-queue-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => onPlaySong(song)}
                >
                  <span className="coverflow-queue-idx">{i + 1}</span>
                  <img src={song.coverUrl} alt={song.title} className="coverflow-queue-thumb" />
                  <div className="coverflow-queue-meta">
                    <div className="coverflow-queue-title">{song.title}</div>
                    <div className="coverflow-queue-artist">{song.artist}</div>
                  </div>
                  {isCurrent && isPlaying && (
                    <div className="coverflow-soundwave mini">
                      <span /><span /><span />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* Floating Pill Player Bar (Apple / Metrolist Dynamic Island Style) */}
      <footer className="coverflow-pill-bar">
        {/* Left: Previous, Play/Pause, Next */}
        <div className="coverflow-pill-left">
          <button
            className={`coverflow-pill-btn sub ${isShuffle ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>

          <button className="coverflow-pill-btn" onClick={onPrev} title="Previous (Left Arrow)">
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            className="coverflow-pill-play-btn"
            onClick={onTogglePlay}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <Pause size={22} fill="#0d0f14" color="#0d0f14" />
            ) : (
              <Play size={22} fill="#0d0f14" color="#0d0f14" style={{ marginLeft: '2px' }} />
            )}
          </button>

          <button className="coverflow-pill-btn" onClick={onNext} title="Next (Right Arrow)">
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            className={`coverflow-pill-btn sub ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Center: Song Capsule with Integrated Scrub Bar */}
        <div className="coverflow-pill-center">
          <img src={currentSong.coverUrl} alt={currentSong.title} className="coverflow-capsule-thumb" />
          <div className="coverflow-capsule-meta">
            <div className="coverflow-capsule-title">{currentSong.title}</div>
            <div className="coverflow-capsule-artist">{currentSong.artist}</div>
          </div>

          <div className="coverflow-soundwave">
            <span /><span /><span /><span />
          </div>

          <button
            className="coverflow-capsule-action-btn"
            onClick={() => onToggleLike(currentSong.id)}
            title="Like Song"
          >
            <Heart
              size={18}
              fill={currentSong.isLiked ? 'var(--accent)' : 'none'}
              color={currentSong.isLiked ? 'var(--accent)' : 'currentColor'}
            />
          </button>

          {/* Integrated Scrub Bar beneath Capsule with Drag Seek */}
          <div
            ref={scrubberRef}
            className={`coverflow-capsule-scrub ${isScrubDragging ? 'dragging' : ''}`}
            onMouseDown={handleScrubMouseDown}
            title={`${formatTime(currentTime)} / ${formatTime(duration)} - Click or drag to seek`}
          >
            <div
              className="coverflow-capsule-scrub-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Synced Lyrics, Queue Drawer Toggle, Volume Control */}
        <div className="coverflow-pill-right">
          <button
            className={`coverflow-pill-btn ${viewMode === 'lyrics' ? 'active' : ''}`}
            onClick={() => setViewMode((m) => (m === 'lyrics' ? 'flow' : 'lyrics'))}
            title="Toggle Synced Lyrics"
          >
            <MessageSquareText size={20} />
          </button>

          <button
            className={`coverflow-pill-btn ${isQueueOpen ? 'active' : ''}`}
            onClick={() => setIsQueueOpen((q) => !q)}
            title="Toggle Queue"
          >
            <ListMusic size={20} />
          </button>

          {/* Volume Control */}
          <div
            className="coverflow-volume-wrapper"
            onMouseEnter={() => setIsVolumeHovered(true)}
            onMouseLeave={() => setIsVolumeHovered(false)}
          >
            <button className="coverflow-pill-btn" onClick={onToggleMute} title="Mute / Unmute">
              {isMuted || volume === 0 ? (
                <VolumeX size={20} />
              ) : volume < 0.5 ? (
                <Volume1 size={20} />
              ) : (
                <Volume2 size={20} />
              )}
            </button>

            {isVolumeHovered && (
              <div className="coverflow-volume-popover">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="coverflow-volume-slider"
                />
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

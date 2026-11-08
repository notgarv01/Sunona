import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
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
  ListPlus,
  ChevronLeft,
  ChevronRight,
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
  onAddToPlaylist?: (song: Song) => void;
}

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';

// SwiftUI & Flutter Native Card Deck Spring Physics
const springTransition = {
  type: 'spring' as const,
  stiffness: 210,
  damping: 26,
  mass: 0.95,
};

const getCardAnimation = (offset: number) => {
  switch (offset) {
    case 0:
      return {
        x: 0,
        z: 80,
        rotateY: 0,
        rotateZ: 0,
        scale: 1.02,
        opacity: 1,
        zIndex: 30,
        filter: 'brightness(1)',
      };
    case 1:
      return {
        x: 295,
        z: -40,
        rotateY: -24,
        rotateZ: 1.8,
        scale: 0.86,
        opacity: 0.94,
        zIndex: 20,
        filter: 'brightness(0.85)',
      };
    case -1:
      return {
        x: -295,
        z: -40,
        rotateY: 24,
        rotateZ: -1.8,
        scale: 0.86,
        opacity: 0.94,
        zIndex: 20,
        filter: 'brightness(0.85)',
      };
    case 2:
      return {
        x: 510,
        z: -110,
        rotateY: -32,
        rotateZ: 3.2,
        scale: 0.72,
        opacity: 0.7,
        zIndex: 10,
        filter: 'brightness(0.65)',
      };
    case -2:
      return {
        x: -510,
        z: -110,
        rotateY: 32,
        rotateZ: -3.2,
        scale: 0.72,
        opacity: 0.7,
        zIndex: 10,
        filter: 'brightness(0.65)',
      };
    case 3:
      return {
        x: 690,
        z: -180,
        rotateY: -38,
        rotateZ: 4.5,
        scale: 0.58,
        opacity: 0,
        zIndex: 1,
        filter: 'brightness(0.4)',
      };
    case -3:
      return {
        x: -690,
        z: -180,
        rotateY: 38,
        rotateZ: -4.5,
        scale: 0.58,
        opacity: 0,
        zIndex: 1,
        filter: 'brightness(0.4)',
      };
    default:
      return {
        x: offset > 0 ? 800 : -800,
        z: -250,
        rotateY: offset > 0 ? -45 : 45,
        rotateZ: offset > 0 ? 5 : -5,
        scale: 0.5,
        opacity: 0,
        zIndex: 0,
        filter: 'brightness(0.3)',
      };
  }
};

// Highly Optimized Memoized 3D Card with Motion Spring Interpolation
const CoverFlowCard = React.memo<{
  song: Song;
  offset: number;
  isCenter: boolean;
  onPlay: (song: Song, offset: number) => void;
}>(({ song, offset, isCenter, onPlay }) => {
  const cardCover = song.coverUrl || DEFAULT_COVER;
  const anim = getCardAnimation(offset);

  return (
    <motion.div
      className={`coverflow-card pos-${offset} ${isCenter ? 'is-center' : ''}`}
      initial={false}
      animate={anim}
      transition={springTransition}
      style={{
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onPlay(song, offset);
      }}
      title={isCenter ? 'Click to toggle play/pause' : `Play ${song.title || 'Track'}`}
    >
      <div className="coverflow-card-cover-wrap">
        <img
          src={cardCover}
          alt={song.title || 'Cover'}
          className="coverflow-card-img"
          loading="eager"
          decoding="async"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_COVER;
          }}
        />
      </div>
      <div className="coverflow-card-dim" />
      <div className="coverflow-card-meta">
        <div className="coverflow-card-title">{song.title || 'Untitled'}</div>
        <div className="coverflow-card-artist">{song.artist || 'Unknown Artist'}</div>
      </div>
    </motion.div>
  );
});

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
  onAddToPlaylist,
}) => {
  // --- ALL REACT HOOKS MUST BE UNCONDITIONALLY CALLED AT THE TOP ---
  const [viewMode, setViewMode] = useState<'flow' | 'lyrics'>('flow');
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isScrubDragging, setIsScrubDragging] = useState<boolean>(false);
  const [scrubDragRatio, setScrubDragRatio] = useState<number | null>(null);

  const scrubberRef = useRef<HTMLDivElement | null>(null);
  const isScrubDraggingRef = useRef<boolean>(false);
  isScrubDraggingRef.current = isScrubDragging;

  // Butter-smooth Carousel Drag & Physics Tracking
  const didDragRef = useRef<boolean>(false);
  const lastWheelTimeRef = useRef<number>(0);

  const handleCardPlay = useCallback((song: Song, offset: number) => {
    if (didDragRef.current) return;
    if (offset === 0) {
      onTogglePlay();
    } else {
      onPlaySong(song);
    }
  }, [onTogglePlay, onPlaySong]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 24) {
      const now = Date.now();
      if (now - lastWheelTimeRef.current > 420) {
        lastWheelTimeRef.current = now;
        if (delta > 0) {
          onNext();
        } else {
          onPrev();
        }
      }
    }
  }, [onNext, onPrev]);

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

  // Sanitize lyrics array safely
  const lyrics = useMemo(() => {
    if (!currentSong || !Array.isArray(currentSong.lyrics)) return [];
    return currentSong.lyrics.filter((l) => l && typeof l.time === 'number' && typeof l.text === 'string');
  }, [currentSong]);

  // Active lyric line index
  const activeLyricIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyrics, currentTime]);

  // Sanitize queue
  const safeQueue = useMemo(() => {
    if (!Array.isArray(queue)) return [];
    return queue.filter((s): s is Song => Boolean(s && s.id));
  }, [queue]);

  // Find index of current song in queue
  const currentIndex = useMemo(() => {
    if (!currentSong || safeQueue.length === 0) return 0;
    const idx = safeQueue.findIndex((s) => s.id === currentSong.id);
    return idx >= 0 ? idx : 0;
  }, [currentSong, safeQueue]);

  // Compute 3D Cover Flow visible cards (-3 to +3)
  const visibleCards = useMemo(() => {
    if (!currentSong) return [];
    if (safeQueue.length === 0) return [{ song: currentSong, offset: 0, index: 0 }];

    const items: { song: Song; offset: number; index: number }[] = [];
    const maxOffset = 3;

    for (let offset = -maxOffset; offset <= maxOffset; offset++) {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < safeQueue.length && safeQueue[idx]) {
        items.push({ song: safeQueue[idx], offset, index: idx });
      }
    }
    return items.length > 0 ? items : [{ song: currentSong, offset: 0, index: 0 }];
  }, [safeQueue, currentIndex, currentSong]);

  // Scrub calculation
  const calculateScrubRatio = useCallback((clientX: number): number => {
    if (!scrubberRef.current) return 0;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  // Scrub dragging mouse listener
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

  // --- SAFE RETURN: ONLY AFTER ALL HOOKS ARE CALLED ---
  if (!isOpen || !currentSong) return null;

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrubMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!scrubberRef.current || duration <= 0) return;
    setIsScrubDragging(true);
    setScrubDragRatio(calculateScrubRatio(e.clientX));
  };

  const activeScrubRatio = scrubDragRatio !== null ? scrubDragRatio : (duration > 0 ? currentTime / duration : 0);
  const progressPercent = Math.max(0, Math.min(100, activeScrubRatio * 100));
  const songCover = currentSong.coverUrl || DEFAULT_COVER;

  return (
    <div className="coverflow-fullscreen-overlay">
      {/* Ambient Atmospheric Backdrop */}
      <div
        className="coverflow-ambient-bg"
        style={{ backgroundImage: `url(${songCover})` }}
      />
      <div className="coverflow-smoke-overlay" />

      {/* Top Header Bar */}
      <header className="coverflow-header">
        <div className="coverflow-header-title">
          <button
            className="coverflow-back-btn"
            onClick={onClose}
            title="Return to Main View (Esc)"
          >
            <ChevronLeft size={18} />
            <span>Back</span>
          </button>
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
        </div>
      </header>

      {/* Main Showcase: Cover Flow 3D or Synced Lyrics */}
      {viewMode === 'flow' ? (
        <main
          className="coverflow-stage"
          onWheel={handleWheel}
        >
          {/* Previous / Next Arrow Floaters */}
          <button
            className="coverflow-nav-arrow left"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            title="Previous Song (Left Arrow)"
          >
            <ChevronLeft size={32} />
          </button>

          <motion.div
            className="coverflow-carousel-container"
            drag="x"
            dragSnapToOrigin
            dragElastic={0.25}
            dragTransition={{ bounceStiffness: 260, bounceDamping: 28 }}
            onDragStart={() => {
              didDragRef.current = true;
            }}
            onDragEnd={(_, info) => {
              setTimeout(() => {
                didDragRef.current = false;
              }, 120);
              const offsetThreshold = 40;
              const velocityThreshold = 200;
              if (info.offset.x < -offsetThreshold || info.velocity.x < -velocityThreshold) {
                onNext();
              } else if (info.offset.x > offsetThreshold || info.velocity.x > velocityThreshold) {
                onPrev();
              }
            }}
          >
            {visibleCards.map(({ song, offset, index }) => {
              if (!song || !song.id) return null;
              return (
                <CoverFlowCard
                  key={`${song.id}_${index}`}
                  song={song}
                  offset={offset}
                  isCenter={offset === 0}
                  onPlay={handleCardPlay}
                />
              );
            })}
          </motion.div>

          <button
            className="coverflow-nav-arrow right"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
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
                <MessageSquareText size={38} style={{ color: 'var(--text-muted, #71717a)', marginBottom: '14px', opacity: 0.6 }} />
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
            <h3>Up Next ({safeQueue.length})</h3>
            <button className="coverflow-close-btn" onClick={() => setIsQueueOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="coverflow-queue-list">
            {safeQueue.map((song, i) => {
              if (!song || !song.id) return null;
              const isCurrent = song.id === currentSong.id;
              const itemCover = song.coverUrl || DEFAULT_COVER;

              return (
                <div
                  key={`${song.id}_${i}`}
                  className={`coverflow-queue-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => onPlaySong(song)}
                >
                  <span className="coverflow-queue-idx">{i + 1}</span>
                  <img
                    src={itemCover}
                    alt={song.title || 'Track'}
                    className="coverflow-queue-thumb"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_COVER;
                    }}
                  />
                  <div className="coverflow-queue-meta">
                    <div className="coverflow-queue-title">{song.title || 'Untitled'}</div>
                    <div className="coverflow-queue-artist">{song.artist || 'Unknown'}</div>
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

      {/* Floating Pill Player Bar */}
      <footer className="coverflow-pill-bar">
        {/* Sleek Integrated Scrub Bar on Top Border of Pill */}
        <div
          ref={scrubberRef}
          className={`coverflow-pill-scrub-bar ${isScrubDragging ? 'dragging' : ''}`}
          onMouseDown={handleScrubMouseDown}
          title={`${formatTime(currentTime)} / ${formatTime(duration)} - Click or drag to seek`}
        >
          <div className="coverflow-pill-scrub-track">
            <div
              className="coverflow-pill-scrub-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Left: Like Button & Time Display */}
        <div className="coverflow-pill-left">
          <button
            className={`coverflow-pill-btn ${currentSong.isLiked ? 'active' : ''}`}
            onClick={() => onToggleLike(currentSong.id)}
            title={currentSong.isLiked ? 'Liked' : 'Like'}
          >
            <Heart
              size={20}
              fill={currentSong.isLiked ? 'var(--accent, #10b981)' : 'none'}
              color={currentSong.isLiked ? 'var(--accent, #10b981)' : 'currentColor'}
            />
          </button>
          <span className="coverflow-pill-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Center: Playback Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
        <div className="coverflow-pill-center">
          <button
            className={`coverflow-pill-btn sub ${isShuffle ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={18} />
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
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Right: Add to Playlist and Inline Volume Control */}
        <div className="coverflow-pill-right">
          {onAddToPlaylist && (
            <button
              className="coverflow-pill-btn"
              onClick={() => onAddToPlaylist(currentSong)}
              title="Add to Playlist"
            >
              <ListPlus size={20} />
            </button>
          )}

          {/* Reliable Inline Volume Control (never vanishes prematurely) */}
          <div className="coverflow-volume-inline">
            <button className="coverflow-pill-btn" onClick={onToggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted || volume === 0 ? (
                <VolumeX size={19} />
              ) : volume < 0.5 ? (
                <Volume1 size={19} />
              ) : (
                <Volume2 size={19} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="coverflow-volume-slider"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </footer>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Mic2, X, Languages, RotateCcw, ExternalLink, Loader2, MicOff } from 'lucide-react';
import type { Song, LyricLine } from '../types';

interface Props {
  currentSong: Song | null;
  currentTime: number;
  isLoading?: boolean;
  onSeek: (time: number) => void;
  onClose: () => void;
  onRetry?: () => void;
}

export const LyricsDrawer: React.FC<Props> = ({
  currentSong,
  currentTime,
  isLoading = false,
  onSeek,
  onClose,
  onRetry,
}) => {
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Auto-scroll active lyric into view smoothly
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  const lyrics = currentSong?.lyrics || [];

  // Find active line index
  let activeIndex = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTime >= lyrics[i].time) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const handleRetry = () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      onRetry();
      setTimeout(() => setIsRetrying(false), 1500);
    }
  };

  return (
    <aside className="app-drawer">
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic2 size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.96rem' }}>
            Live Lyrics
          </span>
          {currentSong?.lyricsSource && lyrics.length > 0 && (
            <span className="lyrics-source-badge" title="Source of lyrics">
              ⚡ {currentSong.lyricsSource}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {currentSong?.geniusUrl && (
            <a
              href={currentSong.geniusUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn"
              style={{ width: '32px', height: '32px', color: '#facc15' }}
              title="Open Verified Story on Genius"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} title="Translate Lyrics">
            <Languages size={15} />
          </button>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="lyrics-container">
        {isLoading || (lyrics.length === 0 && !currentSong?.lyricsNotFound) ? (
          <div className="lyrics-searching-state">
            <div className="searching-radar-glow">
              <Loader2 size={32} className="spin-anim" style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="searching-title">Lyrics dhoond rahe hain...</h3>
            <div className="searching-loader-bar">
              <div className="searching-loader-fill" />
            </div>
          </div>
        ) : lyrics.length > 0 ? (
          lyrics.map((line: LyricLine, idx: number) => {
            const isActive = idx === activeIndex;

            return (
              <div
                key={idx}
                ref={isActive ? activeLineRef : null}
                className={`lyric-line ${isActive ? 'active' : ''}`}
                onClick={() => onSeek(line.time)}
              >
                <div>{line.text}</div>
                {line.translation && (
                  <div className="lyric-translation">{line.translation}</div>
                )}
              </div>
            );
          }).concat(
            currentSong?.geniusUrl ? [
              <div key="genius-pill" style={{ padding: '24px 0 12px', textAlign: 'center' }}>
                <a
                  href={currentSong.geniusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="genius-verified-pill"
                >
                  <span>🧠 Read Story & Meaning on Genius ↗</span>
                </a>
              </div>
            ] : []
          )
        ) : (
          <div className="lyrics-not-found-card">
            <div className="not-found-icon-wrap">
              <MicOff size={26} style={{ color: 'var(--text-secondary)' }} />
            </div>

            <h3 className="not-found-title">
              Lyrics available nahi hain
            </h3>

            {currentSong?.geniusUrl && (
              <a
                href={currentSong.geniusUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="genius-fallback-btn"
              >
                <span>🧠</span>
                <span>Open Song on Genius ↗</span>
              </a>
            )}

            {onRetry && (
              <button
                className={`lyrics-retry-btn ${isRetrying ? 'spinning' : ''}`}
                onClick={handleRetry}
                disabled={isRetrying}
              >
                <RotateCcw size={14} className={isRetrying ? 'spin-anim' : ''} />
                <span>{isRetrying ? 'Dhund rahe hain...' : 'Ek baar aur dhoondo 🔄'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

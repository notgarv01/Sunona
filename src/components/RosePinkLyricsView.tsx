import React, { useRef, useEffect } from 'react';
import { X, Sparkles, Video } from 'lucide-react';
import type { Song } from '../types';

interface RosePinkLyricsViewProps {
  currentSong: Song | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
  onClose: () => void;
  onSwitchTheme: () => void;
  onOpenExportModal: () => void;
}

export const RosePinkLyricsView: React.FC<RosePinkLyricsViewProps> = ({
  currentSong,
  currentTime,
  onSeek,
  onClose,
  onSwitchTheme,
  onOpenExportModal,
}) => {
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll active lyric smoothly inside the 3D card
  useEffect(() => {
    if (activeLineRef.current && scrollContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  const lyrics = currentSong?.lyrics && currentSong.lyrics.length > 0
    ? currentSong.lyrics
    : [
        { time: 0, text: 'Dil ki baatein... lafzon me bayaan' },
        { time: 5, text: 'Tere sang beeti har ek shaam suhana' },
        { time: 10, text: 'Khwaabon ki roshni me tera chehra' },
        { time: 16, text: 'Pyaar tune kya kiya? chain mera liya' },
        { time: 22, text: 'Bepanaah ishq se vaastaa ho gaya' },
        { time: 28, text: 'Har pal nigaahon mein tera asar hai' },
      ];

  return (
    <div className="rose-pink-viewport">
      {/* Ambient background particles & glowing radial glow */}
      <div className="rose-ambient-glow" />
      <div className="rose-petals-layer">
        <span className="petal p1" />
        <span className="petal p2" />
        <span className="petal p3" />
        <span className="petal p4" />
        <span className="petal p5" />
      </div>

      {/* Top Header bar with Theme switcher & Export Reel action */}
      <div className="rose-fl-header">
        <div className="rose-fl-header-left">
          <span className="rose-pill-tag">
            <Sparkles size={13} className="sparkle-spin" />
            ROSE 3D CINEMATIC
          </span>
          <span className="rose-fl-title">{currentSong?.title || 'Live Lyrics'}</span>
        </div>

        <div className="rose-fl-actions">
          <button
            className="rose-header-action-btn export-reel-btn"
            onClick={onOpenExportModal}
            title="Export 9:16 Reel / Story Video"
          >
            <Video size={15} />
            <span>Export Reel (9:16)</span>
          </button>

          <button
            className="rose-header-action-btn switch-theme-btn"
            onClick={onSwitchTheme}
            title="Switch back to Classic Spotify Red"
          >
            <span>🍷 Classic Red</span>
          </button>

          <button className="rose-close-btn" onClick={onClose} title="Close Full Lyrics">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main 3D Floating Stage */}
      <div className="rose-stage-3d">
        {/* Left / Ambient Neon Rose SVG Graphic */}
        <div className="neon-rose-container" title="Neon Rose Vector Art">
          <svg
            className="neon-rose-svg"
            viewBox="0 0 160 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Stem */}
            <path
              d="M80 110 C80 150, 75 180, 85 210"
              stroke="#ff2d75"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="rose-path-stem"
            />
            {/* Leaf Left */}
            <path
              d="M78 145 C55 140, 50 160, 77 165"
              stroke="#ff2d75"
              strokeWidth="2"
              strokeLinecap="round"
              fill="rgba(255, 45, 117, 0.15)"
              className="rose-path-leaf"
            />
            {/* Leaf Right */}
            <path
              d="M81 170 C105 165, 110 185, 83 190"
              stroke="#ff2d75"
              strokeWidth="2"
              strokeLinecap="round"
              fill="rgba(255, 45, 117, 0.15)"
              className="rose-path-leaf"
            />
            {/* Flower Petals (Inner & Outer spirals) */}
            <path
              d="M80 50 C65 50, 55 65, 65 85 C75 105, 95 105, 105 85 C115 65, 105 50, 80 50 Z"
              stroke="#ff4d8d"
              strokeWidth="2.5"
              className="rose-path-petal-1"
            />
            <path
              d="M80 60 C72 60, 68 70, 75 80 C82 90, 92 88, 96 78 C99 68, 90 60, 80 60 Z"
              stroke="#ff77aa"
              strokeWidth="2"
              className="rose-path-petal-2"
            />
            <path
              d="M60 70 C45 80, 50 100, 70 105"
              stroke="#ff2d75"
              strokeWidth="2"
              strokeLinecap="round"
              className="rose-path-petal-3"
            />
            <path
              d="M100 70 C115 80, 110 100, 90 105"
              stroke="#ff2d75"
              strokeWidth="2"
              strokeLinecap="round"
              className="rose-path-petal-4"
            />
          </svg>
          <div className="neon-rose-glow-underlay" />
        </div>

        {/* 3D Tilted Pink Spotify Lyrics Card */}
        <div className="rose-card-3d">
          {/* Card Top Brand & Metadata Bar */}
          <div className="rose-card-topbar">
            <div className="rose-card-track-info">
              {currentSong?.coverUrl ? (
                <img src={currentSong.coverUrl} alt="" className="rose-card-cover" />
              ) : (
                <div className="rose-card-cover-ph" />
              )}
              <div className="rose-card-meta">
                <span className="rose-card-title">{currentSong?.title || 'Unknown Title'}</span>
                <span className="rose-card-artist">{currentSong?.artist || 'Unknown Artist'}</span>
              </div>
            </div>

            {/* Pink Spotify Logo Badge */}
            <div className="rose-card-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ff2d75" />
                <path
                  d="M16.5 14.5C14.2 13.2 10.5 13.1 8 13.8C7.6 13.9 7.2 13.7 7.1 13.3C7 12.9 7.2 12.5 7.6 12.4C10.5 11.5 14.6 11.7 17.3 13.3C17.6 13.5 17.8 14 17.6 14.3C17.4 14.6 16.9 14.7 16.5 14.5ZM17.4 11.8C14.8 10.2 10.4 9.7 7.5 10.6C7 10.7 6.5 10.4 6.4 10C6.3 9.5 6.6 9 7 8.9C10.4 7.9 15.3 8.4 18.3 10.3C18.7 10.5 18.9 11.1 18.6 11.5C18.4 11.9 17.8 12 17.4 11.8ZM18.5 9.1C15.4 7.2 9.8 7 6.6 8C6 8.2 5.4 7.8 5.2 7.2C5 6.6 5.4 6 6 5.8C9.7 4.7 15.9 4.9 19.5 7.1C20.1 7.4 20.2 8.2 19.9 8.7C19.6 9.2 19 9.3 18.5 9.1Z"
                  fill="#ffffff"
                />
              </svg>
              <span>SPOTIFY</span>
            </div>
          </div>

          {/* Blurred top fade overlay for 3D depth */}
          <div className="rose-card-blur-top" />

          {/* Scrolling Synced Lyrics Inside 3D Card */}
          <div className="rose-card-lyrics-scroll" ref={scrollContainerRef}>
            {lyrics.map((line, i) => {
              const nextTime = lyrics[i + 1]?.time ?? Infinity;
              const isActive = currentTime >= line.time && currentTime < nextTime;
              const isPast = currentTime >= nextTime;

              return (
                <p
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  className={`rose-lyric-line ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                  onClick={() => onSeek(line.time)}
                >
                  {line.text}
                </p>
              );
            })}
          </div>

          {/* Blurred bottom fade overlay */}
          <div className="rose-card-blur-bottom" />
        </div>
      </div>
    </div>
  );
};

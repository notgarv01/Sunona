import React, { useEffect, useRef, useState } from 'react';
import { Tv, Maximize2, Minimize2 } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  currentSong: Song | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onStateChange: (isPlaying: boolean) => void;
  onEnded: () => void;
  seekTime: number | null;
}

export const YouTubeEmbedPlayer: React.FC<Props> = ({
  currentSong,
  isPlaying,
  volume,
  isMuted,
  onTimeUpdate,
  onStateChange,
  onEnded,
  seekTime,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);

  // Send postMessage command to YouTube iframe safely with origin target
  const sendCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func, args }),
          'https://www.youtube.com'
        );
      } catch (err) {
        console.warn('PostMessage error:', err);
      }
    }
  };

  // Handle Play / Pause sync
  useEffect(() => {
    if (isPlaying) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [isPlaying]);

  // Handle Volume sync
  useEffect(() => {
    const vol = isMuted ? 0 : Math.round(volume * 100);
    sendCommand('setVolume', [vol]);
  }, [volume, isMuted]);

  // Handle Seek
  useEffect(() => {
    if (seekTime !== null) {
      sendCommand('seekTo', [seekTime, true]);
    }
  }, [seekTime]);

  // Listen to incoming messages from YouTube Iframe with origin validation
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Security check: Ignore postMessages from unauthorized origins
      if (e.origin !== 'https://www.youtube.com' && e.origin !== 'https://www.youtube-nocookie.com') {
        return;
      }

      try {
        if (typeof e.data !== 'string') return;
        const data = JSON.parse(e.data);

        if (data.event === 'infoDelivery' && data.info) {
          const info = data.info;
          if (typeof info.currentTime === 'number' && typeof info.duration === 'number') {
            onTimeUpdate(info.currentTime, info.duration);
          }

          // playerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
          if (info.playerState === 1) {
            onStateChange(true);
          } else if (info.playerState === 2) {
            onStateChange(false);
          } else if (info.playerState === 0) {
            onEnded();
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTimeUpdate, onStateChange, onEnded]);

  if (!currentSong) return null;

  const videoId = currentSong.id;
  // Security check: Ensure video ID matches strict 11-character YouTube video ID format
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=1&modestbranding=1&rel=0&origin=${encodeURIComponent(
    window.location.origin
  )}`;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isVideoExpanded ? '100px' : '96px',
        right: '24px',
        width: isVideoExpanded ? '380px' : '220px',
        height: isVideoExpanded ? '230px' : '135px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        zIndex: 40,
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Player Header with Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderBottom: '1px solid var(--border-glass)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Tv size={13} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
            {currentSong.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="icon-btn"
            style={{ width: '22px', height: '22px' }}
            onClick={() => setIsVideoExpanded((v) => !v)}
            title={isVideoExpanded ? 'Minimize Player' : 'Expand Video'}
          >
            {isVideoExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
        </div>
      </div>

      {/* Official YouTube Embed IFrame */}
      <iframe
        ref={iframeRef}
        key={videoId}
        src={embedUrl}
        title={currentSong.title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          background: '#000',
        }}
      />
    </div>
  );
};

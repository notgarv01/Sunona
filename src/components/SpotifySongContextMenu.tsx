import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Heart,
  ListPlus,
  Trash2,
  Ban,
  Timer,
  Radio,
  User,
  Music2,
  Share2,
  Check,
} from 'lucide-react';
import type { Song, Playlist } from '../types';

export interface SpotifySongContextMenuProps {
  x: number;
  y: number;
  song: Song;
  queueIndex?: number;
  isInQueue?: boolean;
  playlists: Playlist[];
  isLiked?: boolean;
  onClose: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist: (song: Song, playlistId?: string) => void;
  onCreatePlaylistWithSong?: (song: Song) => void;
  onAddToQueue?: (song: Song) => void;
  onRemoveFromQueue?: (index: number) => void;
  onExcludeTasteProfile?: (song: Song) => void;
  onSetSleepTimer?: (minutes: number | 'track') => void;
  onGoToRadio?: (song: Song) => void;
  onGoToArtist?: (artistName: string) => void;
  onViewCredits?: (song: Song) => void;
  onShare?: (song: Song) => void;
}

// Submenu Arrow: Solid right-pointing triangle matching official Spotify desktop
const SubMenuArrow = () => (
  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" className="sp-cm-arrow">
    <path d="M5 2l7 6-7 6V2z" />
  </svg>
);

export const SpotifySongContextMenu: React.FC<SpotifySongContextMenuProps> = ({
  x,
  y,
  song,
  queueIndex,
  isInQueue = true,
  playlists,
  isLiked = false,
  onClose,
  onToggleLike,
  onAddToPlaylist,
  onCreatePlaylistWithSong,
  onAddToQueue,
  onRemoveFromQueue,
  onExcludeTasteProfile,
  onSetSleepTimer,
  onGoToRadio,
  onGoToArtist,
  onViewCredits,
  onShare,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubMenu, setActiveSubMenu] = useState<'playlist' | 'timer' | 'artist' | 'share' | null>(null);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Viewport clamping
  const menuWidth = 240;
  const menuHeight = 390;
  const posX = Math.max(12, Math.min(x, window.innerWidth - menuWidth - 16));
  const posY = Math.max(12, Math.min(y, window.innerHeight - menuHeight - 16));

  // Determine if submenus should open to the left (if near right viewport edge)
  const openSubmenuLeft = posX + menuWidth + 200 > window.innerWidth;

  // Split artist names if comma separated
  const artistsList = (song.artist || '')
    .split(/,|&|feat\.|ft\./i)
    .map((a) => a.trim())
    .filter(Boolean);

  const handleCopyLink = () => {
    if (onShare) onShare(song);
    const appUrl = `${window.location.origin}/?song=${encodeURIComponent(song.id || '')}`;
    navigator.clipboard?.writeText?.(appUrl);
    setCopiedToast('Link copied to clipboard');
    setTimeout(() => {
      setCopiedToast(null);
      onClose();
    }, 1000);
  };

  const handleCopyEmbed = () => {
    const embedUrl = `${window.location.origin}/?song=${encodeURIComponent(song.id || '')}&embed=true`;
    const embed = `<iframe src="${embedUrl}" width="100%" height="152" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
    navigator.clipboard?.writeText?.(embed);
    setCopiedToast('Embed code copied');
    setTimeout(() => {
      setCopiedToast(null);
      onClose();
    }, 1000);
  };

  return (
    <div
      ref={menuRef}
      className="spotify-floating-context-menu"
      style={{
        position: 'fixed',
        left: posX,
        top: posY,
        zIndex: 99999,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Add to playlist (with submenu) */}
      <div
        className={`sp-cm-item has-sub ${activeSubMenu === 'playlist' ? 'active' : ''}`}
        onMouseEnter={() => setActiveSubMenu('playlist')}
      >
        <div className="sp-cm-left">
          <Plus size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Add to playlist</span>
        </div>
        <SubMenuArrow />

        {activeSubMenu === 'playlist' && (
          <div
            className={`sp-cm-submenu ${openSubmenuLeft ? 'left' : 'right'}`}
            onMouseLeave={() => setActiveSubMenu(null)}
          >
            <div
              className="sp-cm-subitem"
              onClick={() => {
                if (onCreatePlaylistWithSong) onCreatePlaylistWithSong(song);
                else onAddToPlaylist(song);
                onClose();
              }}
            >
              <Plus size={14} className="sp-cm-icon" />
              <span>Create playlist</span>
            </div>
            <div className="sp-cm-divider" />
            <div className="sp-cm-sublist">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="sp-cm-subitem"
                  onClick={() => {
                    onAddToPlaylist(song, pl.id);
                    onClose();
                  }}
                >
                  <span className="sp-cm-subitem-title">{pl.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Add to Liked Songs (Purple gradient square with white heart) */}
      <div
        className="sp-cm-item"
        onMouseEnter={() => setActiveSubMenu(null)}
        onClick={() => {
          onToggleLike(song.id);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <div className="sp-cm-liked-icon">
            <Heart size={10} fill="#ffffff" color="#ffffff" />
          </div>
          <span className="sp-cm-label">
            {isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          </span>
        </div>
      </div>

      {/* 3. Add to queue */}
      <div
        className="sp-cm-item"
        onMouseEnter={() => setActiveSubMenu(null)}
        onClick={() => {
          if (onAddToQueue) onAddToQueue(song);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <ListPlus size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Add to queue</span>
        </div>
      </div>

      {/* 4. Remove from queue */}
      {isInQueue && (
        <div
          className="sp-cm-item"
          onMouseEnter={() => setActiveSubMenu(null)}
          onClick={() => {
            if (onRemoveFromQueue && typeof queueIndex === 'number') {
              onRemoveFromQueue(queueIndex);
            }
            onClose();
          }}
        >
          <div className="sp-cm-left">
            <Trash2 size={16} className="sp-cm-icon" />
            <span className="sp-cm-label">Remove from queue</span>
          </div>
        </div>
      )}

      {/* 5. Exclude from your taste profile */}
      <div
        className="sp-cm-item"
        onMouseEnter={() => setActiveSubMenu(null)}
        onClick={() => {
          if (onExcludeTasteProfile) onExcludeTasteProfile(song);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <Ban size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Exclude from your taste profile</span>
        </div>
      </div>

      {/* 6. Sleep timer (with submenu) */}
      <div
        className={`sp-cm-item has-sub ${activeSubMenu === 'timer' ? 'active' : ''}`}
        onMouseEnter={() => setActiveSubMenu('timer')}
      >
        <div className="sp-cm-left">
          <Timer size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Sleep timer</span>
        </div>
        <SubMenuArrow />

        {activeSubMenu === 'timer' && (
          <div
            className={`sp-cm-submenu ${openSubmenuLeft ? 'left' : 'right'}`}
            onMouseLeave={() => setActiveSubMenu(null)}
          >
            {[
              { label: '5 minutes', val: 5 },
              { label: '15 minutes', val: 15 },
              { label: '30 minutes', val: 30 },
              { label: '45 minutes', val: 45 },
              { label: '1 hour', val: 60 },
              { label: 'End of track', val: 'track' as const },
            ].map((t) => (
              <div
                key={t.label}
                className="sp-cm-subitem"
                onClick={() => {
                  if (onSetSleepTimer) onSetSleepTimer(t.val);
                  onClose();
                }}
              >
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Thin Spotify divider line */}
      <div className="sp-cm-divider" />

      {/* 7. Go to song radio */}
      <div
        className="sp-cm-item"
        onMouseEnter={() => setActiveSubMenu(null)}
        onClick={() => {
          if (onGoToRadio) onGoToRadio(song);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <Radio size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Go to song radio</span>
        </div>
      </div>

      {/* 8. Go to artist (with submenu if multiple, or direct) */}
      <div
        className={`sp-cm-item has-sub ${activeSubMenu === 'artist' ? 'active' : ''}`}
        onMouseEnter={() => setActiveSubMenu('artist')}
        onClick={() => {
          if (onGoToArtist) onGoToArtist(artistsList[0] || song.artist);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <User size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Go to artist</span>
        </div>
        <SubMenuArrow />

        {activeSubMenu === 'artist' && artistsList.length > 1 && (
          <div
            className={`sp-cm-submenu ${openSubmenuLeft ? 'left' : 'right'}`}
            onMouseLeave={() => setActiveSubMenu(null)}
          >
            {artistsList.map((art) => (
              <div
                key={art}
                className="sp-cm-subitem"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onGoToArtist) onGoToArtist(art);
                  onClose();
                }}
              >
                <span>{art}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 9. View credits */}
      <div
        className="sp-cm-item"
        onMouseEnter={() => setActiveSubMenu(null)}
        onClick={() => {
          if (onViewCredits) onViewCredits(song);
          onClose();
        }}
      >
        <div className="sp-cm-left">
          <Music2 size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">View credits</span>
        </div>
      </div>

      {/* 10. Share (with submenu) */}
      <div
        className={`sp-cm-item has-sub ${activeSubMenu === 'share' ? 'active' : ''}`}
        onMouseEnter={() => setActiveSubMenu('share')}
      >
        <div className="sp-cm-left">
          <Share2 size={16} className="sp-cm-icon" />
          <span className="sp-cm-label">Share</span>
        </div>
        <SubMenuArrow />

        {activeSubMenu === 'share' && (
          <div
            className={`sp-cm-submenu ${openSubmenuLeft ? 'left' : 'right'}`}
            onMouseLeave={() => setActiveSubMenu(null)}
          >
            <div className="sp-cm-subitem" onClick={handleCopyLink}>
              <span>Copy Song Link</span>
            </div>
            <div className="sp-cm-subitem" onClick={handleCopyEmbed}>
              <span>Embed track</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast Feedback inside menu */}
      {copiedToast && (
        <div className="sp-cm-toast">
          <Check size={14} color="#1ed760" />
          <span>{copiedToast}</span>
        </div>
      )}
    </div>
  );
};

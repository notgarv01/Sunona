import React, { useState } from 'react';
import { X, MoreHorizontal, Check, PlusCircle, Maximize2, ListPlus, Heart, ListMusic, Moon, Radio, User, Disc, Share2 } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  onClose: () => void;
  onPlaySong: (song: Song) => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onOpenLyrics?: () => void;
}

export const SpotifyRightPanel: React.FC<Props> = ({
  currentSong,
  queue,
  isPlaying: _isPlaying,
  onClose,
  onPlaySong,
  onToggleLike,
  onAddToPlaylist,
  onOpenLyrics,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  if (!currentSong) return null;

  // Real lyrics preview or fallback snippet from song
  const lyricsPreviewText =
    currentSong.lyrics && currentSong.lyrics.length > 0
      ? currentSong.lyrics.slice(0, 2).map((l) => l.text).join('\n')
      : 'pyaar tune kya kiya? chain mera liya';

  return (
    <aside className="spotify-right-panel" aria-label="Now Playing View">
      {/* Top Header matching Screenshot 426 & 449 */}
      <div className="spotify-rp-header">
        <div className="spotify-rp-header-title">
          <span className="spotify-rp-track-name">{currentSong.title}</span>
        </div>
        <div className="spotify-rp-header-actions" style={{ position: 'relative' }}>
          <button
            className={`spotify-rp-icon-btn ${showMoreMenu ? 'active' : ''}`}
            onClick={() => setShowMoreMenu(prev => !prev)}
            title="More options"
          >
            <MoreHorizontal size={18} />
          </button>
          <button className="spotify-rp-icon-btn" onClick={onOpenLyrics} title="Expand View">
            <Maximize2 size={16} />
          </button>
          <button className="spotify-rp-icon-btn" onClick={onClose} title="Close Now Playing View">
            <X size={18} />
          </button>

          {/* Context Menu matching Screenshot 449 */}
          {showMoreMenu && (
            <div className="spotify-rp-context-menu" onClick={(e) => e.stopPropagation()}>
              <button
                className="spotify-rp-menu-item"
                onClick={() => {
                  if (onAddToPlaylist) onAddToPlaylist(currentSong);
                  setShowMoreMenu(false);
                }}
              >
                <ListPlus size={16} />
                <span>Add to playlist</span>
              </button>
              <button
                className="spotify-rp-menu-item"
                onClick={() => {
                  onToggleLike(currentSong.id);
                  setShowMoreMenu(false);
                }}
              >
                <Heart size={16} fill={currentSong.isLiked ? '#1ed760' : 'none'} color={currentSong.isLiked ? '#1ed760' : 'currentColor'} />
                <span>{currentSong.isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
              </button>
              <button
                className="spotify-rp-menu-item"
                onClick={() => setShowMoreMenu(false)}
              >
                <ListMusic size={16} />
                <span>Add to queue</span>
              </button>
              <div className="spotify-rp-menu-divider" />
              <button
                className="spotify-rp-menu-item"
                onClick={() => setShowMoreMenu(false)}
              >
                <Moon size={16} />
                <span>Sleep timer</span>
              </button>
              <button
                className="spotify-rp-menu-item"
                onClick={() => setShowMoreMenu(false)}
              >
                <Radio size={16} />
                <span>Go to song radio</span>
              </button>
              <button
                className="spotify-rp-menu-item"
                onClick={() => setShowMoreMenu(false)}
              >
                <User size={16} />
                <span>Go to artist</span>
              </button>
              <button
                className="spotify-rp-menu-item"
                onClick={() => setShowMoreMenu(false)}
              >
                <Disc size={16} />
                <span>Go to album</span>
              </button>
              <div className="spotify-rp-menu-divider" />
              <button
                className="spotify-rp-menu-item"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                  }
                  setShowMoreMenu(false);
                }}
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="spotify-rp-scroll-content">
        {/* Large Portrait/Square Artwork with Ambient Glow */}
        <div className="spotify-rp-cover-wrap">
          {currentSong.coverUrl && (
            <div
              className="spotify-rp-cover-blur-bg"
              style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
              aria-hidden="true"
            />
          )}
          <img
            src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
            alt={currentSong.title}
            className="spotify-rp-cover-img"
          />
        </div>

        {/* Track Title, Artist & Plus Button */}
        <div className="spotify-rp-meta-row">
          <div className="spotify-rp-info">
            <h2 className="spotify-rp-title" title={currentSong.title}>
              {currentSong.title}
            </h2>
            <p className="spotify-rp-artist">{currentSong.artist}</p>
          </div>
          <div className="spotify-rp-actions">
            <button
              className={`spotify-rp-plus-btn ${currentSong.isLiked ? 'liked' : ''}`}
              onClick={() => {
                onToggleLike(currentSong.id);
                if (onAddToPlaylist) onAddToPlaylist(currentSong);
              }}
              title="Add to Liked / Playlist"
            >
              <PlusCircle size={24} />
            </button>
          </div>
        </div>

        {/* Lyrics Preview Deep Wine-Red Card (Exact Screenshot 426) */}
        <div
          className="spotify-rp-lyrics-preview-card"
          onClick={onOpenLyrics}
          title="Click to expand Lyrics"
          role="button"
          tabIndex={0}
        >
          <span className="spotify-rp-lp-label">Lyrics preview</span>
          <div className="spotify-rp-lp-text">{lyricsPreviewText}</div>
        </div>

        {/* About the Artist Card (Exact Screenshot 450) */}
        <div className="spotify-rp-artist-section">
          <h3 className="spotify-rp-section-label">About the artist</h3>
          <div className="spotify-rp-artist-card-box">
            <div className="spotify-rp-artist-avatar-wrap">
              <img
                src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'}
                alt={currentSong.artist}
                className="spotify-rp-artist-avatar"
              />
            </div>
            <div className="spotify-rp-artist-name-row">
              <span className="spotify-rp-artist-name">{currentSong.artist}</span>
              <span className="spotify-verified-badge" title="Verified Artist">
                <Check size={12} color="#ffffff" strokeWidth={3} />
              </span>
            </div>
            <div className="spotify-rp-listeners-row">
              <span className="spotify-rp-listeners-count">21,885,682 monthly listeners</span>
              <button className="spotify-rp-follow-btn">Follow</button>
            </div>
            <p className="spotify-rp-artist-bio">
              {currentSong.artist} is one of India's most soul-stirring and versatile voices, seamlessly blending soulful Bollywood melodies, high-energy pop, and heartfelt acoustic ballads.
            </p>
          </div>
        </div>

        {/* Credits Card (Exact Screenshot 450) */}
        <div className="spotify-rp-credits-section">
          <div className="spotify-rp-section-header">
            <span className="spotify-rp-section-label">Credits</span>
            <span className="spotify-rp-link">Show all</span>
          </div>
          <div className="spotify-rp-credit-item">
            <div>
              <div className="spotify-rp-credit-name">{currentSong.artist}</div>
              <div className="spotify-rp-credit-sub">Main Artist</div>
            </div>
            <button className="spotify-rp-follow-btn-sm">Follow</button>
          </div>
          <div className="spotify-rp-credit-item">
            <div>
              <div className="spotify-rp-credit-name">Amjad Nadeem Aamir</div>
              <div className="spotify-rp-credit-sub">Composer</div>
            </div>
          </div>
          <div className="spotify-rp-credit-item">
            <div>
              <div className="spotify-rp-credit-name">Sanjeev Chaturvedi</div>
              <div className="spotify-rp-credit-sub">Lyricist</div>
            </div>
          </div>
        </div>

        {/* On Tour Card (Exact Screenshot 451) */}
        <div className="spotify-rp-tour-section">
          <div className="spotify-rp-section-header">
            <span className="spotify-rp-section-label">On tour</span>
            <span className="spotify-rp-link">Show all</span>
          </div>
          <div className="spotify-rp-tour-item">
            <div className="spotify-rp-tour-date-box">
              <span className="spotify-tour-month">Nov</span>
              <span className="spotify-tour-day">28</span>
            </div>
            <div className="spotify-rp-tour-meta">
              <div className="spotify-tour-city">Atlantic City</div>
              <div className="spotify-tour-artist">{currentSong.artist}</div>
              <div className="spotify-tour-venue">Sat 8:00 PM • Hard Rock Live</div>
            </div>
          </div>
          <div className="spotify-rp-tour-item">
            <div className="spotify-rp-tour-date-box">
              <span className="spotify-tour-month">Nov</span>
              <span className="spotify-tour-day">29</span>
            </div>
            <div className="spotify-rp-tour-meta">
              <div className="spotify-tour-city">Toronto</div>
              <div className="spotify-tour-artist">{currentSong.artist}</div>
              <div className="spotify-tour-venue">Sun 8:00 PM • The Theatre</div>
            </div>
          </div>
        </div>

        {/* Queue Preview Card (Exact Screenshot 451) */}
        <div className="spotify-rp-queue-section">
          {queue.length > 1 ? (
            <div
              className="spotify-rp-queue-card"
              onClick={() => queue[1] && onPlaySong(queue[1])}
              style={{ cursor: 'pointer' }}
              title={`Play next: ${queue[1]?.title || 'Next'}`}
            >
              <div className="spotify-rp-queue-header">
                <span className="spotify-rp-section-label">Next in queue</span>
              </div>
              <div className="spotify-rp-queue-row">
                <div className="spotify-rp-queue-thumb">
                  <img src={queue[1]?.coverUrl} alt={queue[1]?.title || 'Next in queue'} />
                </div>
                <div className="spotify-rp-queue-meta">
                  <div className="spotify-rp-q-title">{queue[1]?.title}</div>
                  <div className="spotify-rp-q-artist">{queue[1]?.artist}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="spotify-rp-queue-empty-box">
              <span className="spotify-rp-empty-label">Your queue is empty</span>
              <button className="spotify-rp-search-new-btn">Search for something new</button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

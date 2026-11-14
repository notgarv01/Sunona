import React, { useState } from 'react';
import { Home, Compass, Library, Users, Heart, Download, Sliders, ListMusic, Plus, FolderHeart, Maximize2, Search, ArrowUpDown, History, Volume2 } from 'lucide-react';
import { THEME_PRESETS } from '../data/musicData';
import type { ThemePreset, Playlist, PlaybackSource, Song } from '../types';
import type { UserProfile } from '../services/authService';
import { isInvalidCoverUrl } from '../services/playlistService';

interface Props {
  activeView: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album' | 'artist' | 'history';
  setActiveView: (view: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album' | 'artist' | 'history') => void;
  onOpenLibrary?: (filter: 'all' | 'liked' | 'cached' | 'playlists') => void;
  libraryFilter?: 'all' | 'liked' | 'cached' | 'playlists';
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onCreatePlaylist: () => void;
  onOpenListenTogether: () => void;
  onOpenSettings: () => void;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
  likedCount: number;
  cachedCount: number;
  uiMode?: 'sunona' | 'spotify';
  user?: UserProfile | null;
  playbackSource?: PlaybackSource | null;
  isPlaying?: boolean;
  currentSong?: Song | null;
}

export const Sidebar: React.FC<Props> = ({
  activeView,
  setActiveView,
  onOpenLibrary,
  libraryFilter = 'all',
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onSelectAlbum: _onSelectAlbum,
  onCreatePlaylist,
  onOpenListenTogether,
  onOpenSettings,
  currentTheme,
  onSelectTheme,
  likedCount,
  cachedCount,
  uiMode = 'sunona',
  user,
  playbackSource,
  isPlaying = false,
  currentSong,
}) => {
  const [spotifyLibTab, setSpotifyLibTab] = useState<'playlists' | 'albums' | 'artists' | null>(null);

  if (uiMode === 'spotify') {
    return (
      <aside className="app-sidebar spotify-sidebar">
        {/* Spotify Top Box: Home & Search */}
        <div className="spotify-sidebar-top-box">
          <div
            className={`spotify-sidebar-nav-item ${activeView === 'home' ? 'active' : ''}`}
            onClick={() => setActiveView('home')}
          >
            <Home size={22} className="spotify-nav-icon" />
            <span className="spotify-nav-label">Home</span>
          </div>
          <div
            className={`spotify-sidebar-nav-item ${activeView === 'explore' ? 'active' : ''}`}
            onClick={() => setActiveView('explore')}
          >
            <Compass size={22} className="spotify-nav-icon" />
            <span className="spotify-nav-label">Explore</span>
          </div>
          <div
            className="spotify-sidebar-nav-item"
            onClick={onOpenListenTogether}
          >
            <Users size={22} className="spotify-nav-icon" />
            <span className="spotify-nav-label">Listen Together</span>
            <span className="nav-live-tag" style={{ marginLeft: 'auto' }}>LIVE</span>
          </div>
        </div>

        {/* Spotify Bottom Box: Your Library */}
        <div className="spotify-sidebar-library-box">
          <div className="spotify-library-header">
            <div
              className="spotify-library-title-btn"
              onClick={() => (onOpenLibrary ? onOpenLibrary('all') : setActiveView('library'))}
            >
              <Library size={22} className="spotify-nav-icon" />
              <span className="spotify-library-title">Your Library</span>
            </div>
            <div className="spotify-library-header-actions">
              <button
                className="spotify-icon-round-btn"
                onClick={onCreatePlaylist}
                title="Create playlist (+)"
              >
                <Plus size={18} />
              </button>
              <button
                className="spotify-icon-round-btn"
                onClick={() => (onOpenLibrary ? onOpenLibrary('all') : setActiveView('library'))}
                title="Enlarge Your Library"
              >
                <Maximize2 size={16} />
              </button>
              <button
                className="spotify-icon-round-btn"
                onClick={onOpenSettings}
                title="Settings & Themes"
              >
                <Sliders size={16} />
              </button>
            </div>
          </div>

          {/* Library Filter Chips (Matching Screenshot 426) */}
          <div className="spotify-library-chips">
            <button
              className={`spotify-chip ${spotifyLibTab === 'playlists' ? 'active' : ''}`}
              onClick={() => setSpotifyLibTab(spotifyLibTab === 'playlists' ? null : 'playlists')}
            >
              Playlists
            </button>
            <button
              className={`spotify-chip ${spotifyLibTab === 'albums' ? 'active' : ''}`}
              onClick={() => setSpotifyLibTab(spotifyLibTab === 'albums' ? null : 'albums')}
            >
              Albums
            </button>
            <button
              className={`spotify-chip ${spotifyLibTab === 'artists' ? 'active' : ''}`}
              onClick={() => setSpotifyLibTab(spotifyLibTab === 'artists' ? null : 'artists')}
            >
              Artists
            </button>
          </div>

          {/* Search in Library & Recents Sort Header Row */}
          <div className="spotify-library-search-sort-row">
            <button className="spotify-lib-search-btn" title="Search in Your Library">
              <Search size={16} />
            </button>
            <div className="spotify-lib-sort-btn">
              <span>Recents</span>
              <ArrowUpDown size={14} style={{ marginLeft: 4 }} />
            </div>
          </div>

          {/* Spotify Library List (Exact User App Items) */}
          <div className="spotify-library-list">
            {/* Pinned: Liked Songs Card */}
            {(!spotifyLibTab || spotifyLibTab === 'playlists') && (
              <div
                className={`spotify-library-item pinned ${activeView === 'library' && libraryFilter === 'liked' ? 'active' : ''}`}
                onClick={() => (onOpenLibrary ? onOpenLibrary('liked') : setActiveView('library'))}
              >
                <div className="spotify-liked-gradient-box">
                  <Heart size={18} fill="#ffffff" color="#ffffff" />
                </div>
                <div className="spotify-library-item-meta">
                  <div className="spotify-library-item-title">Liked Songs</div>
                  <div className="spotify-library-item-subtitle">
                    <span className="spotify-pinned-badge">📌</span> Playlist • {user?.displayName || 'My Library'}
                  </div>
                </div>
              </div>
            )}

            {/* User Custom Playlists (e.g. garv1, etc.) */}
            {playlists.map((pl) => {
              const validSongCover = pl.songs?.find(s => !isInvalidCoverUrl(s.coverUrl))?.coverUrl;
              const cleanCover = !isInvalidCoverUrl(pl.coverUrl)
                ? pl.coverUrl
                : (validSongCover || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100');
              const isPlayingThis = isPlaying && Boolean(
                (playbackSource?.type === 'playlist' && (playbackSource.id === pl.id || playbackSource.name.toLowerCase() === pl.title.toLowerCase())) ||
                (!playbackSource && currentSong && pl.songs?.some((s) => s.id === currentSong.id))
              );

              return (
                <div
                  key={pl.id}
                  className={`spotify-library-item ${activeView === 'playlist' && selectedPlaylistId === pl.id ? 'active' : ''} ${isPlayingThis ? 'is-playing' : ''}`}
                  onClick={() => onSelectPlaylist(pl.id)}
                >
                  <img
                    src={cleanCover}
                    alt={pl.title}
                    className="spotify-playlist-thumb"
                  />
                  <div className="spotify-library-item-meta">
                    <div className="spotify-library-item-title">{pl.title}</div>
                    <div className="spotify-library-item-subtitle">
                      Playlist • {pl.songs.length} songs
                    </div>
                  </div>
                  {isPlayingThis && (
                    <Volume2 size={16} color="#1ed760" className="sp-playing-icon" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    );
  }
  return (
    <aside className="app-sidebar">
      {/* Navigation Links */}
      <div className="nav-section">
        <div className="nav-section-title">Discover</div>
        <div
          className={`nav-item ${activeView === 'home' ? 'active' : ''}`}
          onClick={() => setActiveView('home')}
        >
          <Home className="nav-item-icon" />
          <span>Home</span>
        </div>
        <div
          className={`nav-item ${activeView === 'explore' ? 'active' : ''}`}
          onClick={() => setActiveView('explore')}
        >
          <Compass className="nav-item-icon" />
          <span>Explore & Charts</span>
        </div>
        <div
          className="nav-item"
          onClick={onOpenListenTogether}
        >
          <Users className="nav-item-icon" />
          <span>Listen Together</span>
          <span className="nav-live-tag">LIVE</span>
        </div>
      </div>

      {/* Library Section */}
      <div className="nav-section">
        <div className="nav-section-title">My Collection</div>
        <div
          className={`nav-item ${activeView === 'library' && libraryFilter === 'all' ? 'active' : ''}`}
          onClick={() => (onOpenLibrary ? onOpenLibrary('all') : setActiveView('library'))}
        >
          <Library className="nav-item-icon" />
          <span>Your Library</span>
        </div>
        <div
          className={`nav-item ${activeView === 'history' ? 'active' : ''}`}
          onClick={() => setActiveView('history')}
        >
          <History className="nav-item-icon" style={{ color: 'var(--primary)' }} />
          <span>Listening History</span>
        </div>
        <div
          className={`nav-item ${activeView === 'my-playlists' ? 'active' : ''}`}
          onClick={() => setActiveView('my-playlists')}
        >
          <FolderHeart className="nav-item-icon" style={{ color: 'var(--primary)' }} />
          <span>My Playlists</span>
          <span className="nav-count">{playlists.length}</span>
        </div>
        <div
          className={`nav-item ${activeView === 'library' && libraryFilter === 'liked' ? 'active' : ''}`}
          onClick={() => (onOpenLibrary ? onOpenLibrary('liked') : setActiveView('library'))}
        >
          <Heart className="nav-item-icon" style={{ color: 'var(--accent)' }} />
          <span>Liked Songs</span>
          {isPlaying && (playbackSource?.id === 'liked-songs' || playbackSource?.name === 'Liked Songs') && (
            <Volume2 size={14} style={{ color: 'var(--accent)', marginLeft: 'auto', marginRight: '6px' }} />
          )}
          <span className="nav-count">{likedCount}</span>
        </div>
        <div
          className={`nav-item ${activeView === 'library' && libraryFilter === 'cached' ? 'active' : ''}`}
          onClick={() => (onOpenLibrary ? onOpenLibrary('cached') : setActiveView('library'))}
        >
          <Download className="nav-item-icon" style={{ color: 'var(--primary)' }} />
          <span>Offline Cached</span>
          <span className="nav-count">{cachedCount}</span>
        </div>
      </div>

      {/* Playlists Section */}
      <div className="nav-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 6px' }}>
          <div className="nav-section-title" style={{ padding: 0 }}>Playlists</div>
          <button
            className="icon-btn"
            style={{ width: '22px', height: '22px' }}
            onClick={onCreatePlaylist}
            title="Create Playlist"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="sidebar-playlists-scroll">
          {playlists.length === 0 && (
            <div
              style={{
                padding: '8px 14px',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                opacity: 0.5,
              }}
            >
              No playlists yet
            </div>
          )}
          {playlists.map((pl) => {
            const isSelected = activeView === 'playlist' && selectedPlaylistId === pl.id;
            const isPlayingThis = isPlaying && Boolean(
              (playbackSource?.type === 'playlist' && (playbackSource.id === pl.id || playbackSource.name.toLowerCase() === pl.title.toLowerCase())) ||
              (!playbackSource && currentSong && pl.songs?.some((s) => s.id === currentSong.id))
            );

            return (
              <div
                key={pl.id}
                className={`nav-item playlist-nav-item ${isSelected ? 'active' : ''} ${isPlayingThis ? 'is-playing' : ''}`}
                onClick={() => onSelectPlaylist(pl.id)}
                title={isPlayingThis ? `Currently playing: ${pl.title}` : pl.title}
              >
                <ListMusic className="nav-item-icon" style={{ color: isPlayingThis ? 'var(--primary)' : undefined }} />
                <span
                  className="playlist-title-truncate"
                  style={{
                    color: isPlayingThis ? 'var(--primary)' : undefined,
                    fontWeight: isPlayingThis ? 700 : undefined,
                  }}
                >
                  {pl.title}
                </span>
                {isPlayingThis && (
                  <Volume2 size={14} style={{ color: 'var(--primary)', marginLeft: 'auto', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer with Theme & Settings */}
      <div className="sidebar-footer">
        <div className="theme-selector-wrap">
          <div className="theme-selector-title">Dynamic Neon Accent</div>
          <div className="theme-dots-row">
            {THEME_PRESETS.map((theme) => {
              const isSelected = currentTheme.id === theme.id;

              return (
                <div
                  key={theme.id}
                  className={`theme-dot ${isSelected ? 'active' : ''}`}
                  style={{
                    background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
                    boxShadow: isSelected ? `0 0 10px ${theme.primaryGlow}` : 'none',
                  }}
                  onClick={() => onSelectTheme(theme)}
                  title={`${theme.name} Accent`}
                />
              );
            })}
          </div>
        </div>

        <div className="nav-item settings-nav-item" onClick={onOpenSettings}>
          <Sliders className="nav-item-icon" />
          <span>Audio Engine Settings</span>
        </div>
      </div>
    </aside>
  );
};

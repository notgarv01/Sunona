import React from 'react';
import { Home, Compass, Library, Users, Heart, Download, Sliders, ListMusic, Plus, FolderHeart } from 'lucide-react';
import { THEME_PRESETS } from '../data/musicData';
import type { ThemePreset, Playlist } from '../types';

interface Props {
  activeView: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album';
  setActiveView: (view: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album') => void;
  onOpenLibrary?: (filter: 'all' | 'liked' | 'cached' | 'playlists') => void;
  libraryFilter?: 'all' | 'liked' | 'cached' | 'playlists';
  playlists: Playlist[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onOpenListenTogether: () => void;
  onOpenSettings: () => void;
  currentTheme: ThemePreset;
  onSelectTheme: (theme: ThemePreset) => void;
  likedCount: number;
  cachedCount: number;
}

export const Sidebar: React.FC<Props> = ({
  activeView,
  setActiveView,
  onOpenLibrary,
  libraryFilter = 'all',
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  onCreatePlaylist,
  onOpenListenTogether,
  onOpenSettings,
  currentTheme,
  onSelectTheme,
  likedCount,
  cachedCount,
}) => {
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
          {playlists.map((pl) => {
            const isSelected = activeView === 'playlist' && selectedPlaylistId === pl.id;

            return (
              <div
                key={pl.id}
                className={`nav-item playlist-nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectPlaylist(pl.id)}
              >
                <ListMusic className="nav-item-icon" />
                <span className="playlist-title-truncate">{pl.title}</span>
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

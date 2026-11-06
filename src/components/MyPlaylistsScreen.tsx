import React, { useState } from 'react';
import { Plus, Play, Music, ListMusic, Search, Trash2 } from 'lucide-react';
import type { Playlist, Song } from '../types';

interface Props {
  playlists: Playlist[];
  onSelectPlaylist: (playlistId: string) => void;
  onCreatePlaylist: () => void;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onDeletePlaylist?: (playlistId: string) => void;
}

export const MyPlaylistsScreen: React.FC<Props> = ({
  playlists,
  onSelectPlaylist,
  onCreatePlaylist,
  onPlaySong,
  onDeletePlaylist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = playlists.filter((pl) =>
    pl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pl.description && pl.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="app-viewport">
      {/* Hero Header */}
      <div className="section-hero">
        <div className="hero-header-row" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <div className="hero-greeting">Your Music Collections</div>
            <h1 className="hero-title">My Playlists</h1>
          </div>

          <button
            className="playlist-play-all-btn"
            onClick={onCreatePlaylist}
            style={{ marginBottom: '8px' }}
          >
            <Plus size={18} />
            <span>Create Playlist</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredPlaylists.length}</strong> of {playlists.length} playlists
        </div>
      </div>

      {/* Playlists Cards Grid */}
      <div className="cards-grid">
        {/* "+ Create New Playlist" Quick Card */}
        <div
          className="song-card create-playlist-card"
          onClick={onCreatePlaylist}
          title="Create New Playlist"
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
              color: 'var(--primary)',
            }}
          >
            <Plus size={32} />
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>New Playlist</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Build your custom mix
          </div>
        </div>

        {/* Existing Playlists */}
        {filteredPlaylists.map((pl) => (
          <div
            key={pl.id}
            className="song-card"
            onClick={() => onSelectPlaylist(pl.id)}
            style={{ position: 'relative' }}
          >
            <div className="card-cover-container">
              {pl.coverUrl ? (
                <img src={pl.coverUrl} alt={pl.title} className="card-cover-img" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.04)' }}>
                  <Music size={40} style={{ opacity: 0.4 }} />
                </div>
              )}
              <div className="card-play-overlay">
                <div
                  className="overlay-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pl.songs.length > 0) {
                      onPlaySong(pl.songs[0], pl.songs);
                    } else {
                      onSelectPlaylist(pl.id);
                    }
                  }}
                  title={pl.songs.length > 0 ? "Play Playlist" : "Open Playlist"}
                >
                  <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>

            <div className="card-title">{pl.title}</div>
            <div className="card-artist" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{pl.songCount} {pl.songCount === 1 ? 'track' : 'tracks'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>
                  {pl.isCurated ? 'Curated' : 'Custom'}
                </span>
                {!pl.isCurated && onDeletePlaylist && (
                  <button
                    className="icon-btn"
                    style={{ width: '22px', height: '22px', padding: 0, color: 'var(--text-muted)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete playlist "${pl.title}"?`)) {
                        onDeletePlaylist(pl.id);
                      }
                    }}
                    title="Delete Playlist"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPlaylists.length === 0 && playlists.length > 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <ListMusic size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <h3>No playlists matching "{searchQuery}"</h3>
          <p>Try searching with another name or click "Create Playlist" above.</p>
        </div>
      )}

      {playlists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <ListMusic size={54} style={{ opacity: 0.25, marginBottom: '16px' }} />
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>No playlists yet</h3>
          <p style={{ maxWidth: '360px', margin: '0 auto 20px', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Create your own custom playlists to organize your favorite tracks, or sign in with Google to sync your collection.
          </p>
          <button
            onClick={onCreatePlaylist}
            style={{
              padding: '10px 20px',
              borderRadius: '24px',
              background: 'var(--primary)',
              color: '#09090b',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={16} />
            <span>Create First Playlist</span>
          </button>
        </div>
      )}
    </div>
  );
};

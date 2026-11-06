import React, { useState, useEffect } from 'react';
import { Heart, Download, FolderPlus, Play, CheckCircle2, ListPlus, Plus, Music2 } from 'lucide-react';
import type { Song, Playlist } from '../types';

interface Props {
  songs: Song[];
  likedSongs?: Song[];
  initialFilter?: 'all' | 'liked' | 'cached' | 'playlists';
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying?: boolean;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onToggleLike: (songId: string, song?: Song) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onCreatePlaylist?: () => void;
  onAddToPlaylist?: (song: Song) => void;
}

export const LibraryScreen: React.FC<Props> = ({
  songs,
  likedSongs = [],
  initialFilter = 'all',
  playlists,
  currentSong,
  isPlaying: _isPlaying,
  onPlaySong,
  onToggleLike,
  onSelectPlaylist,
  onCreatePlaylist,
  onAddToPlaylist,
}) => {
  const [filter, setFilter] = useState<'all' | 'liked' | 'cached' | 'playlists'>(initialFilter);

  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const filteredSongs = (() => {
    if (filter === 'liked') {
      return likedSongs;
    }
    if (filter === 'cached') {
      return songs.filter((s) => s.isCached);
    }
    return songs;
  })();

  return (
    <div className="app-viewport">
      <div className="section-hero">
        <div className="hero-greeting">Local & Synced Library</div>
        <h1 className="hero-title">
          {filter === 'liked' ? 'Liked Tracks ❤️' : filter === 'cached' ? 'Offline Cached Tracks 💾' : filter === 'playlists' ? 'My Playlists 📁' : 'Your Collection'}
        </h1>
      </div>

      {/* Library Filter Pills */}
      <div className="mood-chips-scroll">
        <div
          className={`mood-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span>All Songs ({songs.length})</span>
        </div>
        <div
          className={`mood-chip ${filter === 'liked' ? 'active' : ''}`}
          onClick={() => setFilter('liked')}
        >
          <Heart size={14} style={{ color: 'var(--accent)' }} />
          <span>Liked Tracks ({likedSongs.length})</span>
        </div>
        <div
          className={`mood-chip ${filter === 'cached' ? 'active' : ''}`}
          onClick={() => setFilter('cached')}
        >
          <Download size={14} style={{ color: 'var(--primary)' }} />
          <span>Offline Cached</span>
        </div>
        <div
          className={`mood-chip ${filter === 'playlists' ? 'active' : ''}`}
          onClick={() => setFilter('playlists')}
        >
          <FolderPlus size={14} />
          <span>Playlists ({playlists.length})</span>
        </div>
      </div>

      {/* Quick Play All Header for Liked Songs */}
      {filter === 'liked' && filteredSongs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', padding: '12px 18px', background: 'rgba(255, 36, 66, 0.08)', border: '1px solid rgba(255, 36, 66, 0.22)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Heart size={20} style={{ color: '#ff2442' }} fill="#ff2442" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#fff' }}>Your Favorite Music Collection</div>
              <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.6)' }}>{filteredSongs.length} songs saved to local library</div>
            </div>
          </div>
          <button
            className="glow-pill-btn-red"
            style={{ padding: '8px 20px', fontSize: '0.78rem' }}
            onClick={() => onPlaySong(filteredSongs[0], filteredSongs)}
          >
            <Play size={14} fill="#fff" />
            <span>Play Liked Songs</span>
          </button>
        </div>
      )}

      {/* Offline Storage Cache Status */}
      {filter === 'cached' && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid var(--border-glass)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#f8fafc' }}>Offline Storage Active</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Cached tracks are stored in indexed local storage for instant offline playback.
              </div>
            </div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px' }}>
            {songs.filter((s) => s.isCached).length > 0 ? `${(songs.filter((s) => s.isCached).length * 4.8).toFixed(1)} MB` : '0.0 MB'}
          </span>
        </div>
      )}

      {/* Content Rendering */}
      {filter === 'playlists' ? (
        <div className="cards-grid">
          {/* Create Playlist Action Card */}
          <div
            className="song-card create-playlist-card"
            onClick={onCreatePlaylist}
            title="Create New Playlist"
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                color: 'var(--primary)',
              }}
            >
              <Plus size={30} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#fff' }}>New Playlist</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Create and add songs
            </div>
          </div>

          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="song-card"
              onClick={() => onSelectPlaylist?.(pl.id)}
            >
              <div className="card-cover-container">
                <img src={pl.coverUrl} alt={pl.title} className="card-cover-img" />
                <div className="card-play-overlay">
                  <div
                    className="overlay-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pl.songs.length > 0) {
                        onPlaySong(pl.songs[0], pl.songs);
                      }
                    }}
                    title="Play Playlist"
                  >
                    <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                  </div>
                </div>
              </div>
              <div className="card-title">{pl.title}</div>
              <div className="card-artist">{pl.songCount} tracks</div>
            </div>
          ))}
        </div>
      ) : filteredSongs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          {filter === 'liked' ? (
            <>
              <Heart size={44} style={{ color: 'rgba(255, 36, 66, 0.45)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>No Liked Tracks Yet</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.84rem', maxWidth: '360px', margin: '6px auto 16px' }}>
                Kisi bhi gaane par heart ❤️ icon dabao, voh yahan aapke Liked Songs me hamesha ke liye save ho jayega!
              </p>
            </>
          ) : (
            <>
              <Music2 size={44} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>No Tracks Found</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.84rem', margin: '6px auto 0' }}>
                Your library is currently empty for this filter.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="song-list-table">
          {filteredSongs.map((song, index) => {
            const isCurrent = currentSong?.id === song.id;

            return (
              <div
                key={song.id}
                className={`song-row ${isCurrent ? 'playing' : ''}`}
                onClick={() => onPlaySong(song, filteredSongs)}
              >
                <div className="song-index">{index + 1}</div>
                <img src={song.coverUrl} alt={song.title} className="song-row-thumb" />
                <div className="song-row-main">
                  <div className="song-row-title">{song.title}</div>
                  <div className="song-row-artist">{song.artist}</div>
                </div>
                <div className="song-row-album">{song.album}</div>
                <div className="song-row-stats">{song.isCached ? 'Cached' : 'Streaming'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    className="icon-btn add-to-pl-row-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist?.(song);
                    }}
                    title="Add to Playlist"
                  >
                    <ListPlus size={16} />
                  </button>
                  <Heart
                    size={16}
                    className={`like-btn ${song.isLiked ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(song.id, song);
                    }}
                    fill={song.isLiked ? 'var(--accent)' : 'none'}
                  />
                  {song.isCached && <Download size={14} style={{ color: 'var(--primary)' }} />}
                  <span className="song-row-duration">3:15</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  Trash2,
  Edit2,
  Check,
  X,
  Clock,
  ListMusic,
  Heart,
  Music,
} from 'lucide-react';
import type { Playlist, Song } from '../types';

interface Props {
  playlist: Playlist;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onTogglePlay: () => void;
  onBack: () => void;
  onDeletePlaylist: (id: string) => void;
  onRenamePlaylist: (id: string, newTitle: string, newDesc?: string) => void;
  onRemoveSong: (playlistId: string, songId: string) => void;
  onToggleLike: (songId: string) => void;
}

export const PlaylistScreen: React.FC<Props> = ({
  playlist,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onBack,
  onDeletePlaylist,
  onRenamePlaylist,
  onRemoveSong,
  onToggleLike,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(playlist.title);
  const [editDesc, setEditDesc] = useState(playlist.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const totalDurationSeconds = playlist.songs.reduce((acc, s) => acc + (s.duration || 210), 0);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const formattedDuration =
    totalHours > 0
      ? `${totalHours} hr ${totalMinutes % 60} min`
      : `${totalMinutes} min`;

  const isPlaylistPlaying =
    isPlaying &&
    currentSong &&
    playlist.songs.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (playlist.songs.length === 0) return;
    if (isPlaylistPlaying) {
      onTogglePlay();
    } else {
      onPlaySong(playlist.songs[0], playlist.songs);
    }
  };

  const handleShufflePlay = () => {
    if (playlist.songs.length === 0) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    onPlaySong(shuffled[0], shuffled);
  };

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onRenamePlaylist(playlist.id, editTitle, editDesc);
    }
    setIsEditing(false);
  };

  const formatSongDuration = (secs?: number) => {
    if (!secs || isNaN(secs)) return '3:30';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="app-viewport playlist-viewport">
      {/* Top Back Nav Button */}
      <div className="playlist-top-bar">
        <button className="icon-btn back-btn" onClick={onBack} title="Back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      {/* Playlist Hero Showcase */}
      <div className="playlist-hero">
        <div className="playlist-hero-cover-wrap">
          {playlist.coverUrl ? (
            <img
              src={playlist.coverUrl}
              alt={playlist.title}
              className="playlist-hero-cover"
            />
          ) : (
            <div className="playlist-hero-cover-fallback">
              <Music size={64} style={{ opacity: 0.4 }} />
            </div>
          )}
        </div>

        <div className="playlist-hero-info">
          <span className="playlist-hero-badge">
            {playlist.isCurated ? 'Curated Playlist' : 'User Playlist'}
          </span>

          {isEditing ? (
            <div className="playlist-edit-form">
              <input
                type="text"
                className="playlist-edit-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Playlist name"
                autoFocus
              />
              <textarea
                className="playlist-edit-textarea"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Give your playlist a description..."
                rows={2}
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button className="playlist-save-btn" onClick={handleSaveEdit}>
                  <Check size={14} /> Save
                </button>
                <button
                  className="playlist-cancel-btn"
                  onClick={() => setIsEditing(false)}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="playlist-title-row">
                <h1 className="playlist-hero-title">{playlist.title}</h1>
                {!playlist.isCurated && (
                  <button
                    className="icon-btn edit-playlist-btn"
                    onClick={() => {
                      setEditTitle(playlist.title);
                      setEditDesc(playlist.description || '');
                      setIsEditing(true);
                    }}
                    title="Rename Playlist"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              <p className="playlist-hero-desc">
                {playlist.description || 'No description provided.'}
              </p>
            </>
          )}

          <div className="playlist-meta-row">
            <span>
              <strong>{playlist.songs.length}</strong>{' '}
              {playlist.songs.length === 1 ? 'track' : 'tracks'}
            </span>
            <span className="meta-dot">•</span>
            <span>{formattedDuration}</span>
          </div>

          {/* Action transport controls */}
          <div className="playlist-actions-row">
            <button
              className="playlist-play-all-btn"
              onClick={handlePlayAll}
              disabled={playlist.songs.length === 0}
            >
              {isPlaylistPlaying ? (
                <>
                  <Pause size={18} fill="#0b0914" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="#0b0914" style={{ marginLeft: '2px' }} />
                  <span>Play All</span>
                </>
              )}
            </button>

            <button
              className="playlist-shuffle-btn"
              onClick={handleShufflePlay}
              disabled={playlist.songs.length === 0}
              title="Shuffle Play"
            >
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>

            {!playlist.isCurated && (
              <button
                className="playlist-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                title="Delete Playlist"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px', fontSize: '1.15rem' }}>
              Delete Playlist?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Are you sure you want to delete <strong>"{playlist.title}"</strong>?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="playlist-cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="playlist-delete-confirm-btn"
                onClick={() => {
                  onDeletePlaylist(playlist.id);
                  onBack();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track List Section */}
      <div className="playlist-tracklist-section">
        <div className="playlist-table-header">
          <div className="col-index">#</div>
          <div className="col-title">Title</div>
          <div className="col-album">Album</div>
          <div className="col-actions">
            <Clock size={15} style={{ marginRight: '16px' }} />
          </div>
        </div>

        {playlist.songs.length === 0 ? (
          <div className="playlist-empty-state">
            <div className="playlist-empty-icon-wrap">
              <ListMusic size={40} style={{ color: 'var(--primary)' }} />
            </div>
            <h3>This playlist is currently empty</h3>
            <p>
              Search for your favorite tracks in the top search bar, or browse Home Quick Picks, and click the <strong>+</strong> button on any song to add it here.
            </p>
          </div>
        ) : (
          <div className="song-list-table">
            {playlist.songs.map((song, idx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isCurrent = currentSong?.id === song.id;

              return (
                <div
                  key={`${song.id}_${idx}`}
                  className={`song-row ${isCurrent ? 'playing' : ''}`}
                  onClick={() => onPlaySong(song, playlist.songs)}
                >
                  <div className="song-index">
                    {isThisPlaying ? (
                      <div className="animated-soundwave" title="Playing">
                        <div className="soundwave-bar" />
                        <div className="soundwave-bar" />
                        <div className="soundwave-bar" />
                      </div>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  <img
                    src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'}
                    alt={song.title}
                    className="song-row-thumb"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                    }}
                  />

                  <div className="song-row-main">
                    <div className="song-row-title">{song.title}</div>
                    <div className="song-row-artist">{song.artist}</div>
                  </div>

                  <div className="song-row-album">{song.album || 'Single'}</div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '14px',
                    }}
                  >
                    <Heart
                      size={16}
                      className={`like-btn ${song.isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      fill={song.isLiked ? 'var(--accent)' : 'none'}
                    />

                    <span className="song-row-duration">
                      {formatSongDuration(song.duration)}
                    </span>

                    <button
                      className="icon-btn remove-track-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSong(playlist.id, song.id);
                      }}
                      title="Remove from this playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


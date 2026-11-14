import React, { useState, useEffect } from 'react';
import { X, Plus, Check, ListPlus, Music, FolderPlus } from 'lucide-react';
import type { Playlist, Song } from '../types';

interface Props {
  isOpen: boolean;
  song?: Song | null;
  songs?: Song[] | null;
  playlists: Playlist[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, song: Song) => void;
  onCreateAndAdd: (playlistTitle: string, song: Song) => void;
  onAddMultipleToPlaylist?: (playlistId: string, songs: Song[]) => void;
  onCreateAndAddMultiple?: (playlistTitle: string, songs: Song[]) => void;
}

export const AddToPlaylistModal: React.FC<Props> = ({
  isOpen,
  song,
  songs,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreateAndAdd,
  onAddMultipleToPlaylist,
  onCreateAndAddMultiple,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const isMultiple = Boolean(songs && songs.length > 0);
  const activeSong = song || (songs && songs[0]) || null;
  const songCount = songs?.length || (song ? 1 : 0);

  useEffect(() => {
    if (!isOpen) {
      setNewTitle('');
      setIsCreating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || (!song && !isMultiple)) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (isMultiple && songs && onCreateAndAddMultiple) {
      onCreateAndAddMultiple(newTitle.trim(), songs);
    } else if (activeSong) {
      onCreateAndAdd(newTitle.trim(), activeSong);
    }
    setNewTitle('');
    setIsCreating(false);
  };

  const handleSelectPlaylist = (playlistId: string) => {
    if (isMultiple && songs && onAddMultipleToPlaylist) {
      onAddMultipleToPlaylist(playlistId, songs);
    } else if (activeSong) {
      onAddToPlaylist(playlistId, activeSong);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="add-to-playlist-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ListPlus size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              {isMultiple ? `Save Queue to Playlist (${songCount} tracks)` : 'Add to Playlist'}
            </h3>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Selected Song / Queue Preview Banner */}
        {activeSong && (
          <div className="modal-song-preview">
            <img
              src={activeSong.coverUrl}
              alt={activeSong.title}
              className="modal-song-thumb"
            />
            <div className="modal-song-info">
              <div className="modal-song-title">
                {isMultiple ? `Current Queue (${songCount} tracks)` : activeSong.title}
              </div>
              <div className="modal-song-artist">
                {isMultiple && songs
                  ? songs.slice(0, 3).map((s) => s.title).join(', ') + (songs.length > 3 ? '...' : '')
                  : activeSong.artist}
              </div>
            </div>
          </div>
        )}

        {/* Create New Playlist Inline Toggle */}
        {isCreating ? (
          <form className="modal-create-playlist-form" onSubmit={handleCreateSubmit}>
            <input
              type="text"
              className="modal-create-input"
              placeholder={isMultiple ? "Enter playlist name for queue..." : "Enter new playlist name..."}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                className="modal-submit-btn"
                disabled={!newTitle.trim()}
              >
                {isMultiple ? `Create & Save (${songCount})` : 'Create & Add'}
              </button>
              <button
                type="button"
                className="playlist-cancel-btn"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className="modal-new-playlist-trigger"
            onClick={() => setIsCreating(true)}
          >
            <FolderPlus size={16} />
            <span>Create New Playlist</span>
          </button>
        )}

        {/* Playlists List */}
        <div className="modal-playlists-list">
          {playlists.map((pl) => {
            const isAlreadyAdded = !isMultiple && activeSong && pl.songs.some((s) => s.id === activeSong.id);

            return (
              <div
                key={pl.id}
                className={`modal-playlist-item ${isAlreadyAdded ? 'added' : ''}`}
                onClick={() => {
                  if (!isAlreadyAdded) {
                    handleSelectPlaylist(pl.id);
                  }
                }}
              >
                <div className="modal-playlist-thumb-wrap">
                  {pl.coverUrl ? (
                    <img
                      src={pl.coverUrl}
                      alt={pl.title}
                      className="modal-playlist-thumb"
                    />
                  ) : (
                    <Music size={18} style={{ opacity: 0.5 }} />
                  )}
                </div>

                <div className="modal-playlist-meta">
                  <div className="modal-playlist-title">{pl.title}</div>
                  <div className="modal-playlist-count">
                    {pl.songs.length} tracks
                  </div>
                </div>

                <div className="modal-playlist-action">
                  {isAlreadyAdded ? (
                    <div className="added-pill" title="Already in this playlist">
                      <Check size={14} />
                      <span>Added</span>
                    </div>
                  ) : (
                    <button
                      className="add-to-pl-circle-btn"
                      title={isMultiple ? `Add queue to ${pl.title}` : 'Add to this playlist'}
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

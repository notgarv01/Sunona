import React from 'react';
import { ListMusic, X, Trash2, ListPlus, Volume2 } from 'lucide-react';
import type { Song, PlaybackSource } from '../types';

interface Props {
  queue: Song[];
  currentSong: Song | null;
  playbackSource?: PlaybackSource | null;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onSaveQueueToPlaylist?: () => void;
  onClose: () => void;
}

export const QueueDrawer: React.FC<Props> = ({
  queue,
  currentSong,
  playbackSource,
  onPlaySong,
  onRemoveFromQueue,
  onClearQueue,
  onSaveQueueToPlaylist,
  onClose,
}) => {
  const currentIdx = currentSong ? queue.findIndex((s) => s.id === currentSong.id) : -1;
  const hasNowPlaying = currentIdx >= 0;

  return (
    <aside className="app-drawer">
      <div className="drawer-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListMusic size={18} style={{ color: 'var(--primary)' }} />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
              Up Next Queue ({queue.length})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onSaveQueueToPlaylist && queue.length > 0 && (
              <button
                className="icon-btn"
                style={{ width: '32px', height: '32px' }}
                onClick={onSaveQueueToPlaylist}
                title="Save Queue to Playlist"
              >
                <ListPlus size={16} />
              </button>
            )}
            <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClearQueue} title="Clear Queue">
              <Trash2 size={14} />
            </button>
            <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose} title="Close Queue">
              <X size={15} />
            </button>
          </div>
        </div>

        {playbackSource && (
          <div
            className="queue-source-badge"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--primary)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
          >
            <Volume2 size={13} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Now playing {playbackSource.type === 'album' ? 'album' : 'playlist'}:{' '}
              <strong style={{ color: '#ffffff' }}>{playbackSource.name}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="queue-container">
        {queue && queue.length > 0 ? (
          queue.map((song, idx) => {
            if (!song) return null;
            const isCurrent = currentSong?.id === song.id;
            const showNextFromHeader = hasNowPlaying ? idx === currentIdx + 1 : idx === 1;

            return (
              <React.Fragment key={`${song.id || 'q'}-${idx}`}>
                {idx === 0 && hasNowPlaying && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '2px 4px 6px',
                    }}
                  >
                    Now playing
                  </div>
                )}

                {showNextFromHeader && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '12px 4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Next from:</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                      {playbackSource?.name || 'Queue'}
                    </span>
                  </div>
                )}

                <div
                  className={`queue-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => onPlaySong(song)}
                >
                  <img
                    src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                    alt={song.title || 'Song'}
                    className="queue-item-thumb"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: isCurrent ? 'var(--primary)' : '#ffffff',
                      }}
                    >
                      {song.title || 'Untitled Track'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: '#b3b3b3',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {song.artist || 'Unknown Artist'}
                    </div>
                  </div>
                  {isCurrent ? (
                    <span
                      className="brand-platform-tag"
                      style={{
                        fontSize: '0.6rem',
                        color: 'var(--primary)',
                        borderColor: 'var(--primary)',
                        background: 'rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      PLAYING
                    </span>
                  ) : (
                    <button
                      className="icon-btn"
                      style={{ width: '24px', height: '24px', opacity: 0.6 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromQueue(idx);
                      }}
                      title="Remove from queue"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: '#b3b3b3' }}>
            <p>Queue is empty.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

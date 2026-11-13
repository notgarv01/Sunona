import React from 'react';
import { ListMusic, X, Trash2 } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  queue: Song[];
  currentSong: Song | null;
  onPlaySong: (song: Song) => void;
  onRemoveFromQueue: (index: number) => void;
  onClearQueue: () => void;
  onClose: () => void;
}

export const QueueDrawer: React.FC<Props> = ({
  queue,
  currentSong,
  onPlaySong,
  onRemoveFromQueue,
  onClearQueue,
  onClose,
}) => {
  return (
    <aside className="app-drawer">
      <div className="drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={18} style={{ color: 'var(--primary, #1ed760)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: '#ffffff' }}>
            Up Next Queue ({queue.length})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClearQueue} title="Clear Queue">
            <Trash2 size={14} />
          </button>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose} title="Close Queue">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="queue-container">
        {queue && queue.length > 0 ? (
          queue.map((song, idx) => {
            if (!song) return null;
            const isCurrent = currentSong?.id === song.id;

            return (
              <div
                key={`${song.id || 'q'}-${idx}`}
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
                      color: isCurrent ? 'var(--primary, #1ed760)' : '#ffffff',
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
                  <span className="brand-platform-tag" style={{ fontSize: '0.6rem' }}>PLAYING</span>
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

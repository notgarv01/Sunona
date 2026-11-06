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
          <ListMusic size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem' }}>
            Up Next Queue ({queue.length})
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClearQueue} title="Clear Queue">
            <Trash2 size={14} />
          </button>
          <button className="icon-btn" style={{ width: '32px', height: '32px' }} onClick={onClose}>
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="queue-container">
        {queue.length > 0 ? (
          queue.map((song, idx) => {
            const isCurrent = currentSong?.id === song.id;

            return (
              <div
                key={`${song.id}-${idx}`}
                className={`queue-item ${isCurrent ? 'active' : ''}`}
                onClick={() => onPlaySong(song)}
              >
                <img src={song.coverUrl} alt={song.title} className="queue-item-thumb" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.86rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {song.artist}
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
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <p>Queue is empty.</p>
          </div>
        )}
      </div>
    </aside>
  );
};

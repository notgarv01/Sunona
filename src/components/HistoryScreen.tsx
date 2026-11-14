import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Heart,
  Trash2,
  ArrowLeft,
  Search,
  Calendar,
  Music,
  ListPlus,
  X
} from 'lucide-react';
import type { Song } from '../types';
import { historyService, type PlayHistoryEvent } from '../services/historyService';

interface HistoryScreenProps {
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onTogglePlay?: () => void;
  onToggleLike: (songId: string) => void;
  onBack: () => void;
  onAddToPlaylist?: (song: Song) => void;
  uiMode?: 'sunona' | 'spotify';
}

export interface GroupedHistoryItem {
  id: string;
  song: Song;
  playCount: number;
  lastPlayedAt: number;
}

function formatDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatDuration(secs?: number): string {
  if (!secs || isNaN(secs)) return '3:30';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay: _onTogglePlay,
  onToggleLike,
  onBack,
  onAddToPlaylist,
  uiMode = 'sunona',
}) => {
  const [events, setEvents] = useState<PlayHistoryEvent[]>(() => historyService.getPlayHistory());
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setEvents(historyService.getPlayHistory());
    };
    window.addEventListener('sunona:history-updated', handleUpdate);
    return () => window.removeEventListener('sunona:history-updated', handleUpdate);
  }, []);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (ev) =>
        ev.song.title.toLowerCase().includes(q) ||
        ev.song.artist.toLowerCase().includes(q) ||
        (ev.song.album && ev.song.album.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  // Group events by date, deduplicating repeated plays on the same day with a playCount (e.g. ×2, ×3)
  const groupedEvents = useMemo(() => {
    const groups: { dateLabel: string; items: GroupedHistoryItem[]; totalPlays: number }[] = [];
    const groupMap = new Map<
      string,
      { items: GroupedHistoryItem[]; itemMap: Map<string, GroupedHistoryItem>; total: { count: number } }
    >();

    for (const ev of filteredEvents) {
      const label = formatDateGroup(ev.playedAt);
      if (!groupMap.has(label)) {
        const itemMap = new Map<string, GroupedHistoryItem>();
        const items: GroupedHistoryItem[] = [];
        const total = { count: 0 };
        groupMap.set(label, { items, itemMap, total });
        groups.push({ dateLabel: label, items, totalPlays: 0 });
      }

      const entry = groupMap.get(label)!;
      entry.total.count += 1;
      const existing = entry.itemMap.get(ev.song.id);
      if (existing) {
        existing.playCount += 1;
        existing.lastPlayedAt = Math.max(existing.lastPlayedAt, ev.playedAt);
      } else {
        const newItem: GroupedHistoryItem = {
          id: ev.id,
          song: ev.song,
          playCount: 1,
          lastPlayedAt: ev.playedAt,
        };
        entry.itemMap.set(ev.song.id, newItem);
        entry.items.push(newItem);
      }
    }

    for (const g of groups) {
      const entry = groupMap.get(g.dateLabel);
      if (entry) {
        g.totalPlays = entry.total.count;
      }
    }

    return groups;
  }, [filteredEvents]);

  const handleClear = () => {
    historyService.clearPlayHistory();
    setEvents([]);
    setShowClearConfirm(false);
  };

  const isSpotify = uiMode === 'spotify';

  return (
    <div
      className={isSpotify ? 'spotify-history-view' : 'app-viewport'}
      style={{
        flex: 1,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: isSpotify ? '#121212' : 'var(--bg-main, #0b0914)',
        color: '#ffffff',
        padding: isSpotify ? '24px 32px 120px' : '24px 32px 100px',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            className="icon-btn"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: isSpotify ? 'linear-gradient(135deg, #1ed760, #169c46)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSpotify ? '#000000' : '#ffffff',
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Listening History
              </h1>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.84rem',
                  color: isSpotify ? '#b3b3b3' : 'var(--text-muted, #94a3b8)',
                }}
              >
                {events.length} {events.length === 1 ? 'play' : 'plays'} all-time • Grouped by date & unique songs
              </p>
            </div>
          </div>
        </div>

        {/* Right Actions: Search + Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {events.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.07)',
                borderRadius: '20px',
                padding: '6px 14px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Search size={15} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.85rem',
                  width: '140px',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {events.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Clear all listening history"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Clear */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              background: '#181818',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '380px',
              width: '90%',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.15rem' }}>Clear Listening History?</h3>
            <p style={{ color: '#b3b3b3', fontSize: '0.88rem', margin: '0 0 20px', lineHeight: 1.5 }}>
              This will remove all {events.length} plays from your listening history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {events.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            textAlign: 'center',
            color: '#b3b3b3',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: isSpotify ? '#1ed760' : 'var(--primary, #6366f1)',
            }}
          >
            <Music size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: '0 0 8px' }}>No listening history yet</h2>
          <p style={{ fontSize: '0.9rem', maxWidth: '360px', margin: 0, lineHeight: 1.5 }}>
            Songs you play in SunoNa will automatically appear here grouped by date!
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <p>No tracks matching "{searchQuery}"</p>
        </div>
      ) : (
        /* Date Grouped Content */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {groupedEvents.map(({ dateLabel, items, totalPlays }) => (
            <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Date Group Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  color: isSpotify ? '#1ed760' : 'var(--primary, #38bdf8)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  letterSpacing: '0.02em',
                }}
              >
                <Calendar size={15} />
                <span>{dateLabel}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontWeight: 500,
                    marginLeft: 'auto',
                  }}
                >
                  {items.length} {items.length === 1 ? 'song' : 'songs'} • {totalPlays} {totalPlays === 1 ? 'play' : 'plays'}
                </span>
              </div>

              {/* Tracks List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {items.map((item, index) => {
                  const isThisCurrent = currentSong?.id === item.song.id;
                  const isThisPlaying = isThisCurrent && isPlaying;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onPlaySong(item.song, items.map((i) => i.song))}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '36px 48px 1fr 160px 75px 36px 36px',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        background: isThisCurrent
                          ? isSpotify
                            ? 'rgba(30, 215, 96, 0.12)'
                            : 'rgba(99, 102, 241, 0.15)'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (!isThisCurrent) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isThisCurrent) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {/* Index / Play Indicator */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isThisCurrent ? (isSpotify ? '#1ed760' : 'var(--primary)') : '#94a3b8',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {isThisPlaying ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'flex-end',
                              gap: '2px',
                              height: '14px',
                            }}
                          >
                            <span style={{ width: '3px', height: '100%', background: isSpotify ? '#1ed760' : 'var(--primary)', borderRadius: '1px' }} />
                            <span style={{ width: '3px', height: '60%', background: isSpotify ? '#1ed760' : 'var(--primary)', borderRadius: '1px' }} />
                            <span style={{ width: '3px', height: '80%', background: isSpotify ? '#1ed760' : 'var(--primary)', borderRadius: '1px' }} />
                          </div>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>

                      {/* Song Cover Art */}
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative',
                          flexShrink: 0,
                          background: '#1e1e1e',
                        }}
                      >
                        <img
                          src={item.song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100'}
                          alt={item.song.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100';
                          }}
                        />
                      </div>

                      {/* Title & Artist with Multi-Play Badge */}
                      <div style={{ overflow: 'hidden', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.92rem',
                              fontWeight: 600,
                              color: isThisCurrent ? (isSpotify ? '#1ed760' : 'var(--primary)') : '#ffffff',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {item.song.title}
                          </span>
                          {item.playCount > 1 && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '10px',
                                background: isSpotify ? 'rgba(30, 215, 96, 0.18)' : 'rgba(99, 102, 241, 0.22)',
                                color: isSpotify ? '#1ed760' : 'var(--primary, #818cf8)',
                                border: isSpotify ? '1px solid rgba(30, 215, 96, 0.35)' : '1px solid rgba(99, 102, 241, 0.4)',
                                letterSpacing: '0.02em',
                                flexShrink: 0,
                              }}
                              title={`Played ${item.playCount} times on ${dateLabel}`}
                            >
                              ×{item.playCount}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: isSpotify ? '#b3b3b3' : 'var(--text-muted, #94a3b8)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginTop: '2px',
                          }}
                        >
                          {item.song.artist}
                        </div>
                      </div>

                      {/* Album */}
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: isSpotify ? '#b3b3b3' : 'var(--text-muted, #94a3b8)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.song.album || 'Single'}
                      </div>

                      {/* Duration */}
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: '#94a3b8',
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatDuration(item.song.duration)}
                      </div>

                      {/* Add to Playlist Action */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddToPlaylist) {
                            onAddToPlaylist(item.song);
                          }
                        }}
                      >
                        <button
                          className="icon-btn"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'transparent',
                            border: 'none',
                            color: '#b3b3b3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#ffffff';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#b3b3b3';
                            e.currentTarget.style.background = 'transparent';
                          }}
                          title="Add to Playlist"
                        >
                          <ListPlus size={16} />
                        </button>
                      </div>

                      {/* Like Action */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(item.song.id);
                        }}
                      >
                        <Heart
                          size={16}
                          color={item.song.isLiked ? (isSpotify ? '#1ed760' : 'var(--accent, #ec4899)') : '#b3b3b3'}
                          fill={item.song.isLiked ? (isSpotify ? '#1ed760' : 'var(--accent, #ec4899)') : 'none'}
                          style={{ cursor: 'pointer', transition: 'transform 0.15s ease' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

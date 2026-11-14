import React, { useState } from 'react';
import { X, Play, MoreHorizontal, Trash2, ListPlus } from 'lucide-react';
import type { Song, Playlist } from '../types';
import { SpotifySongContextMenu } from './SpotifySongContextMenu';

export interface SpotifyQueuePanelProps {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  playlists: Playlist[];
  recentlyPlayed?: Song[];
  contextTitle?: string;
  onPlaySong: (song: Song) => void;
  onTogglePlay: () => void;
  onClose: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist: (song: Song, playlistId?: string) => void;
  onRemoveFromQueue?: (index: number) => void;
  onClearQueue?: () => void;
  onSaveQueueToPlaylist?: () => void;
  onAddToQueue?: (song: Song) => void;
  onSelectArtist?: (artistName: string) => void;
  onOpenSleepTimer?: () => void;
  onSearchMore?: () => void;
}

export const SpotifyQueuePanel: React.FC<SpotifyQueuePanelProps> = ({
  currentSong,
  queue,
  isPlaying: _isPlaying,
  playlists,
  recentlyPlayed = [],
  contextTitle,
  onPlaySong,
  onTogglePlay,
  onClose,
  onToggleLike,
  onAddToPlaylist,
  onRemoveFromQueue,
  onClearQueue,
  onSaveQueueToPlaylist,
  onAddToQueue,
  onSelectArtist,
  onOpenSleepTimer,
  onSearchMore,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'recent'>('queue');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    song: Song;
    queueIndex?: number;
  } | null>(null);
  const [creditsSong, setCreditsSong] = useState<Song | null>(null);

  // Dynamic context title: matching screenshot 23be7311 "Next from: Dilfek"
  const resolvedContextTitle =
    contextTitle || currentSong?.album || 'Dilfek';

  // Upcoming queue items (excluding the currently playing song)
  const upcomingQueue = queue.filter((s, idx) => {
    if (currentSong && s.id === currentSong.id && idx === 0) return false;
    return true;
  });

  // Support URL param ?menu=1 for automated visual verification of the context menu
  React.useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('menu') === '1') {
        const targetSong = upcomingQueue[0] || currentSong;
        if (targetSong) {
          setContextMenu({
            x: window.innerWidth - 325,
            y: 280,
            song: targetSong,
            queueIndex: 0,
          });
        }
      }
    } catch {}
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, song: Song, queueIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      song,
      queueIndex,
    });
  };

  const handleMoreButtonClick = (e: React.MouseEvent, song: Song, queueIndex?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      x: rect.left - 240, // Anchor to the left of the 3-dots button
      y: rect.top,
      song,
      queueIndex,
    });
  };

  return (
    <aside className="sp-right-panel sp-queue-panel-v2" aria-label="Queue Panel">
      {/* ── Top Tabs Bar (Screenshot 23be7311) ── */}
      <div className="sp-qp-tabs">
        <div className="sp-qp-tabs-left">
          <button
            className={`sp-qp-tab ${activeTab === 'queue' ? 'active' : ''}`}
            onClick={() => setActiveTab('queue')}
          >
            <span>Queue</span>
            {activeTab === 'queue' && <div className="sp-qp-tab-indicator" />}
          </button>
          <button
            className={`sp-qp-tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            <span>Recently played</span>
            {activeTab === 'recent' && <div className="sp-qp-tab-indicator" />}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onSaveQueueToPlaylist && queue.length > 0 && (
            <button
              className="sp-qp-close-btn"
              onClick={onSaveQueueToPlaylist}
              title="Save Queue to Playlist"
              aria-label="Save Queue to Playlist"
            >
              <ListPlus size={18} />
            </button>
          )}
          {onClearQueue && (
            <button
              className="sp-qp-close-btn"
              onClick={onClearQueue}
              title="Clear Queue"
              aria-label="Clear Queue"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            className="sp-qp-close-btn"
            onClick={onClose}
            title="Close Queue"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Tab 1: Queue Content ── */}
      {activeTab === 'queue' && (
        <div className="sp-qp-content">
          {/* Section 1: Now playing */}
          <div className="sp-qp-section">
            <h3 className="sp-qp-section-heading">Now playing</h3>

            {currentSong ? (
              <div
                className={`sp-qp-row now-playing-row ${
                  contextMenu?.song?.id === currentSong.id ? 'menu-open' : ''
                }`}
                onContextMenu={(e) => handleRowContextMenu(e, currentSong)}
              >
                <div className="sp-qp-cover-wrap">
                  <img
                    src={currentSong.coverUrl || '/images/dilfek-cover.png'}
                    alt={currentSong.title}
                    className="sp-qp-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/dilfek-cover.png';
                    }}
                  />
                  <div
                    className="sp-qp-cover-overlay"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay();
                    }}
                  >
                    <Play size={16} fill="#ffffff" color="#ffffff" />
                  </div>
                </div>

                <div className="sp-qp-meta">
                  <span className="sp-qp-title sp-green-title" title={currentSong.title}>
                    {currentSong.title}
                  </span>
                  <span className="sp-qp-artist" title={currentSong.artist}>
                    {currentSong.artist}
                  </span>
                </div>

                <button
                  className="sp-qp-more-btn"
                  onClick={(e) => handleMoreButtonClick(e, currentSong)}
                  title={`More options for ${currentSong.title}`}
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            ) : (
              <div className="sp-qp-empty">
                <p>No track currently playing</p>
              </div>
            )}
          </div>

          {/* Section 2: Next from: <Context> */}
          <div className="sp-qp-section">
            <h3 className="sp-qp-section-heading">
              Next from: {resolvedContextTitle}
            </h3>

            {upcomingQueue.length > 0 ? (
              <div className="sp-qp-list">
                {upcomingQueue.map((song, idx) => {
                  const isMenuOpen = contextMenu?.song?.id === song.id;
                  const realQueueIndex = queue.findIndex((s) => s.id === song.id);

                  return (
                    <div
                      key={song.id + idx}
                      className={`sp-qp-row ${isMenuOpen ? 'menu-open' : ''}`}
                      onContextMenu={(e) => handleRowContextMenu(e, song, realQueueIndex)}
                      onClick={() => onPlaySong(song)}
                    >
                      <div className="sp-qp-cover-wrap">
                        <img
                          src={song.coverUrl || '/images/dilfek-cover.png'}
                          alt={song.title}
                          className="sp-qp-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/dilfek-cover.png';
                          }}
                        />
                        <div
                          className="sp-qp-cover-overlay"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlaySong(song);
                          }}
                        >
                          <Play size={14} fill="#ffffff" color="#ffffff" />
                        </div>
                      </div>

                      <div className="sp-qp-meta">
                        <span className="sp-qp-title" title={song.title}>
                          {song.title}
                        </span>
                        <span className="sp-qp-artist" title={song.artist}>
                          {song.artist}
                        </span>
                      </div>

                      <button
                        className="sp-qp-more-btn"
                        onClick={(e) => handleMoreButtonClick(e, song, realQueueIndex)}
                        title={`More options for ${song.title}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="sp-qp-empty-queue">
                <p>Your queue is empty</p>
                {onSearchMore && (
                  <button className="sp-qp-search-btn" onClick={onSearchMore}>
                    Search for something new
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 2: Recently Played Content ── */}
      {activeTab === 'recent' && (
        <div className="sp-qp-content">
          <div className="sp-qp-section">
            <h3 className="sp-qp-section-heading">Recently played</h3>

            {recentlyPlayed.length > 0 ? (
              <div className="sp-qp-list">
                {recentlyPlayed.map((song, idx) => {
                  const isMenuOpen = contextMenu?.song?.id === song.id;

                  return (
                    <div
                      key={'recent-' + song.id + idx}
                      className={`sp-qp-row ${isMenuOpen ? 'menu-open' : ''}`}
                      onContextMenu={(e) => handleRowContextMenu(e, song)}
                      onClick={() => onPlaySong(song)}
                    >
                      <div className="sp-qp-cover-wrap">
                        <img
                          src={song.coverUrl || '/images/dilfek-cover.png'}
                          alt={song.title}
                          className="sp-qp-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/dilfek-cover.png';
                          }}
                        />
                        <div
                          className="sp-qp-cover-overlay"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlaySong(song);
                          }}
                        >
                          <Play size={14} fill="#ffffff" color="#ffffff" />
                        </div>
                      </div>

                      <div className="sp-qp-meta">
                        <span className="sp-qp-title" title={song.title}>
                          {song.title}
                        </span>
                        <span className="sp-qp-artist" title={song.artist}>
                          {song.artist}
                        </span>
                      </div>

                      <button
                        className="sp-qp-more-btn"
                        onClick={(e) => handleMoreButtonClick(e, song)}
                        title={`More options for ${song.title}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="sp-qp-empty-queue">
                <p>No recently played tracks found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Spotify Floating Context Menu (Screenshot c3da2f14) ── */}
      {contextMenu && (
        <SpotifySongContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          song={contextMenu.song}
          queueIndex={contextMenu.queueIndex}
          isInQueue={contextMenu.queueIndex !== undefined}
          playlists={playlists}
          isLiked={contextMenu.song.isLiked}
          onClose={() => setContextMenu(null)}
          onToggleLike={onToggleLike}
          onAddToPlaylist={onAddToPlaylist}
          onAddToQueue={onAddToQueue}
          onRemoveFromQueue={onRemoveFromQueue}
          onExcludeTasteProfile={(s) => {
            console.log('Excluded from taste profile:', s.title);
          }}
          onSetSleepTimer={(mins) => {
            if (onOpenSleepTimer) onOpenSleepTimer();
            console.log('Sleep timer set to:', mins);
          }}
          onGoToRadio={(s) => {
            onPlaySong(s);
          }}
          onGoToArtist={(art) => {
            if (onSelectArtist) onSelectArtist(art);
          }}
          onViewCredits={(s) => {
            setCreditsSong(s);
          }}
        />
      )}

      {/* ── Spotify View Credits Modal ── */}
      {creditsSong && (
        <div className="sp-credits-modal-backdrop" onClick={() => setCreditsSong(null)}>
          <div className="sp-credits-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-credits-modal-header">
              <h2>Credits</h2>
              <button
                className="sp-credits-close-btn"
                onClick={() => setCreditsSong(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="sp-credits-modal-body">
              <div className="sp-credits-track-title">{creditsSong.title}</div>
              <div className="sp-credits-track-artist">{creditsSong.artist}</div>

              <div className="sp-credits-section">
                <span className="sp-credits-role">Performed by</span>
                <span className="sp-credits-names">{creditsSong.artist}</span>
              </div>

              <div className="sp-credits-section">
                <span className="sp-credits-role">Written by</span>
                <span className="sp-credits-names">{creditsSong.artist}</span>
              </div>

              <div className="sp-credits-section">
                <span className="sp-credits-role">Produced by</span>
                <span className="sp-credits-names">Spotify Original / SunoNa Production</span>
              </div>

              <div className="sp-credits-section">
                <span className="sp-credits-role">Source</span>
                <span className="sp-credits-names">SunoNa Master Audio Engine (Hi-Res FLAC)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

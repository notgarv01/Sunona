import React, { useState } from 'react';
import {
  Play,
  Pause,
  Clock,
  MoreHorizontal,
  ArrowDownCircle,
  Search,
  ArrowLeft,
  Shuffle,
  CheckCircle,
  PlusCircle,
} from 'lucide-react';
import type { Playlist, Song } from '../types';
import { SwipeableSongRow } from './SwipeableSongRow';

interface Props {
  playlist: Playlist;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onTogglePlay: () => void;
  onBack: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onRemoveSong?: (playlistId: string, songId: string, index?: number) => void;
}

export const SpotifyPlaylistView: React.FC<Props> = ({
  playlist,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onBack,
  onToggleLike,
  onAddToPlaylist: _onAddToPlaylist,
  onRemoveSong,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  const isCurrentPlaylistPlaying =
    isPlaying &&
    currentSong &&
    playlist.songs.some((s) => s.id === currentSong.id);

  const isLikedSongs =
    playlist.id === 'liked-songs' ||
    playlist.title.toLowerCase().includes('liked');

  const totalDurationSecs = playlist.songs.reduce((acc, s) => acc + (s.duration || 210), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);
  const durationText =
    totalHours > 0
      ? `${totalHours} hr ${totalMins} min`
      : `${totalMins} min`;

  const filteredSongs = playlist.songs.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q) ||
      (s.album || '').toLowerCase().includes(q)
    );
  });

  const handleBigPlay = () => {
    if (playlist.songs.length === 0) return;
    if (isCurrentPlaylistPlaying) {
      onTogglePlay();
    } else {
      onPlaySong(playlist.songs[0], playlist.songs);
    }
  };

  const formatDuration = (secs?: number) => {
    if (!secs || isNaN(secs)) return '3:30';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className={`spotify-playlist-viewport ${isLikedSongs ? 'is-liked-theme' : ''}`}>
      {/* Top Back Nav Button & Header */}
      <div className="spotify-pl-header-bar">
        <button className="spotify-pl-back-btn" onClick={onBack} title="Go back">
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Hero Header Matching Screenshots 452 & 453 */}
      <div className="spotify-pl-hero">
        {isLikedSongs ? (
          <div className="spotify-pl-liked-hero-box">
            <svg width="84" height="84" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        ) : (
          <div className="spotify-pl-cover-box">
            <img
              src={playlist.coverUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80'}
              alt={playlist.title}
              className="spotify-pl-cover-img"
            />
          </div>
        )}

        <div className="spotify-pl-info">
          <span className="spotify-pl-tag">
            {isLikedSongs ? 'Playlist' : playlist.isCurated ? 'Public Playlist' : 'Playlist'}
          </span>
          <h1 className="spotify-pl-title">{playlist.title}</h1>
          {playlist.description && (
            <p className="spotify-pl-desc">{playlist.description}</p>
          )}
          <div className="spotify-pl-creator-row">
            <span className="spotify-pl-author-bold">Garvgupta</span>
            <span className="spotify-pl-dot">•</span>
            <span>{playlist.songs.length} songs</span>
            <span className="spotify-pl-dot">•</span>
            <span className="spotify-pl-time-dim">{durationText}</span>
          </div>
        </div>
      </div>

      {/* Action Transport Bar */}
      <div className="spotify-pl-action-bar">
        <button
          className="spotify-pl-big-play-btn"
          onClick={handleBigPlay}
          title={isCurrentPlaylistPlaying ? 'Pause' : 'Play'}
        >
          {isCurrentPlaylistPlaying ? (
            <Pause size={26} fill="#000000" />
          ) : (
            <Play size={26} fill="#000000" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button className="spotify-pl-icon-action" title="Enable shuffle">
          <Shuffle size={22} />
        </button>

        <button className="spotify-pl-icon-action checked" title="Saved to Your Library">
          <CheckCircle size={24} color="var(--accent, #1ed760)" />
        </button>

        <button className="spotify-pl-icon-action" title="Download">
          <ArrowDownCircle size={24} />
        </button>

        <button className="spotify-pl-icon-action" title="More options">
          <MoreHorizontal size={24} />
        </button>

        <div className="spotify-pl-right-actions">
          {isSearchActive ? (
            <div className="spotify-pl-search-inline">
              <Search size={15} style={{ opacity: 0.6 }} />
              <input
                type="text"
                placeholder="Search in playlist"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                autoFocus
              />
              <button
                className="spotify-pl-search-close"
                onClick={() => {
                  setIsSearchActive(false);
                  setFilterQuery('');
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              className="spotify-pl-icon-action"
              onClick={() => setIsSearchActive(true)}
              title="Search in playlist"
            >
              <Search size={18} />
            </button>
          )}
          <div className="spotify-pl-sort-dropdown">
            <span>Recently added</span>
          </div>
        </div>
      </div>

      {/* Spotify Tracklist Table */}
      <div className="spotify-tracklist-table">
        <div className="spotify-tl-header-row">
          <div className="spotify-tl-col-index">#</div>
          <div className="spotify-tl-col-title">Title</div>
          <div className="spotify-tl-col-album">Album</div>
          <div className="spotify-tl-col-date">Date added</div>
          <div className="spotify-tl-col-duration">
            <Clock size={16} />
          </div>
        </div>

        <div className="spotify-tl-rows">
          {filteredSongs.map((song, idx) => {
            const isThisPlaying = currentSong?.id === song.id && isPlaying;
            const isThisActive = currentSong?.id === song.id;

            return (
              <SwipeableSongRow
                key={`${song.id}_${idx}`}
                onDelete={() => onRemoveSong?.(playlist.id, song.id, idx)}
                deleteLabel="Remove"
              >
                <div
                  className={`spotify-tl-row ${isThisActive ? 'active' : ''}`}
                  onDoubleClick={() => onPlaySong(song, playlist.songs)}
                >
                  {/* Index / Play / Animated Equalizer */}
                  <div className="spotify-tl-col-index">
                    {isThisPlaying ? (
                      <div className="spotify-equalizer-bars">
                        <span className="eq-bar bar-1" />
                        <span className="eq-bar bar-2" />
                        <span className="eq-bar bar-3" />
                      </div>
                    ) : (
                      <>
                        <span className="spotify-tl-idx-num">{idx + 1}</span>
                        <button
                          className="spotify-tl-idx-play"
                          onClick={() => onPlaySong(song, playlist.songs)}
                          title={`Play ${song.title}`}
                        >
                          <Play size={14} fill="#ffffff" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Title + Cover + Artist */}
                  <div className="spotify-tl-col-title">
                    <img
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="spotify-tl-thumb"
                    />
                    <div className="spotify-tl-title-wrap">
                      <span
                        className={`spotify-tl-track-name ${isThisActive ? 'is-playing' : ''}`}
                        onClick={() => onPlaySong(song, playlist.songs)}
                      >
                        {song.title}
                      </span>
                      <span className="spotify-tl-track-artist">{song.artist}</span>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="spotify-tl-col-album">
                    <span>{song.album || song.title}</span>
                  </div>

                  {/* Date Added */}
                  <div className="spotify-tl-col-date">
                    <span>Oct 14, 2023</span>
                  </div>

                  {/* Duration + Plus Action */}
                  <div className="spotify-tl-col-duration">
                    <button
                      className={`spotify-tl-heart-btn ${song.isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      title={song.isLiked ? 'Remove from Liked' : 'Save to Liked'}
                    >
                      <PlusCircle size={16} />
                    </button>
                    <span className="spotify-tl-time">{formatDuration(song.duration)}</span>
                    <button className="spotify-tl-more-btn" title="More options">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </SwipeableSongRow>
            );
          })}
        </div>
      </div>
    </div>
  );
};

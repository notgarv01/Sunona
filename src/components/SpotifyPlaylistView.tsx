import React, { useState, useRef } from 'react';
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
  Camera,
} from 'lucide-react';
import type { Playlist, Song, PlaybackSource } from '../types';
import type { UserProfile } from '../services/authService';
import { playlistService, isInvalidCoverUrl } from '../services/playlistService';
import { SwipeableSongRow } from './SwipeableSongRow';

interface Props {
  playlist: Playlist;
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, customQueue?: Song[], contextMode?: 'playlist' | 'radio', seekTime?: number, sourceInfo?: PlaybackSource) => void;
  onTogglePlay: () => void;
  onBack: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onRemoveSong?: (playlistId: string, songId: string, index?: number) => void;
  user?: UserProfile | null;
}

export const SpotifyPlaylistView: React.FC<Props> = ({
  playlist,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onBack,
  onToggleLike,
  onAddToPlaylist,
  onRemoveSong,
  user,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; song: Song } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customCover, setCustomCover] = useState<string | null>(null);
  const [liveAlbumSongs, setLiveAlbumSongs] = useState<Song[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    if (playlist.isCurated && (!playlist.songs || playlist.songs.length === 0)) {
      fetch(`/api/search?q=${encodeURIComponent(playlist.title)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            setLiveAlbumSongs(data.results);
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [playlist.id, playlist.title, playlist.isCurated, playlist.songs]);

  const effectiveSongs = playlist.songs && playlist.songs.length > 0 ? playlist.songs : liveAlbumSongs;

  const validSongCover = effectiveSongs.find((s) => !isInvalidCoverUrl(s.coverUrl))?.coverUrl;
  const cleanCoverUrl = !isInvalidCoverUrl(playlist.coverUrl)
    ? playlist.coverUrl
    : (validSongCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80');

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Please choose an image under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setCustomCover(base64);
        playlistService.updatePlaylistCover(playlist.id, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    const handleWindowClick = () => setContextMenu(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const isCurrentPlaylistPlaying =
    isPlaying &&
    currentSong &&
    effectiveSongs.some((s) => s.id === currentSong.id);

  const isLikedSongs =
    playlist.id === 'liked-songs' ||
    playlist.title.toLowerCase().includes('liked');

  const totalDurationSecs = effectiveSongs.reduce((acc, s) => acc + (s.duration || 210), 0);
  const totalHours = Math.floor(totalDurationSecs / 3600);
  const totalMins = Math.floor((totalDurationSecs % 3600) / 60);
  const durationText =
    totalHours > 0
      ? `${totalHours} hr ${totalMins} min`
      : `${totalMins} min`;

  const filteredSongs = effectiveSongs.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.artist || '').toLowerCase().includes(q) ||
      (s.album || '').toLowerCase().includes(q)
    );
  });

  const handleBigPlay = () => {
    if (effectiveSongs.length === 0) return;
    if (isCurrentPlaylistPlaying) {
      onTogglePlay();
    } else {
      onPlaySong(effectiveSongs[0], effectiveSongs, 'playlist', undefined, { type: 'playlist', id: playlist.id, name: playlist.title });
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
          <div
            className={`spotify-pl-cover-box ${!isLikedSongs && !playlist.isCurated ? 'editable' : ''}`}
            onClick={() => {
              if (!isLikedSongs && !playlist.isCurated) {
                fileInputRef.current?.click();
              }
            }}
            title={!isLikedSongs && !playlist.isCurated ? 'Click to choose custom photo' : undefined}
            style={{ position: 'relative', cursor: !isLikedSongs && !playlist.isCurated ? 'pointer' : 'default' }}
          >
            <img
              src={customCover || cleanCoverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
              alt={playlist.title}
              className="spotify-pl-cover-img"
              onLoad={(e) => {
                const img = e.target as HTMLImageElement;
                if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                  img.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                }
              }}
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
              }}
            />
            {!isLikedSongs && !playlist.isCurated && (
              <div className="spotify-pl-cover-hover-overlay">
                <Camera size={40} color="#ffffff" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Choose photo</span>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              style={{ display: 'none' }}
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
            <span className="spotify-pl-author-bold">
              {playlist.isCurated ? 'SunoNa Curated' : (user?.displayName || 'My Library')}
            </span>
            <span className="spotify-pl-dot">•</span>
            <span>{effectiveSongs.length} songs</span>
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
                  onClick={() => onPlaySong(song, effectiveSongs, 'playlist', undefined, { type: 'playlist', id: playlist.id, name: playlist.title })}
                  onDoubleClick={() => onPlaySong(song, effectiveSongs, 'playlist', undefined, { type: 'playlist', id: playlist.id, name: playlist.title })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      x: Math.min(e.clientX, window.innerWidth - 220),
                      y: Math.min(e.clientY, window.innerHeight - 200),
                      song,
                    });
                  }}
                >
                  {/* Index / Play / Official Extracted Animated Equalizer */}
                  <div className="spotify-tl-col-index">
                    {isThisPlaying ? (
                      <img
                        src="/images/equaliser-animated-green.gif"
                        alt="Playing"
                        width={14}
                        height={14}
                        style={{ display: 'inline-block', verticalAlign: 'middle' }}
                      />
                    ) : (
                      <>
                        <span className="spotify-tl-idx-num">{idx + 1}</span>
                        <button
                          className="spotify-tl-idx-play"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlaySong(song, effectiveSongs, 'playlist', undefined, { type: 'playlist', id: playlist.id, name: playlist.title });
                          }}
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
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="spotify-tl-thumb"
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                          img.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                        }
                      }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="spotify-tl-title-wrap">
                      <span
                        className={`spotify-tl-track-name ${isThisActive ? 'is-playing' : ''}`}
                        onClick={() => onPlaySong(song, effectiveSongs)}
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

      {/* Floating Spotify Dark Context Menu */}
      {contextMenu && (
        <div
          className="spotify-context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: '#282828',
            borderRadius: 6,
            padding: 4,
            boxShadow: '0 16px 32px rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 200,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="context-menu-item"
            style={{ padding: '10px 12px', fontSize: 13, color: '#fff', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              onAddToPlaylist?.(contextMenu.song);
              setContextMenu(null);
            }}
          >
            ➕ Add to playlist
          </div>
          <div
            className="context-menu-item"
            style={{ padding: '10px 12px', fontSize: 13, color: '#fff', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              onToggleLike(contextMenu.song.id);
              setContextMenu(null);
            }}
          >
            {contextMenu.song.isLiked ? '💔 Remove from Liked Songs' : '💚 Save to Liked Songs'}
          </div>
          <div
            className="context-menu-item"
            style={{ padding: '10px 12px', fontSize: 13, color: '#fff', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => {
              navigator.clipboard?.writeText?.(`${contextMenu.song.title} by ${contextMenu.song.artist}`);
              setContextMenu(null);
            }}
          >
            🔗 Copy Song Info
          </div>
        </div>
      )}
    </div>
  );
};

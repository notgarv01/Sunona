import React from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  Shuffle,
  Heart,
  ListPlus,
  Music,
  Disc,
} from 'lucide-react';
import type { Album, Song, PlaybackSource } from '../types';

interface Props {
  album: Album;
  currentSong: Song | null;
  isPlaying: boolean;
  songsState?: Song[];
  onPlaySong: (song: Song, customQueue?: Song[], contextMode?: 'playlist' | 'radio', seekTime?: number, sourceInfo?: PlaybackSource) => void;
  onTogglePlay: () => void;
  onBack: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

export const AlbumScreen: React.FC<Props> = ({
  album,
  currentSong,
  isPlaying,
  songsState = [],
  onPlaySong,
  onTogglePlay,
  onBack,
  onToggleLike,
  onAddToPlaylist,
}) => {
  const [songsList, setSongsList] = React.useState<Song[]>(album.songs || []);
  const [isLoadingTracks, setIsLoadingTracks] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    if (!album.songs || album.songs.length === 0) {
      setIsLoadingTracks(true);
      fetch(`/api/search?q=${encodeURIComponent(album.title + ' ' + (album.artist || ''))}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isMounted) return;
          if (data && Array.isArray(data.results) && data.results.length > 0) {
            setSongsList(
              data.results.map((r: any) => ({
                id: r.id,
                title: r.title,
                artist: r.artist || album.artist,
                album: album.title,
                duration: r.duration || 210,
                coverUrl: r.coverUrl || album.coverUrl,
                audioUrl: '',
                views: r.views || '1M views',
                likes: '100K',
                isLiked: false,
                lyrics: [],
              }))
            );
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoadingTracks(false);
        });
    } else {
      setSongsList(album.songs);
    }
    return () => {
      isMounted = false;
    };
  }, [album.id, album.title, album.artist, album.songs]);

  const totalDurationSeconds = songsList.reduce((acc, s) => acc + (s.duration || 210), 0);
  const totalMinutes = Math.floor(totalDurationSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const formattedDuration =
    totalHours > 0
      ? `${totalHours} hr ${totalMinutes % 60} min`
      : `${totalMinutes} min`;

  const isAlbumPlaying =
    isPlaying &&
    currentSong &&
    songsList.some((s) => s.id === currentSong.id);

  const handlePlayAll = () => {
    if (songsList.length === 0) return;
    if (isAlbumPlaying) {
      onTogglePlay();
    } else {
      onPlaySong(songsList[0], songsList, 'playlist', undefined, { type: 'album', id: album.id, name: album.title });
    }
  };

  const handleShufflePlay = () => {
    if (songsList.length === 0) return;
    const randomIndex = Math.floor(Math.random() * songsList.length);
    onPlaySong(songsList[randomIndex], songsList, 'playlist', undefined, { type: 'album', id: album.id, name: album.title });
  };

  const formatSongDuration = (secs?: number) => {
    if (!secs || isNaN(secs)) return '3:30';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isSongLiked = (song: Song) => {
    const live = songsState.find((s) => s.id === song.id);
    return live ? !!live.isLiked : !!song.isLiked;
  };

  return (
    <div className="app-viewport playlist-viewport album-viewport">
      {/* Top Back Nav Button */}
      <div className="playlist-top-bar">
        <button
          className="back-btn"
          onClick={onBack}
          title="Go back"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Album Hero Showcase */}
      <div
        className="playlist-hero album-hero"
        style={{
          background: `linear-gradient(180deg, ${album.color || '#38bdf8'}18 0%, rgba(255, 255, 255, 0.02) 100%)`,
          borderColor: `${album.color || '#38bdf8'}33`,
        }}
      >
        <div className="playlist-hero-cover-wrap album-hero-cover-wrap">
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.title}
              className="playlist-hero-cover"
            />
          ) : (
            <div className="playlist-hero-cover-fallback">
              <Disc size={64} style={{ opacity: 0.4 }} />
            </div>
          )}
        </div>

        <div className="playlist-hero-info">
          <span
            className="playlist-hero-badge"
            style={{ color: album.color || 'var(--primary)' }}
          >
            Album • {album.year}
          </span>

          <div className="playlist-title-row">
            <h1 className="playlist-hero-title">{album.title}</h1>
          </div>

          <p
            className="playlist-hero-desc"
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-main, #f8fafc)',
              fontWeight: 600,
            }}
          >
            {album.artist}
          </p>

          <div className="playlist-meta-row">
            <span>
              <strong>{songsList.length}</strong>{' '}
              {songsList.length === 1 ? 'song' : 'songs'}
            </span>
            <span className="meta-dot">•</span>
            <span>{formattedDuration}</span>
            <span className="meta-dot">•</span>
            <span>{album.year}</span>
          </div>

          {/* Action transport controls */}
          <div className="playlist-actions-row">
            <button
              className="playlist-play-all-btn"
              onClick={handlePlayAll}
              disabled={songsList.length === 0}
              title={isAlbumPlaying ? 'Pause Album' : 'Play Album'}
            >
              {isAlbumPlaying ? (
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
              disabled={songsList.length === 0}
              title="Shuffle Play Album"
            >
              <Shuffle size={16} />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Album Track List Section */}
      <div className="playlist-tracklist-section">
        <div className="playlist-table-header">
          <div className="col-index">#</div>
          <div className="col-thumb-spacer" />
          <div className="col-title">Title</div>
          <div className="col-album">Album</div>
          <div className="col-duration">Duration</div>
          <div className="col-actions-spacer" />
        </div>

        {isLoadingTracks ? (
          <div className="playlist-empty-state">
            <div className="playlist-empty-icon-wrap">
              <Disc size={40} className="spinning" style={{ color: 'var(--primary)' }} />
            </div>
            <h3>Loading verified tracks from YouTube...</h3>
          </div>
        ) : songsList.length === 0 ? (
          <div className="playlist-empty-state">
            <div className="playlist-empty-icon-wrap">
              <Music size={40} style={{ color: 'var(--primary)' }} />
            </div>
            <h3>No tracks found in this album</h3>
          </div>
        ) : (
          <div className="song-list-table">
            {songsList.map((song, idx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isCurrent = currentSong?.id === song.id;
              const liked = isSongLiked(song);

              return (
                <div
                  key={`${song.id}_${idx}`}
                  className={`song-row ${isCurrent ? 'playing' : ''}`}
                  onClick={() => onPlaySong(song, songsList, 'playlist', undefined, { type: 'album', id: album.id, name: album.title })}
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
                    src={song.coverUrl || album.coverUrl}
                    alt={song.title}
                    className="song-row-thumb"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = album.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                    }}
                  />

                  <div className="song-row-main">
                    <div className="song-row-title">{song.title}</div>
                    <div className="song-row-artist">{song.artist}</div>
                  </div>

                  <div className="song-row-album">{song.album || album.title}</div>

                  <span className="song-row-duration">
                    {formatSongDuration(song.duration)}
                  </span>

                  <div className="song-row-actions">
                    <Heart
                      size={16}
                      className={`like-btn ${liked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id);
                      }}
                      fill={liked ? 'var(--accent)' : 'none'}
                      color={liked ? 'var(--accent)' : 'currentColor'}
                      style={{ cursor: 'pointer' }}
                    />

                    {onAddToPlaylist && (
                      <button
                        className="icon-btn add-to-pl-row-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlaylist(song);
                        }}
                        title="Add to Playlist"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--border-glass)',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <ListPlus size={15} />
                      </button>
                    )}
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

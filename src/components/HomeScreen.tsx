import React, { useState } from 'react';
import { Play, Pause, Heart, Download, ListPlus } from 'lucide-react';
import type { Song, Album, Playlist, DailyDiscoverItem } from '../types';
import type { TasteProfile } from '../services/historyService';
import { MOODS } from '../data/musicData';

interface Props {
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  dailyDiscover?: DailyDiscoverItem[];
  listenAgain?: Song[];
  similarShelf?: { title: string; songs: Song[] } | null;
  mostPlayed?: { song: Song; playCount: number; genreType: string }[];
  tasteProfile?: TasteProfile;
  favoriteArtistShelf?: { title: string; subtitle: string; songs: Song[] } | null;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onToggleLike: (songId: string) => void;
  onSelectMood?: (moodId: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

export const HomeScreen: React.FC<Props> = ({
  songs,
  albums,
  playlists,
  currentSong,
  isPlaying,
  dailyDiscover = [],
  listenAgain = [],
  similarShelf,
  mostPlayed = [],
  tasteProfile,
  favoriteArtistShelf,
  onPlaySong,
  onToggleLike,
  onSelectMood,
  onSelectPlaylist,
  onSelectAlbum,
  onAddToPlaylist,
}) => {
  const [activeMood, setActiveMood] = useState<string>('chill');
  const activeMoodItem = MOODS.find((m) => m.id === activeMood);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatViews = (v?: string) => {
    if (!v) return '';
    return v.toLowerCase().includes('view') ? v : `${v} views`;
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="app-viewport">
      {/* Editorial Header with Taste Profile */}
      <div className="section-hero">
        <div className="hero-header-row">
          <div>
            <div className="hero-greeting">{getGreeting()}</div>
            <h1 className="hero-title">Listen Now</h1>
          </div>

          {tasteProfile && tasteProfile.totalPlays > 0 && (
            <div className="hero-taste-badge" title="Your Personalized Taste Affinity">
              <span className="hero-taste-dot" />
              <span>
                Taste Affinity: <strong>{tasteProfile.primaryGenre}</strong>
                {tasteProfile.favoriteArtist && (
                  <> • Top Artist: <strong>{tasteProfile.favoriteArtist}</strong> ({tasteProfile.favoriteArtistPlays} plays)</>
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mood & Activity Filters */}
      <div className="mood-filter-wrapper">
        <div className="mood-chips-scroll">
          {MOODS.map((m) => (
            <div
              key={m.id}
              className={`mood-chip ${activeMood === m.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMood(m.id);
                onSelectMood?.(m.id);
              }}
              title={m.tagline}
            >
              <span className="mood-chip-emoji">{m.emoji}</span>
              <span>{m.name}</span>
            </div>
          ))}
        </div>

        {/* Active Mood Showcase Banner */}
        {activeMoodItem && (
          <div className="active-mood-spotlight">
            <div className="mood-spotlight-left">
              <span className="mood-spotlight-emoji">{activeMoodItem.emoji}</span>
              <div className="mood-spotlight-text">
                <div className="mood-spotlight-title">
                  <span>Vibe: <strong>{activeMoodItem.name}</strong></span>
                  <span className="mood-status-pill">Active Mood</span>
                </div>
                <div className="mood-spotlight-tagline">{activeMoodItem.tagline}</div>
              </div>
            </div>
            <button
              className="mood-play-mix-btn"
              onClick={() => {
                if (songs && songs.length > 0) {
                  onPlaySong(songs[0], songs);
                }
              }}
              title={`Play ${activeMoodItem.name} Mix`}
            >
              <Play size={14} fill="#0b0914" color="#0b0914" />
              <span>Play {activeMoodItem.name} Mix</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. Daily Discover */}
      {dailyDiscover && dailyDiscover.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">Daily Discover</div>
            <span className="section-action">Curated AutoMix</span>
          </div>

          <div className="daily-discover-carousel">
            {dailyDiscover.map((item, idx) => {
              const isItemPlaying = currentSong?.id === item.recommendation.id && isPlaying;

              return (
                <div
                  key={`${item.recommendation.id}_${idx}`}
                  className="daily-discover-card"
                  onClick={() => onPlaySong(item.recommendation)}
                >
                  <img
                    src={item.recommendation.coverUrl}
                    alt={item.recommendation.title}
                    className="daily-discover-bg"
                  />
                  <div className="daily-discover-overlay" />

                  <div className="daily-discover-top">
                    <div className="daily-discover-badge">
                      <span>Daily Mix {idx + 1}</span>
                    </div>
                    {item.seed && (
                      <div className="daily-discover-seed">
                        <span>Based on</span>
                        <span className="daily-discover-seed-title">{item.seed.title}</span>
                      </div>
                    )}
                  </div>

                  <div className="daily-discover-bottom">
                    <div className="daily-discover-info">
                      <div className="daily-discover-title">{item.recommendation.title}</div>
                      <div className="daily-discover-artist">{item.recommendation.artist}</div>
                    </div>
                    <div className="daily-discover-play-btn" title="Play Radio">
                      {isItemPlaying ? (
                        <Pause size={18} fill="#0b0914" color="#0b0914" />
                      ) : (
                        <Play size={18} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 2. On Repeat / Most Played Songs (Frequency Check) */}
      {mostPlayed && mostPlayed.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">On Repeat • Your Most Played</div>
            <span className="section-action">{mostPlayed.length} top tracks</span>
          </div>

          <div className="most-played-grid">
            {mostPlayed.map(({ song, playCount, genreType }, idx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;

              return (
                <div
                  key={`most_played_${song.id}_${idx}`}
                  className="most-played-card"
                  onClick={() => onPlaySong(song)}
                >
                  <div className="most-played-cover-wrap">
                    <img src={song.coverUrl} alt={song.title} className="most-played-cover" />
                    <div className="most-played-overlay">
                      <div className="most-played-play-btn">
                        {isThisPlaying ? (
                          <Pause size={18} fill="#0b0914" color="#0b0914" />
                        ) : (
                          <Play size={18} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="most-played-info">
                    <div className="most-played-title">{song.title}</div>
                    <div className="most-played-artist">{song.artist}</div>
                    <div className="most-played-meta-pill">
                      <span>Played {playCount}×</span>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span>{genreType}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. Because You Love [Top Artist / Genre] */}
      {favoriteArtistShelf && favoriteArtistShelf.songs.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <div className="section-title">{favoriteArtistShelf.title}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {favoriteArtistShelf.subtitle}
              </div>
            </div>
            <span className="section-action">AutoMix Radio</span>
          </div>

          <div className="cards-grid">
            {favoriteArtistShelf.songs.slice(0, 6).map((song) => (
              <div
                key={`fav_art_${song.id}`}
                className="song-card"
                onClick={() => onPlaySong(song)}
              >
                <div className="card-cover-container">
                  <img src={song.coverUrl} alt={song.title} className="card-cover-img" />
                  <div className="card-play-overlay">
                    <div className="overlay-play-btn">
                      <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                </div>
                <div className="card-title">{song.title}</div>
                <div className="card-artist">{song.artist}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 4. Listen Again & Recent History */}
      {listenAgain && listenAgain.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">Listen Again</div>
          </div>
          <div className="listen-again-strip">
            {listenAgain.map((song) => (
              <div
                key={`history_${song.id}`}
                className="listen-again-pill"
                onClick={() => onPlaySong(song)}
              >
                <img src={song.coverUrl} alt={song.title} className="listen-again-thumb" />
                <div style={{ overflow: 'hidden' }}>
                  <div className="listen-again-title">{song.title}</div>
                  <div className="listen-again-artist">{song.artist}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 5. Quick Picks (Live YouTube Music Tracks) */}
      <div className="section-header">
        <div className="section-title">
          {activeMoodItem ? `${activeMoodItem.emoji} ${activeMoodItem.name} Quick Picks` : 'Quick Picks'}
        </div>
        <span className="section-action">{songs.length} tracks</span>
      </div>

      <div className="song-list-table">
        {songs.map((song, index) => {
          const isThisPlaying = currentSong?.id === song.id && isPlaying;
          const isCurrent = currentSong?.id === song.id;

          return (
            <div
              key={song.id}
              className={`song-row ${isCurrent ? 'playing' : ''}`}
              onClick={() => onPlaySong(song)}
            >
              <div className="song-index">
                {isThisPlaying ? (
                  <div className="animated-soundwave" title="Playing now">
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                  </div>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <img src={song.coverUrl} alt={song.title} className="song-row-thumb" />
              <div className="song-row-main">
                <div className="song-row-title">{song.title}</div>
                <div className="song-row-artist">{song.artist}</div>
              </div>
              <div className="song-row-album">{song.album}</div>
              <div className="song-row-stats">{formatViews(song.views)}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  className="icon-btn add-to-pl-row-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPlaylist?.(song);
                  }}
                  title="Add to Playlist"
                >
                  <ListPlus size={16} />
                </button>
                <Heart
                  size={16}
                  className={`like-btn ${song.isLiked ? 'liked' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(song.id);
                  }}
                  fill={song.isLiked ? 'var(--accent)' : 'none'}
                />
                {song.isCached && (
                  <span title="Offline Cached" style={{ display: 'flex' }}>
                    <Download size={14} style={{ color: 'var(--primary)' }} />
                  </span>
                )}
                <span className="song-row-duration">{formatDuration(song.duration)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. Similar Recommendations Shelf */}
      {similarShelf && similarShelf.songs.length > 0 && (
        <>
          <div className="section-header">
            <div className="section-title">{similarShelf.title}</div>
            <span className="section-action">AutoMix Radio</span>
          </div>

          <div className="cards-grid">
            {similarShelf.songs.slice(0, 6).map((song) => (
              <div
                key={`sim_${song.id}`}
                className="song-card"
                onClick={() => onPlaySong(song)}
              >
                <div className="card-cover-container">
                  <img src={song.coverUrl} alt={song.title} className="card-cover-img" />
                  <div className="card-play-overlay">
                    <div className="overlay-play-btn">
                      <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                    </div>
                  </div>
                </div>
                <div className="card-title">{song.title}</div>
                <div className="card-artist">{song.artist}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 7. Trending Albums */}
      <div className="section-header">
        <div className="section-title">Trending Albums</div>
        <span className="section-action">See All</span>
      </div>

      <div className="cards-grid">
        {albums.map((album) => (
          <div
            key={album.id}
            className="song-card"
            onClick={() => onSelectAlbum?.(album.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-cover-container">
              <img src={album.coverUrl} alt={album.title} className="card-cover-img" />
              <div className="card-play-overlay">
                <div
                  className="overlay-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (album.songs && album.songs.length > 0) {
                      onPlaySong(album.songs[0], album.songs);
                    }
                  }}
                  title={`Play ${album.title}`}
                >
                  <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>
            <div
              className="card-title"
              onClick={(e) => {
                e.stopPropagation();
                onSelectAlbum?.(album.id);
              }}
              title={album.title}
            >
              {album.title}
            </div>
            <div className="card-artist">{album.artist} • {album.year}</div>
          </div>
        ))}
      </div>

      {/* 8. Featured Playlists */}
      <div className="section-header">
        <div className="section-title">Featured Playlists</div>
        <span className="section-action">Browse</span>
      </div>

      <div className="cards-grid">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="song-card"
            onClick={() => onSelectPlaylist?.(pl.id)}
          >
            <div className="card-cover-container">
              <img src={pl.coverUrl} alt={pl.title} className="card-cover-img" />
              <div className="card-play-overlay">
                <div
                  className="overlay-play-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (pl.songs.length > 0) {
                      onPlaySong(pl.songs[0], pl.songs);
                    }
                  }}
                  title="Play Playlist"
                >
                  <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                </div>
              </div>
            </div>
            <div className="card-title">{pl.title}</div>
            <div className="card-artist">{pl.songCount} songs • {pl.isCurated ? 'Curated' : 'User'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

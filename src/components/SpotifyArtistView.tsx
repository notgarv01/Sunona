import React, { useState } from 'react';
import { Play, Pause, MoreHorizontal, ArrowLeft } from 'lucide-react';
import type { Song, Album } from '../types';

interface SpotifyArtistViewProps {
  artistName: string;
  songs: Song[];
  albums: Album[];
  currentSong: Song | null;
  isPlaying: boolean;
  onPlaySong: (song: Song, queue?: Song[]) => void;
  onTogglePlay: () => void;
  onToggleLike?: (songId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onBack: () => void;
}

export const SpotifyArtistView: React.FC<SpotifyArtistViewProps> = ({
  artistName,
  songs,
  albums,
  currentSong,
  isPlaying,
  onPlaySong,
  onTogglePlay,
  onToggleLike: _onToggleLike,
  onSelectAlbum,
  onBack,
}) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [discographyTab, setDiscographyTab] = useState<'popular' | 'albums' | 'singles'>('popular');

  // Filter songs for this artist
  const artistSongs = songs.filter(
    (s) =>
      (s.artist || '').toLowerCase().includes(artistName.toLowerCase()) ||
      (s.title || '').toLowerCase().includes(artistName.toLowerCase())
  );
  const displaySongs = artistSongs.length > 0 ? artistSongs : songs.slice(0, 10);
  const popularSongs = displaySongs.slice(0, 5);

  const artistAlbums = albums.filter((a) =>
    (a.artist || '').toLowerCase().includes(artistName.toLowerCase())
  );

  const heroCover = displaySongs[0]?.coverUrl || '/images/producer.webp';
  const isCurrentArtistPlaying =
    isPlaying && currentSong && displaySongs.some((s) => s.id === currentSong.id);

  const handleBigPlay = () => {
    if (displaySongs.length === 0) return;
    if (isCurrentArtistPlaying) {
      onTogglePlay();
    } else {
      onPlaySong(displaySongs[0], displaySongs);
    }
  };

  const formatDuration = (secs?: number) => {
    if (!secs || isNaN(secs)) return '3:30';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="spotify-artist-viewport">
      {/* Back button */}
      <div className="spotify-pl-header-bar">
        <button className="spotify-pl-back-btn" onClick={onBack} title="Go back">
          <ArrowLeft size={18} />
        </button>
      </div>

      {/* Hero Banner with Cinematic Photo */}
      <div
        className="spotify-artist-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(18,18,18,1)), url(${heroCover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          height: '340px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#3d91f4">
            <path d="M12 0L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-5zm-2 16l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" />
          </svg>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Verified Artist</span>
        </div>

        <h1
          className="sp-artist-hero-name"
          style={{
            fontSize: '72px',
            fontFamily: "var(--encore-title-font-stack, 'SpotifyMixUITitle', sans-serif)",
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            margin: '0 0 12px 0',
            color: '#fff',
          }}
        >
          {artistName}
        </h1>

        <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
          38,491,209 monthly listeners
        </span>
      </div>

      {/* Action Row */}
      <div
        className="spotify-pl-action-bar"
        style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '24px' }}
      >
        <button
          className="spotify-pl-big-play-btn"
          onClick={handleBigPlay}
          title={isCurrentArtistPlaying ? 'Pause' : 'Play'}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#1ed760',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isCurrentArtistPlaying ? (
            <Pause size={26} fill="#000" />
          ) : (
            <Play size={26} fill="#000" style={{ marginLeft: 3 }} />
          )}
        </button>

        <button
          onClick={() => setIsFollowing((prev) => !prev)}
          style={{
            background: 'none',
            border: isFollowing ? '1px solid #1ed760' : '1px solid rgba(255,255,255,0.4)',
            color: isFollowing ? '#1ed760' : '#fff',
            borderRadius: '500px',
            padding: '8px 24px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>

        <button className="spotify-pl-icon-action" title="More options" style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer' }}>
          <MoreHorizontal size={24} />
        </button>
      </div>

      {/* Popular Songs Section */}
      <div style={{ padding: '0 32px 32px 32px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontFamily: "var(--encore-title-font-stack, 'SpotifyMixUITitle', sans-serif)",
            fontWeight: 700,
            marginBottom: '16px',
            color: '#fff',
          }}
        >
          Popular
        </h2>

        <div className="spotify-tracklist-table">
          <div className="spotify-tl-rows">
            {popularSongs.map((song, idx) => {
              const isThisPlaying = currentSong?.id === song.id && isPlaying;
              const isThisActive = currentSong?.id === song.id;

              return (
                <div
                  key={song.id}
                  className={`spotify-tl-row ${isThisActive ? 'active' : ''}`}
                  onClick={() => onPlaySong(song, displaySongs)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '56px',
                    padding: '0 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ width: '40px', textAlign: 'center', color: '#b3b3b3', fontSize: '14px' }}>
                    {isThisPlaying ? (
                      <img
                        src="/images/equaliser-animated-green.gif"
                        alt="Playing"
                        width={14}
                        height={14}
                        style={{ display: 'inline-block' }}
                      />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <img
                      src={song.coverUrl || '/images/onboarding-card-start-playing.webp'}
                      alt={song.title}
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = '/images/onboarding-card-start-playing.webp';
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '15px', fontWeight: 500, color: isThisActive ? '#1ed760' : '#fff' }}>
                        {song.title}
                      </span>
                      <span style={{ fontSize: '13px', color: '#b3b3b3' }}>{song.artist}</span>
                    </div>
                  </div>

                  <div style={{ width: '120px', fontSize: '13px', color: '#b3b3b3', textAlign: 'right', paddingRight: '24px' }}>
                    {(14280000 - idx * 2100000).toLocaleString()}
                  </div>

                  <div style={{ width: '60px', fontSize: '13px', color: '#b3b3b3', textAlign: 'right' }}>
                    {formatDuration(song.duration)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Discography Section */}
      <div style={{ padding: '0 32px 32px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2
            style={{
              fontSize: '24px',
              fontFamily: "var(--encore-title-font-stack, 'SpotifyMixUITitle', sans-serif)",
              fontWeight: 700,
              color: '#fff',
            }}
          >
            Discography
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setDiscographyTab('popular')}
              style={{
                background: discographyTab === 'popular' ? '#fff' : 'rgba(255,255,255,0.08)',
                color: discographyTab === 'popular' ? '#000' : '#fff',
                border: 'none',
                borderRadius: '500px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Popular releases
            </button>
            <button
              onClick={() => setDiscographyTab('albums')}
              style={{
                background: discographyTab === 'albums' ? '#fff' : 'rgba(255,255,255,0.08)',
                color: discographyTab === 'albums' ? '#000' : '#fff',
                border: 'none',
                borderRadius: '500px',
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Albums
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
          {(artistAlbums.length > 0 ? artistAlbums : albums.slice(0, 4)).map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum?.(album.id)}
              style={{
                background: '#181818',
                borderRadius: '8px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#282828')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#181818')}
            >
              <img
                src={album.coverUrl || '/images/onboarding-card-save-playlist.webp'}
                alt={album.title}
                style={{ width: '100%', aspectRatio: '1/1', borderRadius: '6px', objectFit: 'cover', marginBottom: '12px' }}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = '/images/onboarding-card-save-playlist.webp';
                }}
              />
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
                {album.title}
              </div>
              <div style={{ fontSize: '13px', color: '#b3b3b3' }}>
                {album.year || 2024} • Album
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* About the Artist Card */}
      <div style={{ padding: '0 32px 48px 32px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontFamily: "var(--encore-title-font-stack, 'SpotifyMixUITitle', sans-serif)",
            fontWeight: 700,
            marginBottom: '16px',
            color: '#fff',
          }}
        >
          About
        </h2>
        <div
          style={{
            background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.8)), url(${heroCover})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            padding: '36px',
            minHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            maxWidth: '680px',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
            38,491,209 monthly listeners
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, margin: 0 }}>
            {artistName} is one of the most celebrated and listened-to voices in modern Indian music, known for iconic vocals, dynamic melodies, and cultural trendsetters.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Play,
  Flame,
  Sparkles,
  Heart,
  ListPlus,
  ArrowLeft,
  Music2,
  TrendingUp,
  Compass
} from 'lucide-react';
import type { Song } from '../types';
import { MOODS } from '../data/musicData';

interface Props {
  songs: Song[];
  likedSongs?: Song[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onToggleLike: (songId: string, song?: Song) => void;
  onAddToPlaylist?: (song: Song) => void;
}

interface CategoryItem {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  query: string;
  gradient: string;
  accent: string;
}

const CURATED_GENRES: CategoryItem[] = [
  {
    id: 'bollywood',
    title: 'Bollywood Hot 50',
    subtitle: 'Latest Hindi Chartbusters & Melodies',
    emoji: '🎬',
    query: 'Latest Hindi Bollywood Hit Songs 2026',
    gradient: 'linear-gradient(135deg, #2b1118, #451b26)',
    accent: '#ff2442',
  },
  {
    id: 'punjabi',
    title: 'Punjabi Pop & Beats',
    subtitle: 'Diljit, Karan Aujla, AP Dhillon & Shubh',
    emoji: '🦁',
    query: 'Top Punjabi Pop Diljit Karan Aujla Hits',
    gradient: 'linear-gradient(135deg, #2e1d0d, #4d2f14)',
    accent: '#f59e0b',
  },
  {
    id: 'lofi',
    title: 'Late Night Lofi',
    subtitle: 'Mellow chill beats & calming aesthetics',
    emoji: '🌙',
    query: 'Late Night Hindi Lofi Chill Songs',
    gradient: 'linear-gradient(135deg, #131b2e, #1f2d4d)',
    accent: '#38bdf8',
  },
  {
    id: 'hiphop',
    title: 'Desi Hip-Hop & Rap',
    subtitle: 'Divine, Seedhe Maut, KR$NA, Raftaar',
    emoji: '🎤',
    query: 'Desi Hip Hop Rap Seedhe Maut Divine KR$NA',
    gradient: 'linear-gradient(135deg, #251229, #3d1b45)',
    accent: '#c084fc',
  },
  {
    id: 'romance',
    title: 'Romantic & Love Melodies',
    subtitle: 'Soulful duets, pure love & heartbeats',
    emoji: '💖',
    query: 'Best Romantic Hindi Love Songs Arijit Shreya',
    gradient: 'linear-gradient(135deg, #2e1220, #4f1c35)',
    accent: '#f43f5e',
  },
  {
    id: 'global',
    title: 'Global Viral Top 50',
    subtitle: 'Worldwide trending pop & TikTok hits',
    emoji: '🎧',
    query: 'Global Top Pop Music Hits Billboard 2026',
    gradient: 'linear-gradient(135deg, #102422, #18423e)',
    accent: '#2dd4bf',
  },
  {
    id: 'indie',
    title: 'Indie Pop India',
    subtitle: 'Prateek Kuhad, Anuv Jain, Jasleen Royal',
    emoji: '🎸',
    query: 'Indian Indie Pop Prateek Kuhad Anuv Jain',
    gradient: 'linear-gradient(135deg, #262414, #423e1f)',
    accent: '#eab308',
  },
  {
    id: 'acoustic',
    title: 'Acoustic & Unplugged',
    subtitle: 'Raw vocals, acoustic guitar & soulful strings',
    emoji: '🧘',
    query: 'Acoustic Hindi Unplugged Guitar Songs',
    gradient: 'linear-gradient(135deg, #152026, #21333d)',
    accent: '#06b6d4',
  },
  {
    id: 'workout',
    title: 'Workout & Gym Energy',
    subtitle: 'High BPM phonk, rock & motivation',
    emoji: '⚡',
    query: 'High Energy Gym Workout Phonk Motivation Songs',
    gradient: 'linear-gradient(135deg, #2b1111, #471919)',
    accent: '#ef4444',
  },
  {
    id: 'devotional',
    title: 'Devotional & Soul',
    subtitle: 'Peaceful mantras, soulful morning chants',
    emoji: '🕉️',
    query: 'Peaceful Devotional Bhakti Bhajans Soul Chants',
    gradient: 'linear-gradient(135deg, #291b0d, #4a2f14)',
    accent: '#fb923c',
  },
];

export const ExploreScreen: React.FC<Props> = ({
  songs,
  likedSongs = [],
  onPlaySong,
  onToggleLike,
  onAddToPlaylist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  const [categorySongs, setCategorySongs] = useState<Song[]>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState<boolean>(false);
  const [activeMoodId, setActiveMoodId] = useState<string | null>(null);

  // Load category songs when a genre card or mood chip is chosen
  const handleSelectCategory = (cat: CategoryItem) => {
    setSelectedCategory(cat);
    setIsLoadingCategory(true);

    fetch(`/api/search?q=${encodeURIComponent(cat.query)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          const mapped = data.results.map((s: Song) => ({
            ...s,
            isLiked: likedSongs.some((ls) => ls.id === s.id),
          }));
          setCategorySongs(mapped);
        } else {
          setCategorySongs([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load category tracks:', err);
        setCategorySongs([]);
      })
      .finally(() => {
        setIsLoadingCategory(false);
      });
  };

  const handleSelectMoodChip = (moodId: string) => {
    setActiveMoodId(moodId);
    const mood = MOODS.find((m) => m.id === moodId);
    if (!mood) return;

    handleSelectCategory({
      id: mood.id,
      title: mood.name,
      subtitle: mood.tagline,
      emoji: mood.emoji,
      query: mood.searchQuery,
      gradient: mood.gradient,
      accent: '#38bdf8',
    });
  };

  const handleBackToExplore = () => {
    setSelectedCategory(null);
    setActiveMoodId(null);
    setCategorySongs([]);
  };

  return (
    <div className="app-viewport">
      {/* Hero Header */}
      <div className="section-hero">
        <div className="hero-greeting">
          <Compass size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: '-2px' }} />
          Curated Soundscapes & Live Charts
        </div>
        <h1 className="hero-title">Explore</h1>
      </div>

      {/* Mood Selector Chips Bar */}
      <div className="mood-chips-scroll" style={{ marginBottom: '24px' }}>
        <div
          className={`mood-chip ${!selectedCategory ? 'active' : ''}`}
          onClick={handleBackToExplore}
        >
          <Sparkles size={14} color="#ff2442" />
          <span>All Explore</span>
        </div>
        {MOODS.map((m) => {
          const isActive = activeMoodId === m.id;
          return (
            <div
              key={m.id}
              className={`mood-chip ${isActive ? 'active' : ''}`}
              onClick={() => handleSelectMoodChip(m.id)}
            >
              <span>{m.emoji}</span>
              <span>{m.name}</span>
            </div>
          );
        })}
      </div>

      {/* VIEW A: DEDICATED SELECTED GENRE / MOOD SHOWCASE */}
      {selectedCategory ? (
        <div className="selected-category-view">
          {/* Category Hero Banner */}
          <div
            style={{
              background: selectedCategory.gradient,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px 32px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ zIndex: 2 }}>
              <button
                className="icon-btn"
                onClick={handleBackToExplore}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#fff',
                  cursor: 'pointer',
                  marginBottom: '14px',
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Explore</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2.4rem' }}>{selectedCategory.emoji}</span>
                <div>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                    {selectedCategory.title}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                    {selectedCategory.subtitle}
                  </p>
                </div>
              </div>
            </div>

            {/* Play All Button */}
            {categorySongs.length > 0 && (
              <button
                className="glow-pill-btn-red"
                onClick={() => onPlaySong(categorySongs[0], categorySongs)}
                style={{ zIndex: 2 }}
              >
                <Play size={16} fill="#fff" />
                <span>Play All ({categorySongs.length})</span>
              </button>
            )}
          </div>

          {/* Loading Skeleton */}
          {isLoadingCategory ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="radar-circle-outer" style={{ margin: '0 auto 16px', width: '50px', height: '50px' }}>
                <Flame size={24} color="#ff2442" />
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
                Loading {selectedCategory.title} Tracks...
              </div>
              <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginTop: '6px' }}>
                Fetching live charts from YouTube Music
              </p>
            </div>
          ) : categorySongs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
              <Music2 size={40} style={{ color: 'rgba(255, 255, 255, 0.3)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, color: '#fff' }}>No songs loaded for this genre</div>
              <button
                className="glow-pill-btn-red"
                style={{ marginTop: '14px', padding: '6px 16px', fontSize: '0.78rem' }}
                onClick={() => handleSelectCategory(selectedCategory)}
              >
                Retry
              </button>
            </div>
          ) : (
            /* Category Tracks Table */
            <div className="song-list-table">
              {categorySongs.map((song, index) => {
                const isLiked = likedSongs.some((ls) => ls.id === song.id) || song.isLiked;

                return (
                  <div
                    key={song.id}
                    className="song-row"
                    onClick={() => onPlaySong(song, categorySongs)}
                  >
                    <div className="song-index" style={{ fontWeight: 800, color: index < 3 ? '#ff2442' : 'var(--text-muted)' }}>
                      #{index + 1}
                    </div>
                    <img
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="song-row-thumb"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="song-row-main">
                      <div className="song-row-title">{song.title}</div>
                      <div className="song-row-artist">{song.artist}</div>
                    </div>
                    <div className="song-row-album">{song.album || selectedCategory.title}</div>
                    <div className="song-row-stats">{song.views || 'Trending'}</div>
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
                        className={`like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLike(song.id, song);
                        }}
                        fill={isLiked ? 'var(--accent)' : 'none'}
                      />
                      <span className="song-row-duration">3:20</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW B: OVERVIEW (Curated Genres Grid & Global Top Charts) */
        <>
          {/* Genre Grid */}
          <div className="section-header">
            <div className="section-title">
              <TrendingUp size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px', color: '#ff2442' }} />
              Featured Genres & Categories
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            {CURATED_GENRES.map((g) => (
              <div
                key={g.id}
                style={{
                  background: g.gradient,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '24px 22px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '130px',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onClick={() => handleSelectCategory(g)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 10px 25px -5px ${g.accent}33`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Accent line on left */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: g.accent,
                    opacity: 0.9,
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '1.8rem' }}>{g.emoji}</span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      background: 'rgba(0, 0, 0, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      color: g.accent,
                      border: `1px solid ${g.accent}44`,
                    }}
                  >
                    EXPLORE →
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '1.05rem',
                      color: '#f8fafc',
                      lineHeight: 1.2,
                    }}
                  >
                    {g.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      color: 'rgba(255, 255, 255, 0.6)',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {g.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top Global Charts Shelf */}
          <div className="section-header">
            <div className="section-title">
              <Flame size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-2px', color: '#ff2442' }} />
              Global Top Charts
            </div>
          </div>

          <div className="cards-grid">
            {songs.slice(0, 15).map((song, idx) => {
              const isLiked = likedSongs.some((ls) => ls.id === song.id) || song.isLiked;

              return (
                <div
                  key={song.id}
                  className="song-card"
                  onClick={() => onPlaySong(song, songs)}
                  style={{ position: 'relative' }}
                >
                  {/* Rank Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      zIndex: 3,
                      background: idx < 3 ? '#ff2442' : 'rgba(0, 0, 0, 0.65)',
                      color: '#fff',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    #{idx + 1}
                  </div>

                  <div className="card-cover-container">
                    <img src={song.coverUrl} alt={song.title} className="card-cover-img" />
                    <div className="card-play-overlay">
                      <div className="overlay-play-btn">
                        <Play size={20} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                      </div>
                    </div>
                  </div>
                  <div className="card-title">{song.title}</div>
                  <div className="card-artist" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{song.artist}</span>
                    <Heart
                      size={14}
                      className={`like-btn ${isLiked ? 'liked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(song.id, song);
                      }}
                      fill={isLiked ? 'var(--accent)' : 'none'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

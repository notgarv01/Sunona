import React, { useState } from 'react';
import { Search, Play, Sparkles } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  songs: Song[];
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
}

interface SpotifyCategory {
  id: string;
  title: string;
  bgColor: string;
  image: string;
  keywords: string[];
}

const SPOTIFY_CATEGORIES: SpotifyCategory[] = [
  {
    id: 'bollywood',
    title: 'Bollywood',
    bgColor: '#e13300',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
    keywords: ['hindi', 'bollywood', 'arijit', 'shreya', 'sidhu'],
  },
  {
    id: 'punjabi',
    title: 'Punjabi Pop',
    bgColor: '#f59b23',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
    keywords: ['punjabi', 'diljit', 'karan', 'shubh', 'ap dhillon'],
  },
  {
    id: 'pop',
    title: 'Pop',
    bgColor: '#1e3264',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    keywords: ['pop', 'billboard', 'dua', 'taylor', 'ed sheeran'],
  },
  {
    id: 'hiphop',
    title: 'Hip-Hop / Rap',
    bgColor: '#bc5900',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
    keywords: ['hiphop', 'rap', 'emiway', 'divine', 'seedhe', 'kr$na'],
  },
  {
    id: 'romance',
    title: 'Romance',
    bgColor: '#e8115b',
    image: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&auto=format&fit=crop&q=80',
    keywords: ['romantic', 'love', 'dil', 'heart', 'mohabbat'],
  },
  {
    id: 'chill',
    title: 'Chill & Lo-Fi',
    bgColor: '#27856a',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
    keywords: ['lofi', 'chill', 'peaceful', 'rain', 'night'],
  },
  {
    id: 'indie',
    title: 'Indie India',
    bgColor: '#608108',
    image: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80',
    keywords: ['indie', 'prateek', 'anuv', 'acoustic', 'yellow'],
  },
  {
    id: 'charts',
    title: 'Charts',
    bgColor: '#8d67ab',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
    keywords: ['chart', 'top', 'viral', '50', 'hits'],
  },
  {
    id: 'party',
    title: 'Party & Dance',
    bgColor: '#0d73ec',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&auto=format&fit=crop&q=80',
    keywords: ['dance', 'party', 'club', 'dj', 'remix'],
  },
  {
    id: 'rock',
    title: 'Rock & Metal',
    bgColor: '#e91429',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80',
    keywords: ['rock', 'metal', 'band', 'guitar', 'hard'],
  },
  {
    id: 'workout',
    title: 'Workout & Gym',
    bgColor: '#777777',
    image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=80',
    keywords: ['workout', 'gym', 'beast', 'energy', 'motivation'],
  },
  {
    id: 'sleep',
    title: 'Sleep & Ambient',
    bgColor: '#1e3264',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&auto=format&fit=crop&q=80',
    keywords: ['sleep', 'ambient', 'calm', 'piano', 'meditation'],
  },
];

export const SpotifyExplore: React.FC<Props> = ({
  songs,
  onPlaySong,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getFilteredSongs = () => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return songs.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.artist || '').toLowerCase().includes(q) ||
          (s.album || '').toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      const cat = SPOTIFY_CATEGORIES.find((c) => c.id === selectedCategory);
      if (cat) {
        return songs.filter((s) => {
          const text = `${s.title} ${s.artist} ${s.album}`.toLowerCase();
          return cat.keywords.some((k) => text.includes(k));
        });
      }
    }
    return [];
  };

  const filteredSongs = getFilteredSongs();

  return (
    <div className="spotify-explore-viewport">
      {/* Top Search Bar */}
      <div className="spotify-explore-search-bar">
        <div className="spotify-search-input-pill">
          <Search size={20} className="spotify-search-pill-icon" />
          <input
            type="text"
            className="spotify-search-pill-field"
            placeholder="What do you want to play?"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (selectedCategory) setSelectedCategory(null);
            }}
            autoFocus
          />
          {searchQuery && (
            <button
              className="spotify-search-clear-btn"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* When Search query or Category filter active: Show Results Grid */}
      {(searchQuery.trim() || selectedCategory) ? (
        <div className="spotify-explore-results-section">
          <div className="spotify-results-header">
            <h2 className="spotify-results-title">
              {searchQuery ? `Search Results for "${searchQuery}"` : `${selectedCategory?.toUpperCase()} Music`}
            </h2>
            {selectedCategory && (
              <button
                className="spotify-clear-filter-btn"
                onClick={() => setSelectedCategory(null)}
              >
                Clear filter
              </button>
            )}
          </div>

          {filteredSongs.length > 0 ? (
            <div className="spotify-card-shelf-grid">
              {filteredSongs.map((song) => (
                <div
                  key={song.id}
                  className="spotify-media-card"
                  onClick={() => onPlaySong(song, filteredSongs)}
                >
                  <div className="spotify-media-card-cover-wrap">
                    <img
                      src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80'}
                      alt={song.title}
                      className="spotify-media-card-cover"
                      loading="lazy"
                    />
                    <button
                      className="spotify-floating-play-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song, filteredSongs);
                      }}
                      title={`Play ${song.title}`}
                    >
                      <Play size={20} fill="#000000" />
                    </button>
                  </div>
                  <div className="spotify-media-card-meta">
                    <div className="spotify-media-card-title">{song.title}</div>
                    <div className="spotify-media-card-sub">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="spotify-no-results">
              <Sparkles size={40} style={{ opacity: 0.4, marginBottom: 12 }} />
              <h3>No results found</h3>
              <p>Please try a different search query or explore one of the categories below.</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Spotify Signature "Browse all" Colorful Category Tiles */}
      <section className="spotify-browse-section">
        <h2 className="spotify-section-heading">Browse all</h2>
        <div className="spotify-genre-grid">
          {SPOTIFY_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="spotify-genre-tile"
              style={{ backgroundColor: cat.bgColor }}
              onClick={() => setSelectedCategory(cat.id)}
              role="button"
              tabIndex={0}
            >
              <span className="spotify-genre-title">{cat.title}</span>
              <img
                src={cat.image}
                alt={cat.title}
                className="spotify-genre-peeking-art"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

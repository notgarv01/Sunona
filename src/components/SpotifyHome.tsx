import React, { useState, useMemo } from 'react';
import { Play } from 'lucide-react';
import type { Song, Album, Playlist, DailyDiscoverItem } from '../types';
import type { TasteProfile } from '../services/historyService';

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
  likedSongsCount?: number;
  onPlaySong: (song: Song, customQueue?: Song[]) => void;
  onToggleLike: (songId: string) => void;
  onSelectPlaylist?: (playlistId: string) => void;
  onSelectAlbum?: (albumId: string) => void;
  onAddToPlaylist?: (song: Song) => void;
  onOpenLikedSongs?: () => void;
}

interface SpotifyCardItem {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  badge?: string;
  titleOnCover?: boolean;
}

interface SpotifyRadioItem {
  id: string;
  artist: string;
  bgColor: string;
  artistsText: string;
  cutoutUrls: string[];
}

interface SpotifyArtistItem {
  id: string;
  name: string;
  avatarUrl: string;
}

interface SpotifyWideItem {
  id: string;
  category: string;
  title: string;
  source: string;
  bgUrl: string;
  thumbUrl: string;
  description: string;
  isPodcast?: boolean;
  podcastDate?: string;
  podcastDuration?: string;
}

// Helper: get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const SpotifyHome: React.FC<Props> = ({
  songs,
  albums,
  playlists,
  currentSong,
  isPlaying,
  likedSongsCount = 0,
  onPlaySong,
  onSelectPlaylist,
  onSelectAlbum,
  onOpenLikedSongs,
}) => {
  const [filterTag, setFilterTag] = useState<'all' | 'music' | 'podcasts'>('all');

  const greeting = useMemo(() => getGreeting(), []);

  // Quick Access: 6 items in a 2-col grid (Screenshot 426)
  const quickAccessItems = useMemo(() => {
    const items: { id: string; title: string; coverUrl: string; type: 'song' | 'playlist' | 'album'; data?: Song | Playlist | Album }[] = [];

    // Liked songs tile with purple gradient
    if (likedSongsCount > 0) {
      items.push({
        id: 'liked-songs',
        title: 'Liked Songs',
        coverUrl: '',
        type: 'playlist',
      });
    }

    // Playlists
    for (const pl of playlists.slice(0, 2)) {
      items.push({ id: pl.id, title: pl.title, coverUrl: pl.coverUrl, type: 'playlist', data: pl });
    }

    // Albums
    for (const alb of albums.slice(0, 3)) {
      items.push({ id: alb.id, title: alb.title, coverUrl: alb.coverUrl, type: 'album', data: alb });
    }

    // Fill with songs if needed
    if (items.length < 6) {
      for (const s of songs.slice(0, 6 - items.length)) {
        items.push({ id: s.id, title: s.title, coverUrl: s.coverUrl, type: 'song', data: s });
      }
    }

    return items.slice(0, 6);
  }, [likedSongsCount, playlists, albums, songs]);

  // Section 1: Based on your recent listening (Screenshot 426)
  const recentListeningCards: SpotifyCardItem[] = [
    {
      id: 'val-hits',
      title: "Trending Valentine's Hits",
      subtitle: 'Songs India is falling in love with right now...',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'bollywood-mush',
      title: 'Bollywood Mush',
      subtitle: 'Let these songs be the background score...',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      badge: 'Limited ads',
      titleOnCover: true,
    },
    {
      id: 'bolly-chill',
      title: 'Bollywood & Chill',
      subtitle: "Sit back, and chill with Bollywood's...",
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: '1am-feels',
      title: '1 AM Feels Hindi',
      subtitle: 'Late night cool, & these soothing tunes.',
      coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'ipop-icons',
      title: 'I-Pop Icons',
      subtitle: 'Hottest tracks from your favourite I-Pop...',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
  ];

  // Section 2: Recommended Stations (Screenshot 426)
  const radioStations: SpotifyRadioItem[] = [
    {
      id: 'arijit-radio',
      artist: 'Arijit Singh',
      bgColor: '#fed06a',
      artistsText: 'With Jeet Gannguli, Pritam, Vishal-...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
      ],
    },
    {
      id: 'karan-radio',
      artist: 'Karan Aujla',
      bgColor: '#ff7860',
      artistsText: 'With Shubh, AP Dhillon, Navaan...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
      ],
    },
    {
      id: 'kaka-radio',
      artist: 'Kaka',
      bgColor: '#c6a9ff',
      artistsText: 'With Inder Chahal, Ammy Virk, Adaab...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
      ],
    },
    {
      id: 'atif-radio',
      artist: 'Atif Aslam',
      bgColor: '#9ff0ba',
      artistsText: 'With Sachin-Jigar, Sachet Tandon,...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
      ],
    },
    {
      id: 'shubh-radio',
      artist: 'Shubh',
      bgColor: '#f08dbb',
      artistsText: 'With AP Dhillon, Yo Yo Honey Singh, Navaan...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
      ],
    },
  ];

  // Section 3: Recommended for today (Screenshot 427)
  const recommendedToday: SpotifyCardItem[] = [
    {
      id: 'ek-villain',
      title: 'Ek Villain',
      subtitle: 'Mithoon, Ankit Tiwari, Pritam',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'ramaiya',
      title: 'Ramaiya Vastavaiya',
      subtitle: '(Original Motion Picture Soundtrack)',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'best-romance',
      title: 'Best of Romance: Atif Aslam',
      subtitle: 'Atif Aslam',
      coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'blood-money',
      title: 'Blood Money',
      subtitle: '(Original Motion Picture Soundtrack)',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'bollywood-years',
      title: 'Bollywood Through The Years',
      subtitle: 'Timeless classic chartbusters',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // Section 4: More of what you like (Screenshot 428)
  const moreOfWhatYouLikeCards: SpotifyCardItem[] = [
    {
      id: 'ipop-icons-2',
      title: 'I-Pop Icons',
      subtitle: 'Hottest tracks from your favourite I-Pop...',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'sad-hindi',
      title: 'Sad Hindi Melodies',
      subtitle: 'Soulful tunes for the heart that has loved...',
      coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'pov-love',
      title: "pov: you're in love",
      subtitle: "Uff, you've fallen! 💜",
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'filmy-hangover',
      title: 'Filmy Hangover',
      subtitle: 'Soothe your hangover with these chill tracks.',
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      titleOnCover: true,
    },
    {
      id: 'bollywood-central',
      title: 'Bollywood Central',
      subtitle: 'Bollywood Central, jab baje toh sab...',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
      badge: 'Limited ads',
      titleOnCover: true,
    },
  ];

  // Section 5: Popular Radio (Screenshot 428)
  const popularRadioStations: SpotifyRadioItem[] = [
    {
      id: 'sidhu-radio',
      artist: 'Sidhu Moose Wala',
      bgColor: '#9fb7ff',
      artistsText: 'With Shubh, Jxggi, Sharry Mann and...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
      ],
    },
    {
      id: 'kishore-radio',
      artist: 'Kishore Kumar',
      bgColor: '#ff8676',
      artistsText: 'With Mukesh, Kalyanji-Anandji,...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
      ],
    },
    {
      id: 'diljit-radio',
      artist: 'Diljit Dosanjh',
      bgColor: '#7ae4ba',
      artistsText: 'With Harrdy Sandhu, AP Dhillon, Sidhu...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
      ],
    },
    {
      id: 'ar-rahman-radio',
      artist: 'A.R. Rahman',
      bgColor: '#fed06a',
      artistsText: 'With Hariharan, Anirudh Ravichander...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
      ],
    },
    {
      id: 'yyhs-radio',
      artist: 'Yo Yo Honey Singh',
      bgColor: '#a1e488',
      artistsText: 'With Guru Randhawa, Harrdy Sandhu...',
      cutoutUrls: [
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
      ],
    },
  ];

  // Section 6: Your favorite artists (Screenshot 446 & design doc)
  const favoriteArtists: SpotifyArtistItem[] = [
    {
      id: 'art-imran',
      name: 'Imran Khan',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
    {
      id: 'art-yyhs',
      name: 'Yo Yo Honey Singh',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    },
    {
      id: 'art-diljit',
      name: 'Diljit Dosanjh',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
    },
    {
      id: 'art-ar-rahman',
      name: 'A.R. Rahman',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
    },
    {
      id: 'art-king',
      name: 'King',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200',
    },
    {
      id: 'art-mankirt',
      name: 'Mankirt Aulakh',
      avatarUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
    },
    {
      id: 'art-sidhu',
      name: 'Sidhu Moose Wala',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    },
    {
      id: 'art-kk',
      name: 'KK',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    },
  ];

  // Section 7: 2-Column Large Cards (Screenshot 431, 432, 435, 438)
  const largeCards: SpotifyWideItem[] = [
    {
      id: 'wide-val',
      category: 'Based on your recent listening',
      title: "Trending Valentine's Hits",
      source: 'Playlist • Spotify',
      bgUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100',
      description: 'Songs India is falling in love with right now...',
    },
    {
      id: 'wide-sad',
      category: 'Based on your recent listening',
      title: 'Sad Hindi Melodies',
      source: 'Playlist • Spotify',
      bgUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100',
      description: 'Soulful tunes for the heart that has loved...',
    },
    {
      id: 'wide-tegi',
      category: 'More like Tegi Pannu',
      title: 'Talwiinder Radio',
      source: 'Playlist • Spotify',
      bgUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100',
      description: 'With AP Dhillon, Shubh, Karan Aujla...',
    },
    {
      id: 'wide-mumbai',
      category: 'Based on your recent listening',
      title: 'Jhakaas Mumbai',
      source: 'Playlist • Spotify',
      bgUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=100',
      description: 'Check out the songs Mumbai is vibing to.',
    },
    {
      id: 'wide-sad-mix',
      category: 'Made for you',
      title: 'Sad Mix',
      source: 'Playlist • Spotify',
      bgUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100',
      description: 'Gurnazar, Pritam, Anuradha Paudwal and more',
    },
    {
      id: 'wide-podcast-1',
      category: 'Episodes to try',
      title: 'Proposal Icks, Dream Rings & How to Get Her to Say Yes',
      source: 'Episode • Moment of Silence',
      bgUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      thumbUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100',
      description: 'Nov 6 • 51 min 53 sec • Hiii MOSSIES, hope you’re ready for the weekend!',
      isPodcast: true,
      podcastDate: 'Nov 6',
      podcastDuration: '51 min 53 sec',
    },
  ];

  const handlePlayCard = (idx: number) => {
    if (songs.length > 0) {
      const songToPlay = songs[idx % songs.length];
      onPlaySong(songToPlay);
    }
  };

  const handleQuickAccessClick = (item: typeof quickAccessItems[0]) => {
    if (item.id === 'liked-songs') {
      onOpenLikedSongs?.();
      return;
    }
    if (item.type === 'playlist') {
      onSelectPlaylist?.(item.id);
    } else if (item.type === 'album') {
      onSelectAlbum?.(item.id);
    } else if (item.type === 'song' && item.data) {
      onPlaySong(item.data as Song, songs);
    }
  };

  return (
    <div className="spotify-home-viewport">
      {/* Spotify Top Filter Pills (Sticky) */}
      <div className="spotify-filter-pills">
        <button
          className={`spotify-filter-pill ${filterTag === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTag('all')}
        >
          All
        </button>
        <button
          className={`spotify-filter-pill ${filterTag === 'music' ? 'active' : ''}`}
          onClick={() => setFilterTag('music')}
        >
          Music
        </button>
        <button
          className={`spotify-filter-pill ${filterTag === 'podcasts' ? 'active' : ''}`}
          onClick={() => setFilterTag('podcasts')}
        >
          Podcasts
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          GREETING + QUICK ACCESS GRID (Exact Spotify Desktop)
          ══════════════════════════════════════════════════════ */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <div className="sp-home-greeting-section">
          <h1 className="sp-home-greeting">{greeting}</h1>

          {/* 2-col quick access grid with 6 cards */}
          <div className="sp-quick-access-grid">
            {quickAccessItems.map((item, _idx) => (
              <button
                key={item.id}
                className={`sp-quick-access-card ${
                  currentSong && item.type === 'song' && (item.data as Song)?.id === currentSong.id && isPlaying
                    ? 'playing'
                    : ''
                }`}
                onClick={() => handleQuickAccessClick(item)}
                title={item.title}
              >
                {/* Cover thumbnail */}
                <div className={`sp-qa-cover ${item.id === 'liked-songs' ? 'sp-qa-liked' : ''}`}>
                  {item.id === 'liked-songs' ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  ) : item.coverUrl ? (
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  )}
                </div>
                {/* Title */}
                <span className="sp-qa-title">{item.title}</span>
                {/* Hover play button */}
                <div className="sp-qa-play-btn">
                  <Play size={16} fill="#000" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 1: Based on your recent listening (Screenshot 426) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <span className="spotify-shelf-pretitle">Inspired by your recent activity</span>
              <h2 className="spotify-shelf-main-title">Based on your recent listening</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {recentListeningCards.map((item, idx) => (
              <div
                key={item.id}
                className="spotify-media-card"
                onClick={() => handlePlayCard(idx)}
              >
                <div className="spotify-media-card-cover-wrap">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="spotify-media-card-cover"
                    loading="lazy"
                  />
                  <div className="spotify-watermark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  {/* Title overlay on cover */}
                  {item.titleOnCover && (
                    <div className="spotify-cover-title-overlay">
                      <span className="spotify-cover-title-text">{item.title}</span>
                    </div>
                  )}
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx);
                    }}
                    title={`Play ${item.title}`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>
                <div className="spotify-media-card-meta">
                  <div className="spotify-media-card-sub">{item.subtitle}</div>
                  {item.badge && <span className="spotify-card-badge-yellow">{item.badge}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: Recommended Stations (Screenshot 426) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <span className="spotify-shelf-pretitle">Non-stop music based on your favorite songs and artists.</span>
              <h2 className="spotify-shelf-main-title">Recommended Stations</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {radioStations.map((station, idx) => (
              <div
                key={station.id}
                className="spotify-radio-card"
                style={{ backgroundColor: station.bgColor }}
                onClick={() => handlePlayCard(idx + 5)}
              >
                <div className="spotify-radio-top-bar">
                  <div className="spotify-watermark-dark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <span className="spotify-radio-tag">RADIO</span>
                </div>

                {/* Overlapping circular artist cutouts */}
                <div className="spotify-radio-art-group">
                  {station.cutoutUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={station.artist}
                      className={`spotify-radio-circle-img circle-${i + 1}`}
                    />
                  ))}
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx + 5);
                    }}
                    title={`Play ${station.artist} Radio`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>

                <div className="spotify-radio-meta">
                  <h3 className="spotify-radio-artist">{station.artist}</h3>
                  <p className="spotify-radio-sub">{station.artistsText}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 3: Recommended for today (Screenshot 427) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <span className="spotify-shelf-pretitle">Inspired by your recent activity</span>
              <h2 className="spotify-shelf-main-title">Recommended for today</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {recommendedToday.map((item, idx) => (
              <div
                key={item.id}
                className="spotify-media-card"
                onClick={() => handlePlayCard(idx + 2)}
              >
                <div className="spotify-media-card-cover-wrap">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="spotify-media-card-cover"
                    loading="lazy"
                  />
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx + 2);
                    }}
                    title={`Play ${item.title}`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>
                <div className="spotify-media-card-meta">
                  <div className="spotify-media-card-title">{item.title}</div>
                  <div className="spotify-media-card-sub">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4: More of what you like (Screenshot 428) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <span className="spotify-shelf-pretitle">Hear a little bit of everything you love.</span>
              <h2 className="spotify-shelf-main-title">More of what you like</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {moreOfWhatYouLikeCards.map((item, idx) => (
              <div
                key={item.id}
                className="spotify-media-card"
                onClick={() => handlePlayCard(idx + 1)}
              >
                <div className="spotify-media-card-cover-wrap">
                  <img
                    src={item.coverUrl}
                    alt={item.title}
                    className="spotify-media-card-cover"
                    loading="lazy"
                  />
                  <div className="spotify-watermark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  {item.titleOnCover && (
                    <div className="spotify-cover-title-overlay">
                      <span className="spotify-cover-title-text">{item.title}</span>
                    </div>
                  )}
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx + 1);
                    }}
                    title={`Play ${item.title}`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>
                <div className="spotify-media-card-meta">
                  <div className="spotify-media-card-sub">{item.subtitle}</div>
                  {item.badge && <span className="spotify-card-badge-yellow">{item.badge}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 5: Popular Radio (Screenshot 428) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <h2 className="spotify-shelf-main-title">Popular radio</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {popularRadioStations.map((station, idx) => (
              <div
                key={station.id}
                className="spotify-radio-card"
                style={{ backgroundColor: station.bgColor }}
                onClick={() => handlePlayCard(idx + 3)}
              >
                <div className="spotify-radio-top-bar">
                  <div className="spotify-watermark-dark">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#000000">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                    </svg>
                  </div>
                  <span className="spotify-radio-tag">RADIO</span>
                </div>

                <div className="spotify-radio-art-group">
                  {station.cutoutUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={station.artist}
                      className={`spotify-radio-circle-img circle-${i + 1}`}
                    />
                  ))}
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx + 3);
                    }}
                    title={`Play ${station.artist} Radio`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>

                <div className="spotify-radio-meta">
                  <h3 className="spotify-radio-artist">{station.artist}</h3>
                  <p className="spotify-radio-sub">{station.artistsText}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6: Your favorite artists (Screenshot 446) */}
      {(filterTag === 'all' || filterTag === 'music') && (
        <section className="spotify-shelf-section">
          <div className="spotify-shelf-header">
            <div className="spotify-shelf-titles">
              <h2 className="spotify-shelf-main-title">Your favorite artists</h2>
            </div>
            <button className="spotify-show-all-btn">Show all</button>
          </div>

          <div className="spotify-card-shelf-grid">
            {favoriteArtists.map((artist, idx) => (
              <div
                key={artist.id}
                className="spotify-media-card spotify-artist-card-item"
                onClick={() => handlePlayCard(idx)}
              >
                <div className="spotify-media-card-cover-wrap sp-artist-round-wrap">
                  <img
                    src={artist.avatarUrl}
                    alt={artist.name}
                    className="spotify-media-card-cover sp-artist-round-img"
                    loading="lazy"
                  />
                  <button
                    className="spotify-floating-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayCard(idx);
                    }}
                    title={`Play ${artist.name}`}
                  >
                    <Play size={22} fill="#000000" />
                  </button>
                </div>
                <div className="spotify-media-card-meta">
                  <div className="spotify-media-card-title">{artist.name}</div>
                  <div className="spotify-media-card-sub">Artist</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 7: 2-Column Large Cards (Screenshot 431, 432, 435, 438) */}
      <section className="spotify-wide-cards-grid">
        {largeCards.map((card, idx) => (
          <div
            key={card.id}
            className="spotify-wide-card"
            onClick={() => handlePlayCard(idx)}
          >
            <div
              className="spotify-wide-bg"
              style={{ backgroundImage: `url(${card.bgUrl})` }}
            />
            <div className="spotify-wide-overlay" />
            <div className="spotify-wide-content">
              <span className="spotify-wide-category">{card.category}</span>
              <div className="spotify-wide-header-row">
                <img src={card.thumbUrl} alt={card.title} className="spotify-wide-thumb" />
                <div>
                  <h3 className="spotify-wide-title">{card.title}</h3>
                  <span className="spotify-wide-source">{card.source}</span>
                </div>
              </div>
              <p className="spotify-wide-desc">{card.description}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

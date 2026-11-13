/**
 * SpotifyLayout.tsx
 * Full pixel-perfect Spotify Desktop UI shell.
 * Implements the EXACT layout from screenshots 426-453 and mera design.txt:
 *   - Windows titlebar (3-dots menu + nav arrows + home icon + search pill with browse icon + bell + friends + avatar + win controls)
 *   - 3-panel main area: [Sidebar 280px (hidden in full lyrics)] [Center Content / Red Full Lyrics] [Right Panel 340px (Now Playing or Queue)]
 *   - Floating Mini-Player (PiP window)
 *   - Bottom player bar (pure black, 90px, full control suite with active green dots)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Home, Search, Bell, Users, ChevronLeft, ChevronRight, Plus, Check, Library, Maximize2,
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1,
  Heart, Mic2, ListMusic, PlusCircle, Moon, X, ArrowUpDown,
  Compass, MoreHorizontal, Laptop, PictureInPicture2,
  Minus, Square, User
} from 'lucide-react';
import type { Song, Playlist, Album, DailyDiscoverItem } from '../types';
import type { TasteProfile } from '../services/historyService';
import type { UserProfile } from '../services/authService';
import { SpotifyHome } from './SpotifyHome';
import { SpotifyExplore } from './SpotifyExplore';
import { SpotifyPlaylistView } from './SpotifyPlaylistView';
import { SpotifyRightPanel } from './SpotifyRightPanel';
import { SpotifySongView } from './SpotifySongView';
import { INITIAL_ALBUMS } from '../data/musicData';
import { SpotifyArtistView } from './SpotifyArtistView';
import { SpotifyQueuePanel } from './SpotifyQueuePanel';
import { RosePinkLyricsView } from './RosePinkLyricsView';
import { LyricReelExportModal } from './LyricReelExportModal';
import { isInvalidCoverUrl } from '../services/playlistService';
import '../rose-pink-lyrics.css';

interface SpotifyLayoutProps {
  // Playback state
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
  // Content
  songs: Song[];
  albums: Album[];
  playlists: Playlist[];
  likedSongs: Song[];
  dailyDiscover?: DailyDiscoverItem[];
  listenAgain?: Song[];
  similarShelf?: { title: string; songs: Song[] } | null;
  mostPlayed?: { song: Song; playCount: number; genreType: string }[];
  tasteProfile?: TasteProfile;
  favoriteArtistShelf?: { title: string; subtitle: string; songs: Song[] } | null;
  // User
  user?: UserProfile | null;
  // Active view & navigation
  activeView: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album' | 'artist';
  selectedPlaylistId: string | null;
  selectedAlbumId: string | null;
  // Drawer state
  isLyricsOpen: boolean;
  isQueueOpen: boolean;
  isNowPlayingViewOpen: boolean;
  // Sleep
  isSleepTimerActive?: boolean;
  sleepRemainingText?: string | null;
  // Handlers
  onPlaySong: (song: Song, queue?: Song[]) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLike: (songId: string) => void;
  onAddToPlaylist: (song: Song) => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onToggleNowPlayingView: () => void;
  onOpenNowPlaying: () => void;
  onOpenSleepTimer: () => void;
  onCreatePlaylist: () => void;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectAlbum: (albumId: string) => void;
  setActiveView: (view: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album' | 'artist') => void;
  onOpenLibrary: (filter?: 'all' | 'liked' | 'cached' | 'playlists') => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onSelectSong: (song: Song) => void;
  onOpenListenTogether: () => void;
  onOpenSettings: () => void;
  onGoSunoNa: () => void; // Switch back to SunoNa mode
  onRemoveSong?: (playlistId: string, songId: string, index?: number) => void;
  onRemoveFromQueue?: (index: number) => void;
}

function formatTime(secs: number) {
  if (!Number.isFinite(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const SpotifyLayout: React.FC<SpotifyLayoutProps> = ({
  currentSong, isPlaying, currentTime, duration, volume, isMuted,
  isShuffle, repeatMode, queue, songs, albums, playlists, likedSongs,
  dailyDiscover, listenAgain, similarShelf, mostPlayed, tasteProfile,
  favoriteArtistShelf, user,
  activeView, selectedPlaylistId, selectedAlbumId,
  isLyricsOpen, isQueueOpen, isNowPlayingViewOpen,
  isSleepTimerActive, sleepRemainingText,
  onPlaySong, onTogglePlay, onNext, onPrev, onSeek,
  onVolumeChange, onToggleMute, onToggleShuffle, onToggleRepeat,
  onToggleLike, onAddToPlaylist, onToggleLyrics, onToggleQueue,
  onToggleNowPlayingView, onOpenNowPlaying: _onOpenNowPlaying, onOpenSleepTimer,
  onCreatePlaylist, onSelectPlaylist, onSelectAlbum,
  setActiveView, onOpenLibrary, onOpenAuth, onOpenProfile,
  onSelectSong, onOpenListenTogether, onOpenSettings, onGoSunoNa,
  onRemoveSong, onRemoveFromQueue,
}) => {
  const [spotifyLibTab, setSpotifyLibTab] = useState<'playlists' | 'albums' | 'artists' | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [focusedNavIndex, setFocusedNavIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const getRecentSearchesKey = (uid?: string) => `spotify_recent_searches_${uid || 'guest'}`;

  const [recentSearches, setRecentSearches] = useState<{ id: string; title: string; artist: string; coverUrl: string; explicit?: boolean }[]>(() => {
    try {
      const stored = localStorage.getItem(`spotify_recent_searches_${user?.uid || 'guest'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  // Re-sync recent searches when active user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getRecentSearchesKey(user?.uid));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
          return;
        }
      }
    } catch {}
    setRecentSearches([]);
  }, [user?.uid]);

  const saveRecentSearch = useCallback((song: { id: string; title: string; artist: string; coverUrl?: string; explicit?: boolean }) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.title.toLowerCase() !== song.title.toLowerCase());
      const newEntry = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        explicit: song.explicit || false,
      };
      const updated = [newEntry, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(getRecentSearchesKey(user?.uid), JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [user?.uid]);

  const removeRecentSearch = useCallback((songId: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(item => item.id !== songId);
      try {
        localStorage.setItem(getRecentSearchesKey(user?.uid), JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [user?.uid]);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [isSongViewActive, setIsSongViewActive] = useState(false);
  const [lyricsTheme, setLyricsTheme] = useState<'classic' | 'rose'>('rose');
  const [isReelExportOpen, setIsReelExportOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Progress bar drag
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgressRatio, setDragProgressRatio] = useState<number | null>(null);
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  const calculateRatioFromEvent = useCallback((clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    return Math.max(0, Math.min(1, clickX / rect.width));
  }, []);

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentSong || duration <= 0) return;
    e.preventDefault();
    setIsDragging(true);
    setDragProgressRatio(calculateRatioFromEvent(e.clientX));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || duration <= 0) return;
      setDragProgressRatio(calculateRatioFromEvent(e.clientX));
    };
    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef.current && duration > 0) {
        onSeek(calculateRatioFromEvent(e.clientX) * duration);
      }
      setIsDragging(false);
      setDragProgressRatio(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [calculateRatioFromEvent, duration, onSeek]);

  const activeRatio = dragProgressRatio !== null ? dragProgressRatio : (duration > 0 ? currentTime / duration : 0);
  const progressPercent = Math.max(0, Math.min(100, activeRatio * 100));

  // Volume bar
  const volumeBarRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingVol, setIsDraggingVol] = useState(false);
  const isDraggingVolRef = useRef(false);
  isDraggingVolRef.current = isDraggingVol;

  const calcVolRatio = useCallback((clientX: number): number => {
    if (!volumeBarRef.current) return 0;
    const rect = volumeBarRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleVolMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingVol(true);
    onVolumeChange(calcVolRatio(e.clientX));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingVolRef.current) return;
      onVolumeChange(calcVolRatio(e.clientX));
    };
    const handleMouseUp = () => setIsDraggingVol(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [calcVolRatio, onVolumeChange]);

  // Spotify LTR Engine: Search Click-Through Rate (CTR) Tracking in LocalStorage
  const getSearchClickHistory = (q: string): string => {
    try {
      const stored = localStorage.getItem('suno_search_ctr');
      if (!stored) return '';
      const map = JSON.parse(stored);
      return (map[q.toLowerCase().trim()] || []).slice(0, 5).join(',');
    } catch {
      return '';
    }
  };

  const recordSearchClick = (q: string, songTitle: string) => {
    try {
      const stored = localStorage.getItem('suno_search_ctr');
      const map = stored ? JSON.parse(stored) : {};
      const key = q.toLowerCase().trim();
      if (!map[key]) map[key] = [];
      if (!map[key].includes(songTitle)) {
        map[key].unshift(songTitle);
        if (map[key].length > 5) map[key].pop();
      }
      localStorage.setItem('suno_search_ctr', JSON.stringify(map));
    } catch {}
  };

  // Live search powered by 6-Pillar Spotify LTR Engine + Instant Local Fallback
  const executeSearch = (val: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    setIsSearching(true);

    // Instant local search for 0ms responsiveness even offline
    const qLower = val.toLowerCase().trim();
    const localSongMatches = songs.filter(s =>
      s.title.toLowerCase().includes(qLower) || s.artist.toLowerCase().includes(qLower)
    );
    if (localSongMatches.length > 0) {
      setSearchResults(localSongMatches.slice(0, 6));
      setSearchSuggestions(
        Array.from(new Set([
          ...localSongMatches.map(s => s.title),
          ...localSongMatches.map(s => s.artist)
        ])).slice(0, 4)
      );
    }

    // Extract real-time LTR personalization context
    const topArtists = (tasteProfile?.topArtists || []).slice(0, 3).map(a => a.artist).join(',');
    const currentGenre = currentSong ? ((currentSong as any).genre || '') : '';
    const likedIds = (likedSongs || []).slice(0, 20).map(s => s.id).join(',');
    const hour = new Date().getHours();
    const clicks = getSearchClickHistory(val);

    const params = new URLSearchParams({
      q: val,
      hour: hour.toString(),
      artists: topArtists,
      genre: currentGenre,
      clicks: clicks,
      liked: likedIds
    });

    fetch(`/api/search?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.suggestions && data.suggestions.length > 0) setSearchSuggestions(data.suggestions.slice(0, 4));
        if (data.results && data.results.length > 0) setSearchResults(data.results.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setIsSearching(false));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setFocusedNavIndex(-1);
    if (!val.trim()) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
      return;
    }
    setShowSearchDropdown(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(val);
    }, 250);
  };

  const handleSuggestionClick = (sugg: string) => {
    setSearchQuery(sugg);
    setSearchSuggestions([]);
    executeSearch(sugg);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = searchSuggestions.length + searchResults.length;
    if (totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedNavIndex(prev => (prev + 1) % totalItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedNavIndex(prev => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedNavIndex >= 0 && focusedNavIndex < searchSuggestions.length) {
        handleSuggestionClick(searchSuggestions[focusedNavIndex]);
      } else if (focusedNavIndex >= searchSuggestions.length) {
        const songIdx = focusedNavIndex - searchSuggestions.length;
        if (searchResults[songIdx]) handleSearchSelect(searchResults[songIdx]);
      } else if (searchResults.length > 0) {
        handleSearchSelect(searchResults[0]);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
    }
  };

  const handleSearchSelect = (song: Song | { id: string; title: string; artist: string; coverUrl?: string; explicit?: boolean }) => {
    recordSearchClick(searchQuery, song.title);
    saveRecentSearch(song);

    const fullSong: Song = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: (song as any).album || 'Single',
      duration: (song as any).duration || 210,
      coverUrl: song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      audioUrl: (song as any).audioUrl || '',
      lyrics: (song as any).lyrics || [],
    };
    onSelectSong(fullSong);
    setIsSongViewActive(true);

    // Keep dropdown open until the background song page opens smoothly!
    setTimeout(() => {
      setShowSearchDropdown(false);
      setSearchQuery('');
      setSearchSuggestions([]);
      setSearchResults([]);
    }, 280);
  };

  const renderBoldedMatch = (fullText: string, query: string) => {
    if (!query) return fullText;
    const lowerFull = fullText.toLowerCase();
    const lowerQ = query.toLowerCase();
    const matchIdx = lowerFull.indexOf(lowerQ);
    if (matchIdx === -1) return fullText;
    const before = fullText.slice(0, matchIdx);
    const matched = fullText.slice(matchIdx, matchIdx + query.length);
    const after = fullText.slice(matchIdx + query.length);
    return (
      <>
        {before}
        <strong>{matched}</strong>
        {after}
      </>
    );
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
  const isCurrentSongLiked = currentSong ? likedSongs.some((s) => s.id === currentSong.id) : false;

  const likedSongsPlaylist: Playlist = {
    id: 'liked-songs',
    title: 'Liked Songs',
    description: `${user?.displayName || 'My Library'} • ${likedSongs.length} songs`,
    coverUrl: '',
    songs: likedSongs,
    songCount: likedSongs.length,
    isCurated: true,
  };

  interface SpotifyLibEntry {
    id: string;
    title: string;
    sub: string;
    coverUrl: string;
    isLiked?: boolean;
    isArtist?: boolean;
    type: 'playlist' | 'album' | 'artist';
  }

  const allLibraryItems: SpotifyLibEntry[] = [
    {
      id: 'liked-songs',
      title: 'Liked Songs',
      sub: `Playlist • ${user?.displayName || 'My Library'}`,
      coverUrl: '',
      isLiked: true,
      type: 'playlist',
    },
    {
      id: 'best-bollywood-love',
      title: 'Best Bollywood Love Songs',
      sub: 'Playlist • Revibe',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&auto=format&fit=crop&q=80',
      type: 'playlist',
    },
    {
      id: 'alb-iv',
      title: 'International Villager',
      sub: 'Album • Yo Yo Honey Singh',
      coverUrl: 'https://i.ytimg.com/vi/12CeaxLiMgE/hqdefault.jpg',
      type: 'album',
    },
    {
      id: 'alb-dk',
      title: 'Desi Kalakaar',
      sub: 'Album • Yo Yo Honey Singh',
      coverUrl: 'https://i.ytimg.com/vi/KhnVcAC5bIM/hqdefault.jpg',
      type: 'album',
    },
    {
      id: 'art-imran',
      title: 'Imran Khan',
      sub: 'Artist',
      coverUrl: 'https://i.ytimg.com/vi/uuCFRaFWjwY/hqdefault.jpg',
      isArtist: true,
      type: 'artist',
    },
    {
      id: 'art-yyhs',
      title: 'Yo Yo Honey Singh',
      sub: 'Artist',
      coverUrl: 'https://i.ytimg.com/vi/v6F7Bw9cXFg/hqdefault.jpg',
      isArtist: true,
      type: 'artist',
    },
    {
      id: 'art-diljit',
      title: 'Diljit Dosanjh',
      sub: 'Artist',
      coverUrl: 'https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg',
      isArtist: true,
      type: 'artist',
    },
    ...playlists.filter(p => p.id !== 'liked-songs').map(p => {
      const validSongCover = p.songs?.find(s => !isInvalidCoverUrl(s.coverUrl))?.coverUrl;
      const cleanCover = !isInvalidCoverUrl(p.coverUrl)
        ? p.coverUrl
        : (validSongCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80');
      return {
        id: p.id,
        title: p.title,
        sub: `Playlist • ${user?.displayName || 'My Library'}`,
        coverUrl: cleanCover,
        type: 'playlist' as const,
      };
    }),
  ];

  const filteredLibrary = spotifyLibTab
    ? allLibraryItems.filter(item => {
        if (spotifyLibTab === 'playlists') return item.type === 'playlist';
        if (spotifyLibTab === 'albums') return item.type === 'album';
        if (spotifyLibTab === 'artists') return item.type === 'artist';
        return true;
      })
    : allLibraryItems;

  const handleLibraryItemClick = (item: SpotifyLibEntry) => {
    setIsSongViewActive(false);
    if (item.id === 'liked-songs') {
      onOpenLibrary('liked');
      return;
    }
    if (item.type === 'album') {
      const foundAlbum = INITIAL_ALBUMS.find(a => a.id === item.id || a.title.toLowerCase() === item.title.toLowerCase());
      if (foundAlbum) {
        onSelectAlbum(foundAlbum.id);
      } else {
        onSelectAlbum(item.id);
      }
      return;
    }
    if (item.type === 'artist' || item.isArtist) {
      setSelectedArtist(item.title);
      setActiveView('artist');
      return;
    }
    // Check if album has this id or title (e.g. best-bollywood-love, pl-another)
    const foundAlbum = INITIAL_ALBUMS.find(a => a.id === item.id || a.title.toLowerCase() === item.title.toLowerCase());
    if (foundAlbum) {
      onSelectAlbum(foundAlbum.id);
      return;
    }
    const foundPlaylist = playlists.find(p => p.id === item.id);
    if (foundPlaylist) {
      onSelectPlaylist(foundPlaylist.id);
    } else {
      onSelectPlaylist(item.id);
    }
  };

  // Right panel visibility logic:
  // In Screenshot 442, when isLyricsOpen is true, right panel shows Queue!
  const showRightPanel = isNowPlayingViewOpen || isLyricsOpen || isQueueOpen;

  // Toggle fullscreen via Windows button
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="sp-root">
      {/* ══════════════════════════════════════════════════════
          TOP TITLE BAR (Windows Native Spotify Desktop Bar)
          Screenshot 426: [3-dots < >] [ (Home) (Search | Browse) ] [Mode Bell Users Avatar — □ ✕]
          ══════════════════════════════════════════════════════ */}
      <div className="sp-titlebar">
        {/* Left: 3-dots menu button + nav arrows */}
        <div className="sp-titlebar-left">
          <div className="sp-dots-menu-wrap" style={{ position: 'relative' }}>
            <button
              className="sp-nav-arrow sp-dots-btn"
              onClick={() => setShowTopMenu(prev => !prev)}
              title="Spotify menu"
            >
              <MoreHorizontal size={18} />
            </button>
            {showTopMenu && (
              <div className="spotify-top-dropdown" onClick={(e) => e.stopPropagation()}>
                <button className="spotify-top-menu-item" onClick={() => { onGoSunoNa(); setShowTopMenu(false); }}>
                  Switch to SunoNa mode
                </button>
                <button className="spotify-top-menu-item" onClick={() => { onOpenSettings(); setShowTopMenu(false); }}>
                  Settings
                </button>
                <div className="spotify-top-menu-divider" />
                <button className="spotify-top-menu-item" onClick={() => setShowTopMenu(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
          <button
            className="sp-nav-arrow"
            title="Go Back"
            onClick={() => {
              if (activeView !== 'home' || isSongViewActive || isLyricsOpen) {
                if (isLyricsOpen) onToggleLyrics();
                setIsSongViewActive(false);
                setActiveView('home');
              } else {
                window.history.back();
              }
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button className="sp-nav-arrow" title="Go Forward" onClick={() => window.history.forward()}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center: Home circle + Capsule Search with Browse divider */}
        <div className="sp-titlebar-center">
          <button
            className={`sp-home-pill ${activeView === 'home' && !isLyricsOpen ? 'active' : ''}`}
            onClick={() => {
              if (isLyricsOpen) onToggleLyrics();
              setIsSongViewActive(false);
              setActiveView('home');
            }}
            title="Home"
          >
            <Home size={22} fill="#ffffff" color="#ffffff" />
          </button>

          <div className="sp-search-pill">
            <Search size={16} className="sp-search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="What do you want to play?"
              className="sp-search-input"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 300)}
            />
            {searchQuery && (
              <button
                className="sp-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchSuggestions([]);
                  setShowSearchDropdown(true);
                  if (searchInputRef.current) searchInputRef.current.focus();
                }}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
            <div className="sp-search-divider" />
            <button
              className="sp-browse-pill"
              onClick={() => {
                if (isLyricsOpen) onToggleLyrics();
                setIsSongViewActive(false);
                setActiveView('explore');
              }}
              title="Browse"
            >
              <Compass size={18} />
            </button>

            {/* Spotify 1:1 Search dropdown */}
            {showSearchDropdown && (
              <div className="sp-search-dropdown" onMouseDown={(e) => e.stopPropagation()}>
                {!searchQuery.trim() ? (
                  /* Spotify Native Recent Searches (matching Screenshot & Video) */
                  <div className="sp-recent-searches-container">
                    <div className="sp-recent-searches-title">Recent searches</div>
                    <div className="sp-recent-searches-list">
                      {recentSearches.map((item) => (
                        <div
                          key={item.id}
                          className="sp-recent-search-row"
                          onMouseDown={() => handleSearchSelect(item as any)}
                        >
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            className="sp-recent-search-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="sp-recent-search-meta">
                            <div className="sp-recent-search-name">{item.title}</div>
                            <div className="sp-recent-search-sub">
                              {item.explicit && <span className="sp-explicit-tag">E</span>}
                              <span>Song • {item.artist}</span>
                            </div>
                          </div>
                          <button
                            className="sp-recent-search-remove"
                            title="Remove from recent searches"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              removeRecentSearch(item.id);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Keyboard hints header */}
                    <div className="sp-search-header">
                      <div className="sp-search-header-left"></div>
                      <div className="sp-search-header-right">
                        <span className="sp-key-badge">↑</span>
                        <span className="sp-key-badge">↓</span>
                        <span className="sp-header-text">Navigate</span>
                        <span className="sp-key-badge" style={{ marginLeft: '8px' }}>Enter</span>
                        <span className="sp-header-text">Search</span>
                      </div>
                    </div>

                    {/* Text query suggestions */}
                    {searchSuggestions.map((sugg, idx) => {
                      const isFocused = focusedNavIndex === idx;
                      return (
                        <div
                          key={`sugg-${idx}`}
                          className={`sp-search-sugg-row ${isFocused ? 'active' : ''}`}
                          onMouseDown={() => handleSuggestionClick(sugg)}
                        >
                          <Search size={16} className="sp-search-sugg-icon" />
                          <span className="sp-search-sugg-text">
                            {renderBoldedMatch(sugg, searchQuery)}
                          </span>
                        </div>
                      );
                    })}

                    {searchSuggestions.length > 0 && searchResults.length > 0 && (
                      <div className="sp-search-section-divider" />
                    )}

                    {/* Entity results (Song, Album, Playlist) */}
                    {isSearching && searchResults.length === 0 ? (
                      <div className="sp-search-loading">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <>
                        {searchResults.map((song, sIdx) => {
                          const itemIndex = searchSuggestions.length + sIdx;
                          const isFocused = focusedNavIndex === itemIndex;
                          const isLiked = likedSongs.some((s) => s.id === song.id);
                          const subtitle = (song as any).subtitle || `Song • ${song.artist}`;
                          return (
                            <div
                              key={song.id || sIdx}
                              className={`sp-search-result ${isFocused ? 'active' : ''}`}
                              onMouseDown={() => handleSearchSelect(song)}
                              title={`${song.title}\n${subtitle}`}
                            >
                              <div className="sp-search-result-thumb-wrapper">
                                <img
                                  src={song.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                                  alt={song.title}
                                  className="sp-search-result-img"
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                                  }}
                                />
                                <div className="sp-search-play-overlay">
                                  <Play size={14} fill="#ffffff" color="#ffffff" />
                                </div>
                              </div>
                              <div className="sp-search-result-meta">
                                <span className="sp-search-result-title">{song.title}</span>
                                <span className="sp-search-result-artist">{subtitle}</span>
                              </div>
                              <div className="sp-search-result-actions">
                                <button
                                  className="sp-search-more-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  title="More options"
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                                <button
                                  className="sp-search-add-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLike(song.id);
                                  }}
                                  title={isLiked ? 'Saved to Liked Songs' : 'Save to Liked Songs'}
                                >
                                  {isLiked ? <Check size={16} color="#1ed760" /> : <Plus size={16} />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <div
                          className="sp-view-all-results-btn"
                          onMouseDown={() => {
                            if (searchResults.length > 0) {
                              handleSearchSelect(searchResults[0]);
                            }
                          }}
                        >
                          <Search size={16} color="#b3b3b3" />
                          <span>View all results for "{searchQuery}"</span>
                        </div>
                      </>
                    ) : !isSearching && searchSuggestions.length === 0 ? (
                      <div className="sp-search-empty">No results for "{searchQuery}"</div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mode toggle + Bell + Friends + Avatar + Windows Controls */}
        <div className="sp-titlebar-right">
          {/* Segmented Mode toggle pill */}
          <div className="header-ui-mode-pill sp-mode-segmented">
            <button
              className="header-ui-mode-btn active"
              onClick={(e) => { e.stopPropagation(); }}
              title="Spotify Desktop UI (Active)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <span>Spotify</span>
            </button>
            <button
              className="header-ui-mode-btn"
              onClick={onGoSunoNa}
              title="Switch to SunoNa Original UI"
            >
              <img
                src="/logo.jpg"
                alt="SunoNa"
                style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <span>SunoNa</span>
            </button>
          </div>

          <button className="sp-icon-btn" title="What's New / Notifications"><Bell size={18} /></button>
          <button className="sp-icon-btn" title="Friend Activity" onClick={onOpenListenTogether}><Users size={18} /></button>

          {/* Profile Avatar */}
          {user ? (
            <button className="sp-avatar-btn" onClick={onOpenProfile} title={user.displayName || 'Profile'}>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'avatar'}
                  className="sp-avatar-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="sp-avatar-letter">{(user.displayName || 'U')[0].toUpperCase()}</span>
              )}
            </button>
          ) : (
            <button className="sp-avatar-btn" onClick={onOpenAuth} title="Sign In">
              <User size={15} />
            </button>
          )}

          {/* Windows titlebar control buttons (Screenshot 426: — □ ✕) */}
          <div className="sp-win-controls">
            <button className="sp-win-btn" title="Minimize">
              <Minus size={14} />
            </button>
            <button className="sp-win-btn" onClick={toggleFullscreen} title="Maximize">
              <Square size={12} />
            </button>
            <button className="sp-win-btn sp-win-btn-close" onClick={onGoSunoNa} title="Close / Switch Mode">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN AREA: Sidebar + Content + (Right Panel)
          Per mera design.txt: In Lyrics mode, sidebar is hidden!
          ══════════════════════════════════════════════════════ */}
      <div className={`sp-main ${showRightPanel ? 'rp-open' : ''} ${isLyricsOpen ? 'lyrics-mode-main' : ''}`}>

        {/* ── LEFT SIDEBAR (Hidden during full lyrics view) ── */}
        {!isLyricsOpen && (
          <aside className="sp-sidebar">
            {/* Top box: Home + Search nav */}
            <div className="sp-sidebar-top">
              <button
                className={`sp-sidebar-nav-row ${activeView === 'home' && !isSongViewActive ? 'active' : ''}`}
                onClick={() => {
                  setIsSongViewActive(false);
                  setActiveView('home');
                }}
              >
                <Home size={24} className="sp-sidebar-icon" fill={activeView === 'home' && !isSongViewActive ? '#ffffff' : 'none'} />
                <span>Home</span>
              </button>
              <button
                className={`sp-sidebar-nav-row ${activeView === 'explore' && !isSongViewActive ? 'active' : ''}`}
                onClick={() => {
                  setIsSongViewActive(false);
                  setActiveView('explore');
                }}
              >
                <Search size={24} className="sp-sidebar-icon" />
                <span>Search</span>
              </button>
            </div>

            {/* Library box */}
            <div className="sp-sidebar-library">
              {/* Library header */}
              <div className="sp-lib-header">
                <button className="sp-lib-title-btn" onClick={() => onOpenLibrary()}>
                  <Library size={24} className="sp-sidebar-icon" />
                  <span className="sp-lib-title">Your Library</span>
                </button>
                <div className="sp-lib-actions">
                  <button className="sp-lib-icon-btn" onClick={onCreatePlaylist} title="Create playlist or folder">
                    <Plus size={20} />
                  </button>
                  <button className="sp-lib-icon-btn" onClick={() => onOpenLibrary()} title="Expand library">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>

              {/* Filter chips */}
              <div className="sp-lib-chips">
                <button
                  className={`sp-lib-chip ${spotifyLibTab === 'playlists' ? 'active' : ''}`}
                  onClick={() => setSpotifyLibTab(prev => prev === 'playlists' ? null : 'playlists')}
                >Playlists</button>
                <button
                  className={`sp-lib-chip ${spotifyLibTab === 'albums' ? 'active' : ''}`}
                  onClick={() => setSpotifyLibTab(prev => prev === 'albums' ? null : 'albums')}
                >Albums</button>
                <button
                  className={`sp-lib-chip ${spotifyLibTab === 'artists' ? 'active' : ''}`}
                  onClick={() => setSpotifyLibTab(prev => prev === 'artists' ? null : 'artists')}
                >Artists</button>
              </div>

              {/* Search + sort row */}
              <div className="sp-lib-search-row">
                <button className="sp-lib-icon-btn" title="Search in Your Library"><Search size={16} /></button>
                <span className="sp-lib-recents">Recents</span>
                <button className="sp-lib-icon-btn" title="Sort by Recents"><ArrowUpDown size={16} /></button>
              </div>

              {/* Library items list */}
              <div className="sp-lib-items">
                {filteredLibrary.map(item => {
                  const isActive = (selectedPlaylistId === item.id) ||
                    (activeView === 'library' && item.id === 'liked-songs');
                  const isLiked = item.id === 'liked-songs';
                  const isNowPlaying = !!(currentSong && (
                    (item.type === 'album' && currentSong.album === item.title) ||
                    (item.type === 'playlist' && playlists.find(p => p.id === item.id)?.songs?.some(s => s.id === currentSong.id))
                  ));

                  return (
                    <button
                      key={item.id}
                      className={`sp-lib-item ${isActive ? 'active' : ''} ${isNowPlaying ? 'is-playing' : ''}`}
                      onClick={() => handleLibraryItemClick(item)}
                    >
                      <div className={`sp-lib-item-cover ${isLiked ? 'liked-cover' : ''} ${item.isArtist ? 'sp-artist-circle' : ''}`}>
                        {isLiked ? (
                          <Heart size={20} fill="#ffffff" color="#ffffff" />
                        ) : item.coverUrl ? (
                          <img
                            src={item.coverUrl}
                            alt={item.title}
                            onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              if (img.naturalWidth === 120 && img.naturalHeight === 90) {
                                img.src = item.isArtist ? '/images/ylx-artist-row-placeholder.webp' : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                              }
                            }}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.src = item.isArtist ? '/images/ylx-artist-row-placeholder.webp' : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                        ) : (
                          <div className="sp-lib-item-placeholder">
                            <ListMusic size={18} />
                          </div>
                        )}
                      </div>
                      <div className="sp-lib-item-meta">
                        <span className="sp-lib-item-title">{item.title}</span>
                        <span className="sp-lib-item-sub">
                          {isLiked && (
                            <svg className="sp-pin-icon" width="12" height="12" viewBox="0 0 24 24" fill="#1ed760" style={{ display: 'inline', verticalAlign: '-1px', marginRight: 4 }}>
                              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                            </svg>
                          )}
                          {item.sub}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        )}

        {/* ── CENTER CONTENT (Home / Explore / Playlist / Full Lyrics) ── */}
        <main className={`sp-content ${isLyricsOpen ? 'sp-full-lyrics-container' : ''}`}>
          {isLyricsOpen ? (
            lyricsTheme === 'rose' ? (
              <RosePinkLyricsView
                currentSong={currentSong}
                currentTime={currentTime}
                duration={duration}
                isPlaying={isPlaying}
                onSeek={onSeek}
                onTogglePlay={onTogglePlay}
                onClose={onToggleLyrics}
                onSwitchTheme={() => setLyricsTheme('classic')}
                onOpenExportModal={() => setIsReelExportOpen(true)}
              />
            ) : (
              /* ══════════════════════════════════════════════════════
                 FULL LYRICS CINEMATIC VIEW (Screenshot 442, 443, 444)
                 Solid wine-red canvas with synchronized lyrics lines
                 ══════════════════════════════════════════════════════ */
              <div className="spotify-full-lyrics-view">
                {/* Lyrics Header bar */}
                <div className="spotify-fl-header">
                  <span className="spotify-fl-track-title">{currentSong?.title || 'Lyrics'}</span>
                  <div className="spotify-fl-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="spotify-fl-btn"
                      onClick={() => setIsReelExportOpen(true)}
                      title="Export 9:16 Lyric Reel"
                      style={{ background: 'linear-gradient(135deg, #ff2d75, #ff69b4)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <span>🎬 Export Reel</span>
                    </button>
                    <button
                      className="spotify-fl-btn"
                      onClick={() => setLyricsTheme('rose')}
                      title="Switch to Rose Pink 3D Lyrics Theme"
                      style={{ background: 'rgba(255, 45, 117, 0.2)', color: '#ff69b4', border: '1px solid rgba(255, 45, 117, 0.4)', padding: '6px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600 }}
                    >
                      🌸 Rose 3D
                    </button>
                    <button className="spotify-fl-btn" onClick={onToggleLyrics} title="Close Full Lyrics">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Big Interactive Lyrics List */}
                <div className="spotify-fl-body">
                  {currentSong?.lyrics && currentSong.lyrics.length > 0 ? (
                    currentSong.lyrics.map((line, i) => {
                      const isLineActive = currentTime >= line.time && (!currentSong.lyrics?.[i + 1] || currentTime < currentSong.lyrics[i + 1].time);
                      return (
                        <p
                          key={i}
                          className={`spotify-fl-line ${isLineActive ? 'active' : ''}`}
                          onClick={() => onSeek(line.time)}
                        >
                          {line.text}
                        </p>
                      );
                    })
                  ) : (
                    <div className="spotify-fl-fallback">
                      <p className="spotify-fl-line active">pyaar tune kya kiya? chain mera liya</p>
                      <p className="spotify-fl-line">bepanaah ishq se vaastaa ho gaya</p>
                      <p className="spotify-fl-line">tera hee cheharaa ab to dikhe hai</p>
                      <p className="spotify-fl-line">har pal nigaahon mein tera asar hai</p>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : isSongViewActive && currentSong ? (
            <SpotifySongView
              song={currentSong}
              isPlaying={isPlaying}
              onPlaySong={onPlaySong}
              onTogglePlay={onTogglePlay}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
            />
          ) : (
            <>
              {activeView === 'home' && (
                <SpotifyHome
                  songs={songs}
                  albums={albums}
                  playlists={playlists}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  dailyDiscover={dailyDiscover}
                  listenAgain={listenAgain}
                  similarShelf={similarShelf}
                  mostPlayed={mostPlayed}
                  tasteProfile={tasteProfile}
                  favoriteArtistShelf={favoriteArtistShelf}
                  likedSongsCount={likedSongs.length}
                  onPlaySong={onPlaySong}
                  onToggleLike={onToggleLike}
                  onSelectPlaylist={onSelectPlaylist}
                  onSelectAlbum={onSelectAlbum}
                  onAddToPlaylist={onAddToPlaylist}
                  onOpenLikedSongs={() => onOpenLibrary('liked')}
                  onSelectArtist={(name) => {
                    setSelectedArtist(name);
                    setActiveView('artist');
                  }}
                />
              )}
              {activeView === 'explore' && (
                <SpotifyExplore
                  songs={songs}
                  onPlaySong={onPlaySong}
                  onToggleLike={onToggleLike}
                  onAddToPlaylist={onAddToPlaylist}
                />
              )}
              {(activeView === 'playlist' || activeView === 'library') && (() => {
                const currentPlaylist = activeView === 'library'
                  ? likedSongsPlaylist
                  : (playlists.find(p => p.id === selectedPlaylistId) || playlists[0]);
                if (!currentPlaylist) return null;
                return (
                  <SpotifyPlaylistView
                    playlist={currentPlaylist}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={onPlaySong}
                    onTogglePlay={onTogglePlay}
                    onBack={() => setActiveView('home')}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onRemoveSong={onRemoveSong}
                    user={user}
                  />
                );
              })()}
              {activeView === 'album' && (() => {
                const currentAlbum = INITIAL_ALBUMS.find(a => a.id === selectedAlbumId) || INITIAL_ALBUMS[0];
                if (!currentAlbum) return null;
                const albumSongs = currentAlbum.songs && currentAlbum.songs.length > 0
                  ? currentAlbum.songs
                  : songs.filter(s => s.album === currentAlbum.title);
                const albumPlaylist: Playlist = {
                  id: currentAlbum.id,
                  title: currentAlbum.title,
                  description: `${currentAlbum.artist} • ${currentAlbum.year || 2026} • Album`,
                  coverUrl: currentAlbum.coverUrl,
                  songs: albumSongs,
                  songCount: albumSongs.length,
                  isCurated: true,
                };
                return (
                  <SpotifyPlaylistView
                    playlist={albumPlaylist}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlaySong={onPlaySong}
                    onTogglePlay={onTogglePlay}
                    onBack={() => setActiveView('home')}
                    onToggleLike={onToggleLike}
                    onAddToPlaylist={onAddToPlaylist}
                    onRemoveSong={onRemoveSong}
                    user={user}
                  />
                );
              })()}
              {activeView === 'artist' && (
                <SpotifyArtistView
                  artistName={selectedArtist || currentSong?.artist || 'Top Artist'}
                  songs={songs}
                  albums={albums}
                  currentSong={currentSong}
                  isPlaying={isPlaying}
                  onPlaySong={onPlaySong}
                  onTogglePlay={onTogglePlay}
                  onToggleLike={onToggleLike}
                  onSelectAlbum={onSelectAlbum}
                  onBack={() => setActiveView('home')}
                />
              )}
              {activeView === 'my-playlists' && (
                <div className="sp-my-playlists">
                  <h2 className="sp-section-title">Your Playlists</h2>
                  <div className="sp-playlist-grid">
                    {playlists.map(p => (
                      <div key={p.id} className="sp-playlist-card" onClick={() => onSelectPlaylist(p.id)}>
                        <div className="sp-playlist-card-cover">
                          {p.coverUrl ? <img src={p.coverUrl} alt={p.title} /> : <ListMusic size={40} />}
                        </div>
                        <span className="sp-playlist-card-title">{p.title}</span>
                        <span className="sp-playlist-card-sub">{p.songCount} songs</span>
                      </div>
                    ))}
                    <div className="sp-playlist-card sp-create-card" onClick={onCreatePlaylist}>
                      <div className="sp-playlist-card-cover sp-create-cover"><Plus size={40} /></div>
                      <span className="sp-playlist-card-title">Create Playlist</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        {/* ── RIGHT PANEL (Now Playing OR Queue / Recently Played) ── */}
        {showRightPanel && (
          (isQueueOpen || isLyricsOpen) ? (
            <SpotifyQueuePanel
              currentSong={currentSong}
              queue={queue}
              isPlaying={isPlaying}
              playlists={playlists}
              recentlyPlayed={listenAgain || songs.slice(0, 10)}
              contextTitle={currentSong?.album || (selectedPlaylistId ? playlists.find(p => p.id === selectedPlaylistId)?.title : undefined) || 'Dilfek'}
              onPlaySong={onPlaySong}
              onTogglePlay={onTogglePlay}
              onClose={() => {
                if (isQueueOpen) onToggleQueue();
                if (isLyricsOpen) onToggleLyrics();
              }}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
              onRemoveFromQueue={onRemoveFromQueue}
              onAddToQueue={(song) => onPlaySong(song, [...queue, song])}
              onSelectArtist={(artistName) => {
                setSelectedArtist(artistName);
                setActiveView('artist');
              }}
              onOpenSleepTimer={onOpenSleepTimer}
              onSearchMore={() => setActiveView('explore')}
            />
          ) : isNowPlayingViewOpen ? (
            <SpotifyRightPanel
              currentSong={currentSong}
              queue={queue}
              isPlaying={isPlaying}
              onClose={onToggleNowPlayingView}
              onPlaySong={onPlaySong}
              onToggleLike={onToggleLike}
              onAddToPlaylist={onAddToPlaylist}
              onOpenLyrics={onToggleLyrics}
            />
          ) : null
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          FLOATING MINI PLAYER (PiP Window - Screenshot 442)
          ══════════════════════════════════════════════════════ */}
      {isMiniPlayerOpen && currentSong && (
        <div className="spotify-mini-player-pip">
          <div className="sp-pip-header">
            <span className="sp-pip-drag-handle">⠿⠿</span>
            <button className="sp-pip-close-btn" onClick={() => setIsMiniPlayerOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="sp-pip-cover-box">
            <img src={currentSong.coverUrl} alt={currentSong.title} className="sp-pip-cover-img" />
            <div className="sp-pip-overlay-controls">
              <button className="sp-pip-ctrl" onClick={onToggleShuffle}>
                <Shuffle size={14} color={isShuffle ? '#1ed760' : '#fff'} />
              </button>
              <button className="sp-pip-ctrl" onClick={onPrev}>
                <SkipBack size={16} />
              </button>
              <button className="sp-pip-play-btn" onClick={onTogglePlay}>
                {isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" />}
              </button>
              <button className="sp-pip-ctrl" onClick={onNext}>
                <SkipForward size={16} />
              </button>
              <button className="sp-pip-ctrl" onClick={onToggleRepeat}>
                <RepeatIcon size={14} color={repeatMode !== 'off' ? '#1ed760' : '#fff'} />
              </button>
            </div>
          </div>
          <div className="sp-pip-seek-row">
            <div className="sp-pip-seek-track" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(ratio * duration);
            }}>
              <div className="sp-pip-seek-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="sp-pip-info-row">
            <div className="sp-pip-titles">
              <span className="sp-pip-title">{currentSong.title}</span>
              <span className="sp-pip-artist">{currentSong.artist}</span>
            </div>
            <button
              className={`sp-pip-like-btn ${isCurrentSongLiked ? 'active' : ''}`}
              onClick={() => onToggleLike(currentSong.id)}
            >
              <PlusCircle size={18} color={isCurrentSongLiked ? '#1ed760' : '#fff'} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          BOTTOM PLAYER BAR (Exact Spotify 90px bottom bar)
          ══════════════════════════════════════════════════════ */}
      <footer className="sp-player">
        {/* Left: Track info */}
        <div className="sp-pb-left">
          {currentSong ? (
            <>
              <div
                className="sp-pb-cover-wrap"
                onClick={() => {
                  if (isLyricsOpen) onToggleLyrics();
                  setIsSongViewActive(true);
                }}
                title="Open song view"
              >
                <img
                  src={currentSong.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
                  alt={currentSong.title}
                  className="sp-pb-cover"
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
              </div>
              <div className="sp-pb-meta">
                <span
                  className="sp-pb-title"
                  onClick={() => {
                    if (isLyricsOpen) onToggleLyrics();
                    setIsSongViewActive(true);
                  }}
                  title={currentSong.title}
                >
                  {currentSong.title}
                </span>
                <span
                  className="sp-pb-artist"
                  onClick={() => {
                    if (isLyricsOpen) onToggleLyrics();
                    setIsSongViewActive(true);
                  }}
                  title={currentSong.artist}
                >
                  {currentSong.artist}
                </span>
              </div>
              <button
                className={`sp-pb-icon-btn ${isCurrentSongLiked ? 'active-green' : ''}`}
                onClick={() => onToggleLike(currentSong.id)}
                title={isCurrentSongLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              >
                <Heart size={16} fill={isCurrentSongLiked ? '#1ed760' : 'none'} color={isCurrentSongLiked ? '#1ed760' : 'currentColor'} />
              </button>
              <button
                className="sp-pb-icon-btn"
                onClick={() => onAddToPlaylist(currentSong)}
                title="Add to playlist"
              >
                <PlusCircle size={16} />
              </button>
            </>
          ) : (
            <div className="sp-pb-no-song">
              <span className="sp-pb-no-song-text">Pick a song to play</span>
            </div>
          )}
        </div>

        {/* Center: Playback controls + progress */}
        <div className="sp-pb-center">
          <div className="sp-pb-controls">
            <button
              className={`sp-pb-ctrl-btn ${isShuffle ? 'active-green' : ''}`}
              onClick={onToggleShuffle}
              title="Shuffle"
            >
              <Shuffle size={16} />
            </button>
            <button className="sp-pb-ctrl-btn" onClick={onPrev} title="Previous">
              <SkipBack size={18} />
            </button>
            <button className="sp-pb-play-btn" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={18} fill="#000" /> : <Play size={18} fill="#000" />}
            </button>
            <button className="sp-pb-ctrl-btn" onClick={onNext} title="Next">
              <SkipForward size={18} />
            </button>
            <button
              className={`sp-pb-ctrl-btn ${repeatMode !== 'off' ? 'active-green' : ''}`}
              onClick={onToggleRepeat}
              title="Repeat"
            >
              <RepeatIcon size={16} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="sp-pb-progress-row">
            <span className="sp-pb-time">{formatTime(currentTime)}</span>
            <div
              className="sp-pb-progress-track"
              ref={progressBarRef}
              onMouseDown={handleProgressMouseDown}
            >
              <div className="sp-pb-progress-fill" style={{ width: `${progressPercent}%` }} />
              <div className="sp-pb-progress-thumb" style={{ left: `${progressPercent}%` }} />
            </div>
            <span className="sp-pb-time">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Full Spotify right-side control suite (matching Screenshot 23be7311) */}
        <div className="sp-pb-right">
          <button
            className={`sp-pb-icon-btn ${isLyricsOpen ? 'active-green' : ''}`}
            onClick={onToggleLyrics}
            title="Lyrics"
          >
            <Mic2 size={16} />
          </button>
          <button
            className={`sp-pb-icon-btn ${isQueueOpen ? 'active-green' : ''}`}
            onClick={onToggleQueue}
            title="Queue"
            aria-label="Queue"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M15 15H1v-1.5h14V15zm0-4.5H1V9h14v1.5zm-14-7A2.5 2.5 0 0 1 3.5 1h9a2.5 2.5 0 0 1 0 5h-9A2.5 2.5 0 0 1 1 3.5zm2.5-1a1 1 0 0 0 0 2h9a1 1 0 1 0 0-2h-9z" />
            </svg>
          </button>
          <button
            className="sp-pb-icon-btn"
            title="Connect to a device"
            onClick={onOpenListenTogether}
          >
            <Laptop size={16} />
          </button>

          {/* Volume */}
          <button className="sp-pb-icon-btn" onClick={onToggleMute} title="Mute">
            <VolumeIcon size={16} />
          </button>
          <div
            className="sp-pb-vol-track"
            ref={volumeBarRef}
            onMouseDown={handleVolMouseDown}
          >
            <div className="sp-pb-vol-fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
            <div className="sp-pb-vol-thumb" style={{ left: `${(isMuted ? 0 : volume) * 100}%` }} />
          </div>

          {/* Mini Player (PiP) */}
          <button
            className={`sp-pb-icon-btn ${isMiniPlayerOpen ? 'active-green' : ''}`}
            onClick={() => setIsMiniPlayerOpen(prev => !prev)}
            title="Mini Player"
          >
            <PictureInPicture2 size={16} />
          </button>

          {/* Fullscreen */}
          <button
            className="sp-pb-icon-btn"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>

          {isSleepTimerActive && (
            <button
              className="sp-pb-icon-btn active-green"
              onClick={onOpenSleepTimer}
              title={`Sleep timer: ${sleepRemainingText}`}
            >
              <Moon size={16} />
            </button>
          )}
        </div>
      </footer>

      {/* 9:16 Lyric Reel Exporter Modal (from Pink Rose Lyric Guide) */}
      <LyricReelExportModal
        currentSong={currentSong}
        currentTime={currentTime}
        isOpen={isReelExportOpen}
        onClose={() => setIsReelExportOpen(false)}
      />
    </div>
  );
};

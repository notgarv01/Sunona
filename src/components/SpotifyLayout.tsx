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
  Home, Search, Bell, Users, ChevronLeft, ChevronRight, Plus, Library, Maximize2,
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Volume2, VolumeX, Volume1,
  Heart, Mic2, ListMusic, Tv2, PlusCircle, Moon, X, ArrowUpDown,
  Compass, MoreHorizontal, Laptop, PictureInPicture2,
  Minus, Square
} from 'lucide-react';
import type { Song, Playlist, Album, DailyDiscoverItem } from '../types';
import type { TasteProfile } from '../services/historyService';
import type { UserProfile } from '../services/authService';
import { SpotifyHome } from './SpotifyHome';
import { SpotifyExplore } from './SpotifyExplore';
import { SpotifyPlaylistView } from './SpotifyPlaylistView';
import { SpotifyRightPanel } from './SpotifyRightPanel';
import { SpotifySongView } from './SpotifySongView';
import { SwipeableSongRow } from './SwipeableSongRow';
import { INITIAL_ALBUMS } from '../data/musicData';

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
  activeView: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album';
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
  setActiveView: (view: 'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album') => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const [isSongViewActive, setIsSongViewActive] = useState(false);
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

  // Live search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    setShowSearchDropdown(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        if (data.results) setSearchResults(data.results.slice(0, 7));
      } catch {}
      setIsSearching(false);
    }, 300);
  };

  const handleSearchSelect = (song: Song) => {
    setIsSongViewActive(false);
    onSelectSong(song);
    setSearchQuery('');
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  const likedSongsPlaylist: Playlist = {
    id: 'liked-songs',
    title: 'Liked Songs',
    description: `${user?.displayName || 'Garvgupta'} • ${likedSongs.length} songs`,
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
      sub: `Playlist • ${user?.displayName || 'Garvgupta'}`,
      coverUrl: '',
      isLiked: true,
      type: 'playlist',
    },
    {
      id: 'best-bollywood-love',
      title: 'Best Bollywood Love Songs',
      sub: 'Playlist • Revibe',
      coverUrl: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=160',
      type: 'playlist',
    },
    {
      id: 'alb-iv',
      title: 'International Villager',
      sub: 'Album • Yo Yo Honey Singh',
      coverUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160',
      type: 'album',
    },
    {
      id: 'alb-dk',
      title: 'Desi Kalakaar',
      sub: 'Album • Yo Yo Honey Singh',
      coverUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=160',
      type: 'album',
    },
    {
      id: 'pl-another',
      title: 'Another',
      sub: `Playlist • ${user?.displayName || 'Garvgupta'}`,
      coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=160',
      type: 'playlist',
    },
    {
      id: 'art-imran',
      title: 'Imran Khan',
      sub: 'Artist',
      coverUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160',
      isArtist: true,
      type: 'artist',
    },
    {
      id: 'art-yyhs',
      title: 'Yo Yo Honey Singh',
      sub: 'Artist',
      coverUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160',
      isArtist: true,
      type: 'artist',
    },
    {
      id: 'art-diljit',
      title: 'Diljit Dosanjh',
      sub: 'Artist',
      coverUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=160',
      isArtist: true,
      type: 'artist',
    },
    ...playlists.filter(p => p.id !== 'liked-songs').map(p => ({
      id: p.id,
      title: p.title,
      sub: `Playlist • ${user?.displayName || 'Garvgupta'}`,
      coverUrl: p.coverUrl,
      type: 'playlist' as const,
    })),
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
      const foundAlbum = INITIAL_ALBUMS.find(a => a.id === item.id || a.title === item.title);
      if (foundAlbum) {
        onSelectAlbum(foundAlbum.id);
      } else if (songs.length > 0) {
        onPlaySong(songs[0]);
      }
      return;
    }
    if (item.type === 'artist') {
      const artistSong = songs.find(s => s.artist.toLowerCase().includes(item.title.toLowerCase()));
      if (artistSong) {
        onPlaySong(artistSong);
      } else {
        setSearchQuery(item.title);
      }
      return;
    }
    const foundPlaylist = playlists.find(p => p.id === item.id);
    if (foundPlaylist) {
      onSelectPlaylist(foundPlaylist.id);
    } else {
      setActiveView('playlist');
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
          <button className="sp-nav-arrow" title="Go Back" onClick={() => window.history.back()}>
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
              onFocus={() => searchQuery && setShowSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            />
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

            {/* Search dropdown */}
            {showSearchDropdown && (
              <div className="sp-search-dropdown">
                {isSearching ? (
                  <div className="sp-search-loading">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(song => (
                    <div key={song.id} className="sp-search-result" onMouseDown={() => handleSearchSelect(song)}>
                      <img src={song.coverUrl} alt={song.title} className="sp-search-result-img" />
                      <div className="sp-search-result-meta">
                        <span className="sp-search-result-title">{song.title}</span>
                        <span className="sp-search-result-artist">{song.artist}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="sp-search-empty">No results for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mode toggle + Bell + Friends + Avatar + Windows Controls */}
        <div className="sp-titlebar-right">
          {/* SunoNa mode toggle pill */}
          <button className="sp-mode-toggle-pill" onClick={onGoSunoNa} title="Switch to SunoNa mode">
            <span className="sp-toggle-dot sp-toggle-spotify" />
            <span className="sp-toggle-label">Spotify</span>
            <span className="sp-toggle-sep" />
            <img src="/logo.jpg" alt="" style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover', marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }} />
            <span className="sp-toggle-label sp-toggle-label-off">SunoNa</span>
          </button>

          <button className="sp-icon-btn" title="What's New / Notifications"><Bell size={18} /></button>
          <button className="sp-icon-btn" title="Friend Activity" onClick={onOpenListenTogether}><Users size={18} /></button>

          {/* Profile Avatar (Purple #532b88 with 'G') */}
          {user ? (
            <button className="sp-avatar-btn" onClick={onOpenProfile} title={user.displayName || 'Profile'}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="sp-avatar-img" />
              ) : (
                <span className="sp-avatar-letter">{(user.displayName || 'G')[0].toUpperCase()}</span>
              )}
            </button>
          ) : (
            <button className="sp-avatar-btn" onClick={onOpenAuth} title="Profile: Garvgupta">
              <span className="sp-avatar-letter">G</span>
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
                          <img src={item.coverUrl} alt={item.title} />
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
            /* ══════════════════════════════════════════════════════
               FULL LYRICS CINEMATIC VIEW (Screenshot 442, 443, 444)
               Solid wine-red canvas with synchronized lyrics lines
               ══════════════════════════════════════════════════════ */
            <div className="spotify-full-lyrics-view">
              {/* Lyrics Header bar */}
              <div className="spotify-fl-header">
                <span className="spotify-fl-track-title">{currentSong?.title || 'Lyrics'}</span>
                <div className="spotify-fl-actions">
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
                  />
                );
              })()}
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
            <aside className="sp-right-panel" aria-label="Queue Panel">
              {/* Tabs matching Screenshot 442 & 446 */}
              <div className="sp-rp-tabs">
                <button
                  className={`sp-rp-tab ${isQueueOpen || isLyricsOpen ? 'active' : ''}`}
                  onClick={onToggleQueue}
                >
                  Queue
                </button>
                <button className="sp-rp-tab">Recently played</button>
                <button className="sp-rp-close" onClick={() => {
                  if (isQueueOpen) onToggleQueue();
                  if (isLyricsOpen) onToggleLyrics();
                }}>
                  <X size={18} />
                </button>
              </div>

              <div className="sp-rp-queue">
                <h3 className="sp-rp-section-title">Now playing</h3>
                {currentSong ? (
                  <div className="sp-rp-now-playing">
                    <img src={currentSong.coverUrl} alt={currentSong.title} className="sp-rp-np-cover" />
                    <div className="sp-rp-np-meta">
                      <span className="sp-rp-np-title">{currentSong.title}</span>
                      <span className="sp-rp-np-artist">{currentSong.artist}</span>
                    </div>
                  </div>
                ) : (
                  <div className="sp-rp-empty">
                    <p>Your queue is empty</p>
                    <button className="sp-rp-search-btn" onClick={() => setActiveView('explore')}>Search for something new</button>
                  </div>
                )}

                {queue.length > 1 && (
                  <>
                    <h3 className="sp-rp-section-title">Next in queue</h3>
                    <div className="sp-rp-queue-list">
                      {queue
                        .filter(s => s.id !== currentSong?.id)
                        .slice(0, 20)
                        .map((song, i) => {
                          const realIndex = queue.findIndex(s => s.id === song.id);
                          return (
                            <SwipeableSongRow
                              key={song.id + i}
                              onDelete={() => onRemoveFromQueue && realIndex >= 0 ? onRemoveFromQueue(realIndex) : null}
                              deleteLabel="Remove"
                            >
                              <div
                                className="sp-rp-queue-item"
                                onClick={() => onPlaySong(song)}
                              >
                                <img src={song.coverUrl} alt={song.title} className="sp-rp-q-cover" />
                                <div className="sp-rp-q-meta">
                                  <span className="sp-rp-q-title">{song.title}</span>
                                  <span className="sp-rp-q-artist">{song.artist}</span>
                                </div>
                              </div>
                            </SwipeableSongRow>
                          );
                        })}
                    </div>
                  </>
                )}
              </div>
            </aside>
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
              className={`sp-pip-like-btn ${currentSong.isLiked ? 'active' : ''}`}
              onClick={() => onToggleLike(currentSong.id)}
            >
              <PlusCircle size={18} color={currentSong.isLiked ? '#1ed760' : '#fff'} />
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
                <img src={currentSong.coverUrl} alt={currentSong.title} className="sp-pb-cover" />
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
                className={`sp-pb-icon-btn ${currentSong.isLiked ? 'active-green' : ''}`}
                onClick={() => onToggleLike(currentSong.id)}
                title={currentSong.isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              >
                <Heart size={16} fill={currentSong.isLiked ? '#1ed760' : 'none'} color={currentSong.isLiked ? '#1ed760' : 'currentColor'} />
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

        {/* Right: Full Spotify right-side control suite */}
        <div className="sp-pb-right">
          <button
            className={`sp-pb-icon-btn ${isNowPlayingViewOpen ? 'active-green' : ''}`}
            onClick={onToggleNowPlayingView}
            title="Now Playing View"
          >
            <Tv2 size={16} />
          </button>
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
          >
            <ListMusic size={16} />
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
    </div>
  );
};

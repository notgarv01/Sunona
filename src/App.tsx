import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Trash2, X } from 'lucide-react';
import type { Song, ThemePreset, LyricLine, DailyDiscoverItem, Playlist, PlaybackSource } from './types';
import { INITIAL_SONGS, INITIAL_ALBUMS, THEME_PRESETS, MOODS } from './data/musicData';
import { audioEngine } from './services/audioEngine';
import { historyService, type TasteProfile } from './services/historyService';
import { playlistService } from './services/playlistService';
import { listenTogetherService } from './services/listenTogetherService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeScreen } from './components/HomeScreen';
import { ExploreScreen } from './components/ExploreScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { PlaylistScreen } from './components/PlaylistScreen';
import { AlbumScreen } from './components/AlbumScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { MyPlaylistsScreen } from './components/MyPlaylistsScreen';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { PlayerBar } from './components/PlayerBar';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { NowPlayingModal } from './components/NowPlayingModal';
import { ListenTogetherModal } from './components/ListenTogetherModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
// import { IntroScreen } from './components/IntroScreen'; // Temporarily commented out
import { SleepTimerModal } from './components/SleepTimerModal';
import { SleepOverlay } from './components/SleepOverlay';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UpdateModal, type UpdateState } from './components/UpdateModal';
import { SpotifyLayout } from './components/SpotifyLayout';
import { MiniPlayer, copyStylesToPip } from './components/MiniPlayer';
import { authService, type UserProfile } from './services/authService';
import { cloudSyncService } from './services/cloudSyncService';
import { useSleepTimer } from './hooks/useSleepTimer';
import { LandingPage } from './components/LandingPage';

// Helper to parse LRC formatted lyrics into LyricLine[]
function parseLrcLyrics(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\](.*)/;
  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const text = match[4]?.trim();
      if (text) {
        result.push({ time: mins * 60 + secs, text });
      }
    }
  }
  return result;
}

interface StoredPlaybackSession {
  song: Song;
  currentTime: number;
  duration: number;
  queue?: Song[];
  isPlaying?: boolean;
  contextMode?: 'playlist' | 'radio';
}

function healSong(s: Song): Song {
  if (s && s.id === '12CeaxLiMgE') {
    return {
      ...s,
      id: 'O3-6zB3kg8M',
      coverUrl: 'https://i.ytimg.com/vi/O3-6zB3kg8M/hqdefault.jpg',
    };
  }
  return s;
}

const getStoredPlaybackSession = (): StoredPlaybackSession | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 1. Check seamless PWA install / window handover first
      const rawHandover = sessionStorage.getItem('sunona_pwa_handover') || localStorage.getItem('sunona_pwa_handover');
      if (rawHandover) {
        try {
          const parsed = JSON.parse(rawHandover);
          if (parsed && parsed.song && parsed.song.id && Date.now() - (parsed.timestamp || 0) < 60000) {
            sessionStorage.removeItem('sunona_pwa_handover');
            localStorage.removeItem('sunona_pwa_handover');
            parsed.song = healSong(parsed.song);
            if (Array.isArray(parsed.queue)) parsed.queue = parsed.queue.map(healSong);
            return parsed;
          }
        } catch {}
      }

      // 2. Fall back to user-isolated session
      localStorage.removeItem('sunona_last_playback_session'); // Clean legacy unisolated key
      const activeUser = authService.getCurrentUser();
      if (!activeUser || !activeUser.uid) return null;
      const raw = localStorage.getItem(`sunona_playback_${activeUser.uid}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.song && parsed.song.id) {
        parsed.song = healSong(parsed.song);
        if (Array.isArray(parsed.queue)) parsed.queue = parsed.queue.map(healSong);
        return { ...parsed, isPlaying: false };
      }
    }
  } catch (err) {
    console.warn('Failed to parse last playback session:', err);
  }
  return null;
};

function isPWAOrElectronEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Electron Desktop App
  if (Boolean((window as any).electronAPI?.isElectron)) return true;

  // 2. Explicit PWA Query Param
  if (window.location.search.includes('pwa=true') || window.location.search.includes('app=true')) return true;

  // 3. iOS Safari Standalone
  if (Boolean((window.navigator as any)?.standalone)) return true;

  // 4. Desktop Window Controls Overlay PWA
  if (Boolean((window.navigator as any)?.windowControlsOverlay?.visible)) return true;

  // 5. Chromium / Brave App Window (locationbar / address bar is hidden)
  if (window.locationbar && window.locationbar.visible === false) return true;

  // 6. Any display mode other than regular browser tab
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return true;
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;
    if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    if (!window.matchMedia('(display-mode: browser)').matches) return true;
  }

  return false;
}

export const App: React.FC = () => {
  const [showPlayer, setShowPlayer] = useState<boolean>(() => isPWAOrElectronEnvironment());

  useEffect(() => {
    const checkEnvironment = () => {
      if (isPWAOrElectronEnvironment()) {
        setShowPlayer(true);
      }
    };

    // Re-check immediately after first mount (to catch post-hydration window properties)
    checkEnvironment();

    window.addEventListener('appinstalled', checkEnvironment);

    const mqlStandalone = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
    const mqlWco = window.matchMedia ? window.matchMedia('(display-mode: window-controls-overlay)') : null;
    const mqlBrowser = window.matchMedia ? window.matchMedia('(display-mode: browser)') : null;

    mqlStandalone?.addEventListener('change', checkEnvironment);
    mqlWco?.addEventListener('change', checkEnvironment);
    mqlBrowser?.addEventListener('change', checkEnvironment);

    return () => {
      window.removeEventListener('appinstalled', checkEnvironment);
      mqlStandalone?.removeEventListener('change', checkEnvironment);
      mqlWco?.removeEventListener('change', checkEnvironment);
      mqlBrowser?.removeEventListener('change', checkEnvironment);
    };
  }, []);
  const initialSession = useRef<StoredPlaybackSession | null>(getStoredPlaybackSession()).current;

  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [currentSong, setCurrentSong] = useState<Song | null>(() => (initialSession ? initialSession.song : null));
  const currentSongRef = useRef<Song | null>(currentSong);
  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);
  const [queue, setQueue] = useState<Song[]>(() => ((initialSession?.queue && initialSession.queue.length > 0) ? initialSession.queue : []));
  const queueRef = useRef<Song[]>((initialSession?.queue && initialSession.queue.length > 0) ? initialSession.queue : []);
  const playbackContextRef = useRef<'radio' | 'playlist'>(initialSession?.contextMode || 'radio');
  const shuffleHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(() => (initialSession ? initialSession.currentTime : 0));
  const [duration, setDuration] = useState<number>(() => (initialSession ? (initialSession.duration || initialSession.song.duration || 0) : 0));
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const [activeView, setActiveView] = useState<'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album' | 'artist' | 'history'>(() => {
    try {
      const alb = new URLSearchParams(window.location.search).get('album');
      if (alb) return 'album';
    } catch {}
    return 'home';
  });
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(() => {
    try {
      const alb = new URLSearchParams(window.location.search).get('album');
      if (alb) return alb;
    } catch {}
    return null;
  });
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // UI/UX Mode: 'sunona' (MetroList classic) vs 'spotify' (Spotify desktop layout)
  const [uiMode, setUiMode] = useState<'sunona' | 'spotify'>(() => {
    try {
      const urlMode = new URLSearchParams(window.location.search).get('mode');
      if (urlMode === 'spotify' || urlMode === 'sunona') return urlMode;
      const saved = localStorage.getItem('sunona_ui_mode');
      if (saved === 'spotify' || saved === 'sunona') return saved;
      return 'spotify';
    } catch {
      return 'spotify';
    }
  });

  const [isNowPlayingViewOpen, setIsNowPlayingViewOpen] = useState<boolean>(false);

  const handleToggleUiMode = useCallback((mode: 'sunona' | 'spotify') => {
    setUiMode(mode);
    try {
      localStorage.setItem('sunona_ui_mode', mode);
    } catch {}
    // When switching to SunoNa mode, always show SunoNa's dashboard (Home) if we were in Spotify-specific views
    if (mode === 'sunona') {
      setActiveView((curr) => (curr === 'artist' ? 'home' : curr));
    }
    // Re-sync playback history, recommendations and search history so both UIs stay 100% in sync
    setListenAgain(historyService.getListenAgain());
    setMostPlayed(historyService.getMostPlayed());
    const tp = historyService.getTasteProfile();
    setTasteProfile(tp.totalPlays > 0 ? tp : undefined);
    window.dispatchEvent(new CustomEvent('sunona:search-history-updated'));
  }, []);

  useEffect(() => {
    if (uiMode === 'sunona' && activeView === 'artist') {
      setActiveView('home');
    }
  }, [uiMode, activeView]);
  // const [hasEntered, setHasEntered] = useState<boolean>(true); // Temporarily commented out
  const [activeDrawer, setActiveDrawer] = useState<'lyrics' | 'queue' | null>(() => {
    try {
      const drawer = new URLSearchParams(window.location.search).get('drawer');
      if (drawer === 'queue' || drawer === 'lyrics') return drawer;
    } catch {}
    return null;
  });
  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);
  const playbackSourceRef = useRef<PlaybackSource | null>(null);
  playbackSourceRef.current = playbackSource;
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState<boolean>(false);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  // Persistent Liked Songs Collection (User-scoped and clean)
  const [likedSongs, setLikedSongs] = useState<Song[]>(() => {
    try {
      localStorage.removeItem('sunona_liked_songs_v1');
      localStorage.removeItem('sunona_liked_songs_v2'); // Clean up old test data
      const activeUser = authService.getCurrentUser();
      const storageKey = activeUser?.uid ? `sunona_liked_songs_${activeUser.uid}` : 'sunona_liked_songs_guest';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'liked' | 'cached' | 'playlists'>('all');

  const handleOpenLibrary = useCallback((filter: 'all' | 'liked' | 'cached' | 'playlists' = 'all') => {
    setLibraryFilter(filter);
    setActiveView('library');
  }, []);

  // Metrolist Playlist Management States
  const [playlists, setPlaylists] = useState<Playlist[]>(() => playlistService.getPlaylists());
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState<boolean>(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [queueToAddToPlaylist, setQueueToAddToPlaylist] = useState<Song[] | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  // 10-Second Undo Notification State
  interface UndoToastState {
    id: string;
    message: string;
    onUndo: () => void;
    secondsRemaining: number;
  }
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const undoTimerRef = useRef<any>(null);
  const undoIntervalRef = useRef<any>(null);

  const showUndoToast = useCallback((msg: string, onUndo: () => void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);

    const newId = Date.now().toString();
    setUndoToast({
      id: newId,
      message: msg,
      onUndo,
      secondsRemaining: 10,
    });

    undoIntervalRef.current = setInterval(() => {
      setUndoToast((prev) => {
        if (!prev || prev.id !== newId) return null;
        if (prev.secondsRemaining <= 1) {
          if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
          return null;
        }
        return {
          ...prev,
          secondsRemaining: prev.secondsRemaining - 1,
        };
      });
    }, 1000);

    undoTimerRef.current = setTimeout(() => {
      setUndoToast((prev) => (prev?.id === newId ? null : prev));
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    }, 10000);
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (undoIntervalRef.current) clearInterval(undoIntervalRef.current);
    };
  }, []);

  // Google Authentication & Cloud Sync
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !authService.getCurrentUser());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: 'idle',
    currentVersion: '1.0.11',
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  // Subscribe to Playlist Service storage updates
  useEffect(() => {
    return playlistService.subscribe(() => {
      setPlaylists(playlistService.getPlaylists());
    });
  }, []);

  // Listen Together real-time synchronized playback listeners
  useEffect(() => {
    listenTogetherService.setCallbacks({
      onPlay: (song, startTime) => {
        setCurrentSong(song);
        audioEngine.playSong(song);
        setIsPlaying(true);
        setDuration(song.duration);
        setTimeout(() => {
          if (startTime > 0) {
            audioEngine.seek(startTime);
            setCurrentTime(startTime);
          }
        }, 400);
      },
      onPause: () => {
        audioEngine.pause();
        setIsPlaying(false);
      },
      onSeek: (time) => {
        audioEngine.seek(time);
        setCurrentTime(time);
      },
    });

    // Check for invite room parameter in URL
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      listenTogetherService.setRoomCode(roomParam);
      listenTogetherService.setRole('listener');
      setIsListenTogetherOpen(true);
    }
  }, []);

  // Metrolist Discovery & Suggestion Engine States
  const [dailyDiscover, setDailyDiscover] = useState<DailyDiscoverItem[]>([]);
  const [listenAgain, setListenAgain] = useState<Song[]>([]);
  const [similarShelf, setSimilarShelf] = useState<{ title: string; songs: Song[] } | null>(null);
  const [mostPlayed, setMostPlayed] = useState<{ song: Song; playCount: number; genreType: string }[]>([]);
  const [tasteProfile, setTasteProfile] = useState<TasteProfile | undefined>(undefined);
  const [favoriteArtistShelf, setFavoriteArtistShelf] = useState<{ title: string; subtitle: string; songs: Song[] } | null>(null);
  const radioContinuationRef = useRef<string | null>(null);
  const isLoadingMoreRef = useRef<boolean>(false);

  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(THEME_PRESETS[0]);
  const [isListenTogetherOpen, setIsListenTogetherOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Google Auth Subscription & Cloud Data Synchronization
  const activeUserUidRef = useRef<string | null>(authService.getCurrentUser()?.uid || null);

  useEffect(() => {
    return authService.subscribe(async (user) => {
      const prevUid = activeUserUidRef.current;
      const newUid = user?.uid || null;

      // Detect Account Switch (e.g. from user A to user B, or user A to null)
      if (prevUid !== newUid) {
        activeUserUidRef.current = newUid;

        // Immediately STOP any running playback and clear previous account's music
        try {
          audioEngine.stopAndRelease();
        } catch {}

        setCurrentSong(null);
        currentSongRef.current = null;
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setQueue([]);
        queueRef.current = [];
        setIsNowPlayingViewOpen(false);
        setActiveDrawer(null);
      }

      setCurrentUser(user);
      if (user) {
        setIsAuthModalOpen(false);

        // 1. User-isolated listening history
        historyService.setUser(user.uid);
        const tp = historyService.getTasteProfile();
        setTasteProfile(tp.totalPlays > 0 ? tp : undefined);
        setMostPlayed(historyService.getMostPlayed(8));
        setListenAgain(historyService.getListenAgain(10));

        // 2. User-isolated custom playlists
        playlistService.setUser(user.uid);
        setPlaylists(playlistService.getPlaylists());

        // 3. User-isolated liked songs
        const userStorageKey = `sunona_liked_songs_${user.uid}`;
        let activeLikedList: Song[] = [];
        try {
          const localLiked = localStorage.getItem(userStorageKey);
          if (localLiked) {
            const parsed = JSON.parse(localLiked);
            if (Array.isArray(parsed)) {
              activeLikedList = parsed.map(healSong);
            }
          }
        } catch {}
        setLikedSongs(activeLikedList);

        // Immediately re-sync currentSong and songs list to this user's like state
        setSongs((prev) => prev.map((s) => ({ ...s, isLiked: activeLikedList.some((l) => l.id === s.id) })));

        // 4. Restore this user's isolated playback session if they had one (paused on login)
        try {
          const rawSession = localStorage.getItem(`sunona_playback_${user.uid}`);
          if (rawSession) {
            const session = JSON.parse(rawSession);
            if (session && session.song && session.song.id) {
              const healed = healSong(session.song);
              const isLiked = activeLikedList.some((s) => s.id === healed.id);
              const restoredSong = { ...healed, isLiked };
              setCurrentSong(restoredSong);
              currentSongRef.current = restoredSong;
              setIsPlaying(false);
              setCurrentTime(session.currentTime || 0);
              setDuration(session.duration || session.song.duration || 0);
              if (Array.isArray(session.queue) && session.queue.length > 0) {
                const healedQueue = session.queue.map(healSong);
                setQueue(healedQueue);
                queueRef.current = healedQueue;
              }
              if (session.contextMode) {
                playbackContextRef.current = session.contextMode;
              }
              if (session.playbackSource) {
                setPlaybackSource(session.playbackSource);
                playbackSourceRef.current = session.playbackSource;
              }
            }
          }
        } catch {}

        // Load Daily Discover only if user has listening seeds
        const userSeeds = historyService.getDiscoverySeeds();
        if (userSeeds.length > 0) {
          fetch(`/api/daily-discover?seeds=${userSeeds.join(',')}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.discover && data.discover.length > 0) setDailyDiscover(data.discover);
            })
            .catch(() => {});
        } else {
          setDailyDiscover([]);
        }

        // Pull cloud data for this Gmail ID if present
        try {
          const remote = await cloudSyncService.pullFromCloud(user);
          if (remote) {
            if (Array.isArray(remote.likedSongs) && remote.likedSongs.length > 0) {
              const mappedLiked = remote.likedSongs.map((s) => ({ ...s, isLiked: true }));
              setLikedSongs(mappedLiked);
              setCurrentSong((prev) => (prev ? { ...prev, isLiked: mappedLiked.some((s) => s.id === prev.id) } : null));
              setSongs((prev) => prev.map((s) => ({ ...s, isLiked: mappedLiked.some((l) => l.id === s.id) })));
              try {
                localStorage.setItem(userStorageKey, JSON.stringify(mappedLiked));
              } catch {}
            }
            if (Array.isArray(remote.playlists) && remote.playlists.length > 0) {
              playlistService.setPlaylists(remote.playlists);
              setPlaylists(remote.playlists);
            }
            showToast(`Library synced with ${user.email || user.displayName}`);
          }
        } catch {}
      } else {
        // User is logged out: isolate and purge in-memory session without wiping persisted user vaults
        historyService.setUser('guest');
        playlistService.setUser('guest');
        setLikedSongs([]);
        setPlaylists([]);
        setCurrentSong((prev) => (prev ? { ...prev, isLiked: false } : null));
        setSongs((prev) => prev.map((s) => ({ ...s, isLiked: false })));
        setTasteProfile(undefined);
        setMostPlayed([]);
        setListenAgain([]);
        setDailyDiscover([]);
        setSimilarShelf(null);
        setIsAuthModalOpen(true);
      }
    });
  }, [showToast]);

  // Auto-backup to Cloud when library changes for logged in Gmail user
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        cloudSyncService.pushToCloud(currentUser, {
          likedSongs,
          playlists,
          tasteProfile,
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, likedSongs, playlists, tasteProfile]);

  const handleManualCloudSync = useCallback(async () => {
    if (!currentUser) return;
    await cloudSyncService.pushToCloud(currentUser, {
      likedSongs,
      playlists,
      tasteProfile,
    });
    showToast('All music data synced to your Google Account!');
  }, [currentUser, likedSongs, playlists, tasteProfile, showToast]);

  // Apply Theme CSS Custom Variables
  const applyTheme = (theme: ThemePreset) => {
    setCurrentTheme(theme);
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-glow', theme.primaryGlow);
    root.style.setProperty('--primary-subtle', `${theme.primary}1f`);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--bg-base', theme.bgBase);
    root.style.setProperty('--bg-card', theme.bgCard);
    root.style.setProperty('--bg-glass', theme.bgGlass);
  };

  // Fetch Live YouTube Music Home Feed & Suggestions on mount (Metrolist Dynamic Taste Architecture)
  useEffect(() => {
    // 1. YouTube Music Home Feed (Seeded by User Taste from Local History)
    const topSeed = historyService.getTopSeed();
    const homeQuery = topSeed
      ? `?seed=${topSeed.id}&artist=${encodeURIComponent(topSeed.artist)}`
      : '';

    fetch(`/api/home${homeQuery}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quickPicks && data.quickPicks.length > 0) {
          const mapped = data.quickPicks.map((s: Song) => ({
            ...s,
            isLiked: likedSongs.some((ls) => ls.id === s.id),
          }));
          setSongs(mapped);
        }
      })
      .catch((err) => console.error('Failed to load live home feed:', err));

    // 2. Load Local History & Taste Analytics (Most Played & Taste Profile)
    setListenAgain(historyService.getListenAgain());
    const initialMp = historyService.getMostPlayed();
    const initialTp = historyService.getTasteProfile();
    setMostPlayed(initialMp);
    if (initialTp.totalPlays > 0) {
      setTasteProfile(initialTp);
      if (initialTp.favoriteArtist) {
        fetch(`/api/search?q=${encodeURIComponent(initialTp.favoriteArtist + ' hits')}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.results && data.results.length > 0) {
              setFavoriteArtistShelf({
                title: `Because You Love ${initialTp.favoriteArtist}`,
                subtitle: `Curated for your ${initialTp.primaryGenre} listening habit`,
                songs: data.results,
              });
            }
          })
          .catch(() => {});
      }
    } else {
      setTasteProfile(undefined);
      setFavoriteArtistShelf(null);
    }

    // 3. Daily Discover Recommendations (HomeViewModel.getDailyDiscover)
    const seedIds = historyService.getDiscoverySeeds();
    if (seedIds.length > 0) {
      fetch(`/api/daily-discover?seeds=${seedIds.join(',')}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.discover && data.discover.length > 0) {
            setDailyDiscover(data.discover);
          }
        })
        .catch(() => {});
    } else {
      setDailyDiscover([]);
    }

    // 4. Initial Similar Recommendations Shelf
    if (topSeed) {
      fetch(`/api/similar?id=${topSeed.id}&title=${encodeURIComponent(topSeed.title)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            setSimilarShelf({ title: data.title, songs: data.results });
          }
        })
        .catch(() => {});
    } else {
      setSimilarShelf(null);
    }
  }, []);

  // Mood filter handler to dynamically fetch matching songs
  const handleSelectMood = useCallback((moodId: string) => {
    const targetMood = MOODS.find((m) => m.id === moodId);
    const searchQuery = targetMood ? targetMood.searchQuery : (moodId + ' music');
    fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          setSongs(data.results);
        }
      })
      .catch(() => {});
  }, []);

  // Sleep Mode & Timer States & Handlers (extracted into custom hook)
  const {
    isSleepModalOpen,
    setIsSleepModalOpen,
    isSleepOverlayOpen,
    setIsSleepOverlayOpen,
    sleepRemainingSeconds,
    isSleepEndOfTrack,
    isSleepEndOfTrackRef,
    triggerSleepMode,
    handleSetSleepTimer,
    handleSetSleepEndOfTrack,
    handleCancelSleepTimer,
    handleAddSleepMinutes,
    isSleepTimerActive,
    sleepRemainingText,
  } = useSleepTimer({
    volume,
    setVolume,
    setIsPlaying,
    showToast,
  });

  // 5-Stage Multi-Provider Lyrics Waterfall fetcher
  const fetchLyricsForSong = useCallback((song: Song) => {
    setIsLoadingLyrics(true);
    fetch(`/api/lyrics?track=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`)
      .then((r) => r.json())
      .then((data) => {
        setIsLoadingLyrics(false);
        const matchedSource = data.matchedSource || (data.syncedLyrics ? 'LRCLIB (Synced)' : 'Lyrics Engine');
        const geniusUrl = data.geniusUrl || '';

        if (data.syncedLyrics) {
          const parsed = parseLrcLyrics(data.syncedLyrics);
          if (parsed.length > 0) {
            setCurrentSong((prev) =>
              prev && prev.id === song.id
                ? { ...prev, lyrics: parsed, lyricsSource: matchedSource, lyricsNotFound: false, geniusUrl }
                : prev
            );
            setSongs((prev) =>
              prev.map((s) =>
                s.id === song.id ? { ...s, lyrics: parsed, lyricsSource: matchedSource, lyricsNotFound: false, geniusUrl } : s
              )
            );
            return;
          }
        }
        if (data.plainLyrics) {
          const lines = data.plainLyrics
            .split('\n')
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);
          if (lines.length > 0) {
            const parsed = lines.map((text: string, idx: number) => ({
              time: idx * 4,
              text,
            }));
            setCurrentSong((prev) =>
              prev && prev.id === song.id
                ? { ...prev, lyrics: parsed, lyricsSource: matchedSource, lyricsNotFound: false, geniusUrl }
                : prev
            );
            setSongs((prev) =>
              prev.map((s) =>
                s.id === song.id ? { ...s, lyrics: parsed, lyricsSource: matchedSource, lyricsNotFound: false, geniusUrl } : s
              )
            );
            return;
          }
        }
        // If not found in any of the 5 sources
        setCurrentSong((prev) =>
          prev && prev.id === song.id
            ? {
                ...prev,
                lyrics: [],
                lyricsNotFound: true,
                geniusUrl,
                searchedProviders: data.searchedProviders || [
                  '1. LRCLIB Official (Exact Match)',
                  '2. LRCLIB Community (Fuzzy Search)',
                  '3. Lyrics.ovh (Global Text Library)',
                  '4. LRCLIB OST (Title-Only Deep Search)',
                  '5. Global Music Lyrics Archive',
                  '6. Genius Official API (Verified Token)',
                ],
              }
            : prev
        );
      })
      .catch(() => {
        setIsLoadingLyrics(false);
        setCurrentSong((prev) =>
          prev && prev.id === song.id
            ? {
                ...prev,
                lyrics: [],
                lyricsNotFound: true,
                searchedProviders: [
                  '1. LRCLIB Official (Exact Match)',
                  '2. LRCLIB Community (Fuzzy Search)',
                  '3. Lyrics.ovh (Global Text Library)',
                  '4. LRCLIB OST (Title-Only Deep Search)',
                  '5. Global Music Lyrics Archive',
                ],
              }
            : prev
        );
      });
  }, []);

  // Play a specific song with auto lyrics resolution, history logging & live automix radio suggestions
  const playSong = useCallback((
    song: Song,
    customQueue?: Song[],
    contextMode?: 'playlist' | 'radio',
    seekTime?: number,
    sourceInfo?: PlaybackSource | null
  ) => {
    // Update playback source context
    if (sourceInfo !== undefined) {
      setPlaybackSource(sourceInfo);
      playbackSourceRef.current = sourceInfo;
    } else if (contextMode === 'radio') {
      const radioSource: PlaybackSource = { type: 'radio', name: song.artist ? `${song.artist} Radio` : 'Radio' };
      setPlaybackSource(radioSource);
      playbackSourceRef.current = radioSource;
    } else if (!playbackSourceRef.current && song.album) {
      const albumSource: PlaybackSource = { type: 'album', name: song.album };
      setPlaybackSource(albumSource);
      playbackSourceRef.current = albumSource;
    }

    const isLiked = likedSongs.some((ls) => ls.id === song.id) || !!song.isLiked;
    const enrichedSong: Song = { ...song, isLiked };
    console.log(`%c🎵 [TEST_PLAY_EVENT] Title: "${enrichedSong.title}" | Artist: "${enrichedSong.artist}" | ID: "${enrichedSong.id}"`, 'background: #1ed760; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    setCurrentSong(enrichedSong);
    audioEngine.playSong(enrichedSong);
    setIsPlaying(true);
    const startOffset = (seekTime !== undefined && seekTime > 0) ? seekTime : 0;
    setCurrentTime(startOffset);
    if (startOffset > 0) {
      setTimeout(() => {
        audioEngine.seek(startOffset);
      }, 150);
    }
    setDuration(song.duration);

    // Save playback session for this active user immediately
    const activeUid = authService.getCurrentUser()?.uid;
    if (activeUid) {
      try {
        localStorage.setItem(
          `sunona_playback_${activeUid}`,
          JSON.stringify({
            song: enrichedSong,
            currentTime: startOffset,
            duration: song.duration,
            queue: (customQueue && customQueue.length > 0) ? customQueue : queueRef.current,
            contextMode: (customQueue && customQueue.length > 0) ? 'playlist' : (contextMode || playbackContextRef.current),
            playbackSource: sourceInfo !== undefined ? sourceInfo : playbackSourceRef.current,
          })
        );
      } catch {}
    }

    // Broadcast play event to Listen Together room
    listenTogetherService.broadcastHostPlay(song, startOffset);

    // Determine playback mode
    if (contextMode) {
      playbackContextRef.current = contextMode;
    } else if (customQueue && customQueue.length > 0) {
      playbackContextRef.current = 'playlist';
    } else {
      const isAlreadyInQueue = queueRef.current.some((s) => s.id === song.id);
      if (!isAlreadyInQueue || playbackContextRef.current !== 'playlist') {
        playbackContextRef.current = 'radio';
      }
    }

    const isPlaylistMode = playbackContextRef.current === 'playlist';

    // Record play event asynchronously to keep UI thread 100% smooth at 120 FPS
    setTimeout(() => {
      historyService.recordPlay(song);
      setListenAgain(historyService.getListenAgain());
      const updatedMp = historyService.getMostPlayed();
      const updatedTp = historyService.getTasteProfile();
      setMostPlayed(updatedMp);
      setTasteProfile(updatedTp.totalPlays > 0 ? updatedTp : undefined);

      // Refresh recommendations for favorite artist if user has plays
      if (updatedTp.totalPlays > 0 && updatedTp.favoriteArtist) {
        fetch(`/api/search?q=${encodeURIComponent(updatedTp.favoriteArtist + ' top songs')}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.results && data.results.length > 0) {
              setFavoriteArtistShelf({
                title: `Because You Love ${updatedTp.favoriteArtist}`,
                subtitle: `Curated for your ${updatedTp.primaryGenre} listening habit`,
                songs: data.results,
              });
            }
          })
          .catch(() => {});
      }
    }, 250);

    // If a custom playlist queue is provided, set it as the active queue
    if (customQueue && customQueue.length > 0) {
      setQueue(customQueue);
      queueRef.current = customQueue;
      shuffleHistoryRef.current = [song.id];
    }

    // In Playlist Mode: NEVER append external songs to the queue
    if (!isPlaylistMode) {
      const currentQueue = queueRef.current;
      const isAlreadyInQueue = currentQueue.some((s) => s.id === song.id);

      if (!isAlreadyInQueue) {
        // User selected a brand new song (from search, new album, or recommendation shelf)
        // Reset queue to start a fresh coherent Radio Station around this song!
        const initialStation = [song];
        setQueue(initialStation);
        queueRef.current = initialStation;
      }

      // Fetch live YouTube Music Radio Automix Suggestions & Continuation Token (/api/related?id=...)
      fetch(`/api/related?id=${song.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (playbackContextRef.current === 'playlist') return; // Guard against race conditions

          if (data.continuation) {
            radioContinuationRef.current = data.continuation;
          }
          if (data.results && data.results.length > 0) {
            if (!isAlreadyInQueue) {
              const station = [song, ...data.results.filter((r: Song) => r.id !== song.id)];
              setQueue(station);
              queueRef.current = station;
            } else {
              // Progressing through existing queue (Cover Flow navigation, Next/Prev):
              // Keep existing queue intact so Cover Flow carousel slides naturally to the left!
              // Append newly discovered suggestions to the end of the queue for infinite autoplay.
              setQueue((prev) => {
                const existingIds = new Set(prev.map((s) => s.id));
                const newSuggestions = data.results.filter(
                  (r: Song) => !existingIds.has(r.id)
                );
                if (newSuggestions.length === 0) return prev;
                const updated = [...prev, ...newSuggestions];
                queueRef.current = updated;
                return updated;
              });
            }
          }
        })
        .catch(() => {});
    }

    // Refresh Daily Discover recommendations based on user's updated taste profile
    const seedIds = historyService.getDiscoverySeeds();
    const seedsQuery = seedIds.length > 0 ? `?seeds=${seedIds.join(',')}` : `?seeds=${song.id}`;
    fetch(`/api/daily-discover${seedsQuery}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.discover && d.discover.length > 0) {
          setDailyDiscover(d.discover);
          try {
            localStorage.setItem('metrolist_daily_discover_cache_v2', JSON.stringify(d.discover));
          } catch {}
        }
      })
      .catch(() => {});

    // Update Similar Shelf dynamically based on the newly playing track
    fetch(`/api/similar?id=${song.id}&title=${encodeURIComponent(song.title)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.results && data.results.length > 0) {
          setSimilarShelf({ title: data.title, songs: data.results });
        }
      })
      .catch(() => {});

    // If song does not have lyrics, fetch live through 5-stage waterfall asynchronously
    if (!song.lyrics || song.lyrics.length === 0) {
      setTimeout(() => {
        fetchLyricsForSong(song);
      }, 200);
    }

    if (song.color) {
      document.documentElement.style.setProperty('--primary', song.color);
      document.documentElement.style.setProperty('--primary-glow', `${song.color}66`);
    }
  }, [fetchLyricsForSong]);

  // Check for shared song URL parameter on load (?song=... or ?track=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const songId = params.get('song') || params.get('track');
      if (songId) {
        const found = songs.find((s) => s.id === songId) || INITIAL_SONGS.find((s) => s.id === songId);
        if (found) {
          playSong(found);
        } else {
          fetch(`/api/similar?id=${encodeURIComponent(songId)}`)
            .then((r) => r.json())
            .then((d) => {
              if (d && d.songs && d.songs.length > 0) {
                playSong(d.songs[0]);
              }
            })
            .catch(() => {});
        }
      }
    } catch {}
  }, [playSong, songs]);

  // Seamless PWA install & window handover preservation
  useEffect(() => {
    const persistHandover = () => {
      if (currentSongRef.current) {
        try {
          const handoverData = {
            song: currentSongRef.current,
            currentTime: currentTime,
            duration: duration || currentSongRef.current.duration,
            queue: queueRef.current,
            isPlaying: false,
            contextMode: playbackContextRef.current,
            playbackSource: playbackSourceRef.current,
            timestamp: Date.now(),
          };
          sessionStorage.setItem('sunona_pwa_handover', JSON.stringify(handoverData));
          localStorage.setItem('sunona_pwa_handover', JSON.stringify(handoverData));
        } catch {}
      }
    };

    window.addEventListener('beforeunload', persistHandover);
    window.addEventListener('appinstalled', persistHandover);
    return () => {
      window.removeEventListener('beforeunload', persistHandover);
      window.removeEventListener('appinstalled', persistHandover);
    };
  }, [currentTime, duration, isPlaying]);

  // Next track in queue with playlist boundary handling & radio lookahead auto-pagination
  const handleNext = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const isPlaylistMode = playbackContextRef.current === 'playlist';

    if (isShuffle && queue.length > 1) {
      // Find songs in queue that haven't been played in this shuffle cycle yet
      let unplayed = queue.filter(
        (s) => s.id !== currentSong.id && !shuffleHistoryRef.current.includes(s.id)
      );

      // If all songs in queue have been played once in this cycle
      if (unplayed.length === 0) {
        if (isPlaylistMode && repeatMode !== 'all') {
          // Playlist finished in shuffle mode! Stop playback cleanly
          audioEngine.pause();
          setIsPlaying(false);
          audioEngine.seek(0);
          setCurrentTime(0);
          shuffleHistoryRef.current = [];
          return;
        }
        // Start a fresh shuffle cycle without repeating the current song immediately
        shuffleHistoryRef.current = [currentSong.id];
        unplayed = queue.filter((s) => s.id !== currentSong.id);
      }

      const randomIndex = Math.floor(Math.random() * unplayed.length);
      const nextSong = unplayed[randomIndex];
      shuffleHistoryRef.current.push(nextSong.id);
      playSong(nextSong, undefined, isPlaylistMode ? 'playlist' : 'radio', undefined, isPlaylistMode ? playbackSourceRef.current : undefined);
      return;
    }

    if (isPlaylistMode) {
      const isLastSong = currentIndex >= queue.length - 1;
      if (isLastSong) {
        if (repeatMode === 'all') {
          playSong(queue[0], undefined, 'playlist', undefined, playbackSourceRef.current);
        } else {
          // Playlist finished! Stop playback cleanly - do NOT loop and do NOT add suggestions!
          audioEngine.pause();
          setIsPlaying(false);
          audioEngine.seek(0);
          setCurrentTime(0);
        }
        return;
      }

      // Not the last song - play next track in playlist
      playSong(queue[currentIndex + 1], undefined, 'playlist', undefined, playbackSourceRef.current);
      return;
    }

    // Radio Mode: Continuous Autoplay Lookahead (when <= 5 songs remain, prefetch next batch)
    if (
      queue.length - currentIndex <= 5 &&
      radioContinuationRef.current &&
      !isLoadingMoreRef.current
    ) {
      isLoadingMoreRef.current = true;
      fetch(`/api/related?continuation=${encodeURIComponent(radioContinuationRef.current)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.results && data.results.length > 0) {
            setQueue((prev) => {
              const existingIds = new Set(prev.map((s) => s.id));
              const newUnique = data.results.filter((s: Song) => !existingIds.has(s.id));
              const updated = [...prev, ...newUnique];
              queueRef.current = updated;
              return updated;
            });
            radioContinuationRef.current = data.continuation || null;
          }
        })
        .catch(() => {})
        .finally(() => {
          isLoadingMoreRef.current = false;
        });
    }

    const nextIndex = (currentIndex + 1) % queue.length;
    playSong(queue[nextIndex], undefined, 'radio');
  }, [currentSong, queue, isShuffle, repeatMode, playSong]);

  // Previous track in queue
  const handlePrev = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    // If track has been playing for more than 3 seconds, restart it from 0:00
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }

    // If Shuffle is ON and we have previously played tracks in this shuffle session
    if (isShuffle && shuffleHistoryRef.current.length > 1) {
      shuffleHistoryRef.current.pop();
      const previousSongId = shuffleHistoryRef.current[shuffleHistoryRef.current.length - 1];
      const prevSong = queue.find((s) => s.id === previousSongId);
      if (prevSong) {
        const isPlaylistMode = playbackContextRef.current === 'playlist';
        playSong(prevSong, undefined, isPlaylistMode ? 'playlist' : 'radio', undefined, isPlaylistMode ? playbackSourceRef.current : undefined);
        return;
      }
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);

    // If on the first song of the queue (or not found), restart it from beginning.
    // NEVER wrap around to the end or alter the queue!
    if (currentIndex <= 0) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }

    const isPlaylistMode = playbackContextRef.current === 'playlist';
    const prevIndex = currentIndex - 1;
    playSong(queue[prevIndex], undefined, isPlaylistMode ? 'playlist' : 'radio', undefined, isPlaylistMode ? playbackSourceRef.current : undefined);
  }, [currentSong, queue, currentTime, isShuffle, playSong]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
      return;
    }
    if (currentSong && !audioEngine.getCurrentSong()) {
      // First play after restoring session from localStorage: start audio and resume at saved timestamp
      playSong(currentSong, undefined, undefined, currentTime);
      return;
    }
    const playing = audioEngine.togglePlay();
    setIsPlaying(playing);
    if (playing) {
      if (currentSong) listenTogetherService.broadcastHostPlay(currentSong, currentTime);
    } else {
      listenTogetherService.broadcastHostPause();
    }
  }, [currentSong, songs, playSong, currentTime]);

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;

  // Toggle Shuffle without mutating or reordering the queue list
  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const nextState = !prev;
      if (nextState) {
        shuffleHistoryRef.current = currentSongRef.current ? [currentSongRef.current.id] : [];
        showToast('Shuffle: On 🔀');
      } else {
        shuffleHistoryRef.current = [];
        showToast('Shuffle: Off');
      }
      return nextState;
    });
  }, [showToast]);

  // Toggle Repeat: 1st click = track loop ('one'), 2nd click = all queue ('all'), 3rd click = off
  const handleToggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') {
        showToast('Repeat: Current Track 🔂');
        return 'one';
      } else if (prev === 'one') {
        showToast('Repeat: Entire Queue 🔁');
        return 'all';
      } else {
        showToast('Repeat: Off');
        return 'off';
      }
    });
  }, [showToast]);

  // Persist current playback session per-user so returning users resume where they left off
  const lastSavedTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!currentSong || !currentUser?.uid) return;
    const now = Date.now();
    if (now - lastSavedTimeRef.current > 1500 || !isPlaying) {
      lastSavedTimeRef.current = now;
      try {
        const storageKey = `sunona_playback_${currentUser.uid}`;
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            song: currentSong,
            currentTime: Math.floor(currentTime),
            duration: duration || currentSong.duration,
            queue: queueRef.current,
          })
        );
      } catch (e) {
        // storage quota fallback
      }
    }
  }, [currentSong, currentTime, duration, isPlaying, currentUser]);

  // PWA Window Controls Overlay Integration
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'windowControlsOverlay' in navigator) {
      const wco = (navigator as any).windowControlsOverlay;
      const updateWco = () => {
        if (wco?.visible) {
          document.body.classList.add('is-wco');
        } else {
          document.body.classList.remove('is-wco');
        }
      };
      updateWco();
      wco?.addEventListener?.('geometrychange', updateWco);
      return () => {
        wco?.removeEventListener?.('geometrychange', updateWco);
      };
    }
  }, []);

  // Electron Native Integration: Keyboard Media Keys & Native Frame Support
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;
    document.body.classList.add('is-electron');

    let unsubMedia: (() => void) | undefined;
    if (electronAPI.onMediaKey) {
      unsubMedia = electronAPI.onMediaKey((key: string) => {
        if (key === 'play-pause') {
          handleTogglePlay();
        } else if (key === 'next') {
          handleNext();
        } else if (key === 'prev') {
          handlePrev();
        } else if (key === 'like') {
          if (currentSongRef.current) {
            handleToggleLike(currentSongRef.current.id);
          }
        }
      });
    }

    let unsubChecking: (() => void) | undefined;
    let unsubAvailable: (() => void) | undefined;
    let unsubNotAvailable: (() => void) | undefined;
    let unsubProgress: (() => void) | undefined;
    let unsubReady: (() => void) | undefined;
    let unsubError: (() => void) | undefined;

    if (electronAPI.onUpdateChecking) {
      unsubChecking = electronAPI.onUpdateChecking(() => {
        setUpdateState((prev) => ({ ...prev, status: 'checking', error: undefined }));
      });
    }
    if (electronAPI.onUpdateAvailable) {
      unsubAvailable = electronAPI.onUpdateAvailable((info: any) => {
        setUpdateState((prev) => ({
          ...prev,
          status: 'available',
          availableVersion: info?.version,
        }));
      });
    }
    if (electronAPI.onUpdateNotAvailable) {
      unsubNotAvailable = electronAPI.onUpdateNotAvailable(() => {
        setUpdateState((prev) => ({ ...prev, status: 'not-available' }));
      });
    }
    if (electronAPI.onUpdateProgress) {
      unsubProgress = electronAPI.onUpdateProgress((p: any) => {
        setUpdateState((prev) => ({
          ...prev,
          status: 'downloading',
          progressPercent: p?.percent || 0,
          transferredBytes: p?.transferred,
          totalBytes: p?.total,
          bytesPerSecond: p?.bytesPerSecond,
        }));
      });
    }
    if (electronAPI.onUpdateReady) {
      unsubReady = electronAPI.onUpdateReady((version: string) => {
        setUpdateState((prev) => ({
          ...prev,
          status: 'ready',
          availableVersion: version,
        }));
        showToast(`SunoNa v${version} update ready to install!`);
      });
    }
    if (electronAPI.onUpdateError) {
      unsubError = electronAPI.onUpdateError((err: string) => {
        setUpdateState((prev) => ({
          ...prev,
          status: 'error',
          error: typeof err === 'string' ? err : 'Update check failed',
        }));
      });
    }

    return () => {
      unsubMedia?.();
      unsubChecking?.();
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubReady?.();
      unsubError?.();
    };
  }, [handleTogglePlay, handleNext, handlePrev, showToast]);

  // Synchronize Taskbar & Window State with Electron / Browser SMTC
  useEffect(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.sendPlaybackState) {
      electronAPI.sendPlaybackState({
        isPlaying,
        currentSong,
        uiMode,
      });
    }
    if (currentSong && currentSong.title) {
      document.title = `${currentSong.title} • ${currentSong.artist || 'Spotify Free'}`;
    } else {
      document.title = uiMode === 'spotify' ? 'Spotify Free' : 'SunoNa!!';
    }
  }, [isPlaying, currentSong, uiMode]);

  const handleCheckForUpdates = useCallback(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.checkForUpdates) {
      setUpdateState((prev) => ({ ...prev, status: 'checking', error: undefined }));
      electronAPI.checkForUpdates();
    } else {
      setUpdateState((prev) => ({ ...prev, status: 'checking', error: undefined }));
      setTimeout(() => {
        setUpdateState((prev) => ({ ...prev, status: 'not-available' }));
      }, 1200);
    }
  }, []);

  const handleRestartAndInstall = useCallback(() => {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.restartAndInstall) {
      electronAPI.restartAndInstall();
    }
  }, []);

  // Seek audio
  const handleSeek = (seconds: number) => {
    audioEngine.seek(seconds);
    setCurrentTime(seconds);
    listenTogetherService.broadcastHostSeek(seconds);
  };

  // Volume change
  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    setIsMuted(false);
    audioEngine.setVolume(vol);
  };

  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      audioEngine.setMute(false);
    } else {
      setIsMuted(true);
      audioEngine.setMute(true);
    }
  };

  // Toggle like status on song with persistent storage
  const handleToggleLike = useCallback((songId: string, customSong?: Song) => {
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === songId);
      let updated: Song[];
      if (exists) {
        updated = prev.filter((s) => s.id !== songId);
        showToast('Removed from Liked Songs 💔');
      } else {
        const target =
          customSong ||
          (currentSong?.id === songId ? currentSong : null) ||
          songs.find((s) => s.id === songId) ||
          queue.find((s) => s.id === songId);
        if (target) {
          updated = [{ ...target, isLiked: true }, ...prev];
          showToast(`Added "${target.title}" to Liked Songs ❤️`);
        } else {
          updated = prev;
        }
      }
      try {
        const activeKey = currentUser?.uid ? `sunona_liked_songs_${currentUser.uid}` : 'sunona_liked_songs_guest';
        localStorage.setItem(activeKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, isLiked: !s.isLiked } : s))
    );
    if (currentSong && currentSong.id === songId) {
      setCurrentSong((prev) => (prev ? { ...prev, isLiked: !prev.isLiked } : null));
    }
  }, [currentSong, songs, queue, showToast]);

  // Playlist actions & CRUD handlers
  const handleSelectPlaylist = useCallback((id: string) => {
    setSelectedPlaylistId(id);
    setActiveView('playlist');
  }, []);

  const handleSelectAlbum = useCallback((id: string) => {
    setSelectedAlbumId(id);
    setActiveView('album');
  }, []);

  const handleSelectArtist = useCallback((name: string) => {
    setSelectedArtist(name);
    setActiveView('artist');
  }, []);

  const handleCreatePlaylist = useCallback((title: string, desc?: string) => {
    const created = playlistService.createPlaylist(title, desc);
    showToast(`Created playlist "${created.title}"`);
    setSelectedPlaylistId(created.id);
    setActiveView('playlist');
  }, [showToast]);

  const handleDeletePlaylist = useCallback((id: string) => {
    const target = playlistService.getPlaylist(id);
    playlistService.deletePlaylist(id);
    showToast(`Deleted playlist "${target?.title || ''}"`);
    if (selectedPlaylistId === id) {
      setActiveView('library');
      setSelectedPlaylistId(null);
    }
  }, [selectedPlaylistId, showToast]);

  const handleRenamePlaylist = useCallback((id: string, newTitle: string, newDesc?: string) => {
    playlistService.renamePlaylist(id, newTitle, newDesc);
    showToast('Playlist updated');
  }, [showToast]);

  const handleAddToPlaylist = useCallback((playlistId: string, song: Song) => {
    const res = playlistService.addSongToPlaylist(playlistId, song);
    const pl = playlistService.getPlaylist(playlistId);
    if (res.success) {
      showToast(`Added to "${pl?.title || 'Playlist'}"`);
      setSongToAddToPlaylist(null);
    } else if (res.alreadyExists) {
      showToast(`Already in "${pl?.title || 'Playlist'}"`);
    }
  }, [showToast]);

  const handleCreateAndAdd = useCallback((title: string, song: Song) => {
    const created = playlistService.createPlaylist(title);
    playlistService.addSongToPlaylist(created.id, song);
    showToast(`Added to "${created.title}"`);
    setSongToAddToPlaylist(null);
  }, [showToast]);

  const handleAddMultipleToPlaylist = useCallback((playlistId: string, songs: Song[]) => {
    const res = playlistService.addSongsToPlaylist(playlistId, songs);
    const pl = playlistService.getPlaylist(playlistId);
    setPlaylists(playlistService.getPlaylists());
    if (res.addedCount > 0) {
      showToast(`Added ${res.addedCount} songs to "${pl?.title || 'Playlist'}"`);
    } else {
      showToast(`All songs already in "${pl?.title || 'Playlist'}"`);
    }
    setQueueToAddToPlaylist(null);
  }, [showToast]);

  const handleCreateAndAddMultiple = useCallback((title: string, songs: Song[]) => {
    const created = playlistService.createPlaylist(title);
    playlistService.addSongsToPlaylist(created.id, songs);
    setPlaylists(playlistService.getPlaylists());
    showToast(`Created "${created.title}" with ${songs.length} songs`);
    setQueueToAddToPlaylist(null);
  }, [showToast]);

  const handleRemoveSongFromPlaylist = useCallback((playlistId: string, songId: string, index?: number) => {
    const pl = playlists.find((p) => p.id === playlistId);
    const songIndex = index ?? (pl?.songs.findIndex((s) => s.id === songId) ?? -1);
    const songToRemove = pl?.songs[songIndex] || pl?.songs.find((s) => s.id === songId);

    playlistService.removeSongFromPlaylist(playlistId, songId);
    setPlaylists(playlistService.getPlaylists());

    if (songToRemove && songIndex >= 0) {
      showUndoToast(`Removed "${songToRemove.title}" from playlist`, () => {
        playlistService.insertSongAt(playlistId, songToRemove, songIndex);
        setPlaylists(playlistService.getPlaylists());
        showToast(`Restored "${songToRemove.title}" to playlist`);
      });
    } else {
      showToast('Removed from playlist');
    }
  }, [playlists, showUndoToast, showToast]);

  const handleRemoveSongFromQueue = useCallback((index: number) => {
    const songToRemove = queue[index];
    if (!songToRemove) return;

    setQueue((prev) => prev.filter((_, i) => i !== index));
    setSongs((prev) => prev.filter((s) => s.id !== songToRemove.id));

    showUndoToast(`Removed "${songToRemove.title}" from queue`, () => {
      setQueue((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, songToRemove);
        return next;
      });
      setSongs((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, songToRemove);
        return next;
      });
      showToast(`Restored "${songToRemove.title}" to queue`);
    });
  }, [queue, showUndoToast, showToast]);

  const handleRemoveSongFromHomeScreen = useCallback((song: Song, index: number) => {
    setSongs((prev) => prev.filter((_, i) => i !== index));
    setQueue((prev) => prev.filter((s) => s.id !== song.id));

    showUndoToast(`Removed "${song.title}" from Quick Picks`, () => {
      setSongs((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, song);
        return next;
      });
      setQueue((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, song);
        return next;
      });
      showToast(`Restored "${song.title}"`);
    });
  }, [showUndoToast, showToast]);

  // Setup AudioEngine event listeners
  useEffect(() => {
    audioEngine.onTimeUpdate = (time, dur) => {
      setCurrentTime(time);
      if (dur > 0) setDuration(dur);
    };

    audioEngine.onStateChange = (playing) => {
      setIsPlaying(playing);
    };

    audioEngine.onEnded = () => {
      if (isSleepEndOfTrackRef.current) {
        triggerSleepMode();
        return;
      }
      if (repeatModeRef.current === 'one' && currentSongRef.current) {
        audioEngine.seek(0);
        audioEngine.resume();
        setCurrentTime(0);
        setIsPlaying(true);
      } else {
        handleNext();
      }
    };

    audioEngine.onError = (err) => {
      console.warn('Audio streaming notice:', err);
      setTimeout(() => {
        handleNext();
      }, 1000);
    };

    audioEngine.setupMediaSessionHandlers({
      play: () => {
        audioEngine.resume();
        setIsPlaying(true);
      },
      pause: () => {
        audioEngine.pause();
        setIsPlaying(false);
      },
      nexttrack: handleNext,
      previoustrack: handlePrev,
      seekto: (details) => {
        if (details.seekTime !== undefined) {
          handleSeek(details.seekTime);
        }
      },
    });
  }, [handleNext, handlePrev, repeatMode, currentSong]);

  // Laptop Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Repeat toggle with Ctrl+R (Spotify standard) & prevent browser reload
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R') && !e.shiftKey) {
        e.preventDefault();
        handleToggleRepeat();
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        return;
      }

      // Shuffle toggle with Ctrl+S (Spotify standard)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleToggleShuffle();
        return;
      }

      // New Playlist with Ctrl+N
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N') && !e.shiftKey) {
        e.preventDefault();
        setIsCreatePlaylistOpen(true);
        return;
      }

      // Preferences with Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }

      // Zoom In / Out / Reset (Ctrl+=, Ctrl+-, Ctrl+0)
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const cur = parseFloat(document.body.style.zoom || '1');
        document.body.style.zoom = String(Math.min(1.5, Math.round((cur + 0.1) * 10) / 10));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        const cur = parseFloat(document.body.style.zoom || '1');
        document.body.style.zoom = String(Math.max(0.7, Math.round((cur - 0.1) * 10) / 10));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        document.body.style.zoom = '1';
        return;
      }

      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSeek(Math.min(duration, currentTime + 10));
        } else {
          handleNext();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSeek(Math.max(0, currentTime - 10));
        } else {
          handlePrev();
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.min(1, v + 0.05);
          audioEngine.setVolume(nv);
          return nv;
        });
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => {
          const nv = Math.max(0, v - 0.05);
          audioEngine.setVolume(nv);
          return nv;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveDrawer((d) => (d === 'lyrics' ? null : 'lyrics'));
      } else if (e.key === 'q' || e.key === 'Q') {
        setActiveDrawer((d) => (d === 'queue' ? null : 'queue'));
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setIsShortcutsOpen(true);
      } else if (e.code === 'Escape') {
        setIsListenTogetherOpen(false);
        setIsShortcutsOpen(false);
        setIsSettingsOpen(false);
        setIsNowPlayingOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleNext, handlePrev, handleToggleRepeat, handleToggleShuffle, handleSeek, duration, currentTime]);

  const likedCount = likedSongs.length;
  const cachedCount = songs.filter((s) => s.isCached).length;

  // Floating Always-On-Top Miniplayer (Document Picture-in-Picture with exact Spotify UI)
  const handleCloseMiniPlayer = useCallback(() => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch {}
      pipWindowRef.current = null;
    }
    setPipContainer(null);
    setIsMiniPlayerOpen(false);
  }, []);

  const handleToggleMiniPlayer = useCallback(async () => {
    if (isMiniPlayerOpen) {
      handleCloseMiniPlayer();
      return;
    }

    if (!currentSong) return;

    // 1. Document Picture-in-Picture window (Genuine OS Always-on-Top window with exact Spotify React UI)
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      try {
        const pipWin = await (window as any).documentPictureInPicture.requestWindow({
          width: 320,
          height: 380,
        });

        copyStylesToPip(pipWin);

        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.background = '#181818';
        pipWin.document.body.style.overflow = 'hidden';
        pipWin.document.body.style.userSelect = 'none';
        pipWin.document.title = 'SunoNa Miniplayer';

        pipWin.addEventListener('pagehide', () => {
          setPipContainer(null);
          pipWindowRef.current = null;
          setIsMiniPlayerOpen(false);
        });

        pipWindowRef.current = pipWin;
        setPipContainer(pipWin.document.body);
        setIsMiniPlayerOpen(true);
        return;
      } catch (err) {
        console.warn('Document Picture-in-Picture failed, using in-app floating overlay:', err);
      }
    }

    // Fallback: in-app floating overlay
    setPipContainer(null);
    setIsMiniPlayerOpen(true);
  }, [isMiniPlayerOpen, currentSong, handleCloseMiniPlayer]);

  const handleExpandMiniPlayer = useCallback(() => {
    handleCloseMiniPlayer();
    try {
      window.focus();
    } catch {}
    if (uiMode !== 'spotify') {
      setIsNowPlayingOpen(true);
    }
  }, [handleCloseMiniPlayer, uiMode]);

  const renderMiniPlayer = () => {
    if (!isMiniPlayerOpen || !currentSong) return null;

    const miniPlayerEl = (
      <MiniPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isCurrentSongLiked={likedSongs.some((s) => s.id === currentSong.id)}
        onTogglePlay={handleTogglePlay}
        onPrev={handlePrev}
        onNext={handleNext}
        onSeek={handleSeek}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLike={handleToggleLike}
        onToggleMute={handleToggleMute}
        onClose={handleCloseMiniPlayer}
        onExpand={handleExpandMiniPlayer}
        isPipWindow={Boolean(pipContainer)}
      />
    );

    if (pipContainer) {
      return createPortal(miniPlayerEl, pipContainer);
    }

    return miniPlayerEl;
  };

  // Intro Screen temporarily commented out as requested (code preserved)
  /*
  if (!hasEntered) {
    return <IntroScreen onEnter={() => setHasEntered(true)} />;
  }
  */

  // If visiting in normal browser tab (not installed PWA and not Electron), show Landing Page
  if (!showPlayer) {
    return <LandingPage onInstalled={() => setShowPlayer(true)} />;
  }

  // ══ SPOTIFY LAYOUT MODE ══
  if (uiMode === 'spotify') {
    return (
      <>
        <SpotifyLayout
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          queue={queue}
          songs={songs}
          albums={INITIAL_ALBUMS}
          playlists={playlists}
          likedSongs={likedSongs}
          dailyDiscover={dailyDiscover}
          listenAgain={listenAgain}
          similarShelf={similarShelf}
          mostPlayed={mostPlayed}
          tasteProfile={tasteProfile}
          favoriteArtistShelf={favoriteArtistShelf}
          user={currentUser}
          activeView={activeView}
          selectedPlaylistId={selectedPlaylistId}
          selectedAlbumId={selectedAlbumId}
          isLyricsOpen={activeDrawer === 'lyrics'}
          isQueueOpen={activeDrawer === 'queue'}
          isNowPlayingViewOpen={isNowPlayingViewOpen}
          isSleepTimerActive={isSleepTimerActive}
          sleepRemainingText={sleepRemainingText}
          onPlaySong={playSong}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleLike={handleToggleLike}
          onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
          onToggleLyrics={() => setActiveDrawer((d) => (d === 'lyrics' ? null : 'lyrics'))}
          onToggleQueue={() => setActiveDrawer((d) => (d === 'queue' ? null : 'queue'))}
          onToggleNowPlayingView={() => setIsNowPlayingViewOpen((prev) => !prev)}
          onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
          onOpenSleepTimer={() => setIsSleepModalOpen(true)}
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onSelectPlaylist={handleSelectPlaylist}
          onSelectAlbum={handleSelectAlbum}
          selectedArtist={selectedArtist}
          onSelectArtist={handleSelectArtist}
          setActiveView={setActiveView}
          onOpenLibrary={handleOpenLibrary}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          onSelectSong={playSong}
          onOpenListenTogether={() => setIsListenTogetherOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onGoSunoNa={() => handleToggleUiMode('sunona')}
          onLogout={async () => {
            await authService.signOut();
            setCurrentUser(null);
            setIsAuthModalOpen(true);
          }}
          onRemoveSong={handleRemoveSongFromPlaylist}
          onRemoveFromQueue={handleRemoveSongFromQueue}
          onClearQueue={() => setQueue(currentSong ? [currentSong] : [])}
          onSaveQueueToPlaylist={() => setQueueToAddToPlaylist(queue)}
          isMiniPlayerOpen={isMiniPlayerOpen}
          onToggleMiniPlayer={handleToggleMiniPlayer}
          playbackSource={playbackSource}
        />

        {/* Floating OS-level / In-App Miniplayer */}
        {renderMiniPlayer()}

        {/* Fullscreen Now Playing Showcase Modal */}
        {isNowPlayingOpen && currentSong && (
          <NowPlayingModal
            isOpen={isNowPlayingOpen}
            onClose={() => setIsNowPlayingOpen(false)}
            currentSong={currentSong}
            queue={queue}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            currentTheme={currentTheme}
            onPlaySong={playSong}
            onTogglePlay={handleTogglePlay}
            onNext={handleNext}
            onPrev={handlePrev}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onToggleShuffle={handleToggleShuffle}
            onToggleRepeat={handleToggleRepeat}
            onToggleLike={handleToggleLike}
            onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
          />
        )}

        {/* Add To Playlist Modal */}
        <AddToPlaylistModal
          isOpen={Boolean(songToAddToPlaylist || queueToAddToPlaylist)}
          song={songToAddToPlaylist}
          songs={queueToAddToPlaylist}
          playlists={playlists}
          onClose={() => {
            setSongToAddToPlaylist(null);
            setQueueToAddToPlaylist(null);
          }}
          onAddToPlaylist={handleAddToPlaylist}
          onCreateAndAdd={handleCreateAndAdd}
          onAddMultipleToPlaylist={handleAddMultipleToPlaylist}
          onCreateAndAddMultiple={handleCreateAndAddMultiple}
        />

        {/* Create Playlist Modal */}
        <CreatePlaylistModal
          isOpen={isCreatePlaylistOpen}
          onClose={() => setIsCreatePlaylistOpen(false)}
          onCreate={handleCreatePlaylist}
        />

        {/* Floating Toast */}
        {toastMessage && (
          <div className="toast-notification">
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 10-Second Undo Toast */}
        {undoToast && (
          <div className="toast-undo-banner">
            <div className="toast-undo-header">
              <div className="toast-undo-content">
                <Trash2 size={16} className="toast-undo-icon" />
                <span className="toast-undo-text">{undoToast.message}</span>
              </div>
              <div className="toast-undo-actions">
                <button
                  className="toast-undo-btn"
                  onClick={() => {
                    undoToast.onUndo();
                    setUndoToast(null);
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Undo ({undoToast.secondsRemaining}s)</span>
                </button>
                <button
                  className="toast-dismiss-btn"
                  onClick={() => setUndoToast(null)}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="toast-undo-progress" />
          </div>
        )}

        {/* Listen Together Modal */}
        <ListenTogetherModal
          isOpen={isListenTogetherOpen}
          onClose={() => setIsListenTogetherOpen(false)}
          currentSong={currentSong}
          isPlaying={isPlaying}
        />

        {/* Settings Dialog */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onOpenIntro={() => setIsSettingsOpen(false)}
        />

        {/* Sleep Timer Modal */}
        <SleepTimerModal
          isOpen={isSleepModalOpen}
          activeRemainingSeconds={sleepRemainingSeconds}
          isEndOfTrack={isSleepEndOfTrack}
          onSetTimer={handleSetSleepTimer}
          onSetEndOfTrack={handleSetSleepEndOfTrack}
          onCancelTimer={handleCancelSleepTimer}
          onAddMinutes={handleAddSleepMinutes}
          onClose={() => setIsSleepModalOpen(false)}
        />

        {/* Deep Sleep Overlay */}
        <SleepOverlay
          isOpen={isSleepOverlayOpen}
          onWakeUp={() => setIsSleepOverlayOpen(false)}
        />

        {/* Google & Email Auth Gate */}
        <AuthModal
          isOpen={isAuthModalOpen || !currentUser}
          onClose={() => {
            if (currentUser) setIsAuthModalOpen(false);
          }}
          isMandatoryGate={!currentUser}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthModalOpen(false);
            showToast(`Welcome, ${user.displayName}! Private library loaded.`);
          }}
        />

        {/* Profile Modal */}
        {currentUser && (
          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={currentUser}
            likedSongsCount={likedSongs.length}
            playlistsCount={playlists.length}
            onSignOut={() => {
              // Commit active playback session for this user before wiping memory state
              const activeUid = currentUser?.uid || authService.getCurrentUser()?.uid;
              if (activeUid && currentSong) {
                try {
                  localStorage.setItem(
                    `sunona_playback_${activeUid}`,
                    JSON.stringify({
                      song: currentSong,
                      currentTime: Math.floor(currentTime),
                      duration: duration || currentSong.duration,
                      queue: queueRef.current,
                    })
                  );
                } catch {}
              }
              setIsProfileModalOpen(false);
              authService.signOut();
              try {
                audioEngine.stopAndRelease();
              } catch {}
              setCurrentSong(null);
              currentSongRef.current = null;
              setIsPlaying(false);
              setCurrentTime(0);
              setDuration(0);
              setQueue([]);
              queueRef.current = [];
              setIsNowPlayingViewOpen(false);
              setActiveDrawer(null);
              setCurrentUser(null);
              historyService.setUser('guest');
              playlistService.setUser('guest');
              setLikedSongs([]);
              setPlaylists([]);
              setTasteProfile(undefined);
              setMostPlayed([]);
              setListenAgain([]);
              setFavoriteArtistShelf(null);
              setDailyDiscover([]);
              setSimilarShelf(null);
              setIsAuthModalOpen(true);
              showToast('Signed out successfully.');
            }}
            onManualSync={handleManualCloudSync}
          />
        )}
      </>
    );
  }

  // ══ SUNONA CLASSIC MODE ══
  return (
    <div className={`app-container sunona-mode`} data-ui-mode={uiMode}>
      {/* Subtle Atmospheric Background Cover Glow */}
      <div className="ambient-background">
        {currentSong && (
          <div
            className="ambient-cover-glow"
            style={{ backgroundImage: `url(${currentSong.coverUrl})` }}
          />
        )}
      </div>

      {/* Top Header with Live YouTube Search & Software Updates */}
      <Header
        onGoHome={() => setActiveView('home')}
        onSelectSong={playSong}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenUpdates={() => setIsUpdateModalOpen(true)}
        isUpdateReady={updateState.status === 'ready'}
        isUpdateDownloading={updateState.status === 'downloading' || updateState.status === 'checking'}
        onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        user={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        uiMode={uiMode}
        onToggleUiMode={handleToggleUiMode}
      />

      {/* Body: Sidebar + Main Viewport + Drawer */}
      <div className="app-body">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenLibrary={handleOpenLibrary}
          libraryFilter={libraryFilter}
          playlists={playlists}
          selectedPlaylistId={selectedPlaylistId}
          onSelectPlaylist={handleSelectPlaylist}
          onSelectAlbum={handleSelectAlbum}
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onOpenListenTogether={() => setIsListenTogetherOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentTheme={currentTheme}
          onSelectTheme={applyTheme}
          likedCount={likedCount}
          cachedCount={cachedCount}
          uiMode={uiMode}
          user={currentUser}
          playbackSource={playbackSource}
          isPlaying={isPlaying}
          currentSong={currentSong}
        />

        {(activeView === 'home' || activeView === 'artist' || !['explore', 'library', 'my-playlists', 'playlist', 'album', 'history'].includes(activeView)) && (
          <HomeScreen
            songs={songs}
            albums={INITIAL_ALBUMS}
            playlists={playlists}
            currentSong={currentSong}
            isPlaying={isPlaying}
            dailyDiscover={dailyDiscover}
            listenAgain={listenAgain}
            similarShelf={similarShelf}
            mostPlayed={mostPlayed}
            tasteProfile={tasteProfile}
            favoriteArtistShelf={favoriteArtistShelf}
            onPlaySong={playSong}
            onToggleLike={handleToggleLike}
            onSelectMood={handleSelectMood}
            onSelectPlaylist={handleSelectPlaylist}
            onSelectAlbum={handleSelectAlbum}
            onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
            onRemoveSong={handleRemoveSongFromHomeScreen}
          />
        )}

        {activeView === 'explore' && (
          <ExploreScreen
            songs={songs}
            likedSongs={likedSongs}
            onPlaySong={playSong}
            onToggleLike={handleToggleLike}
            onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
          />
        )}

        {activeView === 'library' && (
          <LibraryScreen
            songs={songs}
            likedSongs={likedSongs}
            initialFilter={libraryFilter}
            playlists={playlists}
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={playSong}
            onToggleLike={handleToggleLike}
            onSelectPlaylist={handleSelectPlaylist}
            onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
          />
        )}

        {activeView === 'my-playlists' && (
          <MyPlaylistsScreen
            playlists={playlists}
            onSelectPlaylist={handleSelectPlaylist}
            onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
            onPlaySong={playSong}
            onDeletePlaylist={handleDeletePlaylist}
          />
        )}

        {activeView === 'playlist' && (
          (() => {
            const currentPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || playlists[0];
            if (!currentPlaylist) return null;
            return (
              <PlaylistScreen
                playlist={currentPlaylist}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onPlaySong={playSong}
                onTogglePlay={handleTogglePlay}
                onBack={() => setActiveView('my-playlists')}
                onDeletePlaylist={handleDeletePlaylist}
                onRenamePlaylist={handleRenamePlaylist}
                onRemoveSong={handleRemoveSongFromPlaylist}
                onToggleLike={handleToggleLike}
              />
            );
          })()
        )}

        {activeView === 'album' && (
          (() => {
            const currentAlbum = INITIAL_ALBUMS.find((a) => a.id === selectedAlbumId) || {
              id: selectedAlbumId || 'album',
              title: selectedAlbumId?.replace(/^alb-/, '').replace(/-/g, ' ') || 'Album',
              artist: 'Various Artists',
              coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
              year: 2026,
              songCount: 0,
              color: '#8b5cf6',
              songs: [],
            };
            if (!currentAlbum) return null;
            return (
              <AlbumScreen
                album={currentAlbum}
                currentSong={currentSong}
                isPlaying={isPlaying}
                songsState={songs}
                onPlaySong={playSong}
                onTogglePlay={handleTogglePlay}
                onBack={() => setActiveView('home')}
                onToggleLike={handleToggleLike}
                onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
              />
            );
          })()
        )}

        {activeView === 'history' && (
          <HistoryScreen
            currentSong={currentSong}
            isPlaying={isPlaying}
            onPlaySong={playSong}
            onTogglePlay={handleTogglePlay}
            onToggleLike={handleToggleLike}
            onBack={() => setActiveView('home')}
            onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
            uiMode="sunona"
          />
        )}

        {/* Right Drawer: Live Synced Lyrics */}
        {activeDrawer === 'lyrics' && (
          <LyricsDrawer
            currentSong={currentSong}
            currentTime={currentTime}
            isLoading={isLoadingLyrics}
            onSeek={handleSeek}
            onRetry={() => currentSong && fetchLyricsForSong(currentSong)}
            onClose={() => setActiveDrawer(null)}
          />
        )}

        {/* Right Drawer: Up Next Queue */}
        {activeDrawer === 'queue' && (
          <QueueDrawer
            queue={queue}
            currentSong={currentSong}
            playbackSource={playbackSource}
            onPlaySong={playSong}
            onRemoveFromQueue={handleRemoveSongFromQueue}
            onClearQueue={() => setQueue(currentSong ? [currentSong] : [])}
            onSaveQueueToPlaylist={() => setQueueToAddToPlaylist(queue)}
            onClose={() => setActiveDrawer(null)}
          />
        )}
      </div>

      {/* Bottom Sticky Player Bar */}
      <PlayerBar
        currentSong={currentSong}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        isMuted={isMuted}
        isShuffle={isShuffle}
        repeatMode={repeatMode}
        isLyricsOpen={activeDrawer === 'lyrics'}
        isQueueOpen={activeDrawer === 'queue'}
        currentTheme={currentTheme}
        uiMode={uiMode}
        isNowPlayingViewOpen={isNowPlayingViewOpen}
        onToggleNowPlayingView={() => setIsNowPlayingViewOpen((prev) => !prev)}
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        isMiniPlayerOpen={isMiniPlayerOpen}
        onToggleMiniPlayer={handleToggleMiniPlayer}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
        onToggleLyrics={() => setActiveDrawer((d) => (d === 'lyrics' ? null : 'lyrics'))}
        onToggleQueue={() => setActiveDrawer((d) => (d === 'queue' ? null : 'queue'))}
        onToggleLike={handleToggleLike}
        onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
        isSleepTimerActive={isSleepTimerActive}
        sleepRemainingText={sleepRemainingText}
        onOpenSleepTimer={() => setIsSleepModalOpen(true)}
        likedSongs={likedSongs}
        playbackSource={playbackSource}
      />

      {/* Floating OS-level / In-App Miniplayer */}
      {renderMiniPlayer()}

      {/* Fullscreen Now Playing Showcase Modal */}
      {isNowPlayingOpen && currentSong && (
        <NowPlayingModal
          isOpen={isNowPlayingOpen}
          onClose={() => setIsNowPlayingOpen(false)}
          currentSong={currentSong}
          queue={queue}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          currentTheme={currentTheme}
          onPlaySong={playSong}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleLike={handleToggleLike}
          onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
        />
      )}

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={Boolean(songToAddToPlaylist || queueToAddToPlaylist)}
        song={songToAddToPlaylist}
        songs={queueToAddToPlaylist}
        playlists={playlists}
        onClose={() => {
          setSongToAddToPlaylist(null);
          setQueueToAddToPlaylist(null);
        }}
        onAddToPlaylist={handleAddToPlaylist}
        onCreateAndAdd={handleCreateAndAdd}
        onAddMultipleToPlaylist={handleAddMultipleToPlaylist}
        onCreateAndAddMultiple={handleCreateAndAddMultiple}
      />

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 10-Second Undo Toast */}
      {undoToast && (
        <div className="toast-undo-banner">
          <div className="toast-undo-header">
            <div className="toast-undo-content">
              <Trash2 size={16} className="toast-undo-icon" />
              <span className="toast-undo-text">{undoToast.message}</span>
            </div>
            <div className="toast-undo-actions">
              <button
                className="toast-undo-btn"
                onClick={() => {
                  undoToast.onUndo();
                  setUndoToast(null);
                }}
              >
                <RotateCcw size={14} />
                <span>Undo ({undoToast.secondsRemaining}s)</span>
              </button>
              <button
                className="toast-dismiss-btn"
                onClick={() => setUndoToast(null)}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="toast-undo-progress" />
        </div>
      )}

      {/* Listen Together Room Modal */}
      <ListenTogetherModal
        isOpen={isListenTogetherOpen}
        onClose={() => setIsListenTogetherOpen(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
      />

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenIntro={() => {
          setIsSettingsOpen(false);
          // setHasEntered(false); // Intro screen commented out
        }}
      />

      {/* Sleep Mode & Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepModalOpen}
        activeRemainingSeconds={sleepRemainingSeconds}
        isEndOfTrack={isSleepEndOfTrack}
        onSetTimer={handleSetSleepTimer}
        onSetEndOfTrack={handleSetSleepEndOfTrack}
        onCancelTimer={handleCancelSleepTimer}
        onAddMinutes={handleAddSleepMinutes}
        onClose={() => setIsSleepModalOpen(false)}
      />

      {/* Deep Sleep Goodnight Overlay */}
      <SleepOverlay
        isOpen={isSleepOverlayOpen}
        onWakeUp={() => setIsSleepOverlayOpen(false)}
      />

      {/* Google & Email Auth Gate */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        onClose={() => {
          if (currentUser) setIsAuthModalOpen(false);
        }}
        isMandatoryGate={!currentUser}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          showToast(`Welcome, ${user.displayName}! Private library loaded.`);
        }}
      />

      {/* User Profile & Private Cloud Backup Details */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          likedSongsCount={likedSongs.length}
          playlistsCount={playlists.length}
          onSignOut={() => {
            // Commit active playback session for this user before wiping memory state
            const activeUid = currentUser?.uid || authService.getCurrentUser()?.uid;
            if (activeUid && currentSong) {
              try {
                localStorage.setItem(
                  `sunona_playback_${activeUid}`,
                  JSON.stringify({
                    song: currentSong,
                    currentTime: Math.floor(currentTime),
                    duration: duration || currentSong.duration,
                    queue: queueRef.current,
                  })
                );
              } catch {}
            }
            setIsProfileModalOpen(false);
            authService.signOut();
            try {
              audioEngine.stopAndRelease();
            } catch {}
            setCurrentSong(null);
            currentSongRef.current = null;
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
            setQueue([]);
            queueRef.current = [];
            setIsNowPlayingViewOpen(false);
            setActiveDrawer(null);
            setCurrentUser(null);
            historyService.setUser('guest');
            playlistService.setUser('guest');
            setLikedSongs([]);
            setPlaylists([]);
            setTasteProfile(undefined);
            setMostPlayed([]);
            setListenAgain([]);
            setFavoriteArtistShelf(null);
            setDailyDiscover([]);
            setSimilarShelf(null);
            setIsAuthModalOpen(true);
            showToast('Signed out successfully.');
          }}
          onManualSync={handleManualCloudSync}
        />
      )}
      {/* Software Updates & Download Progress Dialog */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        updateState={updateState}
        onCheckForUpdates={handleCheckForUpdates}
        onRestartAndInstall={handleRestartAndInstall}
      />
    </div>
  );
};

export default App;

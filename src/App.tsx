import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Song, ThemePreset, LyricLine, DailyDiscoverItem, Playlist } from './types';
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
import { MyPlaylistsScreen } from './components/MyPlaylistsScreen';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { CreatePlaylistModal } from './components/CreatePlaylistModal';
import { PlayerBar } from './components/PlayerBar';
import { LyricsDrawer } from './components/LyricsDrawer';
import { QueueDrawer } from './components/QueueDrawer';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlayingModal } from './components/NowPlayingModal';
import { ListenTogetherModal } from './components/ListenTogetherModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { SettingsModal } from './components/SettingsModal';
import { IntroScreen } from './components/IntroScreen';
import { SleepTimerModal } from './components/SleepTimerModal';
import { SleepOverlay } from './components/SleepOverlay';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { UpdateModal, type UpdateState } from './components/UpdateModal';
import { authService, type UserProfile } from './services/authService';
import { cloudSyncService } from './services/cloudSyncService';

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

export const App: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>(INITIAL_SONGS);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>(INITIAL_SONGS);
  const queueRef = useRef<Song[]>(INITIAL_SONGS);
  const playbackContextRef = useRef<'radio' | 'playlist'>('radio');

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.85);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  const [activeView, setActiveView] = useState<'home' | 'explore' | 'library' | 'my-playlists' | 'playlist' | 'album'>('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [activeDrawer, setActiveDrawer] = useState<'lyrics' | 'queue' | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState<boolean>(false);
  const [isMiniPlayer, setIsMiniPlayer] = useState<boolean>(false);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  // Google Authentication & Cloud Sync
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: 'idle',
    currentVersion: '1.0.6',
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
  useEffect(() => {
    return authService.subscribe(async (user) => {
      setCurrentUser(user);
      if (user) {
        historyService.setUser(user.uid);
        const tp = historyService.getTasteProfile();
        setTasteProfile(tp.totalPlays > 0 ? tp : undefined);
        setMostPlayed(historyService.getMostPlayed(8));
        setListenAgain(historyService.getListenAgain(10));

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

        // Pull cloud data for this Gmail ID
        const remote = await cloudSyncService.pullFromCloud(user);
        const userStorageKey = `sunona_liked_songs_${user.uid}`;
        if (remote) {
          if (Array.isArray(remote.likedSongs)) {
            const mappedLiked = remote.likedSongs.map((s) => ({ ...s, isLiked: true }));
            setLikedSongs(mappedLiked);
            try {
              localStorage.setItem(userStorageKey, JSON.stringify(mappedLiked));
            } catch {}
          }
          if (Array.isArray(remote.playlists)) {
            playlistService.setPlaylists(remote.playlists);
            setPlaylists(remote.playlists);
          }
          showToast(`Library synced with ${user.email || user.displayName}`);
        } else {
          // Fresh account without prior cloud records: clean 0 slate
          setLikedSongs([]);
          playlistService.setPlaylists([]);
          setPlaylists([]);
          try {
            localStorage.removeItem(userStorageKey);
            localStorage.removeItem('sunona_liked_songs_v2');
            localStorage.removeItem('sunona_liked_songs_guest');
            localStorage.removeItem('sunona_user_playlists_v2');
          } catch {}
        }
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
          setQueue(mapped);
          queueRef.current = mapped;
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

  // Sleep Mode & Timer States & Handlers
  const [isSleepModalOpen, setIsSleepModalOpen] = useState<boolean>(false);
  const [isSleepOverlayOpen, setIsSleepOverlayOpen] = useState<boolean>(false);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);
  const [isSleepEndOfTrack, setIsSleepEndOfTrack] = useState<boolean>(false);
  const isSleepEndOfTrackRef = useRef<boolean>(false);
  isSleepEndOfTrackRef.current = isSleepEndOfTrack;
  const originalVolumeRef = useRef<number>(volume);

  // Trigger Deep Sleep Mode (Fades volume, halts stream, shows goodnight screen)
  const triggerSleepMode = useCallback(() => {
    setSleepRemainingSeconds(null);
    setIsSleepEndOfTrack(false);

    // Halt audio playback & terminate network streaming (0 data consumed)
    audioEngine.stopAndRelease();
    setIsPlaying(false);

    // Restore original volume setting for next wake-up
    audioEngine.setVolume(originalVolumeRef.current);
    setVolume(originalVolumeRef.current);

    // Open Deep Sleep Screen
    setIsSleepOverlayOpen(true);
    setIsSleepModalOpen(false);
  }, []);

  // Handle setting a timer in minutes
  const handleSetSleepTimer = useCallback((minutes: number) => {
    originalVolumeRef.current = audioEngine.getVolume();
    setIsSleepEndOfTrack(false);
    setSleepRemainingSeconds(minutes * 60);
    setIsSleepModalOpen(false);
    showToast(`🌙 Sleep timer set for ${minutes} min!`);
  }, [showToast]);

  // Handle setting End of Track
  const handleSetSleepEndOfTrack = useCallback(() => {
    originalVolumeRef.current = audioEngine.getVolume();
    setIsSleepEndOfTrack(true);
    setSleepRemainingSeconds(null);
    setIsSleepModalOpen(false);
    showToast('🌙 Sleep mode will activate when this song ends!');
  }, [showToast]);

  // Handle canceling timer
  const handleCancelSleepTimer = useCallback(() => {
    setSleepRemainingSeconds(null);
    setIsSleepEndOfTrack(false);
    audioEngine.setVolume(originalVolumeRef.current);
    setVolume(originalVolumeRef.current);
    showToast('Sleep timer turned off');
  }, [showToast]);

  // Handle adding minutes (+5, +15)
  const handleAddSleepMinutes = useCallback((minutes: number) => {
    setSleepRemainingSeconds((prev) => (prev ? prev + minutes * 60 : minutes * 60));
    showToast(`Added +${minutes} min to sleep timer`);
  }, [showToast]);

  // Countdown timer tick & 30-second volume fade-out
  useEffect(() => {
    if (sleepRemainingSeconds === null) return;

    if (sleepRemainingSeconds <= 0) {
      triggerSleepMode();
      return;
    }

    const timer = setInterval(() => {
      setSleepRemainingSeconds((prev) => {
        if (prev === null) return null;
        const next = prev - 1;

        // Smooth 30s Volume Fade-Out before sleep
        if (next <= 30 && next > 0) {
          const fadeRatio = next / 30;
          const fadedVolume = originalVolumeRef.current * fadeRatio;
          audioEngine.setVolume(fadedVolume);
          setVolume(fadedVolume);
        }

        if (next <= 0) {
          clearInterval(timer);
          triggerSleepMode();
          return null;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepRemainingSeconds, triggerSleepMode]);

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
  const playSong = useCallback((song: Song, customQueue?: Song[], contextMode?: 'playlist' | 'radio') => {
    const isLiked = likedSongs.some((ls) => ls.id === song.id) || !!song.isLiked;
    const enrichedSong: Song = { ...song, isLiked };
    setCurrentSong(enrichedSong);
    audioEngine.playSong(enrichedSong);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(song.duration);

    // Broadcast play event to Listen Together room
    listenTogetherService.broadcastHostPlay(song, 0);

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

    // Record play event into local database (Metrolist MusicDatabase event logging)
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

    // If a custom playlist queue is provided, set it as the active queue
    if (customQueue && customQueue.length > 0) {
      setQueue(customQueue);
      setSongs(customQueue);
      queueRef.current = customQueue;
    }

    // In Playlist Mode: NEVER append external songs to the queue
    if (!isPlaylistMode) {
      const currentQueue = queueRef.current;
      const isAlreadyInQueue = currentQueue.some((s) => s.id === song.id);

      if (!isAlreadyInQueue) {
        // User selected a brand new song (from search, new album, or recommendation shelf)
        // Reset queue & quick picks to start a fresh coherent Radio Station around this song!
        const initialStation = [song];
        setQueue(initialStation);
        setSongs(initialStation);
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
              // Fresh station: Seed both the Cover Flow Queue and Home Quick Picks with the identical coherent list!
              const station = [song, ...data.results.filter((r: Song) => r.id !== song.id)];
              setQueue(station);
              setSongs(station);
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
                setSongs(updated);
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

    // If song does not have lyrics, fetch live through 5-stage waterfall
    if (!song.lyrics || song.lyrics.length === 0) {
      fetchLyricsForSong(song);
    }

    if (song.color) {
      document.documentElement.style.setProperty('--primary', song.color);
      document.documentElement.style.setProperty('--primary-glow', `${song.color}66`);
    }
  }, [fetchLyricsForSong]);

  // Next track in queue with playlist boundary handling & radio lookahead auto-pagination
  const handleNext = useCallback(() => {
    if (!currentSong || queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    const isPlaylistMode = playbackContextRef.current === 'playlist';

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      playSong(queue[randomIndex], undefined, isPlaylistMode ? 'playlist' : 'radio');
      return;
    }

    if (isPlaylistMode) {
      const isLastSong = currentIndex >= queue.length - 1;
      if (isLastSong) {
        if (repeatMode === 'all') {
          playSong(queue[0], undefined, 'playlist');
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
      playSong(queue[currentIndex + 1], undefined, 'playlist');
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
              setSongs(updated);
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
    if (currentTime > 4) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const isPlaylistMode = playbackContextRef.current === 'playlist';
    const currentIndex = queue.findIndex((s) => s.id === currentSong.id);
    if (isPlaylistMode && currentIndex <= 0) {
      // First song in playlist: restart it
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    playSong(queue[prevIndex], undefined, isPlaylistMode ? 'playlist' : 'radio');
  }, [currentSong, queue, currentTime, playSong]);

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (!currentSong && songs.length > 0) {
      playSong(songs[0]);
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

  const handleRemoveSongFromPlaylist = useCallback((playlistId: string, songId: string) => {
    playlistService.removeSongFromPlaylist(playlistId, songId);
    showToast('Removed from playlist');
  }, [showToast]);

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
      if (repeatMode === 'one' && currentSong) {
        audioEngine.seek(0);
        audioEngine.resume();
      } else {
        handleNext();
      }
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
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight' && !e.ctrlKey) {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft' && !e.ctrlKey) {
        e.preventDefault();
        handlePrev();
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
      } else if (e.key === 'p' || e.key === 'P') {
        setIsMiniPlayer((m) => !m);
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        setIsShortcutsOpen(true);
      } else if (e.code === 'Escape') {
        setIsListenTogetherOpen(false);
        setIsShortcutsOpen(false);
        setIsSettingsOpen(false);
        setIsMiniPlayer(false);
        setIsNowPlayingOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleNext, handlePrev]);

  const likedCount = likedSongs.length;
  const cachedCount = songs.filter((s) => s.isCached).length;

  if (!hasEntered) {
    return <IntroScreen onEnter={() => setHasEntered(true)} />;
  }

  return (
    <div className="app-container">
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
        onSelectSong={playSong}
        onToggleMiniPlayer={() => setIsMiniPlayer((m) => !m)}
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
          onCreatePlaylist={() => setIsCreatePlaylistOpen(true)}
          onOpenListenTogether={() => setIsListenTogetherOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          currentTheme={currentTheme}
          onSelectTheme={applyTheme}
          likedCount={likedCount}
          cachedCount={cachedCount}
        />

        {activeView === 'home' && (
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
            return currentPlaylist ? (
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
            ) : null;
          })()
        )}

        {activeView === 'album' && (
          (() => {
            const currentAlbum = INITIAL_ALBUMS.find((a) => a.id === selectedAlbumId) || INITIAL_ALBUMS[0];
            return currentAlbum ? (
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
            ) : null;
          })()
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
            onPlaySong={playSong}
            onRemoveFromQueue={(idx) => setQueue((q) => q.filter((_, i) => i !== idx))}
            onClearQueue={() => setQueue(currentSong ? [currentSong] : [])}
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
        onOpenNowPlaying={() => setIsNowPlayingOpen(true)}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleShuffle={() => setIsShuffle((s) => !s)}
        onToggleRepeat={() => {
          if (repeatMode === 'off') setRepeatMode('all');
          else if (repeatMode === 'all') setRepeatMode('one');
          else setRepeatMode('off');
        }}
        onToggleLyrics={() => setActiveDrawer((d) => (d === 'lyrics' ? null : 'lyrics'))}
        onToggleQueue={() => setActiveDrawer((d) => (d === 'queue' ? null : 'queue'))}
        onToggleMiniPlayer={() => setIsMiniPlayer((m) => !m)}
        onToggleLike={handleToggleLike}
        onAddToPlaylist={(song) => setSongToAddToPlaylist(song)}
        isSleepTimerActive={sleepRemainingSeconds !== null || isSleepEndOfTrack}
        sleepRemainingText={
          isSleepEndOfTrack
            ? 'Track'
            : sleepRemainingSeconds !== null
            ? `${Math.floor(sleepRemainingSeconds / 60)}:${sleepRemainingSeconds % 60 < 10 ? '0' : ''}${sleepRemainingSeconds % 60}`
            : null
        }
        onOpenSleepTimer={() => setIsSleepModalOpen(true)}
      />

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
          onToggleShuffle={() => setIsShuffle((s) => !s)}
          onToggleRepeat={() => {
            if (repeatMode === 'off') setRepeatMode('all');
            else if (repeatMode === 'all') setRepeatMode('one');
            else setRepeatMode('off');
          }}
          onToggleLike={handleToggleLike}
        />
      )}

      {/* Floating Mini-Player for Laptop Multitasking */}
      {isMiniPlayer && (
        <MiniPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={handleTogglePlay}
          onNext={handleNext}
          onPrev={handlePrev}
          onExpand={() => setIsMiniPlayer(false)}
          onToggleLyrics={() => setActiveDrawer((d) => (d === 'lyrics' ? null : 'lyrics'))}
        />
      )}

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={Boolean(songToAddToPlaylist)}
        song={songToAddToPlaylist}
        playlists={playlists}
        onClose={() => setSongToAddToPlaylist(null)}
        onAddToPlaylist={handleAddToPlaylist}
        onCreateAndAdd={handleCreateAndAdd}
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

      {/* Settings & Equalizer Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenIntro={() => {
          setIsSettingsOpen(false);
          setHasEntered(false);
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

      {/* Google Authentication Dialog */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome, ${user.displayName}! Cloud sync active.`);
        }}
      />

      {/* Google User Profile & Cloud Backup Details */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={currentUser}
          likedSongsCount={likedSongs.length}
          playlistsCount={playlists.length}
          onSignOut={() => {
            authService.signOut();
            setCurrentUser(null);
            historyService.setUser('guest');
            historyService.clear();
            setLikedSongs([]);
            playlistService.setPlaylists([]);
            setPlaylists([]);
            setTasteProfile(undefined);
            setMostPlayed([]);
            setListenAgain([]);
            setFavoriteArtistShelf(null);
            setDailyDiscover([]);
            setSimilarShelf(null);
            try {
              if (currentUser?.uid) {
                localStorage.removeItem(`sunona_liked_songs_${currentUser.uid}`);
              }
              localStorage.removeItem('sunona_liked_songs_guest');
              localStorage.removeItem('sunona_liked_songs_v2');
              localStorage.removeItem('sunona_user_playlists_v2');
              localStorage.removeItem('metrolist_daily_discover_cache_v2');
              localStorage.removeItem('metrolist_history_v2');
              localStorage.removeItem('metrolist_history_v1');
              localStorage.removeItem('metrolist_search_history_v1');
            } catch {}
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

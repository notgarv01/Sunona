import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Keyboard, X, Loader2, Download, RefreshCw, Home, ChevronLeft, ChevronRight, MoreHorizontal, Bell, Users, Library } from 'lucide-react';
import type { Song } from '../types';
import type { UserProfile } from '../services/authService';

interface Props {
  onSelectSong: (song: Song) => void;
  onOpenShortcuts: () => void;
  onOpenUpdates?: () => void;
  isUpdateReady?: boolean;
  isUpdateDownloading?: boolean;
  version?: string;
  onAddToPlaylist?: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
  user?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenProfile?: () => void;
  onGoHome?: () => void;
  uiMode?: 'sunona' | 'spotify';
  onToggleUiMode?: (mode: 'sunona' | 'spotify') => void;
}

interface RecentSearchSong {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  album?: string;
  duration?: number;
}

export const SpotifyLogoIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1ed760" className="spotify-icon-svg" style={{ flexShrink: 0, display: 'block' }}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

const getRecentSongsKey = (uid?: string) => `sunona_recent_search_songs_${uid || 'guest'}`;

function getStoredRecentSongs(uid?: string): RecentSearchSong[] {
  try {
    const raw = localStorage.getItem(getRecentSongsKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

export const Header: React.FC<Props> = ({
  onSelectSong,
  onOpenShortcuts,
  onOpenUpdates,
  isUpdateReady,
  isUpdateDownloading,
  version = '1.0.11',
  onAddToPlaylist: _onAddToPlaylist,
  currentSong: _currentSong,
  isPlaying,
  user,
  onOpenAuth,
  onOpenProfile,
  onGoHome,
  uiMode = 'sunona',
  onToggleUiMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [recentSongs, setRecentSongs] = useState<RecentSearchSong[]>(() => getStoredRecentSongs(user?.uid));
  const [isLoading, setIsLoading] = useState(false);

  // Sync recent search songs when active user changes or when another UI updates history
  useEffect(() => {
    const handleSync = () => {
      setRecentSongs(getStoredRecentSongs(user?.uid));
    };
    handleSync();
    window.addEventListener('sunona:search-history-updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('sunona:search-history-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [user?.uid]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const searchTimerRef = useRef<any>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const saveRecentSong = useCallback((song: Song | RecentSearchSong) => {
    setRecentSongs((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id && s.title.toLowerCase() !== song.title.toLowerCase());
      const updated: RecentSearchSong[] = [
        {
          id: song.id,
          title: song.title,
          artist: song.artist,
          album: song.album || 'Single',
          coverUrl: song.coverUrl,
          duration: song.duration,
        },
        ...filtered,
      ].slice(0, 10);
      try {
        localStorage.setItem(getRecentSongsKey(user?.uid), JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('sunona:search-history-updated'));
      } catch {}
      return updated;
    });
  }, [user?.uid]);

  const removeRecentSong = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSongs((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem(getRecentSongsKey(user?.uid), JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('sunona:search-history-updated'));
      } catch {}
      return updated;
    });
  }, [user?.uid]);

  const clearAllRecent = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSongs([]);
    try {
      localStorage.removeItem(getRecentSongsKey(user?.uid));
      window.dispatchEvent(new CustomEvent('sunona:search-history-updated'));
    } catch {}
  }, [user?.uid]);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Debounced Live YouTube Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(async () => {
      try {
        const apiKey = localStorage.getItem('yt_api_key') || '';
        const headers: Record<string, string> = {};
        if (apiKey && apiKey.trim().length > 10) {
          headers['X-YouTube-Key'] = apiKey.trim();
        }
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSearchSuggestions(data.suggestions.slice(0, 5));
          } else {
            setSearchSuggestions([]);
          }
          const items: Song[] = (data.results || []).map((it: any) => ({
            id: it.id,
            title: it.title,
            artist: it.artist,
            album: it.subtitle || it.album || 'YouTube Music',
            duration: it.duration || 210,
            coverUrl: it.coverUrl,
            audioUrl: '', // Uses YouTube player engine directly by id!
            views: it.views,
            lyrics: [],
          }));
          setSearchResults(items);
        }
      } catch (err) {
        console.error('Search request error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`app-header ${uiMode === 'spotify' ? 'spotify-header' : ''}`}>
      {/* Brand & Spotify Top Nav */}
      <div className="header-left">
        {uiMode === 'spotify' ? (
          <div className="spotify-hdr-nav-cluster">
            <button className="spotify-hdr-dots-btn" title="More options">
              <MoreHorizontal size={18} />
            </button>
            <button className="spotify-hdr-nav-btn" onClick={() => window.history.back()} title="Go back">
              <ChevronLeft size={20} />
            </button>
            <button className="spotify-hdr-nav-btn disabled" title="Go forward">
              <ChevronRight size={20} />
            </button>
            <button className="spotify-hdr-home-btn" onClick={onGoHome} title="Home">
              <Home size={22} />
            </button>
          </div>
        ) : (
          <div
            className="brand-badge"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              if (onGoHome) onGoHome();
            }}
            title="Go to Home"
          >
            <div className="brand-logo-icon" style={{ overflow: 'hidden', padding: 0, background: 'transparent', border: 'none' }}>
              <img
                src="/logo.jpg"
                alt="SunoNa Logo"
                className={`brand-logo-img ${isPlaying ? 'spinning-disc-icon' : ''}`}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <span className="brand-title">SunoNa!!</span>
              <div className="brand-subtitle" style={{ color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.04em' }}>v{version}</div>
            </div>
          </div>
        )}

        {/* Global Live YouTube Music Search Bar (Spotify Style) */}
        <div className={`search-container ${uiMode === 'spotify' ? 'spotify-search-container' : ''}`} ref={searchRef}>
          <div className="search-input-wrapper">
            {isLoading ? (
              <Loader2 className="search-icon" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Search className="search-icon" />
            )}
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="What do you want to play?"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchResults.length > 0) {
                    saveRecentSong(searchResults[0]);
                    onSelectSong(searchResults[0]);
                    setIsDropdownOpen(false);
                  }
                } else if (e.key === 'Escape') {
                  setIsDropdownOpen(false);
                }
              }}
            />
            {searchQuery ? (
              <X
                size={16}
                style={{ cursor: 'pointer', color: 'var(--text-muted)' }}
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              />
            ) : uiMode === 'spotify' ? (
              <div className="spotify-search-browse-addon">
                <span className="spotify-search-divider" />
                <button
                  type="button"
                  className="spotify-search-browse-btn"
                  title="Browse"
                >
                  <Library size={16} />
                </button>
              </div>
            ) : (
              <span className="search-shortcut">Ctrl+K</span>
            )}
          </div>

          {/* Instant Search Results & Recent Searches Dropdown */}
          {isDropdownOpen && (
            <div className="search-results-dropdown">
              {searchQuery.trim() === '' ? (
                <div className="search-history-section">
                  <div className="search-section-header" style={{ borderBottom: 'none', padding: '10px 12px 6px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Recent searches</span>
                    {recentSongs.length > 0 && (
                      <button className="search-clear-all-btn" onClick={clearAllRecent}>
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="search-history-list" style={{ padding: '0 2px' }}>
                    {recentSongs.map((song) => (
                      <div
                        key={song.id}
                        className="search-result-item"
                        onClick={() => {
                          saveRecentSong(song);
                          onSelectSong({
                            ...song,
                            album: 'YouTube Music',
                            duration: song.duration || 210,
                            audioUrl: '',
                            lyrics: [],
                          });
                          setIsDropdownOpen(false);
                        }}
                      >
                        <img src={song.coverUrl} alt={song.title} className="search-result-thumb" />
                        <div className="search-result-info">
                          <div className="search-result-title">{song.title}</div>
                          <div className="search-result-subtitle">{song.album && song.album.includes('•') ? song.album : `Song • ${song.artist}`}</div>
                        </div>
                        <button
                          className="search-history-remove-btn"
                          onClick={(e) => removeRecentSong(song.id, e)}
                          title="Remove from recents"
                          style={{ opacity: 0.6, padding: '4px' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {searchSuggestions.length > 0 && (
                    <div className="search-suggestions-container" style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                        Predictions
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {searchSuggestions.map((sugg, sIdx) => (
                          <button
                            key={`sugg_${sIdx}`}
                            type="button"
                            onClick={() => {
                              setSearchQuery(sugg);
                              inputRef.current?.focus();
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '16px',
                              padding: '4px 10px',
                              color: '#e4e4e7',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.14)';
                              e.currentTarget.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.color = '#e4e4e7';
                            }}
                          >
                            <Search size={11} style={{ opacity: 0.6 }} />
                            <span>{sugg}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px 6px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>Search results</span>
                    {isLoading && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={13} className="animate-spin" /> Searching...
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '0 2px' }}>
                    {searchResults.length > 0 ? (
                      searchResults.map((song) => (
                        <div
                          key={song.id}
                          className="search-result-item"
                          onClick={() => {
                            saveRecentSong(song);
                            onSelectSong(song);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <img src={song.coverUrl} alt={song.title} className="search-result-thumb" />
                          <div className="search-result-info">
                            <div className="search-result-title">{song.title}</div>
                            <div className="search-result-subtitle">{song.album && song.album.includes('•') ? song.album : `Song • ${song.artist}`}</div>
                          </div>
                        </div>
                      ))
                    ) : !isLoading ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                        No songs found for "{searchQuery}"
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Header Right Actions */}
      <div className="header-right">
        {/* Install Desktop App Button (Only in Web Browser mode, hidden in Native Electron) */}
        {deferredPrompt && !(window as any).electronAPI?.isElectron && (
          <button
            className="header-install-app-btn"
            onClick={handleInstallApp}
            title="Install SunoNa as a standalone Windows Desktop App"
          >
            <Download size={14} />
            <span>Install App</span>
          </button>
        )}

        {/* Check for Software Updates Button */}
        <button
          className="icon-btn"
          onClick={onOpenUpdates}
          title="Check for Software Updates"
          style={{ position: 'relative' }}
        >
          <RefreshCw size={17} className={isUpdateDownloading ? 'animate-spin' : ''} style={{ color: isUpdateReady ? '#34d399' : 'inherit' }} />
          {isUpdateReady && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#10b981',
                boxShadow: '0 0 8px #10b981',
              }}
            />
          )}
        </button>

        {/* Spotify vs SunoNa UI Mode Switcher Pill */}
        <div className="header-ui-mode-pill">
          <button
            className={`header-ui-mode-btn ${uiMode === 'sunona' ? 'active' : ''}`}
            onClick={() => onToggleUiMode?.('sunona')}
            title="Switch to SunoNa Original UI"
          >
            <img
              src="/logo.jpg"
              alt="SunoNa"
              className={isPlaying && uiMode === 'sunona' ? 'spinning-disc-icon' : ''}
              style={{ width: '13px', height: '13px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span>SunoNa</span>
          </button>
          <button
            className={`header-ui-mode-btn ${uiMode === 'spotify' ? 'active' : ''}`}
            onClick={() => onToggleUiMode?.('spotify')}
            title="Switch to Spotify Desktop UI"
          >
            <SpotifyLogoIcon size={14} />
            <span>Spotify</span>
          </button>
        </div>

        {/* Laptop Keyboard Shortcuts Dialog */}
        <button
          className="icon-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard size={18} />
        </button>

        {/* Spotify User Cluster (Bell, Friends, Profile Avatar) */}
        {uiMode === 'spotify' ? (
          <div className="spotify-hdr-user-cluster">
            <button className="spotify-hdr-icon-btn" title="What's New">
              <Bell size={18} />
            </button>
            <button className="spotify-hdr-icon-btn" title="Friend Activity">
              <Users size={18} />
            </button>
            <div
              className="spotify-hdr-avatar-g"
              onClick={onOpenProfile || onOpenAuth}
              title={user?.displayName ? `${user.displayName} (Profile)` : 'My Profile'}
              style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span>{user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
          </div>
        ) : user ? (
          <button
            onClick={onOpenProfile}
            className="header-user-profile-btn"
            title={`Signed in as ${user.displayName || user.email} • Click to manage Cloud Backup`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '3px 12px 3px 4px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`}
              alt={user.displayName || 'User'}
              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName || 'Listener'}
            </span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="header-google-signin-btn"
            title="Sign in with Google to backup your playlists & liked songs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '20px',
              padding: '6px 13px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Play, Keyboard, PictureInPicture, X, Loader2, Disc, ListPlus, Clock, TrendingUp, Download } from 'lucide-react';
import type { Song } from '../types';

interface Props {
  onSelectSong: (song: Song) => void;
  onToggleMiniPlayer: () => void;
  onOpenShortcuts: () => void;
  onAddToPlaylist?: (song: Song) => void;
  currentSong: Song | null;
  isPlaying: boolean;
}

const SEARCH_HISTORY_KEY = 'metrolist_search_history_v1';
const TRENDING_SUGGESTIONS = [
  'Arz Kiya Hai',
  'Khat',
  'Arijit Singh',
  'Anuv Jain',
  'Pritam Hits',
  'Lo-Fi Hindi',
];

function getStoredSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === 'string' && s.trim().length > 0);
    }
  } catch {}
  return [];
}

export const Header: React.FC<Props> = ({
  onSelectSong,
  onToggleMiniPlayer,
  onOpenShortcuts,
  onAddToPlaylist,
  currentSong,
  isPlaying,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>(getStoredSearchHistory);
  const [isLoading, setIsLoading] = useState(false);
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

  const saveToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 15);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((query: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSearchHistory((prev) => {
      const updated = prev.filter((q) => q !== query);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearAllHistory = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {}
  }, []);

  const handleSelectQuery = useCallback((query: string) => {
    setSearchQuery(query);
    saveToHistory(query);
    setIsDropdownOpen(true);
    inputRef.current?.focus();
  }, [saveToHistory]);

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
          const items: Song[] = (data.results || []).map((it: any) => ({
            id: it.id,
            title: it.title,
            artist: it.artist,
            album: it.album || 'YouTube Music',
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
    <header className="app-header">
      {/* Brand */}
      <div className="header-left">
        <div className="brand-badge" onClick={() => window.location.reload()}>
          <div className="brand-logo-icon">
            <Disc size={20} className={isPlaying ? 'spinning-disc-icon' : ''} />
          </div>
          <div>
            <span className="brand-title">SunoNa!!</span>
            <div className="brand-subtitle">Desktop Hi-Fi</div>
          </div>
        </div>

        {/* Global Live YouTube Music Search Bar */}
        <div className="search-container" ref={searchRef}>
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
              placeholder="Search tracks, artists, albums..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (searchQuery.trim()) {
                    saveToHistory(searchQuery.trim());
                  }
                  if (searchResults.length > 0) {
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
            ) : (
              <span className="search-shortcut">Ctrl+K</span>
            )}
          </div>

          {/* Instant Search Results & History Dropdown */}
          {isDropdownOpen && (
            <div className="search-results-dropdown">
              {searchQuery.trim() === '' ? (
                <>
                  {/* Recent Searches Section */}
                  {searchHistory.length > 0 && (
                    <div className="search-history-section">
                      <div className="search-section-header">
                        <div className="search-section-title">
                          <Clock size={13} className="search-history-clock-icon" />
                          <span>Recent Searches</span>
                        </div>
                        <button
                          className="search-clear-all-btn"
                          onClick={clearAllHistory}
                          title="Clear all search history"
                        >
                          Clear all
                        </button>
                      </div>

                      <div className="search-history-list">
                        {searchHistory.map((item, idx) => (
                          <div
                            key={`hist_${idx}_${item}`}
                            className="search-history-item"
                            onClick={() => handleSelectQuery(item)}
                          >
                            <div className="search-history-item-left">
                              <Clock size={14} className="search-history-clock-icon" />
                              <span className="search-history-text">{item}</span>
                            </div>
                            <button
                              className="search-history-remove-btn"
                              onClick={(e) => removeFromHistory(item, e)}
                              title="Delete search"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Suggestions Section */}
                  <div className="search-trending-section">
                    <div
                      className="search-section-header"
                      style={{ marginTop: searchHistory.length > 0 ? '8px' : '0' }}
                    >
                      <div className="search-section-title">
                        <TrendingUp size={13} style={{ color: 'var(--accent)' }} />
                        <span>Trending & Suggested</span>
                      </div>
                    </div>
                    <div className="search-trending-chips">
                      {TRENDING_SUGGESTIONS.map((item) => (
                        <div
                          key={`trend_${item}`}
                          className="search-trending-chip"
                          onClick={() => handleSelectQuery(item)}
                        >
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Matching history quick-tags while typing */}
                  {(() => {
                    const matches = searchHistory
                      .filter(
                        (h) =>
                          h.toLowerCase().includes(searchQuery.toLowerCase()) &&
                          h.toLowerCase() !== searchQuery.toLowerCase()
                      )
                      .slice(0, 3);

                    return matches.length > 0 ? (
                      <div className="search-matching-history-row">
                        {matches.map((match) => (
                          <div
                            key={`match_${match}`}
                            className="search-matching-pill"
                            onClick={() => handleSelectQuery(match)}
                            title={`Search "${match}"`}
                          >
                            <Clock size={12} />
                            <span>{match}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      Live YouTube Music ({searchResults.length})
                    </span>
                    {isLoading && <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>Searching YouTube...</span>}
                  </div>

                  {searchResults.length > 0 ? (
                    searchResults.map((song) => (
                      <div
                        key={song.id}
                        className="search-result-item"
                        onClick={() => {
                          if (searchQuery.trim()) {
                            saveToHistory(searchQuery.trim());
                          }
                          onSelectSong(song);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <img src={song.coverUrl} alt={song.title} className="search-result-thumb" />
                        <div className="search-result-info">
                          <div className="search-result-title">{song.title}</div>
                          <div className="search-result-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
                            {/official|coke studio|vevo|t-series|sony|yrf|zee music/i.test(song.title + ' ' + song.artist) && (
                              <span className="search-official-tag">OFFICIAL</span>
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {song.artist} • {song.views}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <button
                            className="icon-btn"
                            style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.08)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPlaylist?.(song);
                            }}
                            title="Add to Playlist"
                          >
                            <ListPlus size={14} />
                          </button>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                              color: '#0b0914',
                            }}
                          >
                            <Play size={13} fill="#0b0914" color="#0b0914" style={{ marginLeft: '2px' }} />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : !isLoading ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No tracks found on YouTube for "{searchQuery}"
                    </div>
                  ) : null}
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

        {/* Playback Status Badge */}
        <div className={`playback-status-pill ${isPlaying && currentSong ? 'playing' : 'idle'}`} title="Audio Engine Status">
          <span className={`playback-status-dot ${isPlaying && currentSong ? 'playing' : 'idle'}`} />
          <span>
            {isPlaying && currentSong
              ? `${currentSong.title}`
              : 'Engine Ready'}
          </span>
        </div>

        {/* Mini-Player PiP Button */}
        <button
          className="icon-btn"
          onClick={onToggleMiniPlayer}
          title="Open Floating Mini-Player (Laptop PiP)"
        >
          <PictureInPicture size={18} />
        </button>

        {/* Laptop Keyboard Shortcuts Dialog */}
        <button
          className="icon-btn"
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard size={18} />
        </button>
      </div>
    </header>
  );
};

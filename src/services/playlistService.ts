import type { Playlist, Song } from '../types';
import { authService } from './authService';

export function isInvalidCoverUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const s = url.trim().toLowerCase();
  return (
    s === '' ||
    s.includes('keyboard-shortcuts') ||
    s.includes('onboarding-card') ||
    s.includes('producer.webp') ||
    s.includes('producer-thumbnail-bg') ||
    s.includes('ej74baox') ||
    s.includes('library-import') ||
    s.includes('mando_helmet') ||
    s.includes('podcasts-following-empty-state')
  );
}

export function sanitizeCoverUrl(url?: string | null, fallback?: string): string {
  if (isInvalidCoverUrl(url)) {
    return fallback || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
  }
  return url!;
}

class PlaylistService {
  private playlists: Playlist[] = [];
  private listeners: (() => void)[] = [];
  private currentUserId: string = 'guest';

  constructor() {
    try {
      const activeUser = authService.getCurrentUser();
      if (activeUser?.uid) {
        this.currentUserId = activeUser.uid;
      }
    } catch {}
    this.load();
  }

  private getStorageKey(): string {
    return `sunona_playlists_${this.currentUserId}`;
  }

  public setUser(userId: string | null) {
    this.currentUserId = userId?.trim() || 'guest';
    this.load();
    this.notify();
  }

  private sanitizePlaylist(pl: Playlist): Playlist {
    if (pl.songs && Array.isArray(pl.songs)) {
      pl.songs = pl.songs.map((s: Song) => {
        if (isInvalidCoverUrl(s.coverUrl)) {
          s.coverUrl = s.id ? `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
        }
        return s;
      });
    }
    if (isInvalidCoverUrl(pl.coverUrl)) {
      const firstValidSong = pl.songs?.find(s => !isInvalidCoverUrl(s.coverUrl));
      pl.coverUrl = firstValidSong?.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';
    }
    return pl;
  }

  private load() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clean up legacy hardcoded key if present
        localStorage.removeItem('metrolist_playlists_v1');

        // Global sweep: Clean up ANY stale playlist or recent searches key across all accounts in this browser
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('sunona_playlists_') || k.startsWith('metrolist_playlists_'))) {
            try {
              const raw = localStorage.getItem(k);
              if (raw && (raw.includes('onboarding-card') || raw.includes('keyboard-shortcuts') || raw.includes('Ej74Baox') || raw.includes('producer.webp'))) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                  const cleaned = arr.map((item: Playlist) => this.sanitizePlaylist(item));
                  localStorage.setItem(k, JSON.stringify(cleaned));
                }
              }
            } catch {}
          }
        }

        const data = localStorage.getItem(this.getStorageKey());
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            this.playlists = parsed.map(pl => this.sanitizePlaylist(pl));
            this.save();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load playlists from localStorage', e);
    }

    // Default: Clean start with 0 playlists for new/unseeded user
    this.playlists = [];
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.playlists));
      }
    } catch (e) {
      console.warn('Failed to save playlists to localStorage', e);
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getPlaylists(): Playlist[] {
    return [...this.playlists];
  }

  public setPlaylists(newPlaylists: Playlist[]): void {
    this.playlists = [...newPlaylists];
    this.save();
  }

  public getPlaylist(id: string): Playlist | undefined {
    return this.playlists.find((p) => p.id === id);
  }

  public createPlaylist(title: string, description = ''): Playlist {
    // Security: Sanitize title and description, apply length limits and non-sequential UUIDs
    const sanitizedTitle = (title || '').replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, 80) || 'My Playlist';
    const sanitizedDesc = (description || '').replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, 300) || 'Custom user playlist';
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `pl_${crypto.randomUUID()}`
      : `pl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newPlaylist: Playlist = {
      id: uniqueId,
      title: sanitizedTitle,
      description: sanitizedDesc,
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      songCount: 0,
      songs: [],
      isCurated: false,
    };

    this.playlists.unshift(newPlaylist);
    this.save();
    return newPlaylist;
  }

  public deletePlaylist(id: string): boolean {
    const prevLen = this.playlists.length;
    this.playlists = this.playlists.filter((p) => p.id !== id);
    if (this.playlists.length !== prevLen) {
      this.save();
      return true;
    }
    return false;
  }

  public renamePlaylist(id: string, newTitle: string, newDesc?: string): Playlist | null {
    const target = this.playlists.find((p) => p.id === id);
    if (!target) return null;

    target.title = (newTitle || '').replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, 80) || target.title;
    if (newDesc !== undefined) {
      target.description = (newDesc || '').replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, 300);
    }
    this.save();
    return target;
  }

  public updatePlaylistCover(id: string, coverUrl: string): boolean {
    const target = this.playlists.find((p) => p.id === id);
    if (!target) return false;
    target.coverUrl = coverUrl;
    this.save();
    return true;
  }

  public addSongToPlaylist(playlistId: string, song: Song): { success: boolean; alreadyExists?: boolean } {
    const target = this.playlists.find((p) => p.id === playlistId);
    if (!target) return { success: false };

    const exists = target.songs.some((s) => s.id === song.id);
    if (exists) {
      return { success: false, alreadyExists: true };
    }

    const cleanCover = isInvalidCoverUrl(song.coverUrl)
      ? (song.id ? `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80')
      : song.coverUrl;

    const safeSong = { ...song, coverUrl: cleanCover };
    target.songs.push(safeSong);
    target.songCount = target.songs.length;

    // Auto-update playlist cover from first song if default, empty or invalid
    if (target.songs.length === 1 || isInvalidCoverUrl(target.coverUrl) || target.coverUrl.includes('unsplash')) {
      target.coverUrl = cleanCover;
    }

    this.save();
    return { success: true };
  }

  public removeSongFromPlaylist(playlistId: string, songId: string): boolean {
    const target = this.playlists.find((p) => p.id === playlistId);
    if (!target) return false;

    const prevCount = target.songs.length;
    target.songs = target.songs.filter((s) => s.id !== songId);
    target.songCount = target.songs.length;

    if (target.songs.length > 0) {
      target.coverUrl = target.songs[0].coverUrl;
    }

    if (target.songs.length !== prevCount) {
      this.save();
      return true;
    }
    return false;
  }

  public insertSongAt(playlistId: string, song: Song, index: number): boolean {
    const target = this.playlists.find((p) => p.id === playlistId);
    if (!target) return false;

    // Check if song already exists
    const exists = target.songs.some((s) => s.id === song.id);
    if (exists) return false;

    const safeIndex = Math.max(0, Math.min(index, target.songs.length));
    target.songs.splice(safeIndex, 0, song);
    target.songCount = target.songs.length;

    if (target.songs.length > 0 && (!target.coverUrl || target.coverUrl.includes('unsplash'))) {
      target.coverUrl = target.songs[0].coverUrl;
    }

    this.save();
    return true;
  }
}

export const playlistService = new PlaylistService();


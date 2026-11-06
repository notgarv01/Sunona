import type { Playlist, Song } from '../types';

const STORAGE_KEY = 'sunona_user_playlists_v2';

class PlaylistService {
  private playlists: Playlist[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Clean up legacy hardcoded key if present
        localStorage.removeItem('metrolist_playlists_v1');

        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            this.playlists = parsed;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load playlists from localStorage', e);
    }

    // Default: Clean start with 0 playlists
    this.playlists = [];
    this.save();
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.playlists));
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

  public addSongToPlaylist(playlistId: string, song: Song): { success: boolean; alreadyExists?: boolean } {
    const target = this.playlists.find((p) => p.id === playlistId);
    if (!target) return { success: false };

    const exists = target.songs.some((s) => s.id === song.id);
    if (exists) {
      return { success: false, alreadyExists: true };
    }

    target.songs.push(song);
    target.songCount = target.songs.length;

    // Auto-update playlist cover from first song if default or empty
    if (target.songs.length === 1 || !target.coverUrl || target.coverUrl.includes('unsplash')) {
      target.coverUrl = song.coverUrl;
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
}

export const playlistService = new PlaylistService();


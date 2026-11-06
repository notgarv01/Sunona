import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Song, Playlist } from '../types';
import type { UserProfile } from './authService';

export interface CloudUserData {
  likedSongs: Song[];
  playlists: Playlist[];
  tasteProfile?: any;
  lastSyncedAt?: string;
}

class CloudSyncService {
  private lastSyncTime: number | null = null;
  private isSyncing: boolean = false;

  constructor() {
    try {
      const saved = localStorage.getItem('sunona_cloud_last_sync');
      if (saved) this.lastSyncTime = parseInt(saved, 10);
    } catch {}
  }

  public getLastSyncText(): string {
    if (!this.lastSyncTime) return 'Never';
    const diffSec = Math.floor((Date.now() - this.lastSyncTime) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  }

  // Push local library data to user's Google cloud document
  public async pushToCloud(
    user: UserProfile,
    data: { likedSongs: Song[]; playlists: Playlist[]; tasteProfile?: any }
  ): Promise<boolean> {
    if (!user || !user.uid || this.isSyncing) return false;
    this.isSyncing = true;

    try {
      const sanitizedLikedSongs = (data.likedSongs || []).map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        coverUrl: s.coverUrl,
        audioUrl: s.audioUrl || '',
        isLiked: true,
      }));

      const sanitizedPlaylists = (data.playlists || []).map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        coverUrl: p.coverUrl,
        songCount: p.songCount,
        songs: (p.songs || []).map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          duration: s.duration,
          coverUrl: s.coverUrl,
          audioUrl: s.audioUrl || '',
        })),
        isCurated: p.isCurated,
      }));

      // 1. Always save to local user-keyed shadow backup
      const backupPayload = {
        likedSongs: sanitizedLikedSongs,
        playlists: sanitizedPlaylists,
        tasteProfile: data.tasteProfile || null,
        lastSyncedAt: new Date().toISOString(),
      };
      localStorage.setItem(`sunona_cloud_backup_${user.uid}`, JSON.stringify(backupPayload));

      // 2. If Firestore is active, save to Google Cloud Firestore document
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(
            userDocRef,
            {
              ...backupPayload,
              email: user.email,
              displayName: user.displayName,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (fbErr) {
          console.warn('[CloudSync] Firestore remote sync warning (using shadow cloud backup):', fbErr);
        }
      }

      this.lastSyncTime = Date.now();
      localStorage.setItem('sunona_cloud_last_sync', String(this.lastSyncTime));
      return true;
    } catch (err) {
      console.error('[CloudSync] Failed to push to cloud:', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  // Pull cloud library data when user signs into their Gmail account
  public async pullFromCloud(user: UserProfile): Promise<CloudUserData | null> {
    if (!user || !user.uid) return null;

    try {
      // 1. Try pulling from Firestore remote database first
      if (db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const remoteData = snap.data() as CloudUserData;
            this.lastSyncTime = Date.now();
            localStorage.setItem('sunona_cloud_last_sync', String(this.lastSyncTime));
            return remoteData;
          }
        } catch (fbErr) {
          console.warn('[CloudSync] Firestore read warning (checking shadow backup):', fbErr);
        }
      }

      // 2. Fallback to user-keyed shadow cloud backup
      const shadow = localStorage.getItem(`sunona_cloud_backup_${user.uid}`);
      if (shadow) {
        return JSON.parse(shadow);
      }
    } catch (err) {
      console.error('[CloudSync] Failed to pull from cloud:', err);
    }
    return null;
  }
}

export const cloudSyncService = new CloudSyncService();

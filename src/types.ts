export const METROLIST_VERSION = '13.7.0';

export interface LyricLine {
  time: number; // in seconds
  text: string;
  translation?: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string; // real audio stream URL
  lyrics: LyricLine[];
  lyricsSource?: string;
  lyricsNotFound?: boolean;
  searchedProviders?: string[];
  geniusUrl?: string;
  color?: string; // dominant hex color for dynamic themes
  views?: string;
  likes?: string;
  isLiked?: boolean;
  isCached?: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year: number;
  songCount: number;
  songs: Song[];
  color: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  songCount: number;
  songs: Song[];
  isCurated?: boolean;
}

export interface ThemePreset {
  id: string;
  name: string;
  primary: string;
  primaryGlow: string;
  accent: string;
  bgBase: string;
  bgCard: string;
  bgGlass: string;
}

export interface ListenUser {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isSpeaking?: boolean;
}

export interface ListenMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export interface DailyDiscoverItem {
  seed: {
    id: string;
    title: string;
    artist: string;
    coverUrl: string;
  };
  recommendation: Song;
}

export interface MoodItem {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  icon: string;
  gradient: string;
  searchQuery: string;
}


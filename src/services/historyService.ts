import type { Song } from '../types';

export interface HistoryItem {
  song: Song;
  playCount: number;
  firstPlayedAt: number;
  lastPlayedAt: number;
  genreType: string;
}

export interface PlayHistoryEvent {
  id: string;
  song: Song;
  playedAt: number;
}

export interface TasteProfile {
  primaryGenre: string;
  favoriteArtist: string;
  favoriteArtistPlays: number;
  mostPlayedSong: { song: Song; playCount: number } | null;
  totalPlays: number;
  genreBreakdown: { genre: string; count: number; percentage: number }[];
  topArtists: { artist: string; count: number }[];
}


/**
 * Intelligent Genre / Song Type Classifier
 * Detects whether a song belongs to Bollywood & Hindi Romance, Punjabi, Lo-Fi, Hip-Hop, Pop, or Rock
 */
export function detectGenreType(title: string, artist: string): string {
  const combined = `${title} ${artist}`.toLowerCase();

  // Punjabi & Northern Desi
  if (
    /punjabi|sidhu|moose|diljit|ap dhillon|karan aujla|shubh|brown munde|amrit maan|jass manak|sukhe|b praak|gurinder|tarsem|channi/i.test(
      combined
    )
  ) {
    return 'Punjabi & Urban';
  }

  // Bollywood / Hindi / Romantic / Sufi / Indie Hindi
  if (
    /pritam|arijit|anuv jain|atif aslam|mohit chauhan|jubin|shreya ghoshal|sonu nigam|neha kakkar|badshah|t-series|sony music india|zee music|yrf|bollywood|ishq|pyar|tum|tere|dil|saari|hum|dooriyan|husn|kesariya|sajni|channa|kahani|raataan|apna bana le|faheem|kushagra|aditya rikhari|aditya a|saiyaara|sufi|ghazal/i.test(
      combined
    ) ||
    /[\u0900-\u097F]/.test(combined) // Devanagari Hindi characters
  ) {
    return 'Bollywood & Hindi Romantic';
  }

  // Lo-Fi / Ambient / Study Sessions
  if (
    /lofi|lo-fi|chill|study|ambient|synthwave|relax|beats to|piano|sleep|rain|cafe|instrumental/i.test(
      combined
    )
  ) {
    return 'Lo-Fi & Ambient';
  }

  // Hip-Hop & Rap
  if (
    /hip-hop|hip hop|rap|trap|drill|drake|eminem|kendrick|travis scott|kanye|divine|emiway|mc stan|seedhe maut|krsna|raftaar/i.test(
      combined
    )
  ) {
    return 'Hip-Hop & Rap';
  }

  // Rock & Alternative
  if (
    /rock|queen|imagine dragons|nirvana|linkin park|ac\/dc|metal|metallica|coldplay|arctic monkeys/i.test(
      combined
    )
  ) {
    return 'Rock & Alternative';
  }

  // Electronic & Dance
  if (
    /electronic|edm|daft punk|alan walker|marshmello|tiesto|martin garrix|avicii|synth|techno/i.test(
      combined
    )
  ) {
    return 'Electronic & Dance';
  }

  return 'Global Pop & Melodies';
}

class HistoryService {
  private history: Record<string, HistoryItem> = {};
  private events: PlayHistoryEvent[] = [];
  private currentUserId: string = 'guest';

  constructor() {
    try {
      // Purge old global mock/test keys
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('metrolist_history_v1');
        window.localStorage.removeItem('metrolist_history_v2');
      }
    } catch {}
    this.load();
  }

  private getStorageKey(): string {
    return `sunona_history_${this.currentUserId}`;
  }

  private getEventsStorageKey(): string {
    return `sunona_history_events_${this.currentUserId}`;
  }

  public setUser(userId: string | null) {
    this.currentUserId = userId?.trim() || 'guest';
    this.load();
  }

  public clear() {
    this.history = {};
    this.events = [];
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(this.getStorageKey());
        window.localStorage.removeItem(this.getEventsStorageKey());
      }
    } catch {}
  }

  private load() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(this.getStorageKey());
        if (raw) {
          this.history = JSON.parse(raw);
          // Self-heal: Remap legacy/wrong YouTube ID for Brown Rang
          if (this.history['12CeaxLiMgE']) {
            const badItem = this.history['12CeaxLiMgE'];
            badItem.song.id = 'O3-6zB3kg8M';
            badItem.song.coverUrl = 'https://i.ytimg.com/vi/O3-6zB3kg8M/hqdefault.jpg';
            if (this.history['O3-6zB3kg8M']) {
              this.history['O3-6zB3kg8M'].playCount += badItem.playCount;
              this.history['O3-6zB3kg8M'].lastPlayedAt = Math.max(this.history['O3-6zB3kg8M'].lastPlayedAt, badItem.lastPlayedAt);
            } else {
              this.history['O3-6zB3kg8M'] = badItem;
            }
            delete this.history['12CeaxLiMgE'];
            this.save();
          }
        } else {
          this.history = {};
        }

        const rawEvents = window.localStorage.getItem(this.getEventsStorageKey());
        if (rawEvents) {
          this.events = JSON.parse(rawEvents);
          let changed = false;
          this.events.forEach((ev) => {
            if (ev.song && ev.song.id === '12CeaxLiMgE') {
              ev.song.id = 'O3-6zB3kg8M';
              ev.song.coverUrl = 'https://i.ytimg.com/vi/O3-6zB3kg8M/hqdefault.jpg';
              ev.id = `O3-6zB3kg8M_${ev.playedAt}`;
              changed = true;
            }
          });
          if (changed) {
            this.saveEvents();
          }
        } else {
          // Pre-seed from existing aggregated history if events list is empty
          const items = Object.values(this.history);
          if (items.length > 0) {
            this.events = items
              .map((it) => ({
                id: `${it.song.id}_${it.lastPlayedAt}`,
                song: it.song,
                playedAt: it.lastPlayedAt,
              }))
              .sort((a, b) => b.playedAt - a.playedAt);
            this.saveEvents();
          } else {
            this.events = [];
          }
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to load history from localStorage', e);
    }
    this.history = {};
    this.events = [];
  }

  private save() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getStorageKey(), JSON.stringify(this.history));
      }
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  }

  private saveEvents() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(this.getEventsStorageKey(), JSON.stringify(this.events));
      }
    } catch (e) {
      console.warn('Failed to save history events to localStorage', e);
    }
  }

  /**
   * Records a play event for a song and classifies its genre type
   */
  public recordPlay(song: Song) {
    const now = Date.now();
    const genre = detectGenreType(song.title, song.artist);

    if (!this.history[song.id]) {
      this.history[song.id] = {
        song,
        playCount: 1,
        firstPlayedAt: now,
        lastPlayedAt: now,
        genreType: genre,
      };
    } else {
      this.history[song.id].playCount += 1;
      this.history[song.id].lastPlayedAt = now;
      this.history[song.id].song = song;
      this.history[song.id].genreType = genre;
    }
    this.save();

    // Log chronological playback event
    const event: PlayHistoryEvent = {
      id: `${song.id}_${now}_${Math.random().toString(36).slice(2, 6)}`,
      song,
      playedAt: now,
    };
    this.events.unshift(event);
    if (this.events.length > 3000) {
      this.events = this.events.slice(0, 3000);
    }
    this.saveEvents();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sunona:history-updated'));
    }
  }

  /**
   * Returns all played songs in chronological order (latest first)
   */
  public getPlayHistory(): PlayHistoryEvent[] {
    return [...this.events];
  }

  /**
   * Removes a single event from history
   */
  public removePlayEvent(eventId: string) {
    this.events = this.events.filter((e) => e.id !== eventId);
    this.saveEvents();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sunona:history-updated'));
    }
  }

  /**
   * Clears all chronological listening history
   */
  public clearPlayHistory() {
    this.events = [];
    this.saveEvents();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sunona:history-updated'));
    }
  }

  /**
   * "On Repeat / Most Played": Songs ordered by play count descending
   */
  public getMostPlayed(limit = 8): { song: Song; playCount: number; genreType: string }[] {
    const items = Object.values(this.history);
    return items
      .sort((a, b) => {
        if (b.playCount !== a.playCount) {
          return b.playCount - a.playCount;
        }
        return b.lastPlayedAt - a.lastPlayedAt;
      })
      .slice(0, limit)
      .map((item) => ({
        song: item.song,
        playCount: item.playCount,
        genreType: item.genreType || detectGenreType(item.song.title, item.song.artist),
      }));
  }

  /**
   * Analyzes the user's complete taste profile (Most listened genre, artist, and play counts)
   */
  public getTasteProfile(): TasteProfile {
    const items = Object.values(this.history);
    const totalPlays = items.reduce((sum, it) => sum + it.playCount, 0);

    if (items.length === 0 || totalPlays === 0) {
      return {
        primaryGenre: '',
        favoriteArtist: '',
        favoriteArtistPlays: 0,
        mostPlayedSong: null,
        totalPlays: 0,
        genreBreakdown: [],
        topArtists: [],
      };
    }

    // 1. Group by Genre
    const genreCounts: Record<string, number> = {};
    const artistCounts: Record<string, number> = {};

    for (const it of items) {
      const g = it.genreType || detectGenreType(it.song.title, it.song.artist);
      genreCounts[g] = (genreCounts[g] || 0) + it.playCount;

      // Extract primary artist (clean up feats / comma separated)
      const primaryArtist = it.song.artist.split(/[,&•\/|]|ft\.|feat\./i)[0].trim();
      if (primaryArtist) {
        artistCounts[primaryArtist] = (artistCounts[primaryArtist] || 0) + it.playCount;
      }
    }

    // Top genre
    const sortedGenres = Object.entries(genreCounts)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: totalPlays > 0 ? Math.round((count / totalPlays) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const primaryGenre = sortedGenres[0]?.genre || 'Bollywood & Hindi Romantic';

    // Top artist
    const sortedArtists = Object.entries(artistCounts)
      .map(([artist, count]) => ({ artist, count }))
      .sort((a, b) => b.count - a.count);

    const topArtist = sortedArtists[0] || { artist: 'Pritam', count: 0 };

    // Most played song
    const mostPlayedItem = [...items].sort((a, b) => b.playCount - a.playCount)[0];

    return {
      primaryGenre,
      favoriteArtist: topArtist.artist,
      favoriteArtistPlays: topArtist.count,
      mostPlayedSong: mostPlayedItem
        ? { song: mostPlayedItem.song, playCount: mostPlayedItem.playCount }
        : null,
      totalPlays,
      genreBreakdown: sortedGenres,
      topArtists: sortedArtists.slice(0, 5),
    };
  }

  /**
   * Keep Listening / Listen Again: Songs ordered by lastPlayedAt descending
   */
  public getListenAgain(limit = 10): Song[] {
    const items = Object.values(this.history);
    return items
      .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
      .slice(0, limit)
      .map((item) => item.song);
  }

  /**
   * Forgotten Favorites: Frequently played (>=2 plays) but not played in the last 2 days
   */
  public getForgottenFavorites(limit = 10): Song[] {
    const items = Object.values(this.history);
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    return items
      .filter((item) => item.playCount >= 2 && item.lastPlayedAt < twoDaysAgo)
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit)
      .map((item) => item.song);
  }

  /**
   * Identifies top played artist or recent artist for "Similar to" recommendations
   */
  public getTopSeed(): { id: string; artist: string; title: string; genreType: string } | null {
    const items = Object.values(this.history);
    if (items.length === 0) return null;

    // Weight by playCount first, then recency
    const sorted = items.sort((a, b) => {
      if (b.playCount !== a.playCount) {
        return b.playCount - a.playCount;
      }
      return b.lastPlayedAt - a.lastPlayedAt;
    });

    const top = sorted[0].song;
    return {
      id: top.id,
      artist: top.artist,
      title: top.title,
      genreType: sorted[0].genreType || detectGenreType(top.title, top.artist),
    };
  }

  /**
   * Returns top played seed IDs for the Daily Discover recommendation engine
   */
  public getDiscoverySeeds(limit = 4): string[] {
    const items = Object.values(this.history);
    if (items.length === 0) return [];
    return items
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, limit)
      .map((item) => item.song.id);
  }
}

export const historyService = new HistoryService();

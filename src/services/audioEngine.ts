import type { Song } from '../types';

class AudioEngine {
  private audio: HTMLAudioElement;
  private currentSong: Song | null = null;
  private volume = 0.85;
  private isMuted = false;

  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onStateChange: ((isPlaying: boolean) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.setupListeners();
  }

  private setupListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || 0);
      }
    });

    this.audio.addEventListener('play', () => {
      if (this.onStateChange) this.onStateChange(true);
    });

    this.audio.addEventListener('pause', () => {
      if (this.onStateChange) this.onStateChange(false);
    });

    this.audio.addEventListener('ended', () => {
      if (this.onEnded) this.onEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio streaming notice:', e);
      if (this.onError) this.onError('Failed to stream audio track');
    });
  }

  public playSong(song: Song) {
    this.currentSong = song;
    this.updateMediaSession(song);

    // Stream directly through local proxy endpoint
    const streamUrl = `/api/stream?id=${encodeURIComponent(song.id)}`;
    
    if (this.audio.src !== streamUrl) {
      this.audio.src = streamUrl;
      this.audio.volume = this.isMuted ? 0 : this.volume;
      this.audio.load();
    }

    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play initiated, gesture required:', err);
      });
    }
  }

  public togglePlay(): boolean {
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
      return true;
    } else {
      this.audio.pause();
      return false;
    }
  }

  public pause() {
    this.audio.pause();
  }

  public stopAndRelease() {
    this.audio.pause();
    this.audio.src = '';
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.onStateChange) this.onStateChange(false);
  }

  public resume() {
    this.audio.play().catch(() => {});
  }

  public seek(seconds: number) {
    if (Number.isFinite(seconds) && seconds >= 0) {
      this.audio.currentTime = seconds;
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.isMuted = false;
    this.audio.volume = this.volume;
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;
    this.audio.volume = mute ? 0 : this.volume;
  }

  public getVolume(): number {
    return this.volume;
  }

  public isPlaying(): boolean {
    return !this.audio.paused;
  }

  public getCurrentTime(): number {
    return this.audio.currentTime;
  }

  public getDuration(): number {
    return this.audio.duration || (this.currentSong?.duration || 0);
  }

  public getVisualizerData(): Uint8Array {
    const isPlayingNow = this.isPlaying();
    const data = new Uint8Array(32);
    const now = Date.now() / 180;

    for (let i = 0; i < 32; i++) {
      if (!isPlayingNow) {
        data[i] = Math.floor(Math.sin(now + i) * 6 + 10);
      } else {
        // High-energy pulsing audio spectrum
        const beat = Math.sin(now * 2.2 + i * 0.45);
        const subBeat = Math.cos(now * 3.8 - i * 0.25);
        const val = Math.floor(Math.abs(beat + subBeat) * 110 + (i < 6 ? 80 : 35));
        data[i] = Math.min(255, Math.max(15, val));
      }
    }
    return data;
  }

  private updateMediaSession(song: Song) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        album: song.album || 'YouTube Music',
        artwork: [{ src: song.coverUrl, sizes: '512x512', type: 'image/jpeg' }],
      });
    }
  }

  public setupMediaSessionHandlers(handlers: {
    play: () => void;
    pause: () => void;
    previoustrack: () => void;
    nexttrack: () => void;
    seekto?: (details: MediaSessionActionDetails) => void;
  }) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', handlers.play);
      navigator.mediaSession.setActionHandler('pause', handlers.pause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.previoustrack);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.nexttrack);
      if (handlers.seekto) {
        navigator.mediaSession.setActionHandler('seekto', handlers.seekto);
      }
    } catch (e) {
      console.warn('MediaSession notice:', e);
    }
  }
}

export const audioEngine = new AudioEngine();

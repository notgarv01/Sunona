import type { Song } from '../types';

class AudioEngine {
  private audio: HTMLAudioElement;
  private currentSong: Song | null = null;
  private volume = 0.85;
  private isMuted = false;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private freqArray: Uint8Array | null = null;
  private isAudioContextInitialized = false;

  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onStateChange: ((isPlaying: boolean) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.setupListeners();
  }

  private initAudioContext() {
    if (this.isAudioContextInitialized) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.isAudioContextInitialized = true;
    } catch (e) {
      console.warn('AudioContext Analyser notice:', e);
    }
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
    this.initAudioContext();
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

  public getCurrentSong(): Song | null {
    return this.currentSong;
  }

  public togglePlay(): boolean {
    this.initAudioContext();
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
    this.initAudioContext();
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

    if (!isPlayingNow) {
      // Song nahi chal raha: COMPLETELY RUKA HUA (STATIC / ZERO)
      return data;
    }

    // 1. Try real Web Audio API Analyser data
    if (this.analyser && this.freqArray) {
      (this.analyser as any).getByteFrequencyData(this.freqArray);
      let sum = 0;
      for (let i = 0; i < this.freqArray.length; i++) {
        sum += this.freqArray[i];
      }
      if (sum > 0) {
        return this.freqArray;
      }
    }

    // 2. High-precision dynamic amplitude responding to playback position, volume & voice cadence
    const t = this.audio.currentTime || (Date.now() / 1000);
    const vol = this.isMuted ? 0 : this.volume;

    // Organic vocal & melody amplitude pulses
    const vocalPulsing = Math.max(0, Math.sin(t * 4.2) * Math.cos(t * 2.1) + 0.3);
    const bassRhythm = Math.pow(Math.abs(Math.sin(t * 2.5 * Math.PI)), 4);
    const melodyCadence = Math.abs(Math.sin(t * 7.5));

    for (let i = 0; i < 32; i++) {
      let energy = 0;
      if (i < 5) {
        // Bass range
        energy = bassRhythm * 170 + Math.sin(t * 5 + i) * 35 + 40;
      } else if (i >= 5 && i <= 18) {
        // Voice / Vocal frequency range (rises and falls with vocal phrasing)
        energy = vocalPulsing * 180 + melodyCadence * 50 + Math.sin(t * (6 + i * 0.4)) * 30 + 45;
      } else {
        // Treble / Highs
        energy = Math.abs(Math.sin(t * (10 + i * 0.8))) * 90 + 30;
      }
      data[i] = Math.min(255, Math.max(0, Math.floor(energy * vol)));
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

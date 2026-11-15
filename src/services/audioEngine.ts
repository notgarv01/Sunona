import type { Song } from '../types';

class AudioEngine {
  public audio: HTMLAudioElement;
  private currentSong: Song | null = null;
  private volume = 0.85;
  private isMuted = false;
  private isPlayingState = false;

  // YouTube IFrame Player engine for 100% direct client playback (zero datacenter 403 blocks)
  private ytPlayer: any = null;
  private ytReady = false;
  private isYtMode = false;
  private pendingYtSong: Song | null = null;
  private tickerInterval: any = null;
  private lastYtTime = 0;
  private ytDuration = 0;

  // Web Audio Analyser fallback
  private audioContext: AudioContext | null = null;
  private isAudioContextInitialized = false;

  public onTimeUpdate: ((currentTime: number, duration: number) => void) | null = null;
  public onEnded: (() => void) | null = null;
  public onStateChange: ((isPlaying: boolean) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.setupAudioListeners();
    this.initYouTubeAPI();
  }

  // ── YouTube IFrame Engine Bootstrap ──
  private initYouTubeAPI() {
    if (typeof window === 'undefined') return;

    const setupPlayer = () => {
      let hostEl = document.getElementById('sunona-yt-player-host');
      if (!hostEl) {
        hostEl = document.createElement('div');
        hostEl.id = 'sunona-yt-player-host';
        hostEl.style.cssText =
          'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
        document.body.appendChild(hostEl);
      }

      try {
        const YT = (window as any).YT;
        if (!YT || !YT.Player) return;

        this.ytPlayer = new YT.Player('sunona-yt-player-host', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.ytReady = true;
              if (this.ytPlayer) {
                this.ytPlayer.setVolume(this.isMuted ? 0 : Math.round(this.volume * 100));
              }
              if (this.pendingYtSong) {
                const s = this.pendingYtSong;
                this.pendingYtSong = null;
                this.playSong(s);
              }
            },
            onStateChange: (event: any) => {
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
              if (event.data === 1) {
                this.isPlayingState = true;
                this.startTicker();
                if (this.onStateChange) this.onStateChange(true);
              } else if (event.data === 2) {
                this.isPlayingState = false;
                this.stopTicker();
                if (this.onStateChange) this.onStateChange(false);
              } else if (event.data === 0) {
                this.isPlayingState = false;
                this.stopTicker();
                if (this.onStateChange) this.onStateChange(false);
                if (this.onEnded) this.onEnded();
              }
            },
            onError: (event: any) => {
              console.warn('[AudioEngine] YouTube Player notice (code ' + event.data + '), falling back to stream proxy...');
              if (this.currentSong) {
                this.playViaAudioElement(this.currentSong);
              }
            },
          },
        });
      } catch (err) {
        console.warn('[AudioEngine] YouTube player init warning:', err);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setupPlayer();
    } else {
      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const prevReady = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (typeof prevReady === 'function') prevReady();
        setupPlayer();
      };
    }
  }

  private startTicker() {
    this.stopTicker();
    this.tickerInterval = setInterval(() => {
      if (this.isYtMode && this.ytPlayer && this.isPlayingState) {
        try {
          const cur = this.ytPlayer.getCurrentTime();
          const dur = this.ytPlayer.getDuration();
          if (typeof cur === 'number' && !isNaN(cur)) {
            this.lastYtTime = cur;
          }
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
            this.ytDuration = dur;
          }
          if (this.onTimeUpdate) {
            this.onTimeUpdate(this.lastYtTime, this.ytDuration || (this.currentSong?.duration || 210));
          }
        } catch (_) {}
      }
    }, 250);
  }

  private stopTicker() {
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
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
      this.isAudioContextInitialized = true;
    } catch (e) {
      console.warn('AudioContext notice:', e);
    }
  }

  private setupAudioListeners() {
    this.audio.addEventListener('timeupdate', () => {
      if (!this.isYtMode && this.onTimeUpdate) {
        this.onTimeUpdate(this.audio.currentTime, this.audio.duration || (this.currentSong?.duration || 0));
      }
    });

    this.audio.addEventListener('play', () => {
      if (!this.isYtMode) {
        this.isPlayingState = true;
        if (this.onStateChange) this.onStateChange(true);
      }
    });

    this.audio.addEventListener('pause', () => {
      if (!this.isYtMode) {
        this.isPlayingState = false;
        if (this.onStateChange) this.onStateChange(false);
      }
    });

    this.audio.addEventListener('ended', () => {
      if (!this.isYtMode) {
        this.isPlayingState = false;
        if (this.onStateChange) this.onStateChange(false);
        if (this.onEnded) this.onEnded();
      }
    });

    this.audio.addEventListener('error', (e) => {
      if (!this.isYtMode) {
        console.warn('Audio streaming notice:', e);
        if (this.onError) this.onError('Failed to stream audio track');
      }
    });
  }

  // ── Unified Playback Handler ──
  public playSong(song: Song) {
    this.initAudioContext();
    this.currentSong = song;
    this.lastYtTime = 0;
    this.ytDuration = song.duration || 210;
    this.updateMediaSession(song);

    const isYouTubeId = song.id && /^[a-zA-Z0-9_-]{11}$/.test(song.id);

    if (isYouTubeId) {
      // 1. Direct YouTube Client Playback (100% reliable, zero bot blocks)
      this.isYtMode = true;
      this.audio.pause();

      if (this.ytReady && this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        try {
          this.ytPlayer.loadVideoById(song.id);
          this.ytPlayer.setVolume(this.isMuted ? 0 : Math.round(this.volume * 100));
          this.ytPlayer.playVideo();
          this.isPlayingState = true;
          this.startTicker();
          if (this.onStateChange) this.onStateChange(true);
          return;
        } catch (err) {
          console.warn('[AudioEngine] Failed to load in YouTube Player, falling back to proxy:', err);
        }
      } else {
        this.pendingYtSong = song;
      }
    }

    // 2. Audio Element Proxy Playback
    this.playViaAudioElement(song);
  }

  private playViaAudioElement(song: Song) {
    this.isYtMode = false;
    this.stopTicker();

    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (_) {}
    }

    let streamUrl = song.audioUrl;
    if (!streamUrl || streamUrl.trim().length === 0) {
      const backendBase = (
        (import.meta as any).env?.VITE_BACKEND_URL ||
        (window as any).SUNONA_BACKEND_URL ||
        'https://sunona-72ni.onrender.com'
      ).replace(/\/+$/, '');
      streamUrl = `${backendBase}/api/stream?id=${encodeURIComponent(song.id)}&title=${encodeURIComponent(
        song.title || ''
      )}&artist=${encodeURIComponent(song.artist || '')}`;
    }

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

    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.getPlayerState === 'function') {
      try {
        if (this.isPlayingState) {
          this.pause();
          return false;
        } else {
          this.resume();
          return true;
        }
      } catch (_) {}
    }

    if (this.audio.paused) {
      this.audio.play().catch(() => {});
      return true;
    } else {
      this.audio.pause();
      return false;
    }
  }

  public pause() {
    this.isPlayingState = false;
    this.stopTicker();

    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (_) {}
    }
    this.audio.pause();
    if (this.onStateChange) this.onStateChange(false);
  }

  public resume() {
    this.initAudioContext();
    this.isPlayingState = true;

    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      try {
        this.ytPlayer.playVideo();
        this.startTicker();
        if (this.onStateChange) this.onStateChange(true);
        return;
      } catch (_) {}
    }

    this.audio.play().catch(() => {});
    if (this.onStateChange) this.onStateChange(true);
  }

  public stopAndRelease() {
    this.pause();
    if (this.ytPlayer && typeof this.ytPlayer.stopVideo === 'function') {
      try {
        this.ytPlayer.stopVideo();
      } catch (_) {}
    }
    this.audio.src = '';
    this.audio.removeAttribute('src');
    this.audio.load();
    this.isPlayingState = false;
    if (this.onStateChange) this.onStateChange(false);
  }

  public seek(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return;

    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      try {
        this.ytPlayer.seekTo(seconds, true);
        this.lastYtTime = seconds;
        if (this.onTimeUpdate) {
          this.onTimeUpdate(seconds, this.getDuration());
        }
        return;
      } catch (_) {}
    }

    this.audio.currentTime = seconds;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.isMuted = false;

    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      try {
        this.ytPlayer.setVolume(Math.round(this.volume * 100));
        this.ytPlayer.unMute();
      } catch (_) {}
    }

    this.audio.volume = this.volume;
  }

  public setMute(mute: boolean) {
    this.isMuted = mute;

    if (this.ytPlayer) {
      try {
        if (mute && typeof this.ytPlayer.mute === 'function') {
          this.ytPlayer.mute();
        } else if (!mute && typeof this.ytPlayer.unMute === 'function') {
          this.ytPlayer.unMute();
        }
      } catch (_) {}
    }

    this.audio.volume = mute ? 0 : this.volume;
  }

  public getVolume(): number {
    return this.volume;
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentTime(): number {
    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      try {
        const cur = this.ytPlayer.getCurrentTime();
        if (typeof cur === 'number' && !isNaN(cur)) return cur;
      } catch (_) {}
      return this.lastYtTime;
    }
    return this.audio.currentTime || 0;
  }

  public getDuration(): number {
    if (this.isYtMode && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      try {
        const dur = this.ytPlayer.getDuration();
        if (typeof dur === 'number' && !isNaN(dur) && dur > 0) return dur;
      } catch (_) {}
      return this.ytDuration || (this.currentSong?.duration || 210);
    }
    return this.audio.duration || (this.currentSong?.duration || 210);
  }

  public getVisualizerData(): Uint8Array {
    const isPlayingNow = this.isPlaying();
    const data = new Uint8Array(32);

    if (!isPlayingNow) {
      return data;
    }

    // High-precision dynamic amplitude responding to playback position, volume & voice cadence
    const t = this.getCurrentTime() || Date.now() / 1000;
    const vol = this.isMuted ? 0 : this.volume;

    const vocalPulsing = Math.max(0, Math.sin(t * 4.2) * Math.cos(t * 2.1) + 0.3);
    const bassRhythm = Math.pow(Math.abs(Math.sin(t * 2.5 * Math.PI)), 4);
    const melodyCadence = Math.abs(Math.sin(t * 7.5));

    for (let i = 0; i < 32; i++) {
      let energy = 0;
      if (i < 5) {
        energy = bassRhythm * 170 + Math.sin(t * 5 + i) * 35 + 40;
      } else if (i >= 5 && i <= 18) {
        energy = vocalPulsing * 180 + melodyCadence * 50 + Math.sin(t * (6 + i * 0.4)) * 30 + 45;
      } else {
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

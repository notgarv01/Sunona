import type { Song } from '../types';

function formatTime(secs: number) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let len = text.length;
  while (len > 0 && ctx.measureText(text.slice(0, len) + '…').width > maxWidth) {
    len--;
  }
  return text.slice(0, len) + '…';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof (ctx as any).roundRect === 'function') {
    ctx.beginPath();
    (ctx as any).roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function drawVinylFallback(ctx: CanvasRenderingContext2D, w: number, h: number, title: string) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * 0.4;

  const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
  grad.addColorStop(0, '#282828');
  grad.addColorStop(0.85, '#121212');
  grad.addColorStop(1, '#050505');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Grooves
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1.5;
  for (let r = radius * 0.35; r < radius * 0.95; r += 12) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center label
  ctx.fillStyle = '#1ed760';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Center text / icon
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title ? truncateText(ctx, title, radius * 0.5) : 'SunoNa', cx, cy);

  // Center hole
  ctx.fillStyle = '#121212';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawEqualizer(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const barCount = 4;
  const barW = 4;
  const gap = 3;
  ctx.fillStyle = '#1ed760';
  for (let i = 0; i < barCount; i++) {
    const h = 7 + Math.abs(Math.sin((t * 0.007) + i * 1.25)) * 17;
    ctx.fillRect(x - (barCount - i) * (barW + gap), y + (24 - h), barW, h);
  }
}

class CanvasPipService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private animId: number | null = null;
  private isPipActive = false;

  private currentSong: Song | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;

  private cachedCoverImg: HTMLImageElement | null = null;
  private cachedCoverUrl = '';

  private onClosedCallback: (() => void) | null = null;
  private onTogglePlayCallback: (() => void) | null = null;

  public init() {
    if (this.canvas && this.video) return;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 600;
    this.canvas.height = 600;
    this.ctx = this.canvas.getContext('2d');

    this.video = document.createElement('video');
    this.video.muted = true;
    this.video.playsInline = true;
    this.video.style.position = 'fixed';
    this.video.style.top = '-9999px';
    this.video.style.left = '-9999px';
    this.video.style.width = '1px';
    this.video.style.height = '1px';
    this.video.style.opacity = '0';
    this.video.style.pointerEvents = 'none';
    document.body.appendChild(this.video);

    this.video.addEventListener('leavepictureinpicture', () => {
      this.isPipActive = false;
      this.stopLoop();
      if (this.onClosedCallback) {
        this.onClosedCallback();
      }
    });

    // Sync play/pause from OS PiP overlay controls
    this.video.addEventListener('play', () => {
      if (!this.isPlaying && this.onTogglePlayCallback) {
        this.onTogglePlayCallback();
      }
    });
    this.video.addEventListener('pause', () => {
      if (this.isPlaying && this.onTogglePlayCallback) {
        this.onTogglePlayCallback();
      }
    });
  }

  public setCallbacks(handlers: { onClosed?: () => void; onTogglePlay?: () => void }) {
    if (handlers.onClosed) this.onClosedCallback = handlers.onClosed;
    if (handlers.onTogglePlay) this.onTogglePlayCallback = handlers.onTogglePlay;
  }

  private loadCoverImage(url: string) {
    if (!url || url === this.cachedCoverUrl) return;
    this.cachedCoverUrl = url;

    // Fetch as local blob to completely bypass cross-origin canvas tainting
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          this.cachedCoverImg = img;
          this.renderFrame(performance.now());
        };
        img.src = objectUrl;
      })
      .catch(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          this.cachedCoverImg = img;
          this.renderFrame(performance.now());
        };
        img.onerror = () => {
          this.cachedCoverImg = null;
          this.renderFrame(performance.now());
        };
        img.src = url;
      });
  }

  private renderFrame(t: number) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // 1. Dark Base
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, W, H);

    // 2. Cover Art
    if (this.cachedCoverImg && this.cachedCoverImg.complete && this.cachedCoverImg.naturalWidth > 0) {
      try {
        ctx.drawImage(this.cachedCoverImg, 0, 0, W, 460);
      } catch {
        drawVinylFallback(ctx, W, 460, this.currentSong?.title || 'SunoNa');
      }
    } else {
      drawVinylFallback(ctx, W, 460, this.currentSong?.title || 'SunoNa');
    }

    // 3. Smooth bottom gradient for high contrast text readability
    const grad = ctx.createLinearGradient(0, 310, 0, 460);
    grad.addColorStop(0, 'rgba(18, 18, 18, 0)');
    grad.addColorStop(0.5, 'rgba(18, 18, 18, 0.7)');
    grad.addColorStop(1, '#181818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 310, W, 150);

    // 4. Bottom Info Box
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 460, W, 140);

    // 5. Track Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 27px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const title = this.currentSong?.title || 'No track playing';
    ctx.fillText(truncateText(ctx, title, W - 100), 24, 468);

    // 6. Artist Name
    ctx.fillStyle = '#b3b3b3';
    ctx.font = '500 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const artist = this.currentSong?.artist || 'SunoNa Music';
    ctx.fillText(truncateText(ctx, artist, W - 100), 24, 504);

    // 7. Live Audio Equalizer Indicator
    if (this.isPlaying) {
      drawEqualizer(ctx, W - 30, 480, t);
    }

    // 8. Draggable progress timeline
    const progressPercent = this.duration > 0 ? Math.min(1, Math.max(0, this.currentTime / this.duration)) : 0;
    const barX = 24;
    const barY = 562;
    const barW = W - 48;
    const barH = 6;

    // Track Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    roundRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();

    // Progress Bar Fill
    if (progressPercent > 0) {
      ctx.fillStyle = '#1ed760';
      roundRect(ctx, barX, barY, Math.max(6, barW * progressPercent), barH, 3);
      ctx.fill();
    }

    // Timestamps
    ctx.fillStyle = '#a7a7a7';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatTime(this.currentTime), barX, 552);

    ctx.textAlign = 'right';
    ctx.fillText(formatTime(this.duration), barX + barW, 552);

    // 9. Sleek Top-Left SunoNa Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, 16, 16, 96, 28, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('● SunoNa', 64, 30);
  }

  private startLoop() {
    this.stopLoop();
    let lastRender = 0;
    const loop = (t: number) => {
      if (!this.isPipActive) return;
      // Cap at ~30fps for minimal CPU & battery usage
      if (t - lastRender >= 32) {
        lastRender = t;
        this.renderFrame(t);
      }
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  public update(song: Song | null, isPlaying: boolean, currentTime: number, duration: number) {
    this.currentSong = song;
    this.isPlaying = isPlaying;
    this.currentTime = currentTime;
    this.duration = duration;

    if (song?.coverUrl && song.coverUrl !== this.cachedCoverUrl) {
      this.loadCoverImage(song.coverUrl);
    }
  }

  public async enter(song: Song, isPlaying: boolean, currentTime: number, duration: number): Promise<boolean> {
    this.init();
    if (!this.canvas || !this.video) return false;

    this.currentSong = song;
    this.isPlaying = isPlaying;
    this.currentTime = currentTime;
    this.duration = duration;

    if (song.coverUrl) {
      this.loadCoverImage(song.coverUrl);
    }

    this.renderFrame(performance.now());

    // Connect canvas stream to video
    if (!this.video.srcObject) {
      const stream = (this.canvas as any).captureStream ? (this.canvas as any).captureStream(30) : null;
      if (!stream) {
        throw new Error('captureStream not supported in this browser');
      }
      this.video.srcObject = stream;
    }

    await this.video.play();
    await this.video.requestPictureInPicture();
    this.isPipActive = true;
    this.startLoop();
    return true;
  }

  public async exit() {
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {}
    }
    this.isPipActive = false;
    this.stopLoop();
  }

  public isActive(): boolean {
    return this.isPipActive && Boolean(document.pictureInPictureElement);
  }
}

export const canvasPipService = new CanvasPipService();

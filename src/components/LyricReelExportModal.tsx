import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import type { Song } from '../types';

interface LyricReelExportModalProps {
  currentSong: Song | null;
  currentTime: number;
  isOpen: boolean;
  onClose: () => void;
}

export const LyricReelExportModal: React.FC<LyricReelExportModalProps> = ({
  currentSong,
  currentTime,
  isOpen,
  onClose,
}) => {
  const [durationSecs, setDurationSecs] = useState<number>(15);
  const [startTime, setStartTime] = useState<number>(Math.max(0, Math.floor(currentTime)));
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStartTime(Math.max(0, Math.floor(currentTime)));
      setDownloadUrl(null);
      setRenderProgress(0);
    }
  }, [isOpen, currentTime]);

  if (!isOpen || !currentSong) return null;

  // Render preview frame on canvas
  const drawFrame = (timeOffset: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Dark Romantic Vignette Background
    const bgGrad = ctx.createRadialGradient(w * 0.7, h * 0.3, 50, w * 0.5, h * 0.5, h * 0.8);
    bgGrad.addColorStop(0, '#3a0d24');
    bgGrad.addColorStop(0.5, '#1e0513');
    bgGrad.addColorStop(1, '#0a0206');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle ambient glow orbs
    ctx.save();
    ctx.filter = 'blur(40px)';
    ctx.fillStyle = 'rgba(255, 45, 117, 0.15)';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.25, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Neon Rose Graphic (Top center)
    ctx.save();
    ctx.translate(w * 0.5, h * 0.22);
    ctx.strokeStyle = '#ff2d75';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff2d75';
    ctx.shadowBlur = 15;
    ctx.lineCap = 'round';

    // Rose stem
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(0, 30, -5, 50, 0, 70);
    ctx.stroke();

    // Rose flower
    ctx.beginPath();
    ctx.arc(0, -10, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-2, -12, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Title & Artist Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(currentSong.title, w * 0.5, h * 0.35);

    ctx.fillStyle = '#ff77aa';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(currentSong.artist, w * 0.5, h * 0.38);

    // 4. Pink Tilted 3D Card Area for Lyrics
    const cardX = w * 0.08;
    const cardY = h * 0.43;
    const cardW = w * 0.84;
    const cardH = h * 0.44;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 45, 117, 0.08)';
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(255, 45, 117, 0.25)';
    ctx.shadowBlur = 25;

    // Rounded rectangle card
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Lyrics Lines Inside Card
    const currentVirtualTime = startTime + timeOffset;
    const lyrics = currentSong.lyrics && currentSong.lyrics.length > 0
      ? currentSong.lyrics
      : [
          { time: startTime, text: currentSong.title },
          { time: startTime + 4, text: 'Pyaar tune kya kiya? chain mera liya' },
          { time: startTime + 8, text: 'Bepanaah ishq se vaastaa ho gaya' },
          { time: startTime + 12, text: 'Har pal nigaahon mein tera asar hai' },
        ];

    let activeIdx = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentVirtualTime >= lyrics[i].time) activeIdx = i;
    }

    const startIdx = Math.max(0, activeIdx - 1);
    const visibleLines = lyrics.slice(startIdx, startIdx + 4);

    visibleLines.forEach((line, idx) => {
      const isLineActive = lyrics[activeIdx]?.time === line.time;
      const lineY = cardY + 70 + idx * 52;

      ctx.save();
      ctx.textAlign = 'center';

      if (isLineActive) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.shadowColor = 'rgba(255, 105, 180, 0.9)';
        ctx.shadowBlur = 18;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.shadowBlur = 0;
      }

      ctx.fillText(line.text, w * 0.5, lineY, cardW - 40);
      ctx.restore();
    });

    // 6. Footer Brand: SunoNa x Spotify Logo
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('MADE WITH SUNONA • 9:16 REEL', w * 0.5, h * 0.94);
    ctx.restore();
  };

  // Live preview loop when modal is open
  useEffect(() => {
    let t = 0;
    const loop = () => {
      t += 0.05;
      drawFrame(t % durationSecs);
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [startTime, durationSecs, currentSong]);

  // Actual recording export function
  const handleExportReel = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering) return;

    setIsRendering(true);
    setRenderProgress(0);

    try {
      const stream = canvas.captureStream(30);
      const recordedChunks: Blob[] = [];

      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setIsRendering(false);
      };

      mediaRecorder.start();

      const totalFrames = durationSecs * 30;
      let frameCount = 0;

      const recordInterval = setInterval(() => {
        frameCount++;
        setRenderProgress(Math.floor((frameCount / totalFrames) * 100));

        if (frameCount >= totalFrames) {
          clearInterval(recordInterval);
          mediaRecorder.stop();
        }
      }, 1000 / 30);
    } catch (err) {
      console.error('Error recording reel:', err);
      setIsRendering(false);
    }
  };

  return (
    <div className="rose-modal-overlay" onClick={onClose}>
      <div className="rose-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="rose-modal-header">
          <div className="rose-modal-title-wrap">
            <Sparkles size={16} color="#ff2d75" />
            <h3>Export 9:16 Lyric Reel</h3>
          </div>
          <button className="rose-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rose-modal-body">
          {/* Canvas Preview in 9:16 (360x640 displayed) */}
          <div className="rose-preview-viewport">
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="rose-preview-canvas"
            />
          </div>

          {/* Controls */}
          <div className="rose-modal-controls">
            <div className="rose-control-group">
              <label>Reel Duration</label>
              <div className="rose-pill-selector">
                <button
                  className={`rose-time-pill ${durationSecs === 15 ? 'active' : ''}`}
                  onClick={() => setDurationSecs(15)}
                >
                  15s (WhatsApp Story)
                </button>
                <button
                  className={`rose-time-pill ${durationSecs === 30 ? 'active' : ''}`}
                  onClick={() => setDurationSecs(30)}
                >
                  30s (Instagram Reel)
                </button>
              </div>
            </div>

            <div className="rose-control-group">
              <label>Start Time ({Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')})</label>
              <input
                type="range"
                min={0}
                max={Math.max(0, (currentSong.duration || 180) - durationSecs)}
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="rose-range-slider"
              />
            </div>

            {/* Action Button */}
            {downloadUrl ? (
              <a
                href={downloadUrl}
                download={`${currentSong.title.replace(/[^a-zA-Z0-9]/g, '_')}_rose_reel.webm`}
                className="rose-download-btn"
              >
                <CheckCircle2 size={18} />
                <span>Download Video Ready (.webm)</span>
              </a>
            ) : (
              <button
                className="rose-render-btn"
                onClick={handleExportReel}
                disabled={isRendering}
              >
                {isRendering ? (
                  <>
                    <Loader2 size={18} className="spin-anim" />
                    <span>Rendering Video ({renderProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Generate & Download 9:16 Video</span>
                  </>
                )}
              </button>
            )}
            <p className="rose-disclaimer">
              Rendered on device via GPU Canvas. Ready for WhatsApp Status & Instagram Stories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface Props {
  isPlaying: boolean;
  primaryColor?: string;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<Props> = ({ isPlaying, primaryColor = '#a855f7', accentColor = '#ec4899' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getVisualizerData();
      const barCount = 14;
      const barWidth = Math.floor(width / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        // Take samples from frequency bins
        const binIndex = Math.floor((i / barCount) * freqData.length);
        const rawVal = freqData[binIndex] || 0;
        
        // If not playing, draw subtle resting idle bars with gentle wave
        const idleWave = Math.sin(Date.now() / 400 + i) * 3 + 4;
        const normalizedHeight = isPlaying ? Math.max(3, (rawVal / 255) * height) : idleWave;

        const x = i * (barWidth + 2);
        const y = height - normalizedHeight;

        // Gradient from primary to accent
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, primaryColor);
        grad.addColorStop(1, accentColor);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, normalizedHeight, [3, 3, 0, 0]);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, primaryColor, accentColor]);

  return (
    <div className="visualizer-canvas-box" title="Real-time Audio Analyser">
      <canvas ref={canvasRef} width={80} height={28} className="visualizer-canvas" />
    </div>
  );
};

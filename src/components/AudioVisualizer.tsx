import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface Props {
  isPlaying: boolean;
  primaryColor?: string;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<Props> = ({
  isPlaying,
  primaryColor = '#a855f7',
  accentColor = '#ec4899',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // Store smoothed bar heights for fluid studio-meter motion
  const barHeightsRef = useRef<number[]>(new Array(14).fill(4));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = 14;
    const width = canvas.width;
    const height = canvas.height;
    const barWidth = 3;
    const gap = 2;
    const totalBarsWidth = barCount * barWidth + (barCount - 1) * gap;
    const offsetX = Math.max(0, Math.floor((width - totalBarsWidth) / 2));

    // Static resting bar heights when NOT playing (clean, symmetric, stationary - RUKA HUA)
    const staticResting = [3, 4, 5, 5, 6, 6, 6, 6, 5, 5, 4, 4, 3, 3];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getVisualizerData();

      for (let i = 0; i < barCount; i++) {
        let targetHeight = 3;

        if (isPlaying) {
          // Dynamic amplitude reacting to voice and music frequencies
          const binIndex = Math.min(freqData.length - 1, Math.floor((i / barCount) * freqData.length));
          const rawVal = freqData[binIndex] || 0;
          // Scale to canvas height (leave 2px margin at top for crisp aesthetic)
          targetHeight = Math.max(3, (rawVal / 255) * (height - 2));
        } else {
          // Song nahi chal raha: COMPLETELY STATIC (ruka hua), ZERO motion!
          targetHeight = staticResting[i] || 3;
        }

        // Smooth physics-based meter transition: snappy attack on voice/beats, gentle decay
        const prev = barHeightsRef.current[i] ?? 3;
        let current: number;
        if (isPlaying) {
          if (targetHeight > prev) {
            current = prev + (targetHeight - prev) * 0.7; // Snappy rise
          } else {
            current = prev + (targetHeight - prev) * 0.3; // Natural decay
          }
        } else {
          // Quickly settle to resting static position and freeze
          current = prev + (targetHeight - prev) * 0.25;
        }
        barHeightsRef.current[i] = current;

        const x = offsetX + i * (barWidth + gap);
        const y = height - current;

        // Gradient from primary to accent
        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, primaryColor);
        grad.addColorStop(1, accentColor);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, Math.max(2, current), [2, 2, 0, 0]);
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
    <div
      className="visualizer-canvas-box"
      title={isPlaying ? 'Live Audio Analyser (Dynamic Voice & Music Spectrum)' : 'Audio Analyser (Stationary)'}
    >
      <canvas ref={canvasRef} width={80} height={28} className="visualizer-canvas" />
    </div>
  );
};

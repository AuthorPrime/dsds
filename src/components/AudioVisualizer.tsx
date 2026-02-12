import { useEffect, useRef } from 'react';
import type { AudioVisualizerProps } from '../types';

const AudioVisualizer = ({ analyser, isActive, color, mode = 'default' }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      const centerY = h / 2;

      if (!isActive || !analyser) {
        // === IDLE STATE ===
        ctx.clearRect(0, 0, w, h);

        if (mode === 'cinematic') {
          // Breathing sine wave
          const time = Date.now() / 1000;
          const breatheAlpha = 0.2 + 0.15 * Math.sin(time * 0.8);
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.globalAlpha = breatheAlpha;
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
          for (let x = 0; x < w; x++) {
            const y = centerY + Math.sin((x / w) * Math.PI * 4 + time * 2) * 6;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.shadowBlur = 0;
        } else {
          // Default: simple gray line
          ctx.beginPath();
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 1;
          ctx.moveTo(0, centerY);
          ctx.lineTo(w, centerY);
          ctx.stroke();
        }

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // === ACTIVE STATE ===
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      if (mode === 'cinematic') {
        // --- CINEMATIC MODE ---
        // Background fade with subtle tint
        ctx.fillStyle = 'rgba(5, 5, 5, 0.15)';
        ctx.fillRect(0, 0, w, h);

        // Compute average amplitude for volume-reactive effects
        let avgAmplitude = 0;
        for (let i = 0; i < bufferLength; i++) {
          avgAmplitude += Math.abs(dataArray[i] - 128);
        }
        avgAmplitude /= bufferLength;
        const normalizedVol = Math.min(avgAmplitude / 50, 1);

        // --- Frequency bars (subtle, behind waveform) ---
        const freqData = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(freqData);
        const barCount = 48;
        const barWidth = w / barCount;
        const step = Math.floor(bufferLength / barCount);

        ctx.globalAlpha = 0.12 + normalizedVol * 0.1;
        for (let i = 0; i < barCount; i++) {
          const barVal = freqData[i * step] / 255;
          const barH = barVal * h * 0.6;
          const gradient = ctx.createLinearGradient(0, h, 0, h - barH);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth + 1, h - barH, barWidth - 2, barH);
        }
        ctx.globalAlpha = 1;

        // --- Volume-reactive radial glow ---
        if (normalizedVol > 0.05) {
          const glowRadius = 60 + normalizedVol * 120;
          const gradient = ctx.createRadialGradient(w / 2, centerY, 0, w / 2, centerY, glowRadius);
          gradient.addColorStop(0, color.replace(')', `, ${0.08 + normalizedVol * 0.12})`).replace('rgb', 'rgba'));
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, w, h);
        }

        // --- Blurred glow pass (drawn first, underneath) ---
        ctx.beginPath();
        ctx.lineWidth = 5;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.25;
        ctx.shadowBlur = 25;
        ctx.shadowColor = color;

        const sliceW = w / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceW;
        }
        ctx.lineTo(w, centerY);
        ctx.stroke();

        // --- Crisp waveform pass (on top) ---
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceW;
        }
        ctx.lineTo(w, centerY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // --- DEFAULT MODE (original) ---
        ctx.fillStyle = 'rgba(5, 5, 5, 0.2)';
        ctx.fillRect(0, 0, w, h);

        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        ctx.beginPath();

        const sliceWidth = (w * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(w, centerY);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, color, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={150}
      className="w-full h-full rounded-lg bg-black/40 backdrop-blur-sm border border-white/5"
    />
  );
};

export default AudioVisualizer;

/**
 * Thumbnail Generator - Canvas-based branded episode thumbnails
 * Generates a 1280x720 podcast thumbnail using the DSDS brand palette
 */

import { BRANDING } from '../branding';

export interface ThumbnailOptions {
  title: string;
  episodeNumber?: number;
  showName?: string;
  hostName?: string;
  width?: number;
  height?: number;
}

/**
 * Generate a branded podcast thumbnail as a data URL.
 * Uses canvas 2D API — works in browser and Tauri webview.
 */
export function generateThumbnail(options: ThumbnailOptions): string {
  const {
    title,
    episodeNumber,
    showName = BRANDING.podcast.name,
    hostName = BRANDING.podcast.host,
    width = 1280,
    height = 720,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // --- Background gradient ---
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0A0A1A');
  bgGrad.addColorStop(0.5, '#1A0A2E');
  bgGrad.addColorStop(1, '#0A1A2E');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // --- Decorative orbs ---
  // Purple orb top-right
  const orbGrad1 = ctx.createRadialGradient(width * 0.8, height * 0.2, 0, width * 0.8, height * 0.2, 250);
  orbGrad1.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
  orbGrad1.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = orbGrad1;
  ctx.fillRect(0, 0, width, height);

  // Cyan orb bottom-left
  const orbGrad2 = ctx.createRadialGradient(width * 0.2, height * 0.8, 0, width * 0.2, height * 0.8, 200);
  orbGrad2.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
  orbGrad2.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = orbGrad2;
  ctx.fillRect(0, 0, width, height);

  // --- Grid lines (subtle) ---
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // --- Bottom accent bar ---
  const barGrad = ctx.createLinearGradient(0, height - 6, width, height - 6);
  barGrad.addColorStop(0, BRANDING.colors.primary);
  barGrad.addColorStop(1, BRANDING.colors.secondary);
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, height - 6, width, 6);

  // --- Show name (top) ---
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '600 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(showName.toUpperCase(), 60, 60);

  // --- Episode number badge ---
  if (episodeNumber) {
    const epText = `EP ${episodeNumber}`;
    ctx.font = '700 18px system-ui, -apple-system, sans-serif';
    const epWidth = ctx.measureText(epText).width + 24;
    const epX = width - 60 - epWidth;

    ctx.fillStyle = BRANDING.colors.primary;
    roundRect(ctx, epX, 38, epWidth, 32, 16);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(epText, epX + epWidth / 2, 60);
  }

  // --- Title (center, with word wrap) ---
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  const maxTitleWidth = width - 120;
  const titleLines = wrapText(ctx, title, maxTitleWidth, '700 48px system-ui, -apple-system, sans-serif');
  const lineHeight = 58;
  const totalTextHeight = titleLines.length * lineHeight;
  const startY = (height / 2) - (totalTextHeight / 2) + 20;

  ctx.font = '700 48px system-ui, -apple-system, sans-serif';
  titleLines.forEach((line, i) => {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(line, width / 2 + 2, startY + i * lineHeight + 2);
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  // --- Host name (bottom) ---
  ctx.font = '500 20px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText(`Hosted by ${hostName}`, 60, height - 40);

  // --- DSS badge (bottom-right) ---
  ctx.textAlign = 'right';
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  const dssGrad = ctx.createLinearGradient(width - 200, height - 40, width - 60, height - 40);
  dssGrad.addColorStop(0, BRANDING.colors.primary);
  dssGrad.addColorStop(1, BRANDING.colors.secondary);
  ctx.fillStyle = dssGrad;
  ctx.fillText(BRANDING.dss.shortName, width - 60, height - 40);

  return canvas.toDataURL('image/png');
}

/**
 * Generate thumbnail and return as a Blob for downloading.
 */
export async function generateThumbnailBlob(options: ThumbnailOptions): Promise<Blob | null> {
  const dataUrl = generateThumbnail(options);
  if (!dataUrl) return null;

  const res = await fetch(dataUrl);
  return res.blob();
}

// --- Helpers ---

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, font: string): string[] {
  ctx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  // Limit to 3 lines max, truncate with ellipsis
  if (lines.length > 3) {
    lines.length = 3;
    lines[2] = lines[2].slice(0, -3) + '...';
  }

  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

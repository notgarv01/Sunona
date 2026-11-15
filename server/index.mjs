import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Auto-patch solver timeout for low-CPU cloud environments (Render Free Tier)
try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const solverDir = path.resolve(currentDir, 'node_modules/@distube/ytdl-core/dist/solver');
  const workerFile = path.join(solverDir, 'worker.js');
  if (fs.existsSync(workerFile)) {
    let content = fs.readFileSync(workerFile, 'utf8');
    if (content.includes('TIMEOUT_MS = 2000')) {
      fs.writeFileSync(workerFile, content.replace('TIMEOUT_MS = 2000', 'TIMEOUT_MS = 60000'), 'utf8');
    }
  }
  const indexFile = path.join(solverDir, 'index.js');
  if (fs.existsSync(indexFile)) {
    let content = fs.readFileSync(indexFile, 'utf8');
    if (content.includes('CALL_DEADLINE_MS = 10_000')) {
      fs.writeFileSync(indexFile, content.replace('CALL_DEADLINE_MS = 10_000', 'CALL_DEADLINE_MS = 60_000'), 'utf8');
    }
  }
} catch (_) {}

import { createPoTokenProvider, Ytdl, Client, chooseFormat } from '@distube/ytdl-core';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// In-memory caches for maximum speed and minimal latency
const streamCache = new Map();
const ytIdCache = new Map();
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

let getPoToken = null;
let ytVision = new Ytdl({ clients: [Client.VisionOS] });
let ytMusic = new Ytdl({ clients: [Client.WebMusic] });
let ytMulti = new Ytdl({ clients: [Client.VisionOS, Client.WebMusic, Client.Tv, Client.WebEmbedded] });
let ytMweb = null;

async function initPoTokenEngine() {
  try {
    getPoToken = await createPoTokenProvider({ timeoutMs: 25000 });
    ytMweb = new Ytdl({ getPoToken, clients: [Client.Mweb, Client.VisionOS] });
  } catch (err) {
    ytMweb = new Ytdl({ clients: [Client.VisionOS, Client.WebMusic] });
  }
}

// Initialize PO token in background so server starts immediately without blocking
initPoTokenEngine().catch(() => {});

function sanitizeString(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

function parseDurationSec(durText) {
  if (!durText || typeof durText !== 'string') return 210;
  const parts = durText.split(':').map((p) => parseInt(p, 10));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 210;
}

// ── Pure YouTube Search Resolution ──
async function resolveYouTubeAudioId(query) {
  if (!query) return null;
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.01.00',
            hl: 'en',
            gl: 'IN',
          },
        },
        query: `${query} audio`,
      }),
    });
    const data = await res.json();
    const sections =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    for (const section of sections) {
      const contents = section.itemSectionRenderer?.contents || [];
      for (const c of contents) {
        if (c.videoRenderer?.videoId) {
          return c.videoRenderer.videoId;
        }
      }
    }
  } catch (_) {}
  return null;
}

// ── High-Performance YouTube Audio URL Resolver ──
async function getAudioDirectUrl(videoId, titleParam = '', artistParam = '') {
  // 1. Resolve to standard 11-char YouTube ID if needed
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    const lookupKey = (videoId ? videoId + '_' : '') + `${titleParam} ${artistParam}`.trim().toLowerCase();
    let resolvedId = ytIdCache.get(lookupKey) || (videoId ? ytIdCache.get(videoId) : null);
    if (!resolvedId && (titleParam || artistParam)) {
      resolvedId = await resolveYouTubeAudioId(`${titleParam} ${artistParam}`.trim());
      if (resolvedId) {
        ytIdCache.set(lookupKey, resolvedId);
        if (videoId) ytIdCache.set(videoId, resolvedId);
      }
    }
    if (resolvedId) {
      videoId = resolvedId;
    }
  }

  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return null;
  }

  // 2. Check stream cache (valid for 3 hours)
  const cached = streamCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < 10800000) {
    return cached.url;
  }

  // 3. Multi-client YouTube audio format resolution (VisionOS -> WebMusic -> Multi -> Mweb)
  const engines = [
    { name: 'VisionOS', yt: ytVision },
    { name: 'WebMusic', yt: ytMusic },
    { name: 'Multi', yt: ytMulti },
    { name: 'Mweb', yt: ytMweb || ytVision },
  ];

  for (const engine of engines) {
    try {
      const info = await engine.yt.getInfo(videoId);
      let format = chooseFormat(info.formats, {
        filter: (f) => f.hasAudio && !f.hasVideo,
        quality: 'highestaudio',
      });
      if (!format || !format.url) {
        format = chooseFormat(info.formats, { filter: (f) => f.hasAudio });
      }

      if (format && format.url) {
        streamCache.set(videoId, { url: format.url, timestamp: Date.now() });
        return format.url;
      }
    } catch (_) {}
  }

  // 4. Secondary fallback: Dynamic search if initial ID was geo-restricted or unavailable
  if (titleParam || artistParam) {
    try {
      const altId = await resolveYouTubeAudioId(`${titleParam} ${artistParam}`.trim());
      if (altId && altId !== videoId) {
        const info = await ytVision.getInfo(altId);
        let format = chooseFormat(info.formats, {
          filter: (f) => f.hasAudio && !f.hasVideo,
          quality: 'highestaudio',
        });
        if (!format || !format.url) {
          format = chooseFormat(info.formats, { filter: (f) => f.hasAudio });
        }
        if (format && format.url) {
          streamCache.set(videoId, { url: format.url, timestamp: Date.now() });
          streamCache.set(altId, { url: format.url, timestamp: Date.now() });
          return format.url;
        }
      }
    } catch (_) {}
  }

  return null;
}

// ── Health / Ping (For Keep-Alive & Monitoring) ──
app.get(['/health', '/ping', '/'], (req, res) => {
  res.json({
    status: 'online',
    service: 'SunoNa Pure YouTube Streaming Engine',
    clients: ['VisionOS', 'WebMusic', 'Tv', 'WebEmbedded', 'Mweb'],
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Stream Diagnostic Endpoint (/api/debug-stream?id=...) ──
app.get('/api/debug-stream', async (req, res) => {
  const testId = req.query.id || '9CmAUpXtVFc';
  const results = {};

  for (const clientName of ['VisionOS', 'WebMusic']) {
    try {
      const yt = new Ytdl({ clients: [Client[clientName]] });
      const t0 = Date.now();
      const info = await yt.getInfo(testId);
      const chosen = chooseFormat(info.formats, { filter: (f) => f.hasAudio && !f.hasVideo });
      results[clientName] = {
        success: true,
        ms: Date.now() - t0,
        title: info.videoDetails?.title,
        formatsCount: info.formats?.length,
        chosenItag: chosen?.itag,
        hasUrl: Boolean(chosen?.url),
        urlPreview: chosen?.url ? chosen.url.slice(0, 70) : null,
      };
    } catch (e) {
      results[clientName] = { success: false, error: e.message };
    }
  }

  res.json({
    testId,
    timestamp: new Date().toISOString(),
    results,
  });
});

// ── Audio Stream Proxy (/api/stream?id=...&title=...&artist=...) ──
app.get('/api/stream', async (req, res) => {
  try {
    let videoId = sanitizeString(req.query.id || '', 40);
    if (videoId === '12CeaxLiMgE') {
      videoId = 'O3-6zB3kg8M';
    }
    const titleParam = sanitizeString(req.query.title || '', 120);
    const artistParam = sanitizeString(req.query.artist || '', 120);

    const directUrl = await getAudioDirectUrl(videoId, titleParam, artistParam);
    if (!directUrl) {
      return res.status(404).send('Audio stream format unavailable');
    }

    // Forward Range request for instant seek & smooth scrubbing
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const audioRes = await fetch(directUrl, { headers });
    res.status(audioRes.status);

    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    audioRes.headers.forEach((val, key) => {
      if (forwardHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    if (audioRes.body) {
      const reader = audioRes.body.getReader();
      let isClosed = false;
      req.on('close', () => {
        isClosed = true;
        reader.cancel().catch(() => {});
      });

      while (!isClosed) {
        const { done, value } = await reader.read();
        if (done || isClosed) {
          if (!res.writableEnded) res.end();
          break;
        }
        res.write(value);
      }
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[Stream] Resolution error:', err.message);
    if (!res.headersSent) {
      res.status(500).send(`Stream resolution failed: ${err.message}`);
    } else {
      res.end();
    }
  }
});

// ── Search & Autocomplete (/api/search?q=...) ──
app.get('/api/search', async (req, res) => {
  try {
    const query = sanitizeString(req.query.q || '', 120);
    if (!query) {
      return res.json({ suggestions: [], results: [] });
    }

    const trimmedQuery = query.trim();

    // 1. YouTube Music Live Autocomplete Suggestions
    let suggestions = [];
    try {
      const suggRes = await fetch('https://music.youtube.com/youtubei/v1/music/get_search_suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB_REMIX',
              clientVersion: '1.20240101.01.00',
              hl: 'en',
              gl: 'IN',
            },
          },
          input: trimmedQuery,
        }),
      });
      const suggData = await suggRes.json();
      const rawSuggs = (suggData.contents?.[0]?.searchSuggestionsSectionRenderer?.contents || [])
        .map((c) => (c.searchSuggestionRenderer?.suggestion?.runs || []).map((r) => r.text).join(''))
        .filter(Boolean);

      const seenSuggs = new Set();
      for (const s of rawSuggs) {
        const clean = s
          .replace(/\b(?:song|songs|video|audio|lyrics?|full|hd)\b/gi, '')
          .replace(/[.,\-]+$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean && !seenSuggs.has(clean.toLowerCase())) {
          seenSuggs.add(clean.toLowerCase());
          suggestions.push(clean);
        }
        if (suggestions.length >= 4) break;
      }
    } catch (_) {}

    // 2. Pure YouTube Video Search (100% genuine YouTube IDs and playable audio)
    const results = [];
    const seenIds = new Set();

    try {
      const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240101.01.00',
              hl: 'en',
              gl: 'IN',
            },
          },
          query: `${trimmedQuery} song`,
        }),
      });
      const data = await searchRes.json();
      const sections =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      for (const s of sections) {
        const contents = s.itemSectionRenderer?.contents || [];
        for (const c of contents) {
          const vr = c.videoRenderer;
          if (vr && vr.videoId && !seenIds.has(vr.videoId)) {
            seenIds.add(vr.videoId);
            const title = vr.title?.runs?.[0]?.text || trimmedQuery;
            const artist = vr.ownerText?.runs?.[0]?.text || 'YouTube Music';
            const durText = vr.lengthText?.simpleText || '3:30';
            const duration = parseDurationSec(durText);
            const coverUrl =
              vr.thumbnail?.thumbnails?.pop()?.url ||
              `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;

            results.push({
              id: vr.videoId,
              title,
              artist,
              subtitle: `Song • ${artist}`,
              album: 'YouTube Music',
              duration,
              coverUrl,
              type: 'song',
            });
            if (results.length >= 10) break;
          }
        }
        if (results.length >= 10) break;
      }
    } catch (_) {}

    res.json({ suggestions, results });
  } catch (err) {
    res.status(500).json({ suggestions: [], results: [] });
  }
});

// ── Similar Recommendations Shelf (/api/similar?id=...&title=...) ──
app.get('/api/similar', async (req, res) => {
  try {
    const rawId = sanitizeString(req.query.id || '', 40);
    const title = sanitizeString(req.query.title || '', 100);
    const shelfTitle = title ? `Because You Love ${title}` : 'Recommended Songs';
    const results = [];
    const seenIds = new Set();

    if (rawId && YOUTUBE_ID_REGEX.test(rawId)) {
      try {
        const radioRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://music.youtube.com',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            videoId: rawId,
            playlistId: 'RDAMVM' + rawId,
          }),
        });

        const rData = await radioRes.json();
        const playlist =
          rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
        const items = playlist?.contents || [];

        for (const it of items) {
          const r = it.playlistPanelVideoRenderer;
          if (r && r.videoId && r.videoId !== rawId && !seenIds.has(r.videoId)) {
            seenIds.add(r.videoId);
            results.push({
              id: r.videoId,
              title: r.title?.runs?.[0]?.text || 'Suggested Track',
              artist: r.shortBylineText?.runs?.[0]?.text || r.longBylineText?.runs?.[0]?.text || 'YouTube Music',
              album: r.longBylineText?.runs?.[2]?.text || 'Single',
              duration: parseDurationSec(r.lengthText?.runs?.[0]?.text),
              coverUrl: r.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
              audioUrl: '',
              views: 'Recommended for you',
              lyrics: [],
            });
            if (results.length >= 8) break;
          }
        }
      } catch (_) {}
    }

    if (results.length === 0 && title) {
      try {
        const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            query: `${title} songs`,
          }),
        });
        const data = await searchRes.json();
        const sections =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const s of sections) {
          const contents = s.itemSectionRenderer?.contents || [];
          for (const c of contents) {
            const vr = c.videoRenderer;
            if (vr && vr.videoId && !seenIds.has(vr.videoId)) {
              seenIds.add(vr.videoId);
              results.push({
                id: vr.videoId,
                title: vr.title?.runs?.[0]?.text || '',
                artist: vr.ownerText?.runs?.[0]?.text || '',
                album: 'Single',
                duration: parseDurationSec(vr.lengthText?.simpleText),
                coverUrl: vr.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                audioUrl: '',
                views: 'Recommended for you',
                lyrics: [],
              });
              if (results.length >= 8) break;
            }
          }
          if (results.length >= 8) break;
        }
      } catch (_) {}
    }

    res.json({ title: shelfTitle, results });
  } catch (err) {
    res.json({ title: 'Recommended Songs', results: [] });
  }
});

// ── Daily Discover Recommendations (/api/daily-discover?seeds=...) ──
app.get('/api/daily-discover', async (req, res) => {
  try {
    const seedsParam = sanitizeString(req.query.seeds || '', 300);
    const seeds = seedsParam.split(',').map((s) => s.trim()).filter((s) => YOUTUBE_ID_REGEX.test(s));
    const discover = [];
    const seenIds = new Set(seeds);

    for (const seed of seeds.slice(0, 3)) {
      try {
        const radioRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://music.youtube.com',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            videoId: seed,
            playlistId: 'RDAMVM' + seed,
          }),
        });

        const rData = await radioRes.json();
        const playlist =
          rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
        const items = playlist?.contents || [];

        for (const it of items) {
          const r = it.playlistPanelVideoRenderer;
          if (r && r.videoId && !seenIds.has(r.videoId)) {
            seenIds.add(r.videoId);
            discover.push({
              id: r.videoId,
              title: r.title?.runs?.[0]?.text || 'Discover Track',
              artist: r.shortBylineText?.runs?.[0]?.text || r.longBylineText?.runs?.[0]?.text || 'YouTube Music',
              album: r.longBylineText?.runs?.[2]?.text || 'Single',
              duration: parseDurationSec(r.lengthText?.runs?.[0]?.text),
              coverUrl: r.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
              audioUrl: '',
              views: 'Daily Discover',
              lyrics: [],
            });
            if (discover.length >= 10) break;
          }
        }
      } catch (_) {}
      if (discover.length >= 10) break;
    }

    // Default trending fallback if no seeds provided or discovery empty
    if (discover.length === 0) {
      try {
        const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            query: 'trending hindi bollywood songs 2026',
          }),
        });
        const data = await searchRes.json();
        const sections =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const s of sections) {
          const contents = s.itemSectionRenderer?.contents || [];
          for (const c of contents) {
            const vr = c.videoRenderer;
            if (vr && vr.videoId && !seenIds.has(vr.videoId)) {
              seenIds.add(vr.videoId);
              discover.push({
                id: vr.videoId,
                title: vr.title?.runs?.[0]?.text || '',
                artist: vr.ownerText?.runs?.[0]?.text || 'Bollywood',
                album: 'Trending',
                duration: parseDurationSec(vr.lengthText?.simpleText),
                coverUrl: vr.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                audioUrl: '',
                views: 'Trending',
                lyrics: [],
              });
              if (discover.length >= 8) break;
            }
          }
          if (discover.length >= 8) break;
        }
      } catch (_) {}
    }

    res.json({ discover });
  } catch (err) {
    res.json({ discover: [] });
  }
});

// ── Related Automix / Radio (/api/related?id=...&continuation=...) ──
app.get('/api/related', async (req, res) => {
  try {
    const rawId = sanitizeString(req.query.id || '', 40);
    const continuation = sanitizeString(req.query.continuation || '', 300);
    const results = [];
    let nextContinuation = null;

    const requestBody = {
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'en',
          gl: 'IN',
        },
      },
    };

    if (continuation) {
      requestBody.continuation = continuation;
    } else if (rawId && YOUTUBE_ID_REGEX.test(rawId)) {
      requestBody.videoId = rawId;
      requestBody.playlistId = 'RDAMVM' + rawId;
    } else {
      return res.json({ results: [], continuation: null });
    }

    try {
      const radioRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.youtube.com',
        },
        body: JSON.stringify(requestBody),
      });

      const rData = await radioRes.json();
      const playlist =
        rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer ||
        rData.continuationContents?.playlistPanelContinuation;

      const items = playlist?.contents || [];
      for (const it of items) {
        const r = it.playlistPanelVideoRenderer;
        if (r && r.videoId) {
          results.push({
            id: r.videoId,
            title: r.title?.runs?.[0]?.text || 'Suggested Track',
            artist: r.shortBylineText?.runs?.[0]?.text || r.longBylineText?.runs?.[0]?.text || 'YouTube Music',
            album: r.longBylineText?.runs?.[2]?.text || 'Single',
            duration: parseDurationSec(r.lengthText?.runs?.[0]?.text),
            coverUrl: r.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
            audioUrl: '',
            views: 'AutoMix Radio',
            lyrics: [],
          });
        }
      }

      const contData = playlist?.continuations?.[0]?.nextRadioContinuationData || playlist?.continuations?.[0]?.nextContinuationData;
      if (contData?.continuation) {
        nextContinuation = contData.continuation;
      }
    } catch (_) {}

    // Fallback if playlist panel returned 0 results (e.g. cloud datacenter IP block)
    if (results.length === 0 && rawId) {
      try {
        const fallbackQuery = (req.query.title || req.query.artist)
          ? `${req.query.title || ''} ${req.query.artist || ''} songs`.trim()
          : 'trending hindi romantic songs';

        const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            context: {
              client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'en', gl: 'IN' },
            },
            query: fallbackQuery,
          }),
        });
        const sData = await searchRes.json();
        const sContents =
          sData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents || [];
        for (const c of sContents) {
          const vr = c.videoRenderer;
          if (vr && vr.videoId && vr.videoId !== rawId) {
            results.push({
              id: vr.videoId,
              title: vr.title?.runs?.[0]?.text || 'Suggested Track',
              artist: vr.ownerText?.runs?.[0]?.text || 'YouTube Music',
              album: 'AutoMix',
              duration: parseDurationSec(vr.lengthText?.simpleText),
              coverUrl: vr.thumbnail?.thumbnails?.pop()?.url || `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
              audioUrl: '',
              views: 'AutoMix Radio',
              lyrics: [],
            });
            if (results.length >= 10) break;
          }
        }
      } catch (_) {}
    }

    res.json({ results, continuation: nextContinuation });
  } catch (err) {
    res.json({ results: [], continuation: null });
  }
});

// ── Multi-Stage Synchronized Lyrics (/api/lyrics?track=...&artist=...) ──
app.get('/api/lyrics', async (req, res) => {
  try {
    const rawTrack = sanitizeString(req.query.track || '', 120);
    const rawArtist = sanitizeString(req.query.artist || '', 120);

    if (!rawTrack) {
      return res.json({ syncedLyrics: null, plainLyrics: null, found: false });
    }

    const cleanTrack = rawTrack
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/-\s*(Full Song|Lyrical|Audio|Video|From\s+.*|Official\s+.*)/gi, '')
      .replace(/\|\s*.*$/g, '')
      .trim();

    const cleanArtist = rawArtist
      .replace(/-\s*Topic/gi, '')
      .replace(/VEVO/gi, '')
      .split(/[,&•\/|]|ft\.|feat\./i)[0]
      .trim();

    let resultData = null;
    let matchedSource = '';

    // Stage 1: LRCLIB Exact Match
    try {
      const res1 = await fetch(
        `https://lrclib.net/api/get?track_name=${encodeURIComponent(
          cleanTrack
        )}&artist_name=${encodeURIComponent(cleanArtist)}`,
        { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
      );
      if (res1.ok) {
        const d1 = await res1.json();
        if (d1 && (d1.syncedLyrics || d1.plainLyrics)) {
          resultData = d1;
          matchedSource = 'LRCLIB (Exact Match)';
        }
      }
    } catch (_) {}

    // Stage 2: LRCLIB Fuzzy
    if (!resultData) {
      try {
        const query = `${cleanTrack} ${cleanArtist}`.trim();
        const res2 = await fetch(
          `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
          { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
        );
        if (res2.ok) {
          const list2 = await res2.json();
          if (Array.isArray(list2) && list2.length > 0) {
            const withSynced = list2.find((it) => it.syncedLyrics);
            resultData = withSynced || list2[0];
            matchedSource = 'LRCLIB (Community Search)';
          }
        }
      } catch (_) {}
    }

    // Stage 3: Lyrics.ovh
    if (!resultData && cleanArtist.length > 1) {
      try {
        const res3 = await fetch(
          `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`,
          { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
        );
        if (res3.ok) {
          const d3 = await res3.json();
          if (d3 && d3.lyrics && d3.lyrics.trim().length > 0) {
            resultData = {
              plainLyrics: d3.lyrics.trim(),
              syncedLyrics: null,
              trackName: cleanTrack,
              artistName: cleanArtist,
            };
            matchedSource = 'Lyrics.ovh';
          }
        }
      } catch (_) {}
    }

    if (resultData && (resultData.syncedLyrics || resultData.plainLyrics)) {
      res.json({ ...resultData, matchedSource, found: true });
    } else {
      res.json({
        syncedLyrics: null,
        plainLyrics: null,
        found: false,
        notFoundMessage: 'Lyrics unavailable for this track',
      });
    }
  } catch (err) {
    res.json({ syncedLyrics: null, plainLyrics: null, found: false });
  }
});

// ── Home Recommendations Feed (/api/home) ──
app.get('/api/home', async (req, res) => {
  try {
    const rawSeed = sanitizeString(req.query.seed || '', 20);
    const seed = YOUTUBE_ID_REGEX.test(rawSeed) ? rawSeed : '';
    const artist = sanitizeString(req.query.artist || '', 100);
    const quickPicks = [];

    if (seed) {
      try {
        const radioRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://music.youtube.com',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            videoId: seed,
            playlistId: 'RDAMVM' + seed,
          }),
        });

        const rData = await radioRes.json();
        const playlist =
          rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
        const items = playlist?.contents || [];

        for (const it of items) {
          const r = it.playlistPanelVideoRenderer;
          if (r && r.videoId) {
            const title = r.title?.runs?.[0]?.text || 'Suggested Track';
            const songArtist =
              r.shortBylineText?.runs?.[0]?.text ||
              r.longBylineText?.runs?.[0]?.text ||
              'YouTube Music';
            const album = r.longBylineText?.runs?.[2]?.text || 'Single';
            const cover =
              r.thumbnail?.thumbnails?.pop()?.url ||
              `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`;
            const durSec = parseDurationSec(r.lengthText?.runs?.[0]?.text);

            quickPicks.push({
              id: r.videoId,
              title: title,
              artist: songArtist,
              album: album,
              duration: durSec,
              coverUrl: cover,
              audioUrl: '',
              views: 'Recommended for you',
              lyrics: [],
            });
          }
        }
      } catch (_) {}
    }

    if (quickPicks.length === 0) {
      try {
        const searchRes = await fetch('https://www.youtube.com/youtubei/v1/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: 'WEB',
                clientVersion: '2.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
            query: artist ? `${artist} songs` : 'trending hindi songs 2026',
          }),
        });

        const sData = await searchRes.json();
        const contents =
          sData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
            ?.itemSectionRenderer?.contents || [];

        for (const c of contents) {
          const vr = c.videoRenderer;
          if (vr && vr.videoId) {
            const title = vr.title?.runs?.[0]?.text || '';
            const songArtist = vr.ownerText?.runs?.[0]?.text || '';
            const cover =
              vr.thumbnail?.thumbnails?.pop()?.url ||
              `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`;
            const durSec = parseDurationSec(vr.lengthText?.simpleText);

            quickPicks.push({
              id: vr.videoId,
              title,
              artist: songArtist,
              album: 'Trending',
              duration: durSec,
              coverUrl: cover,
              audioUrl: '',
              views: vr.viewCountText?.simpleText || 'Trending',
              lyrics: [],
            });
            if (quickPicks.length >= 10) break;
          }
        }
      } catch (_) {}
    }

    res.json({ quickPicks, shelves: [] });
  } catch (err) {
    res.json({ quickPicks: [], shelves: [] });
  }
});

app.listen(PORT, () => {
  console.log(`[SunoNa-Engine] Pure YouTube Streaming Engine listening on http://0.0.0.0:${PORT}`);
});

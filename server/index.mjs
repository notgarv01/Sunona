import express from 'express';
import cors from 'cors';
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
let ytInstance = null;

const OPTIMIZED_CLIENTS = [Client.VisionOS];

async function initPoTokenEngine() {
  try {
    console.log('[PO-Token] Initializing BotGuard worker thread...');
    getPoToken = await createPoTokenProvider({ timeoutMs: 25000 });
    ytInstance = new Ytdl({ getPoToken, clients: OPTIMIZED_CLIENTS });
    console.log('[PO-Token] BotGuard engine active and ready for YouTube requests!');
  } catch (err) {
    console.warn('[PO-Token] Warning initializing PO Token provider, falling back to VisionOS client:', err.message);
    ytInstance = new Ytdl({ clients: OPTIMIZED_CLIENTS });
  }
}

await initPoTokenEngine();

function sanitizeString(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

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

// ── Health / Ping (For UptimeRobot Keep-Alive to Prevent Sleep) ──
app.get(['/health', '/ping', '/'], (req, res) => {
  res.json({
    status: 'online',
    service: 'SunoNa Streaming Engine',
    poTokenActive: Boolean(getPoToken),
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/debug-stream', async (req, res) => {
  const testId = req.query.id || '9CmAUpXtVFc';
  try {
    const yt = ytInstance || new Ytdl({ clients: OPTIMIZED_CLIENTS });
    const info = await yt.getInfo(testId);
    const audioFormats = (info.formats || []).filter((f) => f.hasAudio);
    let chosen = chooseFormat(info.formats, { filter: (f) => f.hasAudio && !f.hasVideo });
    if (!chosen || !chosen.url) {
      chosen = chooseFormat(info.formats, { filter: (f) => f.hasAudio });
    }
    res.json({
      success: true,
      title: info.videoDetails?.title,
      formatsCount: info.formats?.length,
      audioFormatsCount: audioFormats.length,
      chosenHasUrl: Boolean(chosen?.url),
      streamUrlPreview: chosen?.url ? chosen.url.slice(0, 60) : null,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      errorName: err.name,
      errorMessage: err.message,
      cause: err.cause ? (err.cause.message || String(err.cause)) : null,
      causeStack: err.cause?.stack || null,
      stack: err.stack,
    });
  }
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

    // Dynamic resolution if ID is not standard 11-char YouTube ID
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

    let directUrl = '';
    const cached = videoId ? streamCache.get(videoId) : null;
    if (cached && Date.now() - cached.timestamp < 3600000) {
      directUrl = cached.url;
    } else {
      if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
        try {
          const yt = ytInstance || new Ytdl({ clients: OPTIMIZED_CLIENTS });
          const info = await yt.getInfo(videoId);
          let format = chooseFormat(info.formats, {
            filter: (f) => f.hasAudio && !f.hasVideo,
          });
          if (!format || !format.url) {
            format = chooseFormat(info.formats, { filter: (f) => f.hasAudio });
          }

          if (format && format.url) {
            directUrl = format.url;
            streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
          }
        } catch (ytdlErr) {
          console.warn('[Stream] Info error:', ytdlErr.message);
        }
      }

      // Resilient search fallback if initial ID failed
      if (!directUrl && (titleParam || artistParam)) {
        try {
          const dynamicId = await resolveYouTubeAudioId(`${titleParam} ${artistParam}`.trim());
          if (dynamicId) {
            const yt = ytInstance || new Ytdl({ clients: OPTIMIZED_CLIENTS });
            const dynamicInfo = await yt.getInfo(dynamicId);
            let dynFormat = chooseFormat(dynamicInfo.formats, {
              filter: (f) => f.hasAudio && !f.hasVideo,
            });
            if (!dynFormat || !dynFormat.url) {
              dynFormat = chooseFormat(dynamicInfo.formats, { filter: (f) => f.hasAudio });
            }
            if (dynFormat && dynFormat.url) {
              directUrl = dynFormat.url;
              if (videoId) streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
              streamCache.set(dynamicId, { url: directUrl, timestamp: Date.now() });
            }
          }
        } catch (_) {}
      }

      // High-availability CDN audio fallback (JioSaavn) if YouTube is throttled/blocked
      if (!directUrl && (titleParam || artistParam)) {
        try {
          const fallbackQuery = `${titleParam} ${artistParam}`.trim();
          const saavnRes = await fetch(
            `https://saavn.dev/api/search/songs?query=${encodeURIComponent(fallbackQuery)}&limit=1`
          ).then((r) => r.json()).catch(() => null);
          const saavnSong = saavnRes?.data?.results?.[0];
          if (saavnSong?.downloadUrl && Array.isArray(saavnSong.downloadUrl)) {
            const topQuality = saavnSong.downloadUrl[saavnSong.downloadUrl.length - 1]?.url;
            if (topQuality) {
              directUrl = topQuality;
              if (videoId) streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
            }
          }
        } catch (_) {}
      }

      if (!directUrl) {
        res.status(404).send('Audio stream format unavailable');
        return;
      }
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

    audioRes.headers.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey === 'content-type' ||
        lowerKey === 'content-length' ||
        lowerKey === 'content-range' ||
        lowerKey === 'accept-ranges'
      ) {
        res.setHeader(key, val);
      }
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (audioRes.body) {
      const reader = audioRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          break;
        }
        res.write(value);
      }
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[Stream] Resolution error:', err.message);
    res.status(500).send(`Stream resolution failed: ${err.message}`);
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

    const resData = await fetch('https://music.youtube.com/youtubei/v1/music/get_search_suggestions', {
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
    })
      .then((r) => r.json())
      .catch(() => null);

    const sections = resData?.contents || [];

    // Suggestions
    const rawSuggs = (sections[0]?.searchSuggestionsSectionRenderer?.contents || [])
      .map((c) => (c.searchSuggestionRenderer?.suggestion?.runs || []).map((r) => r.text).join(''))
      .filter(Boolean);

    const suggestions = [];
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

    // Results
    const results = [];
    const seenIds = new Set();

    for (const c of sections[1]?.searchSuggestionsSectionRenderer?.contents || []) {
      const item = c.musicResponsiveListItemRenderer;
      if (!item) continue;

      const titleRuns = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const title = titleRuns.map((r) => r.text).join('').trim();
      if (!title) continue;

      const metaRuns = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
      const metaParts = [];
      let cur = [];
      for (const r of metaRuns) {
        if (r.text && r.text.includes('•')) {
          if (cur.length) metaParts.push(cur.map((x) => x.text).join('').trim());
          cur = [];
        } else {
          cur.push(r);
        }
      }
      if (cur.length) metaParts.push(cur.map((x) => x.text).join('').trim());

      let type = 'song';
      let artist = '';
      let extra = '';

      if (metaParts.length >= 3) {
        type = metaParts[0].toLowerCase();
        artist = metaParts[1];
        extra = metaParts[2];
      } else if (metaParts.length === 2) {
        if (/song|album|artist|playlist|single/i.test(metaParts[0])) {
          type = metaParts[0].toLowerCase();
          artist = metaParts[1];
        } else {
          artist = metaParts[0];
          extra = metaParts[1];
        }
      } else if (metaParts.length === 1) {
        artist = metaParts[0];
      }

      const videoId =
        item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
        item.playlistItemData?.videoId ||
        item.navigationEndpoint?.watchEndpoint?.videoId;

      const displayType = type.charAt(0).toUpperCase() + type.slice(1);
      let subtitle = `${displayType} • ${artist || 'Artist'}`;
      if (extra && extra.includes('plays')) {
        subtitle = `${displayType} • ${artist} • ${extra}`;
      }

      const thumbnails = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
      let coverUrl = thumbnails.length ? thumbnails[thumbnails.length - 1].url : '';
      if (coverUrl) {
        coverUrl = coverUrl.replace(/=w\d+-h\d+.*$/, '=w544-h544-l90-rj');
      }

      const id = videoId || ('ytm_' + Math.random().toString(36).slice(2));
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      results.push({
        id,
        title,
        artist: artist || 'Artist',
        subtitle,
        album: displayType,
        duration: 210,
        coverUrl,
        type,
      });
    }

    if (results.length < 3) {
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(trimmedQuery)}&country=IN&entity=song&limit=6`
        );
        const itunesData = await itunesRes.json();
        for (const it of itunesData.results || []) {
          const itId = 'itunes_' + it.trackId;
          if (seenIds.has(itId)) continue;
          seenIds.add(itId);
          results.push({
            id: itId,
            title: it.trackName,
            artist: it.artistName,
            subtitle: `Song • ${it.artistName}`,
            album: it.collectionName || 'Single',
            duration: Math.round((it.trackTimeMillis || 210000) / 1000),
            coverUrl: (it.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
            type: 'song',
          });
          if (results.length >= 6) break;
        }
      } catch (_) {}
    }

    res.json({ suggestions, results: results.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ suggestions: [], results: [] });
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
            const durText = r.lengthText?.runs?.[0]?.text || '3:30';
            const parts = durText.split(':').map((p) => parseInt(p, 10));
            let durSec = 210;
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              durSec = parts[0] * 60 + parts[1];
            }

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
            const durText = vr.lengthText?.simpleText || '3:30';
            const parts = durText.split(':').map((p) => parseInt(p, 10));
            let durSec = 210;
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              durSec = parts[0] * 60 + parts[1];
            }

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
  console.log(`[SunoNa-Engine] Server listening on http://0.0.0.0:${PORT}`);
});

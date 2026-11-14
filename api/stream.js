import { Ytdl, chooseFormat } from '@distube/ytdl-core';

const ytdl = new Ytdl();
const streamCache = new Map();
const ytIdCache = new Map();
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

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

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // If a dedicated Render backend is configured, forward seamlessly
  const renderBackend = (process.env.RENDER_BACKEND_URL || process.env.BACKEND_URL || 'https://sunona-72ni.onrender.com').replace(/\/+$/, '');
  if (renderBackend) {
    try {
      const targetUrl = `${renderBackend}${req.url}`;
      const forwardHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      };
      if (req.headers.range) {
        forwardHeaders['Range'] = req.headers.range;
      }
      const proxyRes = await fetch(targetUrl, { headers: forwardHeaders });
      res.statusCode = proxyRes.status;
      proxyRes.headers.forEach((val, key) => {
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
      if (proxyRes.body) {
        const reader = proxyRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
      return;
    } catch (proxyErr) {
      console.warn('[Proxy] Render proxy fallback triggered:', proxyErr.message);
    }
  }

  try {
    const query = req.query || {};
    let videoId = sanitizeString(query.id || '', 40);
    if (videoId === '12CeaxLiMgE') {
      videoId = 'O3-6zB3kg8M';
    }
    const titleParam = sanitizeString(query.title || '', 120);
    const artistParam = sanitizeString(query.artist || '', 120);

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
          const info = await ytdl.getInfo(videoId);
          const format = chooseFormat(info.formats, {
            filter: (f) => f.hasAudio && !f.hasVideo,
          });

          if (format && format.url) {
            directUrl = format.url;
            streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
          }
        } catch (_) {}
      }

      if (!directUrl && (titleParam || artistParam)) {
        try {
          const dynamicId = await resolveYouTubeAudioId(`${titleParam} ${artistParam}`.trim());
          if (dynamicId) {
            const dynamicInfo = await ytdl.getInfo(dynamicId);
            const dynFormat = chooseFormat(dynamicInfo.formats, {
              filter: (f) => f.hasAudio && !f.hasVideo,
            });
            if (dynFormat && dynFormat.url) {
              directUrl = dynFormat.url;
              if (videoId) streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
              streamCache.set(dynamicId, { url: directUrl, timestamp: Date.now() });
            }
          }
        } catch (_) {}
      }

      if (!directUrl) {
        res.statusCode = 404;
        res.end('Audio stream format unavailable');
        return;
      }
    }

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const audioRes = await fetch(directUrl, { headers });
    res.statusCode = audioRes.status;

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
    res.statusCode = 500;
    res.end(`Stream resolution failed: ${err.message}`);
  }
}

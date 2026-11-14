const http = require('http');
const fs = require('fs');
const path = require('path');
const { Ytdl, chooseFormat } = require('@distube/ytdl-core');

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
const API_KEY_REGEX = /^[a-zA-Z0-9_-]{30,50}$/;

function sanitizeString(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.webm': 'audio/webm',
};


function levenshtein(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    const row = (matrix[i] = new Array(an + 1));
    row[0] = i;
  }
  const firstRow = matrix[0];
  for (let j = 1; j <= an; ++j) firstRow[j] = j;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[bn][an];
}

function normalizePhonetic(str) {
  return (str || '')
    .toLowerCase()
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/gaye/g, 'gayi')
    .replace(/gayee/g, 'gayi')
    .replace(/[^a-z0-9]/g, '');
}

function matchAcronym(str, query) {
  if (!str || !query || query.length < 2) return false;
  const words = str.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  const initials = words.map((w) => w[0]).join('');
  return initials.startsWith(query.toLowerCase());
}

function escapeRegExp(s) {
  return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

const ARTIST_COLLAB_MAP = {
  pritam: ['arijit singh', 'kk', 'mohit chauhan', 'benny dayal', 'shreya ghoshal', 'mika singh'],
  'yo yo honey singh': ['lil golu', 'alfaaz', 'badshah', 'raftaar', 'j-star', 'sonakshi sinha'],
  'arijit singh': ['pritam', 'sachin-jigar', 'mithoon', 'amaal mallik', 'shreya ghoshal'],
  'ap dhillon': ['gurinder gill', 'shinda kahlon', 'gminxr', 'shreya ghoshal'],
  'karan aujla': ['mxrci', 'avvy sra', 'deep jandu', 'badshah'],
  'sidhu moose wala': ['byg byrd', 'sunny malton', 'wazir patar', 'snappy'],
  'anirudh ravichander': ['dhanush', 'jonita gandhi', 'arunraja kamaraj'],
  'diljit dosanjh': ['badshah', 'sonam bajwa', 'tru-skool', 'snappy'],
};

function createServer(staticDir) {
  const ytdl = new Ytdl();
  const streamCache = new Map();
  const dailyDiscoverCache = new Map();
  const ytIdCache = new Map();

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

  return http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        res.statusCode = 400;
        res.end();
        return;
      }

      // Security Headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      // Restrict CORS to trusted local loopback origins
      const origin = req.headers.origin;
      if (origin) {
        try {
          const originUrl = new URL(origin);
          if (
            originUrl.hostname === '127.0.0.1' ||
            originUrl.hostname === 'localhost' ||
            originUrl.protocol === 'app:' ||
            originUrl.protocol === 'file:'
          ) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
          }
        } catch {}
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }

      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      const reqUrl = new URL(req.url, 'http://localhost');
      const pathname = reqUrl.pathname;

      // 1. YouTube Live Audio Stream Proxy (/api/stream?id=...)
      if (pathname === '/api/stream') {
        try {
          const videoId = sanitizeString(reqUrl.searchParams.get('id') || '', 20);
          if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid or missing YouTube video ID' }));
            return;
          }

          let directUrl = '';
          const cached = streamCache.get(videoId);
          if (cached && Date.now() - cached.timestamp < 3600000) {
            directUrl = cached.url;
          } else {
            const info = await ytdl.getInfo(videoId);
            const format = chooseFormat(info.formats, {
              filter: (f) => f.hasAudio && !f.hasVideo,
            });

            if (!format || !format.url) {
              res.statusCode = 404;
              res.end('Audio stream format unavailable');
              return;
            }

            directUrl = format.url;
            streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
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

          res.setHeader('Accept-Ranges', 'bytes');

          if (audioRes.body) {
            const reader = audioRes.body.getReader();
            const streamPump = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  res.end();
                  break;
                }
                res.write(value);
              }
            };
            streamPump().catch(() => res.end());
          } else {
            res.end();
          }
        } catch (err) {
          console.error('Audio stream resolution error:', err.message);
          res.statusCode = 500;
          res.end(`Stream resolution failed: ${err.message}`);
        }
        return;
      }

      function cleanSongMetadata(rawTitle, rawArtist) {
        let title = (rawTitle || '').trim();
        let artist = (rawArtist || '').trim();

        // 1. Remove prefixes: LYRICAL:, OFFICIAL:, FULL VIDEO:, Exclusive:, etc.
        title = title.replace(/^(?:LYRICAL|OFFICIAL|FULL VIDEO|VIDEO SONG|AUDIO TRACK|EXCLUSIVE)\s*[:|-]\s*/i, '');
        title = title.replace(/^Official\s*:\s*/i, '');
        title = title.replace(/^Exclusive:\s*/i, '');

        // 2. Colon title structure like "TU (Official Music Video): TALWIINDER | JACKIE SHROFF..."
        if (/^.*?\b(?:official|video|music)\b.*?:\s*/i.test(title)) {
          const preMatch = title.match(/^(.*?)\s*[\(\[]/);
          const postColon = title.split(/:\s*/)[1] || '';
          if (preMatch && preMatch[1].trim().length > 0) {
            title = preMatch[1].trim();
            if (postColon) {
              const parts = postColon.split('|').map(p => p.trim());
              const validArtists = parts.filter(p => !/Record|Series|Music|Studio|Films|Bhushan|Jackie|Neelam|Hrithik|Sonam|NTR|Janhvi|Sonakshi|Abhishek|Priyanka|John/i.test(p));
              if (validArtists.length > 0) artist = validArtists.join(', ');
            }
          }
        }

        // 3. Remove quotes around title
        title = title.replace(/^['"](.*?)['"]/i, '$1');

        // 4. Strip bracketed YouTube clutter
        title = title.replace(/\s*[\(\[]\s*.*?(?:official|video|audio|lyric|song|album|version|hd|4k|8k|prod|feat|hits).*?[\)\]]/gi, ' ');
        title = title.replace(/\s*[\(\[]\s*album\s*:\s*\{?[^}\]]*\}?[\)\]]/gi, ' ');
        title = title.replace(/Album\s*:\s*\{[^}]*\}/gi, ' ');
        title = title.replace(/\s*[\(\[]\s*(?:punjabi|hindi|haryanvi|bhojpuri|tamil|telugu)\s*(?:hits\s*)?songs?\s*\d*[\)\]]/gi, ' ');

        // 5. Remove non-latin characters
        title = title.replace(/[\u0600-\u06FF]+/g, '').trim();

        // 6. Handle 'by Singer'
        const byMatch = title.match(/^(.*?)\s+by\s+(.*?)$/i);
        if (byMatch) {
          title = byMatch[1];
          artist = byMatch[2];
        }

        // 7. Split by pipe '|'
        if (title.includes('|')) {
          const parts = title.split('|').map(p => p.trim()).filter(Boolean);
          title = parts[0];
          const artistParts = [];
          for (let i = 1; i < parts.length; i++) {
            const p = parts[i];
            if (/Record|Studio|Music|Series|Entertainment|Aale|Nupur|Company|Films|Dhaakad/i.test(p)) continue;
            if (/New\s.*Song|Video|Audio|Punjabi|Hindi/i.test(p)) continue;
            if (/Bhushan Kumar|Jackie Shroff|Neelam Kothari|Tara Sutaria|Hrithik|Sonam|NTR|Janhvi|Sonakshi|Abhishek|Priyanka|John/i.test(p)) continue;
            if (p.length > 2 && p.length < 35) artistParts.push(p);
          }
          if (artistParts.length > 0) artist = artistParts.join(', ');
        }

        // 8. Handle 'Singer - Title'
        if (title.includes(' - ')) {
          const dashParts = title.split(' - ').map(p => p.trim());
          if (dashParts.length === 2) {
            if (/Sonu Nigam|Yo Yo Honey Singh|Arijit|Pritam|Atif Aslam|Diljit|Badshah|Miss Pooja|Talwiinder/i.test(dashParts[0])) {
              artist = dashParts[0];
              title = dashParts[1];
            } else {
              title = dashParts[0];
              if (!artist || /T-Series|VEVO|Sony|Speed Records/i.test(artist)) artist = dashParts[1];
            }
          }
        }

        // 9. Strip trailing video song / full video / lyrical / cast garbage
        title = title.replace(/\s+(?:full video|video song|full song|audio song|lyrical video|full video song|with lyrics|full song with lyrics|lyrical)\b.*/gi, '');
        title = title.replace(/,\s*(?:Sonam Kapoor|Hrithik Roshan|Janhvi|NTR|Saif Ali Khan).*/gi, '');

        // 10. Handle cases like 'Haryana Hood Irshad Khan'
        if (/Irshad Khan/i.test(title)) {
          title = title.replace(/\s*Irshad Khan\s*/i, '');
          artist = 'Irshad Khan';
        }

        // 11. Clean artist of actors
        artist = artist.replace(/^(?:Saif Ali Khan|Sonakshi Sinha|Hrithik Roshan|Jackie Shroff|John Abraham|Abhishek Bachchan|Jacqueline Fernandez|Jacqueline)\s*,\s*/i, '');
        artist = artist.replace(/,\s*(?:Saif Ali Khan|Sonakshi Sinha|Sonam Kapoor|Hrithik Roshan|Janhvi|NTR|Jacqueline|Tara Sutaria|Jackie Shroff|Neelam Kothari|John|Abhishek|Priyanka).*/gi, '');

        title = title.replace(/[-–—:|]\s*$/, '').replace(/\s+/g, ' ').trim();
        artist = artist.replace(/\|.*$/, '').replace(/ - Topic$/i, '').replace(/VEVO$/i, '').replace(/Official$/i, '').trim();

        const typeTag = /Desi Boyz|International Villager/i.test(title) ? 'Album' : 'Song';

        return {
          cleanTitle: title || rawTitle,
          cleanArtist: artist || rawArtist || 'Various Artists',
          subtitle: `${typeTag} • ` + (artist || rawArtist || 'Various Artists')
        };
      }

            // 2. Metrolist InnerTube (YouTube Music WEB_REMIX) Autocomplete & Search Engine
        if (req.url.startsWith('/api/search')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const query = sanitizeString(urlObj.searchParams.get('q') || '', 120);

            if (!query) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ suggestions: [], results: [] }));
              return;
            }

            const trimmedQuery = query.trim();

            // Single fast fetch to YouTube Music InnerTube (WEB_REMIX) - Exactly like native Metrolist
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

            // 1. Text Query Autocomplete Suggestions (Section 0)
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

            // 2. Metrolist-style Recommended Music Items (Section 1)
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

            // Fallback: If recommended items are fewer than 3, fetch iTunes
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

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions, results: results.slice(0, 7) }));
            return;
          } catch (err) {
            console.error('Error in InnerTube search:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions: [], results: [] }));
            return;
          }
        }

      // 3. Multi-Provider Lyrics Waterfall (/api/lyrics)
      if (pathname === '/api/lyrics') {
        try {
          const rawTrack = sanitizeString(reqUrl.searchParams.get('track') || '', 120);
          const rawArtist = sanitizeString(reqUrl.searchParams.get('artist') || '', 120);

          if (!rawTrack) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ syncedLyrics: null, plainLyrics: null, found: false }));
            return;
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

          // Stage 2: LRCLIB Community Search
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

          // Stage 4: Title-only deep search
          if (!resultData && cleanTrack.length > 2) {
            try {
              const res4 = await fetch(
                `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}`,
                { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
              );
              if (res4.ok) {
                const list4 = await res4.json();
                if (Array.isArray(list4) && list4.length > 0) {
                  const withSynced = list4.find((it) => it.syncedLyrics);
                  resultData = withSynced || list4[0];
                  matchedSource = 'LRCLIB (OST Title Search)';
                }
              }
            } catch (_) {}
          }

          if (resultData && (resultData.syncedLyrics || resultData.plainLyrics)) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ...resultData, matchedSource, found: true }));
          } else {
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                syncedLyrics: null,
                plainLyrics: null,
                found: false,
                notFoundMessage: 'Lyrics unavailable for this track',
              })
            );
          }
        } catch (err) {
          console.error('Lyrics error:', err);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ syncedLyrics: null, plainLyrics: null, found: false }));
        }
        return;
      }

      // 4. YouTube Music Home Feed (/api/home)
      if (pathname === '/api/home') {
        try {
          const rawSeed = sanitizeString(reqUrl.searchParams.get('seed') || '', 20);
          const seed = YOUTUBE_ID_REGEX.test(rawSeed) ? rawSeed : '';
          const artist = sanitizeString(reqUrl.searchParams.get('artist') || '', 100);
          const quickPicks = [];

          if (seed) {
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
                const durText = r.lengthText?.runs?.[0]?.text || '3:30';
                const parts = durText.split(':').map((p) => parseInt(p, 10));
                let durSec = 210;
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  durSec = parts[0] * 60 + parts[1];
                }

                quickPicks.push({
                  id: r.videoId,
                  title: r.title?.runs?.[0]?.text || 'Suggested Track',
                  artist:
                    r.shortBylineText?.runs?.[0]?.text ||
                    r.longBylineText?.runs?.[0]?.text ||
                    'YouTube Music',
                  album: r.longBylineText?.runs?.[2]?.text || 'Single',
                  duration: durSec,
                  coverUrl:
                    r.thumbnail?.thumbnails?.pop()?.url ||
                    `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
                  audioUrl: '',
                  views: 'Recommended for you',
                  lyrics: [],
                });
              }
            }
          }

          if (quickPicks.length === 0) {
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
                const durText = vr.lengthText?.simpleText || '3:30';
                const parts = durText.split(':').map((p) => parseInt(p, 10));
                let durSeconds = 210;
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  durSeconds = parts[0] * 60 + parts[1];
                }

                quickPicks.push({
                  id: vr.videoId,
                  title: vr.title?.runs?.[0]?.text || 'Track',
                  artist:
                    vr.ownerText?.runs?.[0]?.text ||
                    vr.shortBylineText?.runs?.[0]?.text ||
                    'Artist',
                  album: 'YouTube Music',
                  duration: durSeconds,
                  coverUrl:
                    vr.thumbnail?.thumbnails?.pop()?.url ||
                    `https://i.ytimg.com/vi/${vr.videoId}/hqdefault.jpg`,
                  audioUrl: '',
                  views: vr.viewCountText?.simpleText || 'Trending',
                  lyrics: [],
                });
              }
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ quickPicks, shelves: [] }));
        } catch (err) {
          console.error('Home feed error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ quickPicks: [], shelves: [] }));
        }
        return;
      }

      // 5. Related Tracks (/api/related)
      if (pathname === '/api/related') {
        try {
          const rawId = sanitizeString(reqUrl.searchParams.get('id') || '', 20);
          const videoId = YOUTUBE_ID_REGEX.test(rawId) ? rawId : '';
          const continuationToken = sanitizeString(reqUrl.searchParams.get('continuation') || '', 300);

          if (!videoId && !continuationToken) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: [], continuation: null }));
            return;
          }

          const bodyPayload = {
            context: {
              client: {
                clientName: 'WEB_REMIX',
                clientVersion: '1.20240101.01.00',
                hl: 'en',
                gl: 'IN',
              },
            },
          };

          if (continuationToken) {
            bodyPayload.continuation = continuationToken;
          } else {
            bodyPayload.videoId = videoId;
            bodyPayload.playlistId = 'RDAMVM' + videoId;
          }

          const nextRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            body: JSON.stringify(bodyPayload),
          });

          const nextData = await nextRes.json();
          let items = [];
          let nextContinuation = null;

          if (continuationToken) {
            const contData = nextData.continuationContents?.playlistPanelContinuation;
            items = contData?.contents || [];
            nextContinuation =
              contData?.continuations?.[0]?.nextRadioContinuationData?.continuation ||
              contData?.continuations?.[0]?.nextContinuationData?.continuation ||
              null;
          } else {
            const playlist =
              nextData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
            items = playlist?.contents || [];
            nextContinuation =
              playlist?.continuations?.[0]?.nextRadioContinuationData?.continuation ||
              playlist?.continuations?.[0]?.nextContinuationData?.continuation ||
              null;
          }

          const relatedSongs = [];
          for (const it of items) {
            const r = it.playlistPanelVideoRenderer;
            if (r && r.videoId) {
              const durText = r.lengthText?.runs?.[0]?.text || '3:30';
              const parts = durText.split(':').map((p) => parseInt(p, 10));
              let durSec = 210;
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                durSec = parts[0] * 60 + parts[1];
              }

              relatedSongs.push({
                id: r.videoId,
                title: r.title?.runs?.[0]?.text || 'Suggested Song',
                artist:
                  r.shortBylineText?.runs?.[0]?.text ||
                  r.longBylineText?.runs?.[0]?.text ||
                  'YouTube Music',
                album: r.longBylineText?.runs?.[2]?.text || 'Single',
                duration: durSec,
                coverUrl:
                  r.thumbnail?.thumbnails?.pop()?.url ||
                  `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
                audioUrl: '',
                views: 'Suggested by Metrolist Radio',
                lyrics: [],
              });
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: relatedSongs, continuation: nextContinuation }));
        } catch (err) {
          console.error('Related radio error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: [], continuation: null }));
        }
        return;
      }

      // 6. Daily Discover Recommendations (/api/daily-discover)
      if (pathname === '/api/daily-discover') {
        try {
          const seedsParam = sanitizeString(reqUrl.searchParams.get('seeds') || '', 100);
          const defaultSeeds = ['kPtn26x8TZM', 'gJLVTKhTnog', 'ElZfdU54Cp8', 'k3g_WjLCsXM'];
          const seedIds = (seedsParam
            ? seedsParam.split(',').filter((s) => YOUTUBE_ID_REGEX.test(s)).slice(0, 4)
            : []
          );
          const finalSeeds = seedIds.length > 0 ? seedIds : defaultSeeds;

          const cacheKey = finalSeeds.slice().sort().join(',');
          const cachedDiscover = dailyDiscoverCache.get(cacheKey);
          if (cachedDiscover && Date.now() - cachedDiscover.timestamp < 1800000) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Cache', 'HIT');
            res.end(JSON.stringify({ discover: cachedDiscover.data }));
            return;
          }

          const discoverResults = await Promise.all(
            finalSeeds.map(async (sId) => {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4500);

                const resRadio = await fetch('https://music.youtube.com/youtubei/v1/next', {
                  method: 'POST',
                  signal: controller.signal,
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
                    videoId: sId,
                    playlistId: 'RDAMVM' + sId,
                  }),
                });
                clearTimeout(timeoutId);

                const rData = await resRadio.json();
                const playlist =
                  rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
                const items = playlist?.contents || [];

                const seedRenderer = items[0]?.playlistPanelVideoRenderer;
                const candidateRenderer =
                  items.slice(1).find((it) => it.playlistPanelVideoRenderer?.videoId !== sId)?.playlistPanelVideoRenderer ||
                  items[1]?.playlistPanelVideoRenderer;

                if (candidateRenderer && candidateRenderer.videoId) {
                  return {
                    seed: {
                      id: sId,
                      title: seedRenderer?.title?.runs?.[0]?.text || 'Your Favorite Track',
                      artist: seedRenderer?.shortBylineText?.runs?.[0]?.text || 'Artist',
                      coverUrl:
                        seedRenderer?.thumbnail?.thumbnails?.pop()?.url ||
                        `https://i.ytimg.com/vi/${sId}/hqdefault.jpg`,
                    },
                    recommendation: {
                      id: candidateRenderer.videoId,
                      title: candidateRenderer.title?.runs?.[0]?.text || 'Discovery Song',
                      artist:
                        candidateRenderer.shortBylineText?.runs?.[0]?.text ||
                        candidateRenderer.longBylineText?.runs?.[0]?.text ||
                        'YouTube Music',
                      album: candidateRenderer.longBylineText?.runs?.[2]?.text || 'Single',
                      duration: 210,
                      coverUrl:
                        candidateRenderer.thumbnail?.thumbnails?.pop()?.url ||
                        `https://i.ytimg.com/vi/${candidateRenderer.videoId}/hqdefault.jpg`,
                      audioUrl: '',
                      lyrics: [],
                      views: 'Recommended for you',
                    },
                  };
                }
              } catch (_) {}
              return null;
            })
          );

          const discoverList = discoverResults.filter(Boolean);
          if (discoverList.length > 0) {
            dailyDiscoverCache.set(cacheKey, { data: discoverList, timestamp: Date.now() });
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ discover: discoverList }));
        } catch (err) {
          console.error('Daily discover error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ discover: [] }));
        }
        return;
      }

      // 7. Similar Recommendations (/api/similar)
      if (pathname === '/api/similar') {
        try {
          const rawId = sanitizeString(reqUrl.searchParams.get('id') || '', 20);
          const id = YOUTUBE_ID_REGEX.test(rawId) ? rawId : 'kPtn26x8TZM';
          const seedTitle = sanitizeString(reqUrl.searchParams.get('title') || 'Your Favorites', 80);

          const relRes = await fetch('https://music.youtube.com/youtubei/v1/next', {
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
              videoId: id,
              playlistId: 'RDAMVM' + id,
            }),
          });

          const rData = await relRes.json();
          const playlist =
            rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
          const items = (playlist?.contents || []).slice(1, 13);

          const similarSongs = [];
          for (const it of items) {
            const r = it.playlistPanelVideoRenderer;
            if (r && r.videoId) {
              similarSongs.push({
                id: r.videoId,
                title: r.title?.runs?.[0]?.text || 'Track',
                artist: r.shortBylineText?.runs?.[0]?.text || 'Artist',
                album: r.longBylineText?.runs?.[2]?.text || 'Single',
                duration: 210,
                coverUrl:
                  r.thumbnail?.thumbnails?.pop()?.url ||
                  `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`,
                views: 'Similar Track',
              });
            }
          }

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ title: `Similar to ${seedTitle}`, results: similarSongs }));
        } catch (err) {
          console.error('Similar shelf error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ title: 'Similar Recommendations', results: [] }));
        }
        return;
      }

      // STATIC FILE SERVING from staticDir (e.g. dist/)
      if (staticDir && fs.existsSync(staticDir)) {
        let safePath;
        try {
          const decoded = decodeURIComponent(pathname);
          safePath = path.resolve(staticDir, '.' + path.normalize(decoded));
        } catch (_) {
          res.statusCode = 400;
          res.end('Bad Request');
          return;
        }
        let filePath = safePath;
        // Prevent directory traversal attacks
        const relative = path.relative(staticDir, filePath);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }

        let stat = null;
        try {
          if (fs.existsSync(filePath)) {
            stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              filePath = path.join(filePath, 'index.html');
              if (fs.existsSync(filePath)) {
                stat = fs.statSync(filePath);
              } else {
                stat = null;
              }
            }
          }
        } catch (_) {}

        // Single Page App fallback: if file does not exist, serve dist/index.html
        if (!stat) {
          filePath = path.join(staticDir, 'index.html');
          if (fs.existsSync(filePath)) {
            stat = fs.statSync(filePath);
          }
        }

        if (stat && stat.isFile()) {
          const ext = path.extname(filePath).toLowerCase();
          const mime = MIME_TYPES[ext] || 'application/octet-stream';
          res.setHeader('Content-Type', mime);
          res.setHeader('Content-Length', stat.size);
          // Cache immutable built assets for 1 day
          if (pathname.startsWith('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      res.statusCode = 404;
      res.end('Not Found');
    } catch (globalErr) {
      console.error('Server unhandled error:', globalErr);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });
}

function startServer({ staticDir, preferredPort = 34567 }) {
  return new Promise((resolve, reject) => {
    const server = createServer(staticDir);

    const tryPort = (port) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && port !== 0) {
          console.log(`Port ${port} in use, picking random free port...`);
          tryPort(0);
        } else {
          reject(err);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        const actualPort = server.address().port;
        console.log(`SunoNa Local API & Static Server running at http://127.0.0.1:${actualPort}`);
        resolve({
          port: actualPort,
          server,
          close: () => server.close(),
        });
      });
    };

    tryPort(preferredPort);
  });
}

module.exports = {
  startServer,
};


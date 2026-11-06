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

function createServer(staticDir) {
  const ytdl = new Ytdl();
  const streamCache = new Map();
  const dailyDiscoverCache = new Map();

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
      res.setHeader('Access-Control-Allow-Origin', '*');

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

      // 2. YouTube Live Search Endpoint (/api/search?q=...)
      if (pathname === '/api/search') {
        try {
          const query = sanitizeString(reqUrl.searchParams.get('q') || '', 120);
          const headerKey = req.headers['x-youtube-key'];
          const customApiKey = (typeof headerKey === 'string' ? headerKey : reqUrl.searchParams.get('key')) || '';

          if (!query) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: [] }));
            return;
          }

          if (customApiKey && API_KEY_REGEX.test(customApiKey.trim())) {
            const ytApiRes = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=20&q=${encodeURIComponent(
                query
              )}&key=${encodeURIComponent(customApiKey.trim())}`
            );
            const ytData = await ytApiRes.json();
            const items = (ytData.items || []).map((it) => ({
              id: it.id?.videoId,
              title: it.snippet?.title,
              artist: it.snippet?.channelTitle,
              album: 'YouTube Music',
              duration: 210,
              durationFormatted: '3:30',
              coverUrl: it.snippet?.thumbnails?.high?.url || it.snippet?.thumbnails?.default?.url,
              views: 'Trending',
            }));

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: items }));
            return;
          }

          const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
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
              query: query.trim(),
            }),
          });

          const data = await response.json();
          const contents =
            data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
              ?.itemSectionRenderer?.contents || [];

          const songs = [];
          for (const c of contents) {
            const vr = c.videoRenderer;
            if (vr && vr.videoId) {
              const durText = vr.lengthText?.simpleText || '3:30';
              const parts = durText.split(':').map((p) => parseInt(p, 10));
              let durSeconds = 210;
              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                durSeconds = parts[0] * 60 + parts[1];
              } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                durSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
              }

              songs.push({
                id: vr.videoId,
                title: vr.title?.runs?.[0]?.text || 'Unknown Title',
                artist:
                  vr.ownerText?.runs?.[0]?.text ||
                  vr.shortBylineText?.runs?.[0]?.text ||
                  'YouTube Music Artist',
                album: 'YouTube Music',
                duration: durSeconds,
                durationFormatted: durText,
                coverUrl:
                  vr.thumbnail?.thumbnails?.pop()?.url ||
                  `https://img.youtube.com/vi/${vr.videoId}/hqdefault.jpg`,
                views: vr.viewCountText?.simpleText || '1.2M views',
              });
            }
          }

          function getRelevanceScore(item, q) {
            let score = 0;
            const t = (item.title || '').toLowerCase();
            const a = (item.artist || '').toLowerCase();
            const qLower = q.toLowerCase();

            if (t.includes(qLower)) score += 50;
            if (a.includes(qLower)) score += 30;
            if (/official (video|audio|music video|lyric)/i.test(t)) score += 45;
            if (/vevo|topic|coke studio|t-series|sony music|yrf|zee music|speed records|white hill/i.test(a)) score += 35;

            const vText = item.views || '';
            if (vText.includes('B views') || vText.includes('B')) {
              score += 40;
            } else if (vText.includes('M views') || vText.includes('M')) {
              const num = parseFloat(vText);
              score += Math.min(35, isNaN(num) ? 10 : num * 1.5);
            }

            if (/karaoke/i.test(t) || /karaoke/i.test(a)) score -= 120;
            if (/instrumental/i.test(t) || /instrumental/i.test(a)) score -= 80;
            if (/background music|bgm/i.test(t)) score -= 70;
            if (/slowed|reverb/i.test(t)) score -= 50;
            if (/tutorial|guitar lesson|how to play/i.test(t)) score -= 90;
            if (/cover/i.test(t) && !qLower.includes('cover')) score -= 40;

            return score;
          }

          songs.sort((a, b) => getRelevanceScore(b, query) - getRelevanceScore(a, query));

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results: songs }));
        } catch (err) {
          console.error('Error querying YouTube search:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message, results: [] }));
        }
        return;
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
        let filePath = path.join(staticDir, decodeURIComponent(pathname));
        // Prevent directory traversal attacks
        if (!filePath.startsWith(staticDir)) {
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


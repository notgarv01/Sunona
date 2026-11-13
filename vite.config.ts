import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { Ytdl, chooseFormat } from '@distube/ytdl-core';

// Security: Strict validation patterns to prevent SSRF and injection
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function sanitizeString(str: string, maxLen = 150): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}


function youtubeStreamingPlugin(): Plugin {
  const ytdl = new Ytdl();
  // Cache resolved format URLs for 1 hour to prevent redundant requests
  const streamCache = new Map<string, { url: string; timestamp: number }>();
  // In-memory cache for mapped YouTube IDs (from Saavn / iTunes / metadata to YouTube videoId)
  const ytIdCache = new Map<string, string>();
  // In-memory cache for Daily Discover recommendations
  const dailyDiscoverCache = new Map<string, { data: any; timestamp: number }>();

  async function resolveYouTubeAudioId(query: string): Promise<string | null> {
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
      const data: any = await res.json();
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

  return {
    name: 'youtube-streaming-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();

        // Security Headers (Defense in depth)
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // 1. YouTube Live Audio Stream Proxy (/api/stream?id=...)
        if (req.url.startsWith('/api/stream')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            let videoId = sanitizeString(urlObj.searchParams.get('id') || '', 40);
            const titleParam = sanitizeString(urlObj.searchParams.get('title') || '', 120);
            const artistParam = sanitizeString(urlObj.searchParams.get('artist') || '', 120);

            // If not a standard 11-char YouTube ID, resolve from title + artist or cache
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

            // Check cache
            let directUrl = '';
            const cached = videoId ? streamCache.get(videoId) : null;
            if (cached && Date.now() - cached.timestamp < 3600000) {
              directUrl = cached.url;
            } else {
              if (videoId && YOUTUBE_ID_REGEX.test(videoId)) {
                try {
                  const info = await ytdl.getInfo(videoId);
                  const format = chooseFormat(info.formats, {
                    filter: (f: any) => f.hasAudio && !f.hasVideo,
                  });

                  if (format && format.url) {
                    directUrl = format.url;
                    streamCache.set(videoId, { url: directUrl, timestamp: Date.now() });
                  }
                } catch (_) {}
              }

              // Resilient dynamic resolution: If initial videoId failed or was invalid, search YouTube for title + artist
              if (!directUrl && (titleParam || artistParam)) {
                try {
                  const dynamicId = await resolveYouTubeAudioId(`${titleParam} ${artistParam}`.trim());
                  if (dynamicId) {
                    const dynamicInfo = await ytdl.getInfo(dynamicId);
                    const dynFormat = chooseFormat(dynamicInfo.formats, {
                      filter: (f: any) => f.hasAudio && !f.hasVideo,
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

            // Forward Range request for instant seek & smooth scrubbing
            const headers: Record<string, string> = {
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
          } catch (err: any) {
            console.error('Audio stream resolution error:', err.message);
            res.statusCode = 500;
            res.end(`Stream resolution failed: ${err.message}`);
          }
          return;
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
            const resData: any = await fetch('https://music.youtube.com/youtubei/v1/music/get_search_suggestions', {
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
              .map((c: any) => (c.searchSuggestionRenderer?.suggestion?.runs || []).map((r: any) => r.text).join(''))
              .filter(Boolean);

            const suggestions: string[] = [];
            const seenSuggs = new Set<string>();
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
            const results: any[] = [];
            const seenIds = new Set<string>();

            for (const c of sections[1]?.searchSuggestionsSectionRenderer?.contents || []) {
              const item = c.musicResponsiveListItemRenderer;
              if (!item) continue;

              const titleRuns = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
              const title = titleRuns.map((r: any) => r.text).join('').trim();
              if (!title) continue;

              const metaRuns = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
              const metaParts: string[] = [];
              let cur: any[] = [];
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
              if (coverUrl && coverUrl.includes('Ej74Baox')) {
                coverUrl = 'https://i.ytimg.com/vi/v6F7Bw9cXFg/hqdefault.jpg';
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
                const itunesData: any = await itunesRes.json();
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
          } catch (err: any) {
            console.error('Error in InnerTube search:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ suggestions: [], results: [] }));
            return;
          }
        }

        // 3. Multi-Provider Lyrics Waterfall (5-Stage Auto-Fallback Engine)
        if (req.url.startsWith('/api/lyrics')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const rawTrack = sanitizeString(urlObj.searchParams.get('track') || '', 120);
            const rawArtist = sanitizeString(urlObj.searchParams.get('artist') || '', 120);

            if (!rawTrack) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ syncedLyrics: null, plainLyrics: null, found: false }));
              return;
            }

            // Clean YouTube video artifacts from title (e.g. "HUSN (Official Video)" -> "HUSN")
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

            const searchedProviders: string[] = [];
            let resultData: any = null;
            let matchedSource: string = '';

            // ========================================================
            // STAGE 1: LRCLIB Official (Exact Studio Match)
            // ========================================================
            searchedProviders.push('1. LRCLIB Official (Exact Match)');
            try {
              const res1 = await fetch(
                `https://lrclib.net/api/get?track_name=${encodeURIComponent(
                  cleanTrack
                )}&artist_name=${encodeURIComponent(cleanArtist)}`,
                { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
              );
              if (res1.ok) {
                const d1: any = await res1.json();
                if (d1 && (d1.syncedLyrics || d1.plainLyrics)) {
                  resultData = d1;
                  matchedSource = 'LRCLIB (Exact Match)';
                }
              }
            } catch (_) {}

            // ========================================================
            // STAGE 2: LRCLIB Community Search (Fuzzy Track + Artist)
            // ========================================================
            if (!resultData) {
              searchedProviders.push('2. LRCLIB Community (Fuzzy Search)');
              try {
                const query = `${cleanTrack} ${cleanArtist}`.trim();
                const res2 = await fetch(
                  `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`,
                  { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
                );
                if (res2.ok) {
                  const list2 = await res2.json();
                  if (Array.isArray(list2) && list2.length > 0) {
                    const withSynced = list2.find((it: any) => it.syncedLyrics);
                    resultData = withSynced || list2[0];
                    matchedSource = 'LRCLIB (Community Search)';
                  }
                }
              } catch (_) {}
            }

            // ========================================================
            // STAGE 3: Lyrics.ovh Global REST API (Plaintext Library)
            // ========================================================
            if (!resultData && cleanArtist.length > 1) {
              searchedProviders.push('3. Lyrics.ovh (Global Text Library)');
              try {
                const res3 = await fetch(
                  `https://api.lyrics.ovh/v1/${encodeURIComponent(cleanArtist)}/${encodeURIComponent(cleanTrack)}`,
                  { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
                );
                if (res3.ok) {
                  const d3: any = await res3.json();
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

            // ========================================================
            // STAGE 4: LRCLIB Title-Only OST Deep Search (No Artist Bias)
            // ========================================================
            if (!resultData && cleanTrack.length > 2) {
              searchedProviders.push('4. LRCLIB OST (Title-Only Deep Search)');
              try {
                const res4 = await fetch(
                  `https://lrclib.net/api/search?track_name=${encodeURIComponent(cleanTrack)}`,
                  { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
                );
                if (res4.ok) {
                  const list4 = await res4.json();
                  if (Array.isArray(list4) && list4.length > 0) {
                    const withSynced = list4.find((it: any) => it.syncedLyrics);
                    resultData = withSynced || list4[0];
                    matchedSource = 'LRCLIB (OST Title Search)';
                  }
                }
              } catch (_) {}
            }

            // ========================================================
            // STAGE 5: Global Music Lyrics Archive (Word Stem Query)
            // ========================================================
            if (!resultData) {
              searchedProviders.push('5. Global Music Lyrics Archive');
              try {
                const words = cleanTrack.split(/\s+/).filter(Boolean);
                const shortQuery = words.length > 1 ? words.slice(0, 2).join(' ') : words[0];
                if (shortQuery) {
                  const res5 = await fetch(
                    `https://lrclib.net/api/search?q=${encodeURIComponent(shortQuery)}`,
                    { headers: { 'User-Agent': 'SunoNa-Music/1.0' }, signal: AbortSignal.timeout(2500) }
                  );
                  if (res5.ok) {
                    const list5 = await res5.json();
                    if (Array.isArray(list5) && list5.length > 0) {
                      const match = list5.find((it: any) =>
                        it.trackName && it.trackName.toLowerCase().includes(shortQuery.toLowerCase())
                      );
                      if (match && (match.syncedLyrics || match.plainLyrics)) {
                        resultData = match;
                        matchedSource = 'Global Archive (Fuzzy)';
                      }
                    }
                  }
                }
              } catch (_) {}
            }

            // ========================================================
            // BONUS STAGE: Genius Official API Search (User Verified Token)
            // ========================================================
            let geniusUrl = '';
            try {
              const geniusQuery = `${cleanTrack} ${cleanArtist}`.trim();
              const gRes = await fetch(
                `https://api.genius.com/search?q=${encodeURIComponent(geniusQuery)}`,
                {
                  headers: {
                    Authorization: 'Bearer I6lYKsH2te931WT1ZKwAOzDzq8_AAse67DLnj0qoxKWaytYUSYk-XfbBp1q47Fbu',
                    'User-Agent': 'SunoNa-Music/1.0',
                  },
                  signal: AbortSignal.timeout(2500),
                }
              );
              if (gRes.ok) {
                const gData: any = await gRes.json();
                const topHit = gData?.response?.hits?.[0]?.result;
                if (topHit?.url) {
                  geniusUrl = topHit.url;
                }
              }
            } catch (_) {}

            // Final Response Delivery
            if (resultData && (resultData.syncedLyrics || resultData.plainLyrics)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ...resultData,
                  matchedSource,
                  searchedProviders,
                  geniusUrl,
                  found: true,
                })
              );
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  syncedLyrics: null,
                  plainLyrics: null,
                  searchedProviders,
                  geniusUrl,
                  found: false,
                  notFoundMessage: '5 jagah dekha fir bhi nahi mil rahe lyrics 💀',
                })
              );
            }
          } catch (err: any) {
            console.error('Lyrics fetch error:', err?.message);
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                syncedLyrics: null,
                plainLyrics: null,
                found: false,
                notFoundMessage: '5 jagah dekha fir bhi nahi mil rahe lyrics 💀',
              })
            );
          }
          return;
        }

        // 4. YouTube Music Home Feed (Metrolist Dynamic Seeded Taste Feed)
        if (req.url.startsWith('/api/home')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const rawSeed = sanitizeString(urlObj.searchParams.get('seed') || '', 20);
            const seed = YOUTUBE_ID_REGEX.test(rawSeed) ? rawSeed : '';
            const artist = sanitizeString(urlObj.searchParams.get('artist') || '', 100);
            const quickPicks: any[] = [];
            const shelves: any[] = [];

            // If user has a seed from play history (e.g. Bollywood song)
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

              const rData: any = await radioRes.json();
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
                  const parts = durText.split(':').map((p: string) => parseInt(p, 10));
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
            }

            // If no seed or seed returned few items, fetch popular trending tracks
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

              const sData: any = await searchRes.json();
              const contents =
                sData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
                  ?.itemSectionRenderer?.contents || [];

              for (const c of contents) {
                const vr = c.videoRenderer;
                if (vr && vr.videoId) {
                  const durText = vr.lengthText?.simpleText || '3:30';
                  const parts = durText.split(':').map((p: string) => parseInt(p, 10));
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
            res.end(JSON.stringify({ quickPicks, shelves }));
          } catch (err: any) {
            console.error('Home feed error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ quickPicks: [], shelves: [] }));
          }
          return;
        }

        // 5. YouTube Music Automix Radio & Continuous Up Next Suggestions (Metrolist YouTubeQueue.radio & nextPage)
        if (req.url.startsWith('/api/related')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const rawId = sanitizeString(urlObj.searchParams.get('id') || '', 20);
            const videoId = YOUTUBE_ID_REGEX.test(rawId) ? rawId : '';
            const continuationToken = sanitizeString(urlObj.searchParams.get('continuation') || '', 300);

            if (!videoId && !continuationToken) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ results: [], continuation: null }));
              return;
            }

            const bodyPayload: any = {
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

            const nextData: any = await nextRes.json();
            let items: any[] = [];
            let nextContinuation: string | null = null;

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

            const relatedSongs: any[] = [];
            for (const it of items) {
              const r = it.playlistPanelVideoRenderer;
              if (r && r.videoId) {
                const title = r.title?.runs?.[0]?.text || 'Suggested Song';
                const artist =
                  r.shortBylineText?.runs?.[0]?.text ||
                  r.longBylineText?.runs?.[0]?.text ||
                  'YouTube Music';
                const album = r.longBylineText?.runs?.[2]?.text || 'Single';
                const cover =
                  r.thumbnail?.thumbnails?.pop()?.url ||
                  `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`;
                const durText = r.lengthText?.runs?.[0]?.text || '3:30';
                const parts = durText.split(':').map((p: string) => parseInt(p, 10));
                let durSec = 210;
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                  durSec = parts[0] * 60 + parts[1];
                }

                relatedSongs.push({
                  id: r.videoId,
                  title: title,
                  artist: artist,
                  album: album,
                  duration: durSec,
                  coverUrl: cover,
                  audioUrl: '',
                  views: 'Suggested by Metrolist Radio',
                  lyrics: [],
                });
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: relatedSongs, continuation: nextContinuation }));
          } catch (err: any) {
            console.error('Related radio error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ results: [], continuation: null }));
          }
          return;
        }

        // 6. Metrolist Daily Discover Recommendations (HomeViewModel.getDailyDiscover)
        if (req.url.startsWith('/api/daily-discover')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const seedsParam = sanitizeString(urlObj.searchParams.get('seeds') || '', 100);
            const defaultSeeds = ['kPtn26x8TZM', 'gJLVTKhTnog', 'ElZfdU54Cp8', 'k3g_WjLCsXM'];
            const seedIds = (seedsParam
              ? seedsParam.split(',').filter((s) => YOUTUBE_ID_REGEX.test(s)).slice(0, 4)
              : []
            );
            const finalSeeds = seedIds.length > 0 ? seedIds : defaultSeeds;

            const cacheKey = finalSeeds.slice().sort().join(',');
            const cachedDiscover = dailyDiscoverCache.get(cacheKey);
            // Cache for 30 minutes for instant zero-latency responses
            if (cachedDiscover && Date.now() - cachedDiscover.timestamp < 1800000) {
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('X-Cache', 'HIT');
              res.end(JSON.stringify({ discover: cachedDiscover.data }));
              return;
            }

            // Fetch all seeds concurrently in parallel!
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

                  const rData: any = await resRadio.json();
                  const playlist =
                    rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
                  const items = playlist?.contents || [];

                  const seedRenderer = items[0]?.playlistPanelVideoRenderer;
                  const candidateRenderer =
                    items.slice(1).find((it: any) => it.playlistPanelVideoRenderer?.videoId !== sId)?.playlistPanelVideoRenderer ||
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
                } catch (subErr) {
                  console.error('Error fetching discover seed in parallel:', subErr);
                }
                return null;
              })
            );

            const discoverList = discoverResults.filter(Boolean);

            if (discoverList.length > 0) {
              dailyDiscoverCache.set(cacheKey, { data: discoverList, timestamp: Date.now() });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ discover: discoverList }));
          } catch (err: any) {
            console.error('Daily discover error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ discover: [] }));
          }
          return;
        }

        // 7. Metrolist "Similar To" Shelf (HomeViewModel.getSimilarRecommendations)
        if (req.url.startsWith('/api/similar')) {
          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const rawId = sanitizeString(urlObj.searchParams.get('id') || '', 20);
            const id = YOUTUBE_ID_REGEX.test(rawId) ? rawId : 'kPtn26x8TZM';
            const seedTitle = sanitizeString(urlObj.searchParams.get('title') || 'Your Favorites', 80);

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

            const rData: any = await relRes.json();
            const playlist =
              rData.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
            const items = (playlist?.contents || []).slice(1, 13);

            const similarSongs: any[] = [];
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
          } catch (err: any) {
            console.error('Similar shelf error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ title: 'Similar Recommendations', results: [] }));
          }
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), youtubeStreamingPlugin()],
});

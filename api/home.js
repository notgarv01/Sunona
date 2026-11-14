function sanitizeString(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export default async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const rawSeed = sanitizeString(req.query?.seed || '', 20);
    const seed = YOUTUBE_ID_REGEX.test(rawSeed) ? rawSeed : '';
    const artist = sanitizeString(req.query?.artist || '', 100);
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

    res.end(JSON.stringify({ quickPicks, shelves: [] }));
  } catch (err) {
    res.end(JSON.stringify({ quickPicks: [], shelves: [] }));
  }
}

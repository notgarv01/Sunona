function sanitizeString(str, maxLen = 150) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\x00-\x1F\x7F]/g, '').trim().substring(0, maxLen);
}

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
    const query = sanitizeString(req.query?.q || '', 120);
    if (!query) {
      res.end(JSON.stringify({ suggestions: [], results: [] }));
      return;
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

    res.end(JSON.stringify({ suggestions, results: results.slice(0, 10) }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ suggestions: [], results: [] }));
  }
}

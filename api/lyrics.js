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
    const rawTrack = sanitizeString(req.query?.track || '', 120);
    const rawArtist = sanitizeString(req.query?.artist || '', 120);

    if (!rawTrack) {
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

    // Stage 1: LRCLIB Exact
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

    // Stage 2: LRCLIB Search
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
      res.end(
        JSON.stringify({
          ...resultData,
          matchedSource,
          found: true,
        })
      );
    } else {
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
    res.end(JSON.stringify({ syncedLyrics: null, plainLyrics: null, found: false }));
  }
}

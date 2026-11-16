export type ParsedVideoSource =
  | { kind: 'youtube'; embedUrl: string }
  | { kind: 'direct'; srcUrl: string }
  | { kind: 'invalid'; reason: string };

export function parseVideoUrl(rawUrl: string): ParsedVideoSource {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { kind: 'invalid', reason: 'File atau tautan video tidak boleh kosong.' };
  }

  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/')) {
    return { kind: 'direct', srcUrl: trimmed };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { kind: 'invalid', reason: 'Format tautan video tidak valid. Awali dengan https://.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { kind: 'invalid', reason: 'Tautan harus menggunakan protokol http atau https.' };
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

  // YouTube standard, short, embed, and youtu.be URLs
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    let videoId = parsed.searchParams.get('v') || '';
    if (!videoId && parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    }
    if (!videoId && parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    }
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        kind: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`
      };
    }
    return { kind: 'invalid', reason: 'ID video YouTube tidak ditemukan pada tautan.' };
  }

  if (host === 'youtu.be') {
    const videoId = parsed.pathname.replace('/', '').split('/')[0] || '';
    if (/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
      return {
        kind: 'youtube',
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`
      };
    }
    return { kind: 'invalid', reason: 'ID video youtu.be tidak valid.' };
  }

  return { kind: 'direct', srcUrl: parsed.toString() };
}

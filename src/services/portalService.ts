export interface VideoMateri {
  id: string;
  klasterId: number;
  title: string;
  videoUrl: string;
  description: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  sessionName: string;
  klasterId: number;
  teamAName: string;
  teamAScore: number;
  teamALevel: number;
  teamBName: string;
  teamBScore: number;
  teamBLevel: number;
  topScore: number;
  winner: string;
  playedAt: string;
}

export interface AdminQuestion {
  id: string;
  klasterId: number;
  text: string;
  options: [string, string];
  correct: 0 | 1;
  explanation: string;
  createdAt: string;
}

const VIDEOS_STORAGE_KEY = 'sipar_videos_v1';
const QUESTIONS_STORAGE_KEY = 'sipar_questions_v1';
const LEADERBOARD_STORAGE_KEY = 'sipar_leaderboard_v1';
const ADMIN_PASSCODE_KEY = 'sipar_admin_passcode_v1';

function readLocalList<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeLocalList<T>(key: string, items: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors
  }
}

export function getSavedAdminPasscode(): string {
  try {
    return window.sessionStorage.getItem(ADMIN_PASSCODE_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedAdminPasscode(passcode: string): void {
  try {
    if (passcode) {
      window.sessionStorage.setItem(ADMIN_PASSCODE_KEY, passcode);
    } else {
      window.sessionStorage.removeItem(ADMIN_PASSCODE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export async function verifyAdminPasscode(passcode: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSavedAdminPasscode(passcode);
        return { ok: true };
      }
      return { ok: false, error: data.error || 'Passcode tidak sesuai.' };
    }
  } catch {
    // Offline/static fallback verification
  }

  if (passcode === 'sipar2026') {
    setSavedAdminPasscode(passcode);
    return { ok: true };
  }
  return { ok: false, error: 'Passcode tidak sesuai.' };
}

export async function fetchVideos(): Promise<{ videos: VideoMateri[]; source: 'api' | 'local' }> {
  const localVideos = readLocalList<VideoMateri>(VIDEOS_STORAGE_KEY);
  try {
    const res = await fetch('/api/videos', { headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return { videos: localVideos, source: 'local' };
    }
    const payload = (await res.json()) as { videos?: VideoMateri[] };
    const apiVideos = Array.isArray(payload.videos) ? payload.videos : [];
    writeLocalList(VIDEOS_STORAGE_KEY, apiVideos);
    return { videos: apiVideos, source: 'api' };
  } catch {
    return { videos: localVideos, source: 'local' };
  }
}

const UPLOAD_CHUNK_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTS = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v']);

export async function uploadVideoFile(
  file: File,
  passcode: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const dotIdx = file.name.lastIndexOf('.');
  const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : '.mp4';
  if (!ALLOWED_UPLOAD_EXTS.has(ext)) {
    throw new Error('Format file harus berupa MP4, WebM, OGG, MOV, atau M4V.');
  }

  const maxBytes = 300 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxBytes) {
    throw new Error('Ukuran video harus antara 1 byte hingga 300 MB.');
  }

  const uploadId = `vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
  let uploadedUrl = '';

  for (let i = 0; i < totalChunks; i++) {
    const start = i * UPLOAD_CHUNK_BYTES;
    const end = Math.min(file.size, start + UPLOAD_CHUNK_BYTES);
    const chunkBlob = file.slice(start, end);

    const query = new URLSearchParams({
      uploadId,
      chunkIndex: String(i),
      totalChunks: String(totalChunks),
      ext
    });

    const res = await fetch(`/api/upload-video?${query.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-admin-passcode': passcode
      },
      body: chunkBlob
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Endpoint unggah server tidak tersedia di mode preview statis.');
    }

    const data = (await res.json()) as { ok?: boolean; videoUrl?: string; error?: string };
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Gagal mengunggah potongan file video.');
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }

    if (data.videoUrl) {
      uploadedUrl = data.videoUrl;
    }
  }

  if (!uploadedUrl) {
    throw new Error('Server tidak mengembalikan path file video.');
  }
  return uploadedUrl;
}

export async function saveVideoMateri(
  input: { id?: string; klasterId: number; title: string; videoUrl: string; description: string },
  passcode: string
): Promise<VideoMateri> {
  const localList = readLocalList<VideoMateri>(VIDEOS_STORAGE_KEY);
  let savedItem: VideoMateri | null = null;

  try {
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode
      },
      body: JSON.stringify(input)
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const payload = (await res.json()) as { video?: VideoMateri };
      if (payload.video) {
        savedItem = payload.video;
      }
    } else if (res.status === 401) {
      throw new Error('Passcode admin tidak valid.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Passcode')) {
      throw err;
    }
  }

  if (!savedItem) {
    savedItem = {
      id: input.id || `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      klasterId: input.klasterId,
      title: input.title.trim(),
      videoUrl: input.videoUrl.trim(),
      description: input.description.trim(),
      createdAt: new Date().toISOString()
    };
  }

  const nextList = localList.filter((item) => item.id !== savedItem!.id);
  nextList.unshift(savedItem);
  writeLocalList(VIDEOS_STORAGE_KEY, nextList);
  return savedItem;
}

export async function deleteVideoMateri(id: string, passcode: string): Promise<void> {
  try {
    const res = await fetch(`/api/videos?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode }
    });
    if (res.status === 401) {
      throw new Error('Passcode admin tidak valid.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Passcode')) {
      throw err;
    }
  }

  const localList = readLocalList<VideoMateri>(VIDEOS_STORAGE_KEY);
  writeLocalList(
    VIDEOS_STORAGE_KEY,
    localList.filter((item) => item.id !== id)
  );
}

export async function fetchLeaderboard(): Promise<{
  entries: LeaderboardEntry[];
  source: 'api' | 'local';
}> {
  const localEntries = readLocalList<LeaderboardEntry>(LEADERBOARD_STORAGE_KEY);
  try {
    const res = await fetch('/api/leaderboard', { headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return {
        entries: [...localEntries].sort((a, b) => b.topScore - a.topScore),
        source: 'local'
      };
    }
    const payload = (await res.json()) as { entries?: LeaderboardEntry[] };
    const apiEntries = Array.isArray(payload.entries) ? payload.entries : [];
    const byId = new Map<string, LeaderboardEntry>();
    for (const item of [...apiEntries, ...localEntries]) {
      byId.set(item.id, item);
    }
    const sorted = Array.from(byId.values()).sort((a, b) => b.topScore - a.topScore);
    return { entries: sorted, source: 'api' };
  } catch {
    return {
      entries: [...localEntries].sort((a, b) => b.topScore - a.topScore),
      source: 'local'
    };
  }
}

export async function submitMatchResult(
  payload: Omit<LeaderboardEntry, 'id' | 'topScore' | 'winner' | 'playedAt'>,
  serverBaseUrl = ''
): Promise<{ entry: LeaderboardEntry; syncedRemote: boolean }> {
  const cleanBase = serverBaseUrl.trim().replace(/\/+$/, '');
  const endpoint = cleanBase ? `${cleanBase}/api/leaderboard` : '/api/leaderboard';
  let entry: LeaderboardEntry | null = null;
  let syncedRemote = false;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as { entry?: LeaderboardEntry };
      if (data.entry) {
        entry = data.entry;
        syncedRemote = true;
      }
    }
  } catch {
    // Fallback to local storage record when offline
  }

  if (!entry) {
    const winner =
      payload.teamAScore > payload.teamBScore
        ? payload.teamAName
        : payload.teamBScore > payload.teamAScore
          ? payload.teamBName
          : 'Seri';

    entry = {
      ...payload,
      id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      topScore: Math.max(payload.teamAScore, payload.teamBScore),
      winner,
      playedAt: new Date().toISOString()
    };
  }

  const localList = readLocalList<LeaderboardEntry>(LEADERBOARD_STORAGE_KEY);
  localList.unshift(entry);
  writeLocalList(LEADERBOARD_STORAGE_KEY, localList);
  return { entry, syncedRemote };
}

export async function deleteLeaderboardEntry(id: string, passcode: string): Promise<void> {
  try {
    const res = await fetch(`/api/leaderboard?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode }
    });
    if (res.status === 401) {
      throw new Error('Passcode admin tidak valid.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Passcode')) {
      throw err;
    }
  }

  if (id === 'all') {
    writeLocalList(LEADERBOARD_STORAGE_KEY, []);
  } else {
    const localList = readLocalList<LeaderboardEntry>(LEADERBOARD_STORAGE_KEY);
    writeLocalList(
      LEADERBOARD_STORAGE_KEY,
      localList.filter((item) => item.id !== id)
    );
  }
}

export async function fetchQuestions(
  serverBaseUrl = '',
  klasterId?: number
): Promise<{ questions: AdminQuestion[]; source: 'api' | 'local' }> {
  const localQuestions = readLocalList<AdminQuestion>(QUESTIONS_STORAGE_KEY);
  const cleanBase = serverBaseUrl.trim().replace(/\/+$/, '');
  const qs = klasterId && klasterId >= 1 && klasterId <= 5 ? `?klaster=${klasterId}` : '';
  const endpoint = cleanBase ? `${cleanBase}/api/questions${qs}` : `/api/questions${qs}`;

  try {
    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      const filtered = klasterId
        ? localQuestions.filter((item) => item.klasterId === klasterId)
        : localQuestions;
      return { questions: filtered, source: 'local' };
    }
    const payload = (await res.json()) as { questions?: AdminQuestion[] };
    const apiQuestions = Array.isArray(payload.questions) ? payload.questions : [];
    if (!klasterId) {
      writeLocalList(QUESTIONS_STORAGE_KEY, apiQuestions);
    }
    return { questions: apiQuestions, source: 'api' };
  } catch {
    const filtered = klasterId
      ? localQuestions.filter((item) => item.klasterId === klasterId)
      : localQuestions;
    return { questions: filtered, source: 'local' };
  }
}

export async function saveQuestionItem(
  input: {
    id?: string;
    klasterId: number;
    text: string;
    options: [string, string];
    correct: 0 | 1;
    explanation: string;
  },
  passcode: string
): Promise<AdminQuestion> {
  const localList = readLocalList<AdminQuestion>(QUESTIONS_STORAGE_KEY);
  let savedItem: AdminQuestion | null = null;

  try {
    const res = await fetch('/api/questions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-passcode': passcode
      },
      body: JSON.stringify(input)
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const payload = (await res.json()) as { question?: AdminQuestion };
      if (payload.question) {
        savedItem = payload.question;
      }
    } else if (res.status === 401) {
      throw new Error('Passcode admin tidak valid.');
    } else if (res.status === 400 && contentType.includes('application/json')) {
      const errBody = (await res.json()) as { error?: string };
      throw new Error(errBody.error || 'Data soal tidak valid.');
    }
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Passcode') || err.message.includes('wajib'))) {
      throw err;
    }
  }

  if (!savedItem) {
    savedItem = {
      id: input.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      klasterId: input.klasterId,
      text: input.text.trim(),
      options: [input.options[0].trim(), input.options[1].trim()],
      correct: input.correct,
      explanation: input.explanation.trim(),
      createdAt: new Date().toISOString()
    };
  }

  const existingIdx = localList.findIndex((item) => item.id === savedItem!.id);
  const nextList = [...localList];
  if (existingIdx !== -1) {
    nextList[existingIdx] = savedItem;
  } else {
    nextList.push(savedItem);
  }
  writeLocalList(QUESTIONS_STORAGE_KEY, nextList);
  return savedItem;
}

export async function deleteQuestionItem(id: string, passcode: string): Promise<void> {
  try {
    const res = await fetch(`/api/questions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'x-admin-passcode': passcode }
    });
    if (res.status === 401) {
      throw new Error('Passcode admin tidak valid.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Passcode')) {
      throw err;
    }
  }

  if (id === 'all') {
    writeLocalList(QUESTIONS_STORAGE_KEY, []);
  } else {
    const localList = readLocalList<AdminQuestion>(QUESTIONS_STORAGE_KEY);
    writeLocalList(
      QUESTIONS_STORAGE_KEY,
      localList.filter((item) => item.id !== id)
    );
  }
}

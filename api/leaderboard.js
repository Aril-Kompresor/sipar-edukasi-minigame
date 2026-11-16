import { loadStore, persistStore } from './_store.js';

function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSCODE || 'sipar2026';
  const headerCode = req.headers?.['x-admin-passcode'];
  return String(headerCode || '') === expected;
}

export default function handler(req, res) {
  const leaderboardStore = loadStore('__siparLeaderboard', 'leaderboard.json');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const sorted = [...leaderboardStore].sort((a, b) => b.topScore - a.topScore);
    res.status(200).json({ total: sorted.length, entries: sorted });
    return;
  }

  if (req.method === 'POST') {
    const {
      sessionName,
      klasterId,
      teamAName,
      teamAScore,
      teamALevel,
      teamBName,
      teamBScore,
      teamBLevel
    } = req.body || {};

    const scoreA = Number(teamAScore) || 0;
    const scoreB = Number(teamBScore) || 0;
    const winner =
      scoreA > scoreB
        ? String(teamAName || 'Tim A')
        : scoreB > scoreA
          ? String(teamBName || 'Tim B')
          : 'Seri';

    const entry = {
      id: `lb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionName: String(sessionName || 'Sesi Sosialisasi').trim(),
      klasterId: Number.parseInt(String(klasterId || '1'), 10) || 1,
      teamAName: String(teamAName || 'Tim A').trim(),
      teamAScore: scoreA,
      teamALevel: Number(teamALevel) || 0,
      teamBName: String(teamBName || 'Tim B').trim(),
      teamBScore: scoreB,
      teamBLevel: Number(teamBLevel) || 0,
      topScore: Math.max(scoreA, scoreB),
      winner,
      playedAt: new Date().toISOString()
    };

    leaderboardStore.unshift(entry);
    persistStore(leaderboardStore, 'leaderboard.json');
    res.status(201).json({ entry });
    return;
  }

  if (req.method === 'DELETE') {
    if (!checkAdmin(req)) {
      res.status(401).json({ error: 'Akses admin tidak valid.' });
      return;
    }
    const { id } = req.query || {};
    if (id === 'all') {
      leaderboardStore.length = 0;
      persistStore(leaderboardStore, 'leaderboard.json');
      res.status(200).json({ ok: true });
      return;
    }
    const idx = leaderboardStore.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Entri tidak ditemukan.' });
      return;
    }
    leaderboardStore.splice(idx, 1);
    persistStore(leaderboardStore, 'leaderboard.json');
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

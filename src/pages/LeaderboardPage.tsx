import React, { useEffect, useState } from 'react';
import {
  getKlasterLabel,
  KLASTER_DATA,
  UMUM_KLASTER_ID
} from '../data/klasterData';
import { fetchLeaderboard, LeaderboardEntry } from '../services/portalService';

type LoadStatus = 'loading' | 'ready' | 'error';

export const LeaderboardPage: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [klasterFilter, setKlasterFilter] = useState<number>(0);

  const loadEntries = async () => {
    setStatus('loading');
    try {
      const res = await fetchLeaderboard();
      setEntries(res.entries);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const filtered = entries.filter(
    (entry) => klasterFilter === 0 || entry.klasterId === klasterFilter
  );

  return (
    <main className="page-section">
      <div className="container">
        <div className="page-head-row">
          <div>
            <h1 className="section-title">Leaderboard Minigame Hak Anak</h1>
            <p className="section-desc">
              Rekap skor pertandingan kuis dua tim dari sesi pembelajaran Forum Anak.
            </p>
          </div>
          <div className="page-head-actions">
            <label htmlFor="lb-klaster-filter" className="sr-only">
              Filter Klaster Leaderboard
            </label>
            <select
              id="lb-klaster-filter"
              className="klaster-select-input"
              value={klasterFilter}
              onChange={(e) => setKlasterFilter(Number.parseInt(e.target.value, 10))}
            >
              <option value={0}>Semua Klaster</option>
              {KLASTER_DATA.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.code}: {k.shortTitle}
                </option>
              ))}
              <option value={UMUM_KLASTER_ID}>Umum: Acak Klaster 1-5</option>
            </select>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void loadEntries()}
              disabled={status === 'loading'}
            >
              Muat Ulang
            </button>
          </div>
        </div>

        {status === 'loading' && (
          <div className="state-box state-loading" role="status" aria-live="polite">
            <p className="state-title">Memuat papan skor leaderboard...</p>
            <p className="state-desc">Mengambil data peringkat sesi minigame terbaru.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-box state-error" role="alert">
            <p className="state-title">Gagal memuat data leaderboard.</p>
            <p className="state-desc">Silakan muat ulang halaman untuk mengambil skor terbaru.</p>
            <div className="state-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void loadEntries()}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {status === 'ready' && filtered.length === 0 && (
          <div className="state-box state-empty" role="status">
            <p className="state-title">Belum ada skor pertandingan di leaderboard.</p>
            <p className="state-desc">
              Skor akan muncul di sini setelah admin menjalankan minigame di server lokal dan
              mengirim hasil pertandingan ke server.
            </p>
          </div>
        )}

        {status === 'ready' && filtered.length > 0 && (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Peringkat</th>
                  <th>Sesi / Pertandingan</th>
                  <th>Klaster</th>
                  <th>Tim A</th>
                  <th>Tim B</th>
                  <th>Pemenang</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => {
                  return (
                    <tr key={entry.id}>
                      <td className="rank-cell">#{idx + 1}</td>
                      <td>{entry.sessionName}</td>
                      <td>{getKlasterLabel(entry.klasterId)}</td>
                      <td>
                        <span className="team-a-color">{entry.teamAName}</span> ({entry.teamAScore}{' '}
                        poin, Lvl {entry.teamALevel})
                      </td>
                      <td>
                        <span className="team-b-color">{entry.teamBName}</span> ({entry.teamBScore}{' '}
                        poin, Lvl {entry.teamBLevel})
                      </td>
                      <td>
                        <strong>{entry.winner}</strong>
                      </td>
                      <td>{new Date(entry.playedAt).toLocaleDateString('id-ID')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};

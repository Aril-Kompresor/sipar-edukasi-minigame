import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KLASTER_DATA } from '../data/klasterData';
import {
  AdminQuestion,
  fetchQuestions,
  submitMatchResult
} from '../services/portalService';
import { soundEngine } from '../utils/soundEngine';
import { SoundStateIcon, TeamMascotIcon } from '../components/Icons';
import { HardwareModal } from '../components/HardwareModal';

const MAX_LEVEL = 4;
const LEVEL_PERCENTAGES = [0, 25, 50, 75, 100];
const LOCAL_BRIDGE_URL = 'http://localhost:3001';

type ChoiceLetter = 'A' | 'B';
type SessionState = 'locked' | 'playing' | 'finished';

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success';
}

export const LocalGamePage: React.FC = () => {
  // Admin Session Gate State
  const [sessionState, setSessionState] = useState<SessionState>('locked');
  const [sessionName, setSessionName] = useState<string>('Sesi Sosialisasi Forum Anak');
  const [teamAName, setTeamAName] = useState<string>('Tim A');
  const [teamBName, setTeamBName] = useState<string>('Tim B');
  const [klasterId, setKlasterId] = useState<number>(1);
  const [questionIdx, setQuestionIdx] = useState<number>(0);

  // Scores & Ladder Levels
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [levelA, setLevelA] = useState<number>(0);
  const [levelB, setLevelB] = useState<number>(0);

  // Dual-Team A/B Choices
  const [choiceA, setChoiceA] = useState<ChoiceLetter | null>(null);
  const [choiceB, setChoiceB] = useState<ChoiceLetter | null>(null);
  const [evaluated, setEvaluated] = useState<boolean>(false);

  // ESP32 Bridge & Web Serial State
  const [bridgeOnline, setBridgeOnline] = useState<boolean>(false);
  const [lanEndpoint, setLanEndpoint] = useState<string>('http://localhost:3001/api/local/esp32');
  const [serialConnected, setSerialConnected] = useState<boolean>(false);
  const [serialLabel, setSerialLabel] = useState<string>('Status: Belum Terhubung');
  const [hwModalOpen, setHwModalOpen] = useState<boolean>(false);
  const [hwLogs, setHwLogs] = useState<string[]>([
    '[Sistem] Menunggu Admin memulai sesi sebelum menerima trigger ESP32.'
  ]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundEngine.isEnabled());

  // Sync to Server Leaderboard & Remote Questions API
  const [serverUrl, setServerUrl] = useState<string>(
    import.meta.env.VITE_SERVER_API_URL || 'https://sipar.fragma.my.id'
  );
  const [remoteQuestions, setRemoteQuestions] = useState<AdminQuestion[]>([]);
  const [questionSource, setQuestionSource] = useState<'api' | 'local'>('local');
  const [syncingQuestions, setSyncingQuestions] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string>('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(0);

  const currentKlaster = KLASTER_DATA.find((k) => k.id === klasterId) || KLASTER_DATA[0];
  const remoteForKlaster = remoteQuestions.filter((q) => q.klasterId === klasterId);
  const activeQuestions =
    remoteForKlaster.length > 0 ? remoteForKlaster : currentKlaster.questions;
  const currentQuestion = activeQuestions[questionIdx % activeQuestions.length];
  const correctLetter: ChoiceLetter = currentQuestion.correct === 0 ? 'A' : 'B';

  const addToast = useCallback((message: string, type: 'info' | 'success' = 'info') => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 3000);
  }, []);

  const appendLog = useCallback((msg: string) => {
    const stamp = new Date().toLocaleTimeString('id-ID');
    setHwLogs((prev) => [...prev.slice(-29), `${stamp} ${msg}`]);
  }, []);

  const evaluateRound = useCallback(
    (finalA: ChoiceLetter | null, finalB: ChoiceLetter | null) => {
      if (evaluated) return;
      setEvaluated(true);

      const aCorrect = finalA !== null && finalA === correctLetter;
      const bCorrect = finalB !== null && finalB === correctLetter;

      if (finalA !== null) {
        if (aCorrect) {
          setScoreA((prev) => prev + 100);
          setLevelA((prev) => Math.min(MAX_LEVEL, prev + 1));
        } else {
          setScoreA((prev) => Math.max(0, prev - 50));
          setLevelA((prev) => Math.max(0, prev - 1));
        }
      }

      if (finalB !== null) {
        if (bCorrect) {
          setScoreB((prev) => prev + 100);
          setLevelB((prev) => Math.min(MAX_LEVEL, prev + 1));
        } else {
          setScoreB((prev) => Math.max(0, prev - 50));
          setLevelB((prev) => Math.max(0, prev - 1));
        }
      }

      if (aCorrect || bCorrect) {
        soundEngine.playCorrect();
        window.setTimeout(() => soundEngine.playClimbUp(), 180);
      } else {
        soundEngine.playWrong();
        window.setTimeout(() => soundEngine.playClimbDown(), 180);
      }
    },
    [correctLetter, evaluated]
  );

  const handleTeamChoice = useCallback(
    (team: 'A' | 'B', choice: ChoiceLetter, sourceLabel: string) => {
      if (sessionState !== 'playing') {
        appendLog(`[Terkunci] Input ${sourceLabel} Tim ${team}:${choice} ditolak (Admin belum mulai).`);
        addToast('Game belum dimulai oleh Admin.', 'info');
        return;
      }

      if (evaluated) return;

      if (team === 'A') {
        if (choiceA !== null) return;
        soundEngine.playBuzzer(true);
        setChoiceA(choice);
        appendLog(`[${sourceLabel}] ${teamAName} memilih ${choice}`);
        if (choiceB !== null) {
          evaluateRound(choice, choiceB);
        }
      } else {
        if (choiceB !== null) return;
        soundEngine.playBuzzer(false);
        setChoiceB(choice);
        appendLog(`[${sourceLabel}] ${teamBName} memilih ${choice}`);
        if (choiceA !== null) {
          evaluateRound(choiceA, choice);
        }
      }
    },
    [addToast, appendLog, choiceA, choiceB, evaluateRound, evaluated, sessionState, teamAName, teamBName]
  );

  // Connect to Local Node ESP32 Bridge via SSE
  useEffect(() => {
    let active = true;
    void fetch(`${LOCAL_BRIDGE_URL}/api/local/status`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; lanAddresses?: string[]; port?: number }) => {
        if (!active || !data.ok) return;
        setBridgeOnline(true);
        const ip = data.lanAddresses?.[0] || 'localhost';
        setLanEndpoint(`http://${ip}:${data.port || 3001}/api/local/esp32`);
      })
      .catch(() => {
        if (active) setBridgeOnline(false);
      });

    const evtSource = new EventSource(`${LOCAL_BRIDGE_URL}/api/local/events`);
    evtSource.addEventListener('connected', () => {
      setBridgeOnline(true);
    });
    evtSource.addEventListener('esp32_trigger', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as {
          team?: 'A' | 'B';
          choice?: ChoiceLetter;
        };
        if ((data.team === 'A' || data.team === 'B') && (data.choice === 'A' || data.choice === 'B')) {
          handleTeamChoice(data.team, data.choice, 'ESP32 WiFi');
        }
      } catch {
        // Ignore malformed event
      }
    });
    evtSource.onerror = () => {
      setBridgeOnline(false);
    };

    return () => {
      active = false;
      evtSource.close();
    };
  }, [handleTeamChoice]);

  const handleStartSession = () => {
    soundEngine.playClick();
    setScoreA(0);
    setScoreB(0);
    setLevelA(0);
    setLevelB(0);
    setQuestionIdx(0);
    setChoiceA(null);
    setChoiceB(null);
    setEvaluated(false);
    setSyncNotice('');
    setSessionState('playing');
    appendLog(`[Admin] Memulai sesi "${sessionName}" (${currentKlaster.code}).`);
    addToast('Sesi minigame dimulai. ESP32 siap menerima pilihan A dan B.', 'success');
  };

  const handleLockSession = () => {
    soundEngine.playClick();
    setSessionState('locked');
    setChoiceA(null);
    setChoiceB(null);
    setEvaluated(false);
    appendLog('[Admin] Sesi dikunci kembali.');
  };

  const handleNextQuestion = useCallback(() => {
    soundEngine.playClick();
    if (questionIdx < activeQuestions.length - 1) {
      setQuestionIdx((prev) => prev + 1);
      setChoiceA(null);
      setChoiceB(null);
      setEvaluated(false);
    } else {
      setSessionState('finished');
      appendLog('[Admin] Semua soal pada klaster ini selesai.');
      addToast('Sesi soal selesai. Kirim skor ke leaderboard server.', 'success');
    }
  }, [activeQuestions.length, addToast, appendLog, questionIdx]);

  const handleSyncQuestions = useCallback(
    async (silent = false) => {
      setSyncingQuestions(true);
      const res = await fetchQuestions(serverUrl);
      setRemoteQuestions(res.questions);
      setQuestionSource(res.source);
      setSyncingQuestions(false);
      if (!silent) {
        const countKlaster = res.questions.filter((q) => q.klasterId === klasterId).length;
        if (res.source === 'api') {
          addToast(
            `Sync berhasil: ${res.questions.length} total soal server (${countKlaster} soal di ${currentKlaster.code}).`,
            'success'
          );
          appendLog(`[API Soal] Berhasil tarik ${res.questions.length} soal dari ${serverUrl || 'origin lokal'}.`);
        } else {
          addToast('Server tidak terjangkau. Menggunakan cache atau soal bawaan lokal.', 'info');
          appendLog('[API Soal] Server offline, memakai data soal lokal.');
        }
      }
    },
    [addToast, appendLog, currentKlaster.code, klasterId, serverUrl]
  );

  useEffect(() => {
    void handleSyncQuestions(true);
    // Initial background question sync from Admin API on page load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Operator keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'q') handleTeamChoice('A', 'A', 'Keyboard');
      else if (key === 'w') handleTeamChoice('A', 'B', 'Keyboard');
      else if (key === 'o') handleTeamChoice('B', 'A', 'Keyboard');
      else if (key === 'p') handleTeamChoice('B', 'B', 'Keyboard');
      else if (e.code === 'Space' && sessionState === 'playing' && evaluated) {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [evaluated, handleNextQuestion, handleTeamChoice, sessionState]);

  const handleConnectSerial = async () => {
    const navSerial = navigator as Navigator & {
      serial?: {
        requestPort: () => Promise<{
          open: (opts: { baudRate: number }) => Promise<void>;
          readable: ReadableStream<Uint8Array> | null;
        }>;
      };
    };

    if (!navSerial.serial) {
      addToast('Browser ini tidak mendukung Web Serial API. Gunakan Chrome/Edge.', 'info');
      appendLog('[Info] Web Serial tidak didukung. Gunakan ESP32 WiFi HTTP atau keyboard.');
      return;
    }

    try {
      appendLog('[Serial] Meminta izin port COM ESP32...');
      const port = await navSerial.serial.requestPort();
      await port.open({ baudRate: 115200 });
      setSerialConnected(true);
      setSerialLabel('Status: Port ESP32 Terhubung (115200 bps)');
      addToast('ESP32 USB Serial terhubung.', 'success');

      if (port.readable) {
        const decoder = new TextDecoderStream();
        void port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>);
        const reader = decoder.readable.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            const line = value.trim().toUpperCase();
            appendLog(`[Serial Rx] ${line}`);
            if (line.includes('A:A') || line === 'TIMA_A') handleTeamChoice('A', 'A', 'USB Serial');
            else if (line.includes('A:B') || line === 'TIMA_B') handleTeamChoice('A', 'B', 'USB Serial');
            else if (line.includes('B:A') || line === 'TIMB_A') handleTeamChoice('B', 'A', 'USB Serial');
            else if (line.includes('B:B') || line === 'TIMB_B') handleTeamChoice('B', 'B', 'USB Serial');
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Koneksi dibatalkan';
      appendLog(`[Serial Error] ${msg}`);
      setSerialLabel('Status: Gagal atau Dibatalkan');
    }
  };

  const handleSyncToServer = async () => {
    setSyncing(true);
    setSyncNotice('');
    const result = await submitMatchResult(
      {
        sessionName,
        klasterId,
        teamAName,
        teamAScore: scoreA,
        teamALevel: levelA,
        teamBName,
        teamBScore: scoreB,
        teamBLevel: levelB
      },
      serverUrl
    );
    setSyncing(false);
    setSyncNotice(
      result.syncedRemote
        ? `Skor sesi "${result.entry.sessionName}" berhasil dikirim ke Server Leaderboard.`
        : 'Server tidak terjangkau; skor disimpan ke riwayat lokal perangkat ini.'
    );
  };

  const aResultStatus =
    evaluated && choiceA ? (choiceA === correctLetter ? 'BENAR' : 'SALAH') : null;
  const bResultStatus =
    evaluated && choiceB ? (choiceB === correctLetter ? 'BENAR' : 'SALAH') : null;

  return (
    <main className="game-main">
      <div className="container">
        <div className="game-page-header">
          <div>
            <h1 className="section-title">Minigame Server Lokal (ESP32)</h1>
            <p className="section-desc">
              Game hanya aktif setelah Admin memulai sesi. Kedua tim memilih A atau B lewat tombol
              ESP32, lalu sistem mengevaluasi benar atau salah secara langsung.
            </p>
          </div>

          <div className="game-header-controls">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSoundEnabled(soundEngine.toggle())}
            >
              <SoundStateIcon active={soundEnabled} size={16} />
              <span>{soundEnabled ? 'Audio Aktif' : 'Audio Mati'}</span>
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setHwModalOpen(true)}
            >
              <span
                className={`hw-dot ${bridgeOnline || serialConnected ? 'is-online' : ''}`}
                aria-hidden="true"
              />
              <span>
                {bridgeOnline
                  ? 'ESP32 Bridge: Aktif'
                  : serialConnected
                    ? 'ESP32 USB: Aktif'
                    : 'Pengaturan ESP32'}
              </span>
            </button>
          </div>
        </div>

        {/* Panel Kontrol Admin (Gate Awal) */}
        <section className="admin-gate-card" aria-label="Kontrol Admin Sesi Game">
          <div className="admin-gate-grid">
            <div>
              <label htmlFor="session-name-input" className="field-label">
                Nama Sesi
              </label>
              <input
                id="session-name-input"
                type="text"
                className="materi-search-input w-full"
                value={sessionName}
                disabled={sessionState === 'playing'}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="local-klaster-select" className="field-label">
                Klaster Soal
              </label>
              <select
                id="local-klaster-select"
                className="klaster-select-input w-full"
                value={klasterId}
                disabled={sessionState === 'playing'}
                onChange={(e) => setKlasterId(Number.parseInt(e.target.value, 10))}
              >
                {KLASTER_DATA.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code}: {k.shortTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="team-a-input" className="field-label">
                Nama Tim A
              </label>
              <input
                id="team-a-input"
                type="text"
                className="materi-search-input w-full"
                value={teamAName}
                disabled={sessionState === 'playing'}
                onChange={(e) => setTeamAName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="team-b-input" className="field-label">
                Nama Tim B
              </label>
              <input
                id="team-b-input"
                type="text"
                className="materi-search-input w-full"
                value={teamBName}
                disabled={sessionState === 'playing'}
                onChange={(e) => setTeamBName(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-sync-row">
            <div className="admin-sync-input-wrap">
              <label htmlFor="sync-api-url" className="field-label">
                URL Server Admin API (untuk tarik soal &amp; kirim skor lintas komputer)
              </label>
              <div className="materi-toolbar" style={{ marginBottom: 0 }}>
                <input
                  id="sync-api-url"
                  type="url"
                  className="materi-search-input"
                  placeholder="https://sipar.fragma.my.id"
                  value={serverUrl}
                  disabled={sessionState === 'playing'}
                  onChange={(e) => setServerUrl(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={sessionState === 'playing' || syncingQuestions}
                  onClick={() => void handleSyncQuestions(false)}
                >
                  {syncingQuestions ? 'Menarik Soal...' : 'Sync Soal dari Server'}
                </button>
              </div>
            </div>
            <span className="source-indicator">
              Sumber Soal ({currentKlaster.code}):{' '}
              {remoteForKlaster.length > 0
                ? `Dashboard Admin (${remoteForKlaster.length} soal${questionSource === 'local' ? ' cache' : ' API'})`
                : `Bawaan Lokal (${currentKlaster.questions.length} soal)`}
            </span>
          </div>

          <div className="admin-gate-footer">
            <span className="source-indicator">
              Status Sesi:{' '}
              {sessionState === 'locked'
                ? 'Terkunci (Menunggu Admin Memulai)'
                : sessionState === 'playing'
                  ? 'Sedang Berlangsung'
                  : 'Selesai'}
            </span>
            <div className="games-actions-bar">
              {sessionState !== 'playing' ? (
                <button type="button" className="btn btn-primary" onClick={handleStartSession}>
                  Mulai Sesi Game
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={handleLockSession}>
                  Akhiri &amp; Kunci Sesi
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Papan Arena Tangga + Soal Pilihan A & B */}
        <div className="games-container-card">
          {sessionState === 'locked' && (
            <div className="state-box state-empty" role="status">
              <p className="state-title">Arena Menunggu Admin Memulai Game</p>
              <p className="state-desc">
                Tekan tombol <strong>Mulai Sesi Game</strong> pada panel admin di atas agar soal
                muncul dan trigger ESP32 untuk pilihan A dan B dari Tim A serta Tim B aktif.
              </p>
              <p className="state-desc" style={{ marginTop: '0.5rem' }}>
                Endpoint WiFi ESP32: <code>{lanEndpoint}</code>
              </p>
            </div>
          )}

          {sessionState !== 'locked' && (
            <>
              <div className="games-board-scene">
                <div className="scene-label">
                  {currentKlaster.code}: {currentKlaster.stageTheme.name}
                </div>

                <div className="ladder-columns">
                  <div className="ladder-col col-a">
                    <div className="col-head">
                      <span className="team-name team-a-color">{teamAName}</span>
                      <span className="team-score">
                        {scoreA} Poin (Tingkat {levelA})
                      </span>
                    </div>
                    <div className="ladder-track-box">
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 4</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 3</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 2</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 1</span>
                      </div>
                      <div className="rung-line base-line">
                        <span className="rung-lvl">Mulai</span>
                      </div>
                      <div
                        className="mascot-badge mascot-a-style"
                        style={{ bottom: `${LEVEL_PERCENTAGES[levelA]}%` }}
                      >
                        <TeamMascotIcon team="A" size={20} />
                        <span className="mascot-title">{teamAName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="ladder-divider" aria-hidden="true">
                    <span className="vs-text">VS</span>
                  </div>

                  <div className="ladder-col col-b">
                    <div className="col-head">
                      <span className="team-name team-b-color">{teamBName}</span>
                      <span className="team-score">
                        {scoreB} Poin (Tingkat {levelB})
                      </span>
                    </div>
                    <div className="ladder-track-box">
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 4</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 3</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 2</span>
                      </div>
                      <div className="rung-line">
                        <span className="rung-lvl">Tingkat 1</span>
                      </div>
                      <div className="rung-line base-line">
                        <span className="rung-lvl">Mulai</span>
                      </div>
                      <div
                        className="mascot-badge mascot-b-style"
                        style={{ bottom: `${LEVEL_PERCENTAGES[levelB]}%` }}
                      >
                        <TeamMascotIcon team="B" size={20} />
                        <span className="mascot-title">{teamBName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {sessionState === 'playing' && (
                <>
                  <div className="question-panel-card">
                    <div className="q-meta-row">
                      <span className="q-count-text">
                        Soal {(questionIdx % activeQuestions.length) + 1} dari{' '}
                        {activeQuestions.length} ({currentKlaster.code})
                      </span>
                      <span className="q-status-text">
                        {evaluated
                          ? `Kunci Jawaban: Pilihan ${correctLetter}`
                          : 'Menunggu pilihan A atau B dari masing-masing tim...'}
                      </span>
                    </div>

                    <h2 className="q-question-text">{currentQuestion.text}</h2>

                    <div className="ab-options-display">
                      {currentQuestion.options.map((optText, idx) => {
                        const letter: ChoiceLetter = idx === 0 ? 'A' : 'B';
                        const isKey = evaluated && letter === correctLetter;
                        return (
                          <div
                            key={optText}
                            className={`ab-option-card ${isKey ? 'is-answer-key' : ''}`}
                          >
                            <span className="opt-badge">{letter}</span>
                            <span>{optText}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Status & Trigger Input Pilihan A / B per Tim (ESP32 / Keyboard / Klik) */}
                    <div className="dual-team-inputs">
                      <div className="team-trigger-box team-a-box">
                        <div className="team-trigger-head">
                          <span className="team-a-color">{teamAName}</span>
                          <span className="team-choice-status">
                            {choiceA
                              ? aResultStatus
                                ? `Pilih ${choiceA}: ${aResultStatus}`
                                : `Memilih ${choiceA} (Terkunci)`
                              : 'Belum memilih'}
                          </span>
                        </div>
                        <div className="team-ab-buttons">
                          <button
                            type="button"
                            className={`btn btn-outline btn-sm ${choiceA === 'A' ? 'is-picked-a' : ''}`}
                            disabled={choiceA !== null || evaluated}
                            onClick={() => handleTeamChoice('A', 'A', 'Klik')}
                          >
                            Pilih A <kbd>[Q]</kbd>
                          </button>
                          <button
                            type="button"
                            className={`btn btn-outline btn-sm ${choiceA === 'B' ? 'is-picked-a' : ''}`}
                            disabled={choiceA !== null || evaluated}
                            onClick={() => handleTeamChoice('A', 'B', 'Klik')}
                          >
                            Pilih B <kbd>[W]</kbd>
                          </button>
                        </div>
                      </div>

                      <div className="team-trigger-box team-b-box">
                        <div className="team-trigger-head">
                          <span className="team-b-color">{teamBName}</span>
                          <span className="team-choice-status">
                            {choiceB
                              ? bResultStatus
                                ? `Pilih ${choiceB}: ${bResultStatus}`
                                : `Memilih ${choiceB} (Terkunci)`
                              : 'Belum memilih'}
                          </span>
                        </div>
                        <div className="team-ab-buttons">
                          <button
                            type="button"
                            className={`btn btn-outline btn-sm ${choiceB === 'A' ? 'is-picked-b' : ''}`}
                            disabled={choiceB !== null || evaluated}
                            onClick={() => handleTeamChoice('B', 'A', 'Klik')}
                          >
                            Pilih A <kbd>[O]</kbd>
                          </button>
                          <button
                            type="button"
                            className={`btn btn-outline btn-sm ${choiceB === 'B' ? 'is-picked-b' : ''}`}
                            disabled={choiceB !== null || evaluated}
                            onClick={() => handleTeamChoice('B', 'B', 'Klik')}
                          >
                            Pilih B <kbd>[P]</kbd>
                          </button>
                        </div>
                      </div>
                    </div>

                    {!evaluated && (choiceA !== null || choiceB !== null) && (
                      <div className="evaluate-manual-row">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => evaluateRound(choiceA, choiceB)}
                        >
                          Evaluasi Jawaban Sekarang
                        </button>
                      </div>
                    )}

                    {evaluated && (
                      <div className="pqc-feedback-bar correct" role="status" aria-live="polite">
                        <div className="feedback-text">
                          <div className="feedback-title">
                            Hasil Soal: {teamAName} ({aResultStatus || 'Tidak Menjawab'}) |{' '}
                            {teamBName} ({bResultStatus || 'Tidak Menjawab'})
                          </div>
                          <div className="feedback-desc">{currentQuestion.explanation}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={handleNextQuestion}
                        >
                          {questionIdx >= activeQuestions.length - 1
                            ? 'Selesaikan Sesi'
                            : 'Soal Berikutnya'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="games-footer-notes">
                    <span>
                      Shortcut Operator: Tim A (<kbd>[Q]</kbd>=A, <kbd>[W]</kbd>=B), Tim B (
                      <kbd>[O]</kbd>=A, <kbd>[P]</kbd>=B), lanjut soal (<kbd>[Spasi]</kbd>).
                    </span>
                  </div>
                </>
              )}

              {sessionState === 'finished' && (
                <div className="session-summary-card" role="status">
                  <h2 className="reader-title">Sesi Selesai</h2>
                  <p className="reader-summary">
                    Skor akhir: <strong>{teamAName}</strong> ({scoreA} poin, Tingkat {levelA}) vs{' '}
                    <strong>{teamBName}</strong> ({scoreB} poin, Tingkat {levelB}).
                  </p>
                  <div className="sync-server-box">
                    <label htmlFor="remote-server-url" className="field-label">
                      URL Website Server Leaderboard (kosongkan jika satu origin / lokal)
                    </label>
                    <div className="materi-toolbar" style={{ marginBottom: '0.75rem' }}>
                      <input
                        id="remote-server-url"
                        type="url"
                        className="materi-search-input"
                        placeholder="https://sipar.fragma.my.id"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={syncing}
                        onClick={() => void handleSyncToServer()}
                      >
                        {syncing ? 'Mengirim...' : 'Kirim Skor ke Server Leaderboard'}
                      </button>
                    </div>
                    {syncNotice && <p className="state-desc">{syncNotice}</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <HardwareModal
        open={hwModalOpen}
        onClose={() => setHwModalOpen(false)}
        serialConnected={serialConnected}
        serialLabel={serialLabel}
        bridgeOnline={bridgeOnline}
        lanEndpoint={lanEndpoint}
        logs={hwLogs}
        onConnectSerial={() => void handleConnectSerial()}
        onTestTrigger={(team, choice) => handleTeamChoice(team, choice, 'Uji Virtual')}
      />

      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`} role="status">
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </main>
  );
};

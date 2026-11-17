import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AbQuizQuestion, KLASTER_DATA } from '../data/klasterData';
import {
  AdminQuestion,
  fetchQuestions,
  submitMatchResult
} from '../services/portalService';
import { soundEngine } from '../utils/soundEngine';
import { SoundStateIcon, TeamMascotIcon } from '../components/Icons';
import { HardwareModal } from '../components/HardwareModal';

const QUESTIONS_PER_SESSION = 10;
const DEFAULT_TIMER_SECONDS = 15;
const AUTO_NEXT_SECONDS = 3;
const TIMER_PRESETS = [10, 15, 20, 30];
const LOCAL_BRIDGE_URL = 'http://localhost:3001';

type ChoiceLetter = 'A' | 'B';
type SessionState = 'locked' | 'playing' | 'finished';

interface ToastItem {
  id: number;
  message: string;
  type: 'info' | 'success';
}

interface RoundOutcome {
  questionId: string;
  questionText: string;
  correctLetter: ChoiceLetter;
  choiceA: ChoiceLetter | null;
  choiceB: ChoiceLetter | null;
  pointsA: number;
  pointsB: number;
  timedOut: boolean;
}

function shuffleAndPickQuestions(
  primaryPool: AbQuizQuestion[],
  fallbackPool: AbQuizQuestion[],
  count: number
): AbQuizQuestion[] {
  const seenIds = new Set<string>();
  const combined: AbQuizQuestion[] = [];

  for (const q of primaryPool) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      combined.push(q);
    }
  }
  for (const q of fallbackPool) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      combined.push(q);
    }
  }

  const copy = [...combined];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function choiceToLabel(choice: ChoiceLetter | null, options: [string, string]): string {
  if (choice === 'A') return options[0] || 'Benar';
  if (choice === 'B') return options[1] || 'Salah';
  return 'Waktu Habis';
}

interface LocalGamePageProps {
  onPlayingChange?: (playing: boolean) => void;
}

export const LocalGamePage: React.FC<LocalGamePageProps> = ({ onPlayingChange }) => {
  // Lobby & Session State
  const [sessionState, setSessionState] = useState<SessionState>('locked');

  useEffect(() => {
    onPlayingChange?.(sessionState === 'playing');
    return () => {
      onPlayingChange?.(false);
    };
  }, [onPlayingChange, sessionState]);
  const [sessionName, setSessionName] = useState<string>('Sesi Sosialisasi Forum Anak');
  const [teamAName, setTeamAName] = useState<string>('Tim A');
  const [teamBName, setTeamBName] = useState<string>('Tim B');
  const [klasterId, setKlasterId] = useState<number>(1);
  const [timerDuration, setTimerDuration] = useState<number>(DEFAULT_TIMER_SECONDS);
  const [showAdvancedSync, setShowAdvancedSync] = useState<boolean>(false);

  // Randomized 10-question session deck & index
  const [sessionQuestions, setSessionQuestions] = useState<AbQuizQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_TIMER_SECONDS);
  const [timedOutRound, setTimedOutRound] = useState<boolean>(false);

  // Scores, Streaks, Correct Counts & Round History
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [streakA, setStreakA] = useState<number>(0);
  const [streakB, setStreakB] = useState<number>(0);
  const [correctCountA, setCorrectCountA] = useState<number>(0);
  const [correctCountB, setCorrectCountB] = useState<number>(0);
  const [history, setHistory] = useState<RoundOutcome[]>([]);

  // Dual-Team A/B (Benar/Salah) Choices
  const [choiceA, setChoiceA] = useState<ChoiceLetter | null>(null);
  const [choiceB, setChoiceB] = useState<ChoiceLetter | null>(null);
  const [evaluated, setEvaluated] = useState<boolean>(false);
  const [autoNextLeft, setAutoNextLeft] = useState<number>(AUTO_NEXT_SECONDS);

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
  const stageRef = useRef<HTMLDivElement | null>(null);

  const currentKlaster = KLASTER_DATA.find((k) => k.id === klasterId) || KLASTER_DATA[0];
  const remoteForKlaster = remoteQuestions.filter((q) => q.klasterId === klasterId);
  const activeQuestions =
    sessionQuestions.length > 0 ? sessionQuestions : currentKlaster.questions;
  const totalQuestions = activeQuestions.length || 1;
  const currentQuestion = activeQuestions[questionIdx % totalQuestions] || currentKlaster.questions[0];
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
    (finalA: ChoiceLetter | null, finalB: ChoiceLetter | null, byTimeout = false) => {
      if (evaluated) return;
      setEvaluated(true);
      setTimedOutRound(byTimeout);

      const aCorrect = finalA !== null && finalA === correctLetter;
      const bCorrect = finalB !== null && finalB === correctLetter;
      const pointsA = aCorrect ? 100 : 0;
      const pointsB = bCorrect ? 100 : 0;

      if (aCorrect) {
        setScoreA((prev) => prev + 100);
        setCorrectCountA((prev) => prev + 1);
        setStreakA((prev) => prev + 1);
      } else {
        setStreakA(0);
      }

      if (bCorrect) {
        setScoreB((prev) => prev + 100);
        setCorrectCountB((prev) => prev + 1);
        setStreakB((prev) => prev + 1);
      } else {
        setStreakB(0);
      }

      setHistory((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          questionText: currentQuestion.text,
          correctLetter,
          choiceA: finalA,
          choiceB: finalB,
          pointsA,
          pointsB,
          timedOut: byTimeout
        }
      ]);

      if (byTimeout) {
        appendLog(
          `[Timer Habis] Evaluasi otomatis: ${teamAName} (+${pointsA}), ${teamBName} (+${pointsB}).`
        );
      }

      if (aCorrect || bCorrect) {
        soundEngine.playCorrect();
        window.setTimeout(() => soundEngine.playClimbUp(), 180);
      } else {
        soundEngine.playWrong();
      }
    },
    [
      appendLog,
      correctLetter,
      currentQuestion.id,
      currentQuestion.text,
      evaluated,
      teamAName,
      teamBName
    ]
  );

  // Per-question countdown timer
  useEffect(() => {
    if (sessionState !== 'playing' || evaluated) return;

    if (timeLeft <= 0) {
      evaluateRound(choiceA, choiceB, true);
      return;
    }

    const timerId = window.setTimeout(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [choiceA, choiceB, evaluateRound, evaluated, sessionState, timeLeft]);

  const handleTeamChoice = useCallback(
    (team: 'A' | 'B', choice: ChoiceLetter, sourceLabel: string) => {
      if (sessionState !== 'playing') {
        appendLog(`[Terkunci] Input ${sourceLabel} Tim ${team}:${choice} ditolak (Admin belum mulai).`);
        addToast('Game belum dimulai oleh Admin.', 'info');
        return;
      }

      if (evaluated) return;

      const labelText = choice === 'A' ? 'Benar' : 'Salah';

      if (team === 'A') {
        if (choiceA !== null) return;
        soundEngine.playBuzzer(true);
        setChoiceA(choice);
        appendLog(`[${sourceLabel}] ${teamAName} menjawab ${labelText} (${choice})`);
        if (choiceB !== null) {
          evaluateRound(choice, choiceB, false);
        }
      } else {
        if (choiceB !== null) return;
        soundEngine.playBuzzer(false);
        setChoiceB(choice);
        appendLog(`[${sourceLabel}] ${teamBName} menjawab ${labelText} (${choice})`);
        if (choiceA !== null) {
          evaluateRound(choiceA, choice, false);
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
    const deck = shuffleAndPickQuestions(
      remoteForKlaster,
      currentKlaster.questions,
      QUESTIONS_PER_SESSION
    );
    setSessionQuestions(deck);
    setScoreA(0);
    setScoreB(0);
    setStreakA(0);
    setStreakB(0);
    setCorrectCountA(0);
    setCorrectCountB(0);
    setHistory([]);
    setQuestionIdx(0);
    setChoiceA(null);
    setChoiceB(null);
    setEvaluated(false);
    setTimedOutRound(false);
    setTimeLeft(timerDuration);
    setSyncNotice('');
    setSessionState('playing');
    appendLog(
      `[Admin] Memulai sesi "${sessionName}" (${currentKlaster.code}, ${deck.length} soal acak, ${timerDuration}d/soal).`
    );
    addToast(
      `Minigame dimulai: ${deck.length} soal acak (${timerDuration} detik/soal).`,
      'success'
    );
  };

  const handleLockSession = () => {
    soundEngine.playClick();
    setSessionState('locked');
    setChoiceA(null);
    setChoiceB(null);
    setEvaluated(false);
    setTimedOutRound(false);
    appendLog('[Admin] Sesi dikunci kembali ke lobi.');
  };

  const handleNextQuestion = useCallback(() => {
    soundEngine.playClick();
    setAutoNextLeft(AUTO_NEXT_SECONDS);
    if (questionIdx < activeQuestions.length - 1) {
      setQuestionIdx((prev) => prev + 1);
      setChoiceA(null);
      setChoiceB(null);
      setEvaluated(false);
      setTimedOutRound(false);
      setTimeLeft(timerDuration);
    } else {
      setSessionState('finished');
      appendLog('[Admin] Semua 10 soal acak selesai.');
      addToast('Permainan selesai! Cek podium pemenang.', 'success');
    }
  }, [activeQuestions.length, addToast, appendLog, questionIdx, timerDuration]);

  // Auto-advance to next question after evaluation
  useEffect(() => {
    if (sessionState !== 'playing' || !evaluated) {
      setAutoNextLeft(AUTO_NEXT_SECONDS);
      return;
    }

    if (autoNextLeft <= 0) {
      handleNextQuestion();
      return;
    }

    const nextTimer = window.setTimeout(() => {
      setAutoNextLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearTimeout(nextTimer);
  }, [autoNextLeft, evaluated, handleNextQuestion, sessionState]);

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
          addToast('Server tidak terjangkau. Menggunakan soal bawaan lokal.', 'info');
          appendLog('[API Soal] Server offline, memakai data soal lokal.');
        }
      }
    },
    [addToast, appendLog, currentKlaster.code, klasterId, serverUrl]
  );

  useEffect(() => {
    void handleSyncQuestions(true);
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
        teamALevel: correctCountA,
        teamBName,
        teamBScore: scoreB,
        teamBLevel: correctCountB
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

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement && stageRef.current) {
      void stageRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    }
  };

  const timerPercent = Math.max(0, Math.min(100, (timeLeft / timerDuration) * 100));
  const timerUrgency = timeLeft <= 3 ? 'is-danger' : timeLeft <= 5 ? 'is-warning' : '';

  const aCorrectRound = evaluated && choiceA === correctLetter;
  const bCorrectRound = evaluated && choiceB === correctLetter;

  const aRankLabel = scoreA > scoreB ? '1st' : scoreA < scoreB ? '2nd' : 'Seri';
  const bRankLabel = scoreB > scoreA ? '1st' : scoreB < scoreA ? '2nd' : 'Seri';

  const winnerSummary =
    scoreA > scoreB
      ? `${teamAName} Menang!`
      : scoreB > scoreA
        ? `${teamBName} Menang!`
        : 'Pertandingan Seri!';

  const renderTileState = (teamChoice: ChoiceLetter | null, letter: ChoiceLetter) => {
    if (!evaluated) {
      if (teamChoice === letter) return 'is-locked-pick';
      if (teamChoice !== null) return 'is-locked-other';
      return '';
    }
    if (letter === correctLetter) return 'is-correct-tile';
    if (teamChoice === letter && letter !== correctLetter) return 'is-wrong-tile';
    return 'is-dimmed-tile';
  };

  const isFullPagePlaying = sessionState === 'playing';

  return (
    <main className={isFullPagePlaying ? 'qz-fullpage-main' : 'game-main minigame-shell'}>
      <div className={isFullPagePlaying ? 'qz-fullpage-wrap' : 'container'}>
        {/* STATE 1: LOBI SETUP MINIGAME */}
        {sessionState === 'locked' && (
          <>
            <header className="mg-topbar">
              <div className="mg-topbar-left">
                <span className="mg-mode-pill">Arena Minigame Lokal</span>
              </div>
              <div className="mg-topbar-actions">
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setSoundEnabled(soundEngine.toggle())}
                >
                  <SoundStateIcon active={soundEnabled} size={16} />
                  <span>{soundEnabled ? 'Suara Nyala' : 'Suara Mati'}</span>
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
                      ? 'ESP32 WiFi Aktif'
                      : serialConnected
                        ? 'ESP32 USB Aktif'
                        : 'Koneksi ESP32'}
                  </span>
                </button>
              </div>
            </header>

            <section className="mg-lobby-card" aria-label="Lobi Pengaturan Minigame">
              <div className="mg-lobby-hero">
                <div>
                  <h1 className="mg-lobby-title">Lobi Minigame Dual-Team (Tim A vs Tim B)</h1>
                  <p className="mg-lobby-desc">
                    Pilih klaster, atur timer per soal, dan mulai pertandingan. Kedua sisi layar
                    akan aktif sebagai arena kuis interaktif dengan <strong>10 soal acak Benar/Salah</strong>.
                  </p>
                </div>
                <div className="mg-rule-chips" aria-label="Aturan permainan">
                  <span className="mg-rule-chip">10 Soal Acak</span>
                  <span className="mg-rule-chip">Benar = +100 Poin</span>
                  <span className="mg-rule-chip">Salah / Habis Waktu = 0</span>
                </div>
              </div>

              <div className="mg-lobby-klaster-grid" role="radiogroup" aria-label="Pilih Klaster">
                {KLASTER_DATA.map((k) => {
                  const isSelected = k.id === klasterId;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`mg-klaster-tile ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setKlasterId(k.id);
                      }}
                    >
                      <span className="mg-tile-code">{k.code}</span>
                      <span className="mg-tile-title">{k.shortTitle}</span>
                      <span className="mg-tile-theme">{k.stageTheme.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mg-lobby-form-grid">
                <div>
                  <label htmlFor="session-name-input" className="field-label">
                    Nama Sesi
                  </label>
                  <input
                    id="session-name-input"
                    type="text"
                    className="materi-search-input w-full"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="timer-duration-select" className="field-label">
                    Timer per Soal
                  </label>
                  <select
                    id="timer-duration-select"
                    className="klaster-select-input w-full"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(Number.parseInt(e.target.value, 10))}
                  >
                    {TIMER_PRESETS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec} Detik / Soal
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="team-a-input" className="field-label">
                    Nama Tim A (Kiri)
                  </label>
                  <input
                    id="team-a-input"
                    type="text"
                    className="materi-search-input w-full"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="team-b-input" className="field-label">
                    Nama Tim B (Kanan)
                  </label>
                  <input
                    id="team-b-input"
                    type="text"
                    className="materi-search-input w-full"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                  />
                </div>
              </div>

              <div className="mg-lobby-footer">
                <div className="mg-lobby-meta">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setShowAdvancedSync((prev) => !prev)}
                  >
                    {showAdvancedSync ? 'Tutup Sinkronisasi Server' : 'Sinkronisasi Soal Server'}
                  </button>
                  <span className="source-indicator">
                    Bank soal {currentKlaster.code}:{' '}
                    {remoteForKlaster.length > 0
                      ? `${remoteForKlaster.length} server (${questionSource}) + ${currentKlaster.questions.length} lokal`
                      : `${currentKlaster.questions.length} lokal`}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary mg-start-btn"
                  onClick={handleStartSession}
                >
                  Mulai Minigame (10 Soal Acak)
                </button>
              </div>

              {showAdvancedSync && (
                <div className="mg-sync-drawer">
                  <div className="admin-sync-input-wrap">
                    <label htmlFor="sync-api-url" className="field-label">
                      URL Server Admin API &amp; Endpoint ESP32 LAN: <code>{lanEndpoint}</code>
                    </label>
                    <div className="materi-toolbar" style={{ marginBottom: 0 }}>
                      <input
                        id="sync-api-url"
                        type="url"
                        className="materi-search-input"
                        placeholder="https://sipar.fragma.my.id"
                        value={serverUrl}
                        onChange={(e) => setServerUrl(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={syncingQuestions}
                        onClick={() => void handleSyncQuestions(false)}
                      >
                        {syncingQuestions ? 'Menarik Soal...' : 'Sync Soal dari Server'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* STATE 2: ARENA QUIZIZZ 2-SISI (TIM A KIRI VS TIM B KANAN) */}
        {sessionState === 'playing' && (
          <div ref={stageRef} className="qz-arcade-stage is-fullpage">
            {/* Top Game HUD */}
            <div className="qz-hud-bar">
              <div className="qz-hud-team-group">
                <span className="qz-hud-pill qz-rank-pill">{aRankLabel}</span>
                <span className="qz-hud-pill qz-streak-pill">Streak {streakA}</span>
                <span className="qz-hud-pill qz-score-pill-a">
                  {teamAName}: {scoreA}
                </span>
              </div>

              <div className="qz-hud-center">
                <span className="qz-klaster-chip">
                  {currentKlaster.code}: {currentKlaster.shortTitle}
                </span>
                <div className={`qz-timer-badge ${timerUrgency}`} role="timer" aria-live="off">
                  <span>{evaluated ? 'Selesai' : `${timeLeft}d`}</span>
                </div>
              </div>

              <div className="qz-hud-team-group qz-hud-right">
                <span className="qz-hud-pill qz-score-pill-b">
                  {teamBName}: {scoreB}
                </span>
                <span className="qz-hud-pill qz-streak-pill">Streak {streakB}</span>
                <span className="qz-hud-pill qz-rank-pill">{bRankLabel}</span>
                <button
                  type="button"
                  className="qz-icon-btn"
                  title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
                  aria-label="Toggle suara"
                  onClick={() => setSoundEnabled(soundEngine.toggle())}
                >
                  <SoundStateIcon active={soundEnabled} size={16} />
                </button>
                <button
                  type="button"
                  className="qz-icon-btn"
                  title="Koneksi ESP32"
                  aria-label="Pengaturan ESP32"
                  onClick={() => setHwModalOpen(true)}
                >
                  <span
                    className={`hw-dot ${bridgeOnline || serialConnected ? 'is-online' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="qz-icon-btn"
                  title="Layar Penuh"
                  aria-label="Mode layar penuh"
                  onClick={handleToggleFullscreen}
                >
                  [ ]
                </button>
                <button
                  type="button"
                  className="qz-exit-btn"
                  onClick={handleLockSession}
                >
                  Keluar
                </button>
              </div>
            </div>

            {/* Timer Progress Bar */}
            <div className="qz-timer-track" aria-hidden="true">
              <div
                className={`qz-timer-fill ${timerUrgency}`}
                style={{ width: `${evaluated ? 0 : timerPercent}%` }}
              />
            </div>

            {/* Center Question Box (like reference screenshot) */}
            <div className="qz-question-wrap">
              <div className="qz-q-counter-pill">
                {questionIdx + 1}/{totalQuestions}
              </div>
              <div className="qz-question-card">
                <h1 className="qz-question-text">{currentQuestion.text}</h1>
              </div>
            </div>

            {/* Split 2-Side Answer Tiles: Tim A (Left) vs Tim B (Right) */}
            <div className="qz-split-arena">
              {/* SISI TIM A */}
              <section className="qz-side-panel qz-side-a" aria-label={`Sisi ${teamAName}`}>
                <div className="qz-side-header">
                  <div className="qz-side-title">
                    <TeamMascotIcon team="A" size={22} />
                    <span>{teamAName}</span>
                  </div>
                  <span
                    className={`qz-side-status ${
                      evaluated
                        ? aCorrectRound
                          ? 'is-win'
                          : 'is-miss'
                        : choiceA
                          ? 'is-locked'
                          : ''
                    }`}
                  >
                    {!evaluated
                      ? choiceA
                        ? 'Terkunci'
                        : 'Pilih Jawaban'
                      : aCorrectRound
                        ? 'Benar +100'
                        : choiceA === null
                          ? 'Waktu Habis +0'
                          : 'Salah +0'}
                  </span>
                </div>

                <div className="qz-tiles-row">
                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-true ${renderTileState(choiceA, 'A')}`}
                    disabled={choiceA !== null || evaluated}
                    onClick={() => handleTeamChoice('A', 'A', 'Klik')}
                  >
                    <span className="qz-tile-key">[Q]</span>
                    <span className="qz-tile-label">Benar</span>
                    {evaluated && correctLetter === 'A' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {!evaluated && choiceA === 'A' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-false ${renderTileState(choiceA, 'B')}`}
                    disabled={choiceA !== null || evaluated}
                    onClick={() => handleTeamChoice('A', 'B', 'Klik')}
                  >
                    <span className="qz-tile-key">[W]</span>
                    <span className="qz-tile-label">Salah</span>
                    {evaluated && correctLetter === 'B' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {!evaluated && choiceA === 'B' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>
                </div>
              </section>

              {/* Center VS Divider */}
              <div className="qz-vs-divider" aria-hidden="true">
                <span className="qz-vs-circle">VS</span>
              </div>

              {/* SISI TIM B */}
              <section className="qz-side-panel qz-side-b" aria-label={`Sisi ${teamBName}`}>
                <div className="qz-side-header">
                  <div className="qz-side-title">
                    <TeamMascotIcon team="B" size={22} />
                    <span>{teamBName}</span>
                  </div>
                  <span
                    className={`qz-side-status ${
                      evaluated
                        ? bCorrectRound
                          ? 'is-win'
                          : 'is-miss'
                        : choiceB
                          ? 'is-locked'
                          : ''
                    }`}
                  >
                    {!evaluated
                      ? choiceB
                        ? 'Terkunci'
                        : 'Pilih Jawaban'
                      : bCorrectRound
                        ? 'Benar +100'
                        : choiceB === null
                          ? 'Waktu Habis +0'
                          : 'Salah +0'}
                  </span>
                </div>

                <div className="qz-tiles-row">
                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-true ${renderTileState(choiceB, 'A')}`}
                    disabled={choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('B', 'A', 'Klik')}
                  >
                    <span className="qz-tile-key">[O]</span>
                    <span className="qz-tile-label">Benar</span>
                    {evaluated && correctLetter === 'A' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {!evaluated && choiceB === 'A' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-false ${renderTileState(choiceB, 'B')}`}
                    disabled={choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('B', 'B', 'Klik')}
                  >
                    <span className="qz-tile-key">[P]</span>
                    <span className="qz-tile-label">Salah</span>
                    {evaluated && correctLetter === 'B' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {!evaluated && choiceB === 'B' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>
                </div>
              </section>
            </div>

            {/* Evaluation Feedback Banner or Waiting Note */}
            {!evaluated ? (
              <div className="qz-waiting-bar" role="status">
                <span>
                  {choiceA && !choiceB
                    ? `${teamAName} sudah mengunci jawaban. Menunggu ${teamBName}...`
                    : !choiceA && choiceB
                      ? `${teamBName} sudah mengunci jawaban. Menunggu ${teamAName}...`
                      : 'Tim A dan Tim B wajib menjawab Benar/Salah sebelum waktu habis.'}
                </span>
                {(choiceA !== null || choiceB !== null) && (
                  <button
                    type="button"
                    className="qz-force-eval-btn"
                    onClick={() => evaluateRound(choiceA, choiceB, true)}
                  >
                    Akhiri Timer &amp; Evaluasi
                  </button>
                )}
              </div>
            ) : (
              <div
                className={`qz-feedback-banner ${
                  aCorrectRound || bCorrectRound ? 'is-hit' : 'is-miss'
                }`}
                role="status"
                aria-live="polite"
              >
                <div className="qz-feedback-copy">
                  <div className="qz-feedback-headline">
                    {timedOutRound ? 'Waktu Habis! ' : ''}
                    Kunci: {correctLetter === 'A' ? 'Benar' : 'Salah'} — {teamAName} (
                    {choiceToLabel(choiceA, currentQuestion.options)}: {aCorrectRound ? '+100' : '0'})
                    {' | '}
                    {teamBName} ({choiceToLabel(choiceB, currentQuestion.options)}:{' '}
                    {bCorrectRound ? '+100' : '0'})
                  </div>
                  <div className="qz-feedback-exp">{currentQuestion.explanation}</div>
                </div>
                <button type="button" className="qz-next-btn" onClick={handleNextQuestion}>
                  {questionIdx >= activeQuestions.length - 1
                    ? `Lihat Podium (${autoNextLeft}d) →`
                    : `Lanjut Otomatis (${autoNextLeft}d) →`}
                </button>
              </div>
            )}

            {/* Bottom Player / Team Profile Strip (matching reference footer) */}
            <div className="qz-bottom-bar">
              <div className="qz-player-chip">
                <TeamMascotIcon team="A" size={20} />
                <div>
                  <div className="qz-player-name">{teamAName}</div>
                  <div className="qz-player-sub">
                    {correctCountA}/{totalQuestions} Benar
                  </div>
                </div>
              </div>

              <div className="qz-bottom-dots" aria-label="Progres 10 soal">
                {activeQuestions.map((q, idx) => {
                  const past = history[idx];
                  let cls = 'is-upcoming';
                  if (idx === questionIdx) cls = 'is-current';
                  else if (past) {
                    cls = past.pointsA > 0 || past.pointsB > 0 ? 'is-done-hit' : 'is-done-miss';
                  }
                  return <span key={q.id} className={`qz-dot ${cls}`} />;
                })}
              </div>

              <div className="qz-player-chip qz-player-right">
                <div>
                  <div className="qz-player-name">{teamBName}</div>
                  <div className="qz-player-sub">
                    {correctCountB}/{totalQuestions} Benar
                  </div>
                </div>
                <TeamMascotIcon team="B" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* STATE 3: PODIUM HASIL AKHIR */}
        {sessionState === 'finished' && (
          <section className="mg-podium-card" role="status" aria-label="Hasil Akhir Minigame">
            <div className="summary-winner-banner">
              <span className="summary-badge">
                {currentKlaster.code} • {totalQuestions} Soal Selesai
              </span>
              <h1 className="mg-podium-title">{winnerSummary}</h1>
              <p className="reader-summary">
                Pertandingan <strong>{sessionName}</strong> telah selesai.
              </p>
            </div>

            <div className="mg-podium-versus">
              <div className={`mg-podium-team team-a ${scoreA >= scoreB ? 'is-leading' : ''}`}>
                <div className="mg-podium-team-head">
                  <TeamMascotIcon team="A" size={24} />
                  <span>{teamAName}</span>
                </div>
                <div className="mg-podium-score">{scoreA} Poin</div>
                <div className="mg-podium-acc">
                  {correctCountA} dari {totalQuestions} soal benar
                </div>
              </div>

              <div className={`mg-podium-team team-b ${scoreB >= scoreA ? 'is-leading' : ''}`}>
                <div className="mg-podium-team-head">
                  <TeamMascotIcon team="B" size={24} />
                  <span>{teamBName}</span>
                </div>
                <div className="mg-podium-score">{scoreB} Poin</div>
                <div className="mg-podium-acc">
                  {correctCountB} dari {totalQuestions} soal benar
                </div>
              </div>
            </div>

            <div className="summary-actions-row">
              <button type="button" className="btn btn-primary" onClick={handleStartSession}>
                Main Lagi (Acak 10 Soal Baru)
              </button>
              <button type="button" className="btn btn-outline" onClick={handleLockSession}>
                Ubah Pengaturan di Lobi
              </button>
            </div>

            {history.length > 0 && (
              <details className="mg-history-details">
                <summary>Lihat Ringkasan {history.length} Soal</summary>
                <div className="mg-history-list">
                  {history.map((item, idx) => (
                    <div key={`${item.questionId}-${idx}`} className="mg-history-item">
                      <div className="mg-history-q">
                        <strong>#{idx + 1}</strong> {item.questionText}
                      </div>
                      <div className="mg-history-meta">
                        <span>Kunci: {item.correctLetter === 'A' ? 'Benar' : 'Salah'}</span>
                        <span>
                          {teamAName}: +{item.pointsA}
                        </span>
                        <span>
                          {teamBName}: +{item.pointsB}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div className="sync-server-box">
              <label htmlFor="remote-server-url" className="field-label">
                Kirim Skor ke Server Leaderboard (kosongkan jika satu origin / lokal)
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
                  className="btn btn-outline"
                  disabled={syncing}
                  onClick={() => void handleSyncToServer()}
                >
                  {syncing ? 'Mengirim...' : 'Kirim Skor ke Leaderboard'}
                </button>
              </div>
              {syncNotice && <p className="state-desc">{syncNotice}</p>}
            </div>
          </section>
        )}
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

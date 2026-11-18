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
    onPlayingChange?.(true);
    return () => {
      onPlayingChange?.(false);
    };
  }, [onPlayingChange]);
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
  const [bestStreakA, setBestStreakA] = useState<number>(0);
  const [bestStreakB, setBestStreakB] = useState<number>(0);
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
  const lastAdvanceAtRef = useRef<number>(0);

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

      if (finalA !== null) {
        if (aCorrect) {
          setScoreA((prev) => prev + 100);
          setCorrectCountA((prev) => prev + 1);
          setStreakA((prev) => {
            const next = prev + 1;
            setBestStreakA((best) => Math.max(best, next));
            return next;
          });
        } else {
          setStreakA(0);
        }
      } else if (byTimeout) {
        setStreakA(0);
      }

      if (finalB !== null) {
        if (bCorrect) {
          setScoreB((prev) => prev + 100);
          setCorrectCountB((prev) => prev + 1);
          setStreakB((prev) => {
            const next = prev + 1;
            setBestStreakB((best) => Math.max(best, next));
            return next;
          });
        } else {
          setStreakB(0);
        }
      } else if (byTimeout) {
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

      // Immediately advance to the next question with zero delay
      lastAdvanceAtRef.current = Date.now();
      if (questionIdx < activeQuestions.length - 1) {
        setQuestionIdx((prev) => prev + 1);
        setChoiceA(null);
        setChoiceB(null);
        setEvaluated(false);
        setTimedOutRound(false);
        setTimeLeft(timerDuration);
      } else {
        setChoiceA(null);
        setChoiceB(null);
        setEvaluated(false);
        setTimedOutRound(false);
        soundEngine.playVictoryCheer();
        setSessionState('finished');
        appendLog('[Admin] Semua 10 soal acak selesai.');
        addToast('Permainan selesai! Penonton bersorak di podium pemenang.', 'success');
      }
    },
    [
      activeQuestions.length,
      addToast,
      appendLog,
      correctLetter,
      currentQuestion.id,
      currentQuestion.text,
      evaluated,
      questionIdx,
      teamAName,
      teamBName,
      timerDuration
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

      if (Date.now() - lastAdvanceAtRef.current < 300) return;
      if (evaluated || choiceA !== null || choiceB !== null) return;

      const labelText = choice === 'A' ? 'Benar' : 'Salah';

      if (team === 'A') {
        soundEngine.playBuzzer(true);
        setChoiceA(choice);
        appendLog(`[${sourceLabel}] ${teamAName} tercepat menjawab ${labelText} (${choice})`);
        evaluateRound(choice, null, false);
      } else {
        soundEngine.playBuzzer(false);
        setChoiceB(choice);
        appendLog(`[${sourceLabel}] ${teamBName} tercepat menjawab ${labelText} (${choice})`);
        evaluateRound(null, choice, false);
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
    setBestStreakA(0);
    setBestStreakB(0);
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
    setAutoNextLeft(AUTO_NEXT_SECONDS);
    if (questionIdx < activeQuestions.length - 1) {
      soundEngine.playClick();
      setQuestionIdx((prev) => prev + 1);
      setChoiceA(null);
      setChoiceB(null);
      setEvaluated(false);
      setTimedOutRound(false);
      setTimeLeft(timerDuration);
    } else {
      soundEngine.playVictoryCheer();
      setSessionState('finished');
      appendLog('[Admin] Semua 10 soal acak selesai.');
      addToast('Permainan selesai! Penonton bersorak di podium pemenang.', 'success');
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

  const accuracyA = Math.round((correctCountA / totalQuestions) * 100);
  const accuracyB = Math.round((correctCountB / totalQuestions) * 100);

  return (
    <main className="qz-fullpage-main">
      <div className="qz-fullpage-wrap">
        {/* STATE 1: LOBI SETUP MINIGAME (ARCADE PRE-MATCH STAGE) */}
        {sessionState === 'locked' && (
          <section
            ref={stageRef}
            className="qz-arcade-stage is-fullpage qz-lobby-stage"
            aria-label="Lobi Pengaturan Minigame"
          >
            {/* Top Arcade HUD Bar */}
            <div className="qz-hud-bar">
              <div className="qz-hud-team-group">
                <span className="qz-hud-pill qz-rank-pill">LOBI ARENA</span>
                <span className="qz-hud-pill">10 Soal Acak</span>
                <span className="qz-hud-pill">Siapa Cepat Dia Jawab</span>
                <span className="qz-hud-pill">Benar +100 • Salah/Habis 0</span>
              </div>

              <div className="qz-hud-team-group qz-hud-right">
                <button
                  type="button"
                  className="qz-icon-btn"
                  onClick={() => setShowAdvancedSync((prev) => !prev)}
                >
                  {showAdvancedSync ? 'Tutup Server Soal' : 'Sync Soal Server'}
                </button>
                <button
                  type="button"
                  className="qz-icon-btn"
                  title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
                  aria-label="Toggle suara"
                  onClick={() => setSoundEnabled(soundEngine.toggle())}
                >
                  <SoundStateIcon active={soundEnabled} size={16} />
                  <span style={{ marginLeft: '0.35rem' }}>
                    {soundEnabled ? 'Suara Nyala' : 'Suara Mati'}
                  </span>
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
                  <span style={{ marginLeft: '0.35rem' }}>
                    {bridgeOnline
                      ? 'ESP32 WiFi Aktif'
                      : serialConnected
                        ? 'ESP32 USB Aktif'
                        : 'Koneksi ESP32'}
                  </span>
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
              </div>
            </div>

            {/* Center Pre-Game Banner & Session Settings (matches Question Card position) */}
            <div className="qz-question-wrap">
              <div className="qz-q-counter-pill">PERSIAPAN PERTANDINGAN • DUAL-TEAM</div>
              <div className="qz-question-card qz-lobby-hero-card">
                <h1 className="qz-question-text">
                  Arena Kuis Cepat Tepat Hak Anak — {teamAName} vs {teamBName}
                </h1>
                <p className="qz-lobby-sub">
                  Pilih klaster materi, sesuaikan nama tim &amp; waktu hitung mundur. Begitu dimulai,
                  layar otomatis penuh dan hanya <strong>1 tim tercepat</strong> yang dapat menjawab
                  tiap soal.
                </p>

                <div className="qz-lobby-config-bar">
                  <div className="qz-config-field">
                    <label htmlFor="session-name-input" className="qz-field-label">
                      Nama Sesi Pertandingan
                    </label>
                    <input
                      id="session-name-input"
                      type="text"
                      className="qz-arcade-input"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                    />
                  </div>

                  <div className="qz-config-field">
                    <span className="qz-field-label">Timer Hitung Mundur per Soal</span>
                    <div
                      className="qz-timer-pills"
                      role="radiogroup"
                      aria-label="Pilih durasi timer per soal"
                    >
                      {TIMER_PRESETS.map((sec) => {
                        const active = timerDuration === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            className={`qz-timer-pill-btn ${active ? 'is-active' : ''}`}
                            onClick={() => {
                              soundEngine.playClick();
                              setTimerDuration(sec);
                            }}
                          >
                            {sec} Detik
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Split 2-Side Team Setup (Tim A Left vs Tim B Right — seamless with Playing layout) */}
            <div className="qz-split-arena">
              {/* SISI TIM A */}
              <section className="qz-side-panel qz-side-a" aria-label="Pengaturan Kubu Tim A">
                <div className="qz-side-header">
                  <div className="qz-side-title">
                    <TeamMascotIcon team="A" size={22} />
                    <span>Kubu Kiri • {teamAName}</span>
                  </div>
                  <span className="qz-side-status is-locked">Siap di Sisi Kiri</span>
                </div>

                <div>
                  <label htmlFor="team-a-input" className="qz-field-label">
                    Nama Tim A (Sisi Kiri)
                  </label>
                  <input
                    id="team-a-input"
                    type="text"
                    className="qz-arcade-input"
                    value={teamAName}
                    onChange={(e) => setTeamAName(e.target.value)}
                  />
                </div>
              </section>

              {/* Center VS Divider */}
              <div className="qz-vs-divider" aria-hidden="true">
                <span className="qz-vs-circle">VS</span>
              </div>

              {/* SISI TIM B */}
              <section className="qz-side-panel qz-side-b" aria-label="Pengaturan Kubu Tim B">
                <div className="qz-side-header">
                  <div className="qz-side-title">
                    <TeamMascotIcon team="B" size={22} />
                    <span>Kubu Kanan • {teamBName}</span>
                  </div>
                  <span className="qz-side-status is-win">Siap di Sisi Kanan</span>
                </div>

                <div>
                  <label htmlFor="team-b-input" className="qz-field-label">
                    Nama Tim B (Sisi Kanan)
                  </label>
                  <input
                    id="team-b-input"
                    type="text"
                    className="qz-arcade-input"
                    value={teamBName}
                    onChange={(e) => setTeamBName(e.target.value)}
                  />
                </div>
              </section>
            </div>

            {/* 5 Klaster Selection Grid (Tactile 3D Arcade Cards) */}
            <div className="qz-klaster-section">
              <div className="qz-klaster-head">
                <span className="qz-field-label">Pilih Klaster Pertandingan (10 Soal Acak)</span>
                <span className="qz-bank-badge">
                  Bank Soal {currentKlaster.code}:{' '}
                  {remoteForKlaster.length > 0
                    ? `${remoteForKlaster.length} Server (${questionSource}) + ${currentKlaster.questions.length} Lokal`
                    : `${currentKlaster.questions.length} Soal Lokal Siap Diacak`}
                </span>
              </div>

              <div className="qz-klaster-grid" role="radiogroup" aria-label="Pilih Klaster">
                {KLASTER_DATA.map((k) => {
                  const isSelected = k.id === klasterId;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`qz-klaster-tile ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        soundEngine.playClick();
                        setKlasterId(k.id);
                      }}
                    >
                      <div className="qz-klaster-tile-top">
                        <span className="qz-klaster-code">{k.code}</span>
                        <span className="qz-klaster-count">{k.questions.length} Soal</span>
                      </div>
                      <span className="qz-klaster-title">{k.shortTitle}</span>
                      <span className="qz-klaster-theme">{k.stageTheme.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {showAdvancedSync && (
              <div className="qz-sync-drawer">
                <label htmlFor="sync-api-url" className="qz-field-label">
                  URL Server Admin API &amp; Endpoint ESP32 LAN: <code>{lanEndpoint}</code>
                </label>
                <div className="qz-sync-row">
                  <input
                    id="sync-api-url"
                    type="url"
                    className="qz-arcade-input"
                    placeholder="https://sipar.fragma.my.id"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    className="qz-arcade-btn qz-btn-secondary"
                    disabled={syncingQuestions}
                    onClick={() => void handleSyncQuestions(false)}
                  >
                    {syncingQuestions ? 'Menarik Soal...' : 'Tarik Soal dari Server'}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Launch Bar */}
            <div className="qz-bottom-bar qz-lobby-bottom">
              <div className="qz-lobby-ready-note">
                <span>
                  Target: <strong>{currentKlaster.code} ({currentKlaster.shortTitle})</strong> •{' '}
                  <strong>{timerDuration} Detik/Soal</strong> • Auto-Next Langsung
                </span>
              </div>

              <button
                type="button"
                className="qz-arcade-btn qz-btn-launch"
                onClick={handleStartSession}
              >
                Mulai Pertandingan (10 Soal Acak) →
              </button>
            </div>
          </section>
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
                        ? choiceA !== null
                          ? aCorrectRound
                            ? 'is-win'
                            : 'is-miss'
                          : ''
                        : ''
                    }`}
                  >
                    {!evaluated
                      ? 'Siap Menjawab'
                      : choiceA !== null
                        ? aCorrectRound
                          ? 'Tercepat • Benar +100'
                          : 'Tercepat • Salah +0'
                        : timedOutRound
                          ? 'Waktu Habis +0'
                          : 'Kalah Cepat'}
                  </span>
                </div>

                <div className="qz-tiles-row">
                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-true ${renderTileState(choiceA, 'A')}`}
                    disabled={choiceA !== null || choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('A', 'A', 'Klik')}
                  >
                    <span className="qz-tile-key">[Q]</span>
                    <span className="qz-tile-label">Benar</span>
                    {evaluated && correctLetter === 'A' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {evaluated && choiceA === 'A' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-false ${renderTileState(choiceA, 'B')}`}
                    disabled={choiceA !== null || choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('A', 'B', 'Klik')}
                  >
                    <span className="qz-tile-key">[W]</span>
                    <span className="qz-tile-label">Salah</span>
                    {evaluated && correctLetter === 'B' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {evaluated && choiceA === 'B' && (
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
                        ? choiceB !== null
                          ? bCorrectRound
                            ? 'is-win'
                            : 'is-miss'
                          : ''
                        : ''
                    }`}
                  >
                    {!evaluated
                      ? 'Siap Menjawab'
                      : choiceB !== null
                        ? bCorrectRound
                          ? 'Tercepat • Benar +100'
                          : 'Tercepat • Salah +0'
                        : timedOutRound
                          ? 'Waktu Habis +0'
                          : 'Kalah Cepat'}
                  </span>
                </div>

                <div className="qz-tiles-row">
                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-true ${renderTileState(choiceB, 'A')}`}
                    disabled={choiceA !== null || choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('B', 'A', 'Klik')}
                  >
                    <span className="qz-tile-key">[O]</span>
                    <span className="qz-tile-label">Benar</span>
                    {evaluated && correctLetter === 'A' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {evaluated && choiceB === 'A' && (
                      <span className="qz-tile-badge">Dipilih</span>
                    )}
                  </button>

                  <button
                    type="button"
                    className={`qz-answer-tile qz-tile-false ${renderTileState(choiceB, 'B')}`}
                    disabled={choiceA !== null || choiceB !== null || evaluated}
                    onClick={() => handleTeamChoice('B', 'B', 'Klik')}
                  >
                    <span className="qz-tile-key">[P]</span>
                    <span className="qz-tile-label">Salah</span>
                    {evaluated && correctLetter === 'B' && (
                      <span className="qz-tile-badge">Kunci</span>
                    )}
                    {evaluated && choiceB === 'B' && (
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
                  Siapa cepat dia yang menjawab! Hanya 1 tim tercepat yang dapat menjawab soal ini
                  sebelum waktu habis.
                </span>
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
                    {timedOutRound
                      ? `Waktu Habis! Kunci: ${correctLetter === 'A' ? 'Benar' : 'Salah'} — Tidak ada tim yang menjawab (0 Poin)`
                      : choiceA !== null
                        ? `Kunci: ${correctLetter === 'A' ? 'Benar' : 'Salah'} — ${teamAName} tercepat (${choiceToLabel(choiceA, currentQuestion.options)}: ${aCorrectRound ? '+100 Poin' : '0 Poin'})`
                        : `Kunci: ${correctLetter === 'A' ? 'Benar' : 'Salah'} — ${teamBName} tercepat (${choiceToLabel(choiceB, currentQuestion.options)}: ${bCorrectRound ? '+100 Poin' : '0 Poin'})`}
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

        {/* STATE 3: PODIUM HASIL AKHIR (3D STEPPED PODIUM + PENONTON BERSORAK) */}
        {sessionState === 'finished' && (
          <section
            ref={stageRef}
            className="qz-arcade-stage is-fullpage qz-podium-stage"
            role="status"
            aria-label="Hasil Akhir Minigame"
          >
            {/* Top Game HUD */}
            <div className="qz-hud-bar">
              <div className="qz-hud-team-group">
                <span className="qz-hud-pill qz-rank-pill">{aRankLabel}</span>
                <span className="qz-hud-pill qz-score-pill-a">
                  {teamAName}: {scoreA}
                </span>
              </div>

              <div className="qz-hud-center">
                <span className="qz-klaster-chip">
                  {currentKlaster.code}: {currentKlaster.shortTitle}
                </span>
                <button
                  type="button"
                  className="qz-cheer-trigger-btn"
                  onClick={() => soundEngine.playVictoryCheer()}
                >
                  Bunyikan Sorak Penonton
                </button>
              </div>

              <div className="qz-hud-team-group qz-hud-right">
                <span className="qz-hud-pill qz-score-pill-b">
                  {teamBName}: {scoreB}
                </span>
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
                  Ke Lobi
                </button>
              </div>
            </div>

            {/* Center Victory Banner */}
            <div className="qz-question-wrap">
              <div className="qz-q-counter-pill qz-podium-crown-pill">
                {scoreA === scoreB ? 'PODIUM AKHIR • SERI' : 'PODIUM JUARA PERTANDINGAN'}
              </div>
              <div className="qz-question-card qz-podium-hero-card">
                <h1 className="qz-podium-winner-title">{winnerSummary}</h1>
                <p className="qz-lobby-sub">
                  Sesi <strong>{sessionName}</strong> ({currentKlaster.code}:{' '}
                  {currentKlaster.shortTitle}) selesai dengan skor akhir{' '}
                  <strong>
                    {scoreA} vs {scoreB}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {/* 3D Stepped Championship Podium Stage + Cheering Crowd Stadium */}
            <div className="qz-stadium-podium-wrap">
              {/* Spotlight Beams Behind Podium */}
              <div className="qz-spotlight-beams" aria-hidden="true">
                <span className="qz-beam qz-beam-left" />
                <span className="qz-beam qz-beam-center" />
                <span className="qz-beam qz-beam-right" />
              </div>

              {/* Two Stepped Podium Pillars (Tim A Left vs Tim B Right) */}
              <div className="qz-stepped-podium-grid">
                {/* PODIUM COLUMN TIM A (KIRI) */}
                <div
                  className={`qz-podium-column is-team-a ${
                    scoreA > scoreB ? 'is-first-place' : scoreA === scoreB ? 'is-tied-first' : 'is-second-place'
                  }`}
                >
                  {/* Champion Character & Trophy Standing ON TOP of the Pillar */}
                  <div className="qz-podium-stage-top">
                    {scoreA >= scoreB && (
                      <div className="qz-trophy-crown-float" aria-hidden="true">
                        <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
                          <path
                            d="M14 10H34V19C34 24.5228 29.5228 29 24 29C18.4772 29 14 24.5228 14 19V10Z"
                            fill="#FACC15"
                            stroke="#FEF08A"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M14 13H8V17C8 20.3137 10.6863 23 14 23M34 13H40V17C40 20.3137 37.3137 23 34 23"
                            stroke="#FACC15"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <path d="M24 29V36M17 36H31" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="24" cy="18" r="3.5" fill="#92400E" />
                        </svg>
                      </div>
                    )}

                    <div className="qz-podium-avatar-badge team-a-avatar">
                      <TeamMascotIcon team="A" size={34} />
                    </div>

                    <div className="qz-podium-team-banner">
                      <span className="qz-podium-team-name">{teamAName}</span>
                      <span className="qz-podium-team-pts">{scoreA} Poin</span>
                    </div>
                  </div>

                  {/* Physical 3D Podium Block */}
                  <div className="qz-podium-pedestal">
                    <div className="qz-pedestal-ledge" />
                    <div className="qz-pedestal-body">
                      <div className="qz-pedestal-rank-seal">
                        <span className="qz-seal-num">{scoreA >= scoreB ? '1' : '2'}</span>
                        <span className="qz-seal-label">
                          {scoreA > scoreB ? 'JUARA 1' : scoreA === scoreB ? 'JUARA BERSAMA' : 'RUNNER-UP'}
                        </span>
                      </div>

                      <div className="qz-podium-stats-grid">
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">
                            {correctCountA}/{totalQuestions}
                          </span>
                          <span className="qz-stat-lbl">Benar</span>
                        </div>
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">{accuracyA}%</span>
                          <span className="qz-stat-lbl">Akurasi</span>
                        </div>
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">{bestStreakA}x</span>
                          <span className="qz-stat-lbl">Streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PODIUM COLUMN TIM B (KANAN) */}
                <div
                  className={`qz-podium-column is-team-b ${
                    scoreB > scoreA ? 'is-first-place' : scoreA === scoreB ? 'is-tied-first' : 'is-second-place'
                  }`}
                >
                  {/* Champion Character & Trophy Standing ON TOP of the Pillar */}
                  <div className="qz-podium-stage-top">
                    {scoreB >= scoreA && (
                      <div className="qz-trophy-crown-float" aria-hidden="true">
                        <svg width="46" height="46" viewBox="0 0 48 48" fill="none">
                          <path
                            d="M14 10H34V19C34 24.5228 29.5228 29 24 29C18.4772 29 14 24.5228 14 19V10Z"
                            fill="#FACC15"
                            stroke="#FEF08A"
                            strokeWidth="2.5"
                          />
                          <path
                            d="M14 13H8V17C8 20.3137 10.6863 23 14 23M34 13H40V17C40 20.3137 37.3137 23 34 23"
                            stroke="#FACC15"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                          <path d="M24 29V36M17 36H31" stroke="#FACC15" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="24" cy="18" r="3.5" fill="#92400E" />
                        </svg>
                      </div>
                    )}

                    <div className="qz-podium-avatar-badge team-b-avatar">
                      <TeamMascotIcon team="B" size={34} />
                    </div>

                    <div className="qz-podium-team-banner">
                      <span className="qz-podium-team-name">{teamBName}</span>
                      <span className="qz-podium-team-pts">{scoreB} Poin</span>
                    </div>
                  </div>

                  {/* Physical 3D Podium Block */}
                  <div className="qz-podium-pedestal">
                    <div className="qz-pedestal-ledge" />
                    <div className="qz-pedestal-body">
                      <div className="qz-pedestal-rank-seal">
                        <span className="qz-seal-num">{scoreB >= scoreA ? '1' : '2'}</span>
                        <span className="qz-seal-label">
                          {scoreB > scoreA ? 'JUARA 1' : scoreA === scoreB ? 'JUARA BERSAMA' : 'RUNNER-UP'}
                        </span>
                      </div>

                      <div className="qz-podium-stats-grid">
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">
                            {correctCountB}/{totalQuestions}
                          </span>
                          <span className="qz-stat-lbl">Benar</span>
                        </div>
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">{accuracyB}%</span>
                          <span className="qz-stat-lbl">Akurasi</span>
                        </div>
                        <div className="qz-stat-box">
                          <span className="qz-stat-val">{bestStreakB}x</span>
                          <span className="qz-stat-lbl">Streak</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Animated Cheering Audience / Crowd Pit in Front of the Podium */}
              <div className="qz-cheering-crowd-pit" aria-label="Penonton bersorak merayakan">
                {/* Floating Cheer Speech Bubbles from the Crowd */}
                <div className="qz-crowd-chants" aria-hidden="true">
                  <span className="qz-chant-bubble is-blue">
                    {scoreA >= scoreB ? `HIDUP ${teamAName.toUpperCase()}!` : `SEMANGAT ${teamAName.toUpperCase()}!`}
                  </span>
                  <span className="qz-chant-bubble is-gold">HOREEE! LUAR BIASA!</span>
                  <span className="qz-chant-bubble is-emerald">CEPAT TEPAT +100!</span>
                  <span className="qz-chant-bubble is-gold">GGWP PERTANDINGAN SERU!</span>
                  <span className="qz-chant-bubble is-orange">
                    {scoreB >= scoreA ? `JUARA ${teamBName.toUpperCase()}!` : `MANTAP ${teamBName.toUpperCase()}!`}
                  </span>
                </div>

                {/* Animated Crowd Silhouettes & Waving Spectators */}
                <div className="qz-crowd-spectators" aria-hidden="true">
                  {[
                    { id: 1, tone: 'fan-a', delay: '0s' },
                    { id: 2, tone: 'fan-gold', delay: '0.15s' },
                    { id: 3, tone: 'fan-a', delay: '0.3s' },
                    { id: 4, tone: 'fan-b', delay: '0.08s' },
                    { id: 5, tone: 'fan-gold', delay: '0.24s' },
                    { id: 6, tone: 'fan-a', delay: '0.12s' },
                    { id: 7, tone: 'fan-gold', delay: '0.28s' },
                    { id: 8, tone: 'fan-b', delay: '0.05s' },
                    { id: 9, tone: 'fan-gold', delay: '0.2s' },
                    { id: 10, tone: 'fan-a', delay: '0.34s' },
                    { id: 11, tone: 'fan-b', delay: '0.14s' },
                    { id: 12, tone: 'fan-gold', delay: '0.26s' },
                    { id: 13, tone: 'fan-b', delay: '0.09s' },
                    { id: 14, tone: 'fan-b', delay: '0.22s' }
                  ].map((fan) => (
                    <div
                      key={fan.id}
                      className={`qz-spectator ${fan.tone}`}
                      style={{ animationDelay: fan.delay }}
                    >
                      <svg viewBox="0 0 44 54" width="40" height="48" fill="none">
                        {/* Raised Cheering Left & Right Arms */}
                        <path
                          d="M12 28L4 12M32 28L40 12"
                          stroke="currentColor"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                        />
                        {/* Glowing Cheer Stick in Hand */}
                        <circle cx="4" cy="10" r="3" fill="#FACC15" />
                        <circle cx="40" cy="10" r="3" fill="#FACC15" />
                        {/* Head */}
                        <circle cx="22" cy="18" r="7.5" fill="currentColor" />
                        {/* Happy Cheering Mouth */}
                        <path
                          d="M19 19.5C19 21.2 25 21.2 25 19.5"
                          stroke="#120720"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                        {/* Shoulders / Torso */}
                        <path
                          d="M11 48C11 35 15 27 22 27C29 27 33 35 33 48"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 10-Round Timeline & Expandable Question Review */}
            {history.length > 0 && (
              <div className="qz-podium-review-card">
                <div className="qz-round-strip" aria-label="Rekap pemenang tiap nomor soal">
                  {history.map((item, idx) => {
                    const wonA = item.pointsA > 0;
                    const wonB = item.pointsB > 0;
                    const chipClass = wonA
                      ? 'is-team-a'
                      : wonB
                        ? 'is-team-b'
                        : 'is-no-point';
                    const winnerTag = wonA
                      ? teamAName
                      : wonB
                        ? teamBName
                        : item.timedOut
                          ? 'Habis'
                          : 'Salah';
                    return (
                      <div
                        key={`${item.questionId}-${idx}`}
                        className={`qz-round-chip ${chipClass}`}
                      >
                        <span className="qz-round-num">#{idx + 1}</span>
                        <span className="qz-round-tag">{winnerTag}</span>
                      </div>
                    );
                  })}
                </div>

                <details className="qz-history-details">
                  <summary>Lihat Rincian &amp; Kunci Jawaban {history.length} Soal</summary>
                  <div className="qz-history-list">
                    {history.map((item, idx) => (
                      <div key={`${item.questionId}-detail-${idx}`} className="qz-history-item">
                        <div className="qz-history-q">
                          <strong>#{idx + 1}</strong> {item.questionText}
                        </div>
                        <div className="qz-history-meta">
                          <span className="qz-meta-key">
                            Kunci: {item.correctLetter === 'A' ? 'Benar' : 'Salah'}
                          </span>
                          <span className={item.pointsA > 0 ? 'qz-meta-hit-a' : ''}>
                            {teamAName}: +{item.pointsA}
                          </span>
                          <span className={item.pointsB > 0 ? 'qz-meta-hit-b' : ''}>
                            {teamBName}: +{item.pointsB}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Bottom Podium Actions & Leaderboard Server Sync */}
            <div className="qz-podium-footer-grid">
              <div className="qz-sync-leaderboard-card">
                <label htmlFor="remote-server-url" className="qz-field-label">
                  Simpan &amp; Kirim Skor ke Server Leaderboard
                </label>
                <div className="qz-sync-row">
                  <input
                    id="remote-server-url"
                    type="url"
                    className="qz-arcade-input"
                    placeholder="https://sipar.fragma.my.id"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    className="qz-arcade-btn qz-btn-secondary"
                    disabled={syncing}
                    onClick={() => void handleSyncToServer()}
                  >
                    {syncing ? 'Mengirim...' : 'Kirim ke Leaderboard'}
                  </button>
                </div>
                {syncNotice && <p className="qz-sync-notice">{syncNotice}</p>}
              </div>

              <div className="qz-podium-cta-group">
                <button
                  type="button"
                  className="qz-arcade-btn qz-btn-outline"
                  onClick={handleLockSession}
                >
                  Ubah Pengaturan di Lobi
                </button>
                <button
                  type="button"
                  className="qz-arcade-btn qz-btn-launch"
                  onClick={handleStartSession}
                >
                  Main Lagi (10 Soal Acak Baru) →
                </button>
              </div>
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

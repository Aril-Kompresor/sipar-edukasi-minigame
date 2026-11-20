import React, { useEffect, useRef, useState } from 'react';
import { getKlasterLabel, KLASTER_DATA } from '../data/klasterData';
import {
  AdminQuestion,
  deleteLeaderboardEntry,
  deleteQuestionItem,
  deleteVideoMateri,
  fetchLeaderboard,
  fetchQuestions,
  fetchVideos,
  getSavedAdminPasscode,
  LeaderboardEntry,
  saveQuestionItem,
  saveVideoMateri,
  setSavedAdminPasscode,
  uploadVideoFile,
  verifyAdminPasscode,
  VideoMateri
} from '../services/portalService';

type AdminTab = 'videos' | 'questions' | 'leaderboard';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

export const AdminDashboardPage: React.FC = () => {
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [activePasscode, setActivePasscode] = useState<string>(() => getSavedAdminPasscode());
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [tab, setTab] = useState<AdminTab>('videos');
  const [videos, setVideos] = useState<VideoMateri[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Form state for adding/editing video
  const [editingId, setEditingId] = useState<string>('');
  const [klasterId, setKlasterId] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state for adding/editing game question (A/B)
  const [qEditingId, setQEditingId] = useState<string>('');
  const [qKlasterId, setQKlasterId] = useState<number>(1);
  const [qText, setQText] = useState<string>('');
  const [qOptA, setQOptA] = useState<string>('');
  const [qOptB, setQOptB] = useState<string>('');
  const [qCorrect, setQCorrect] = useState<0 | 1>(0);
  const [qExplanation, setQExplanation] = useState<string>('');
  const [qFormError, setQFormError] = useState<string>('');
  const [qSaving, setQSaving] = useState<boolean>(false);

  const loadAllData = async () => {
    const [vidRes, qRes, lbRes] = await Promise.all([
      fetchVideos(),
      fetchQuestions(),
      fetchLeaderboard()
    ]);
    setVideos(vidRes.videos);
    setQuestions(qRes.questions);
    setEntries(lbRes.entries);
  };

  useEffect(() => {
    if (activePasscode) {
      void loadAllData();
    }
  }, [activePasscode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!passcodeInput.trim()) {
      setAuthError('Masukkan passcode admin terlebih dahulu.');
      return;
    }

    setAuthLoading(true);
    const res = await verifyAdminPasscode(passcodeInput.trim());
    setAuthLoading(false);

    if (res.ok) {
      setActivePasscode(passcodeInput.trim());
      setPasscodeInput('');
    } else {
      setAuthError(res.error || 'Passcode admin tidak valid.');
    }
  };

  const handleLogout = () => {
    setSavedAdminPasscode('');
    setActivePasscode('');
  };

  const resetVideoForm = () => {
    setEditingId('');
    setKlasterId(1);
    setTitle('');
    setVideoUrl('');
    setSelectedFile(null);
    setDescription('');
    setFormError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setFormError('');
    if (file && !title.trim()) {
      setTitle(titleFromFilename(file.name));
    }
  };

  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setStatusMessage('');

    if (!title.trim()) {
      setFormError('Judul video materi wajib diisi.');
      return;
    }

    if (!selectedFile && !videoUrl.trim()) {
      setFormError('Pilih file video dari perangkat Anda terlebih dahulu.');
      return;
    }

    try {
      let finalVideoUrl = videoUrl.trim();
      if (selectedFile) {
        setUploading(true);
        setUploadProgress(0);
        finalVideoUrl = await uploadVideoFile(selectedFile, activePasscode, (pct) => {
          setUploadProgress(pct);
        });
      }

      await saveVideoMateri(
        {
          id: editingId || undefined,
          klasterId,
          title,
          videoUrl: finalVideoUrl,
          description
        },
        activePasscode
      );
      await loadAllData();
      setStatusMessage(
        editingId ? 'Video materi berhasil diperbarui.' : 'Video materi baru berhasil diunggah.'
      );
      resetVideoForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengunggah video materi.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditVideo = (vid: VideoMateri) => {
    setEditingId(vid.id);
    setKlasterId(vid.klasterId);
    setTitle(vid.title);
    setVideoUrl(vid.videoUrl);
    setSelectedFile(null);
    setDescription(vid.description);
    setFormError('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteVideo = async (id: string) => {
    await deleteVideoMateri(id, activePasscode);
    await loadAllData();
    setStatusMessage('Video materi dihapus.');
  };

  const handleDeleteLeaderboard = async (id: string) => {
    await deleteLeaderboardEntry(id, activePasscode);
    await loadAllData();
    setStatusMessage(id === 'all' ? 'Semua data leaderboard direset.' : 'Entri skor dihapus.');
  };

  const resetQuestionForm = () => {
    setQEditingId('');
    setQKlasterId(1);
    setQText('');
    setQOptA('');
    setQOptB('');
    setQCorrect(0);
    setQExplanation('');
    setQFormError('');
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQFormError('');
    setStatusMessage('');

    if (!qText.trim() || !qOptA.trim() || !qOptB.trim()) {
      setQFormError('Pertanyaan, pilihan A, dan pilihan B wajib diisi.');
      return;
    }

    setQSaving(true);
    try {
      await saveQuestionItem(
        {
          id: qEditingId || undefined,
          klasterId: qKlasterId,
          text: qText,
          options: [qOptA, qOptB],
          correct: qCorrect,
          explanation: qExplanation
        },
        activePasscode
      );
      await loadAllData();
      setStatusMessage(
        qEditingId
          ? 'Soal game berhasil diperbarui dan siap disinkronkan via API.'
          : 'Soal game baru berhasil disimpan ke /api/questions.'
      );
      resetQuestionForm();
    } catch (err) {
      setQFormError(err instanceof Error ? err.message : 'Gagal menyimpan soal game.');
    } finally {
      setQSaving(false);
    }
  };

  const handleEditQuestion = (q: AdminQuestion) => {
    setQEditingId(q.id);
    setQKlasterId(q.klasterId);
    setQText(q.text);
    setQOptA(q.options[0]);
    setQOptB(q.options[1]);
    setQCorrect(q.correct);
    setQExplanation(q.explanation);
    setQFormError('');
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestionItem(id, activePasscode);
    await loadAllData();
    setStatusMessage(id === 'all' ? 'Semua soal game admin dihapus.' : 'Soal game dihapus.');
  };

  if (!activePasscode) {
    return (
      <main className="page-section">
        <div className="container admin-login-wrap">
          <div className="admin-login-card">
            <h1 className="section-title">Masuk Dashboard Admin</h1>
            <p className="section-desc">
              Masukkan passcode admin untuk mengelola video materi hak anak dan data leaderboard.
            </p>
            <form onSubmit={(e) => void handleLogin(e)} className="admin-form">
              <label htmlFor="admin-passcode-input" className="field-label">
                Passcode Admin
              </label>
              <input
                id="admin-passcode-input"
                type="password"
                className="materi-search-input"
                placeholder="Masukkan passcode admin"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
              />
              {authError && (
                <p className="form-error-text" role="alert">
                  {authError}
                </p>
              )}
              <button type="submit" className="btn btn-primary" disabled={authLoading}>
                {authLoading ? 'Memeriksa...' : 'Buka Dashboard Admin'}
              </button>
            </form>
            <p className="admin-env-hint">
              Konfigurasi produksi dapat menggunakan environment variable{' '}
              <code>ADMIN_PASSCODE</code> pada layanan serverless Anda.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-section">
      <div className="container">
        <div className="page-head-row">
          <div>
            <h1 className="section-title">Dashboard Admin SIPAR</h1>
            <p className="section-desc">
              Unggah file video materi untuk halaman Materi dan kelola skor leaderboard.
            </p>
          </div>
          <div className="page-head-actions">
            <div className="role-switcher" role="tablist" aria-label="Menu Dashboard Admin">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'videos'}
                className={`role-tab-btn ${tab === 'videos' ? 'is-active' : ''}`}
                onClick={() => setTab('videos')}
              >
                Video Materi ({videos.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'questions'}
                className={`role-tab-btn ${tab === 'questions' ? 'is-active' : ''}`}
                onClick={() => setTab('questions')}
              >
                Soal Game ({questions.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'leaderboard'}
                className={`role-tab-btn ${tab === 'leaderboard' ? 'is-active' : ''}`}
                onClick={() => setTab('leaderboard')}
              >
                Leaderboard ({entries.length})
              </button>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleLogout}>
              Keluar Admin
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="admin-notice" role="status">
            {statusMessage}
          </div>
        )}

        {tab === 'videos' && (
          <div className="admin-two-col">
            <section className="admin-panel-card">
              <h2 className="panel-card-title">
                {editingId ? 'Edit Video Materi' : 'Tambah Video Materi Baru'}
              </h2>
              <form onSubmit={(e) => void handleSaveVideo(e)} className="admin-form">
                <div>
                  <label htmlFor="vid-klaster" className="field-label">
                    Klaster Hak Anak
                  </label>
                  <select
                    id="vid-klaster"
                    className="klaster-select-input w-full"
                    value={klasterId}
                    onChange={(e) => setKlasterId(Number.parseInt(e.target.value, 10))}
                  >
                    {KLASTER_DATA.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.code}: {k.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vid-title" className="field-label">
                    Judul Video
                  </label>
                  <input
                    id="vid-title"
                    type="text"
                    className="materi-search-input w-full"
                    placeholder="Contoh: Pengenalan Akta Kelahiran dan KIA"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="vid-file" className="field-label">
                    {editingId
                      ? 'Ganti File Video (opsional, MP4/WebM/MOV maks. 300 MB)'
                      : 'Upload File Video (MP4, WebM, OGG, MOV maks. 300 MB)'}
                  </label>
                  <div className="upload-drop-box">
                    <input
                      ref={fileInputRef}
                      id="vid-file"
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov,.m4v"
                      className="upload-file-input"
                      disabled={uploading}
                      onChange={handleFileSelected}
                    />
                    {selectedFile ? (
                      <p className="upload-file-meta">
                        File dipilih: <strong>{selectedFile.name}</strong> ({formatBytes(selectedFile.size)})
                      </p>
                    ) : editingId && videoUrl ? (
                      <p className="upload-file-meta">
                        Video saat ini: <code>{videoUrl}</code>
                      </p>
                    ) : (
                      <p className="upload-file-meta">
                        Pilih file video langsung dari komputer atau ponsel Anda.
                      </p>
                    )}
                  </div>
                </div>

                {uploading && (
                  <div className="upload-progress-wrap" role="status" aria-live="polite">
                    <div className="upload-progress-head">
                      <span>Mengunggah video ke server...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="upload-progress-bar">
                      <div
                        className="upload-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="vid-desc" className="field-label">
                    Ringkasan Singkat
                  </label>
                  <textarea
                    id="vid-desc"
                    rows={3}
                    className="materi-textarea w-full"
                    placeholder="Jelaskan isi singkat video untuk pelajar..."
                    value={description}
                    disabled={uploading}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {formError && (
                  <p className="form-error-text" role="alert">
                    {formError}
                  </p>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={uploading}>
                    {uploading
                      ? `Mengunggah (${uploadProgress}%)...`
                      : editingId
                        ? 'Simpan Perubahan'
                        : 'Unggah & Publikasikan'}
                  </button>
                  {editingId && !uploading && (
                    <button type="button" className="btn btn-outline" onClick={resetVideoForm}>
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-panel-card">
              <h2 className="panel-card-title">Daftar Video Terpublikasi</h2>
              {videos.length === 0 ? (
                <div className="state-box state-empty">
                  <p className="state-title">Belum ada video materi.</p>
                  <p className="state-desc">
                    Gunakan formulir di samping untuk mengunggah file video pembelajaran pertama.
                  </p>
                </div>
              ) : (
                <div className="admin-items-list">
                  {videos.map((vid) => {
                    const klaster = KLASTER_DATA.find((k) => k.id === vid.klasterId);
                    return (
                      <div key={vid.id} className="admin-list-item">
                        <div className="admin-item-info">
                          <span className="reader-cluster-tag">
                            {klaster ? klaster.code : `Klaster ${vid.klasterId}`}
                          </span>
                          <h3 className="admin-item-title">{vid.title}</h3>
                          <p className="admin-item-url">{vid.videoUrl}</p>
                        </div>
                        <div className="admin-item-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleEditVideo(vid)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => void handleDeleteVideo(vid.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'questions' && (
          <div className="admin-two-col">
            <section className="admin-panel-card">
              <h2 className="panel-card-title">
                {qEditingId ? 'Edit Soal Game (A / B)' : 'Tambah Soal Game Baru (A / B)'}
              </h2>
              <form onSubmit={(e) => void handleSaveQuestion(e)} className="admin-form">
                <div>
                  <label htmlFor="q-klaster" className="field-label">
                    Klaster Soal
                  </label>
                  <select
                    id="q-klaster"
                    className="klaster-select-input w-full"
                    value={qKlasterId}
                    onChange={(e) => setQKlasterId(Number.parseInt(e.target.value, 10))}
                  >
                    {KLASTER_DATA.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.code}: {k.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="q-text" className="field-label">
                    Pertanyaan Kuis
                  </label>
                  <textarea
                    id="q-text"
                    rows={3}
                    className="materi-textarea w-full"
                    placeholder="Tulis pertanyaan singkat dan jelas untuk kedua tim..."
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="q-opt-a" className="field-label">
                    Pilihan A
                  </label>
                  <input
                    id="q-opt-a"
                    type="text"
                    className="materi-search-input w-full"
                    placeholder="Jawaban pilihan A"
                    value={qOptA}
                    onChange={(e) => setQOptA(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="q-opt-b" className="field-label">
                    Pilihan B
                  </label>
                  <input
                    id="q-opt-b"
                    type="text"
                    className="materi-search-input w-full"
                    placeholder="Jawaban pilihan B"
                    value={qOptB}
                    onChange={(e) => setQOptB(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="q-correct" className="field-label">
                    Kunci Jawaban Benar
                  </label>
                  <select
                    id="q-correct"
                    className="klaster-select-input w-full"
                    value={qCorrect}
                    onChange={(e) => setQCorrect(Number(e.target.value) === 1 ? 1 : 0)}
                  >
                    <option value={0}>Pilihan A</option>
                    <option value={1}>Pilihan B</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="q-explanation" className="field-label">
                    Pembahasan Singkat (Opsional)
                  </label>
                  <textarea
                    id="q-explanation"
                    rows={2}
                    className="materi-textarea w-full"
                    placeholder="Ditampilkan setelah jawaban kedua tim dievaluasi..."
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                  />
                </div>

                {qFormError && (
                  <p className="form-error-text" role="alert">
                    {qFormError}
                  </p>
                )}

                <div className="admin-form-actions">
                  <button type="submit" className="btn btn-primary" disabled={qSaving}>
                    {qSaving
                      ? 'Menyimpan...'
                      : qEditingId
                        ? 'Simpan Perubahan Soal'
                        : 'Simpan Soal Game'}
                  </button>
                  {qEditingId && (
                    <button type="button" className="btn btn-outline" onClick={resetQuestionForm}>
                      Batal Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="admin-panel-card">
              <div className="page-head-row" style={{ marginBottom: '0.75rem' }}>
                <h2 className="panel-card-title" style={{ marginBottom: 0 }}>
                  Bank Soal API ({questions.length})
                </h2>
                {questions.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void handleDeleteQuestion('all')}
                  >
                    Hapus Semua
                  </button>
                )}
              </div>
              <p className="admin-env-hint" style={{ marginBottom: '1rem' }}>
                Endpoint sinkronisasi soal untuk komputer game lokal:{' '}
                <code>/api/questions</code>
              </p>

              {questions.length === 0 ? (
                <div className="state-box state-empty">
                  <p className="state-title">Belum ada soal kustom dari admin.</p>
                  <p className="state-desc">
                    Tambahkan soal pilihan A/B di formulir kiri agar minigame di komputer lokal
                    dapat menarik soal terbaru melalui API.
                  </p>
                </div>
              ) : (
                <div className="admin-items-list">
                  {questions.map((q) => {
                    const klaster = KLASTER_DATA.find((k) => k.id === q.klasterId);
                    return (
                      <div key={q.id} className="admin-list-item">
                        <div className="admin-item-info">
                          <span className="reader-cluster-tag">
                            {klaster ? klaster.code : `Klaster ${q.klasterId}`} | Kunci:{' '}
                            {q.correct === 0 ? 'A' : 'B'}
                          </span>
                          <h3 className="admin-item-title">{q.text}</h3>
                          <p className="admin-item-url">
                            A: {q.options[0]} | B: {q.options[1]}
                          </p>
                        </div>
                        <div className="admin-item-actions">
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => handleEditQuestion(q)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => void handleDeleteQuestion(q.id)}
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'leaderboard' && (
          <section className="admin-panel-card">
            <div className="page-head-row" style={{ marginBottom: '1rem' }}>
              <h2 className="panel-card-title">Data Skor dari Server Lokal</h2>
              {entries.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void handleDeleteLeaderboard('all')}
                >
                  Reset Semua Skor
                </button>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="state-box state-empty">
                <p className="state-title">Belum ada data skor masuk.</p>
                <p className="state-desc">
                  Setelah minigame lokal selesai dijalankan, admin di versi lokal dapat mengirim
                  hasilnya ke endpoint <code>/api/leaderboard</code> pada situs server ini.
                </p>
              </div>
            ) : (
              <div className="admin-items-list">
                {entries.map((entry) => (
                  <div key={entry.id} className="admin-list-item">
                    <div className="admin-item-info">
                      <h3 className="admin-item-title">
                        {entry.sessionName} ({getKlasterLabel(entry.klasterId)})
                      </h3>
                      <p className="admin-item-url">
                        {entry.teamAName}: {entry.teamAScore} poin | {entry.teamBName}:{' '}
                        {entry.teamBScore} poin | Pemenang: {entry.winner}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => void handleDeleteLeaderboard(entry.id)}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

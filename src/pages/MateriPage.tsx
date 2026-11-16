import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { KLASTER_DATA } from '../data/klasterData';
import { fetchVideos, VideoMateri } from '../services/portalService';
import { parseVideoUrl } from '../utils/videoUrl';
import { KlasterIcon } from '../components/Icons';

type LoadStatus = 'loading' | 'ready' | 'error';

export const MateriPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawKlaster = Number.parseInt(searchParams.get('klaster') || '0', 10);
  const initialKlaster = rawKlaster >= 1 && rawKlaster <= 5 ? rawKlaster : 0;

  const [klasterFilter, setKlasterFilter] = useState<number>(initialKlaster);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [videos, setVideos] = useState<VideoMateri[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const loadVideos = async () => {
    setStatus('loading');
    try {
      const res = await fetchVideos();
      setVideos(res.videos);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    void loadVideos();
  }, []);

  useEffect(() => {
    if (rawKlaster >= 1 && rawKlaster <= 5) {
      setKlasterFilter(rawKlaster);
    } else if (!searchParams.get('klaster')) {
      setKlasterFilter(0);
    }
  }, [rawKlaster, searchParams]);

  const keyword = searchQuery.trim().toLowerCase();
  const filteredVideos = videos.filter((vid) => {
    const matchKlaster = klasterFilter === 0 || vid.klasterId === klasterFilter;
    const matchQuery =
      !keyword ||
      vid.title.toLowerCase().includes(keyword) ||
      vid.description.toLowerCase().includes(keyword);
    return matchKlaster && matchQuery;
  });

  const activeVideo =
    filteredVideos.find((v) => v.id === selectedVideoId) || filteredVideos[0] || null;
  const parsedSource = activeVideo ? parseVideoUrl(activeVideo.videoUrl) : null;
  const activeKlasterInfo = activeVideo
    ? KLASTER_DATA.find((k) => k.id === activeVideo.klasterId)
    : null;

  const handleSelectKlaster = (id: number) => {
    setKlasterFilter(id);
    if (id === 0) {
      setSearchParams({});
    } else {
      setSearchParams({ klaster: String(id) });
    }
  };

  return (
    <main className="page-section">
      <div className="container">
        <div className="page-head-row">
          <div>
            <h1 className="section-title">Materi Video Hak Anak</h1>
            <p className="section-desc">
              Pilih klaster untuk menonton video pembelajaran yang telah diunggah oleh admin.
            </p>
          </div>
          <div className="page-head-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => void loadVideos()}
              disabled={status === 'loading'}
            >
              Muat Ulang
            </button>
          </div>
        </div>

        <div className="filter-cluster-row" role="tablist" aria-label="Filter Klaster Video">
          <button
            type="button"
            role="tab"
            aria-selected={klasterFilter === 0}
            className={`filter-chip ${klasterFilter === 0 ? 'is-active' : ''}`}
            onClick={() => handleSelectKlaster(0)}
          >
            Semua Klaster ({videos.length})
          </button>
          {KLASTER_DATA.map((k) => {
            const count = videos.filter((v) => v.klasterId === k.id).length;
            return (
              <button
                key={k.id}
                type="button"
                role="tab"
                aria-selected={klasterFilter === k.id}
                className={`filter-chip ${klasterFilter === k.id ? 'is-active' : ''}`}
                onClick={() => handleSelectKlaster(k.id)}
              >
                <KlasterIcon klasterId={k.id} size={16} />
                <span>
                  {k.code} ({count})
                </span>
              </button>
            );
          })}
        </div>

        <div className="materi-toolbar">
          <label htmlFor="video-search-input" className="sr-only">
            Cari video materi
          </label>
          <input
            id="video-search-input"
            type="search"
            className="materi-search-input"
            placeholder="Cari judul atau deskripsi video..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSearchQuery('')}
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {status === 'loading' && (
          <div className="state-box state-loading" role="status" aria-live="polite">
            <p className="state-title">Memuat daftar video materi...</p>
            <p className="state-desc">Mengambil video terbaru dari server materi.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="state-box state-error" role="alert">
            <p className="state-title">Gagal memuat video materi.</p>
            <p className="state-desc">Terjadi gangguan saat membaca daftar video.</p>
            <div className="state-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void loadVideos()}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {status === 'ready' && filteredVideos.length === 0 && (
          <div className="state-box state-empty" role="status">
            <p className="state-title">
              {videos.length === 0
                ? 'Belum ada video materi yang dipublikasikan.'
                : 'Tidak ada video materi yang cocok dengan filter saat ini.'}
            </p>
            <p className="state-desc">
              {videos.length === 0
                ? 'Daftar video pembelajaran akan tampil di halaman ini setelah materi tersedia.'
                : 'Ubah kata kunci pencarian atau pilih Semua Klaster untuk melihat video lain.'}
            </p>
            <div className="state-actions">
              {videos.length === 0 ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void loadVideos()}
                >
                  Muat Ulang
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setSearchQuery('');
                    handleSelectKlaster(0);
                  }}
                >
                  Tampilkan Semua Video
                </button>
              )}
            </div>
          </div>
        )}

        {status === 'ready' && activeVideo && (
          <div className="video-workspace">
            <div className="video-player-card">
              <div className="video-frame-wrap">
                {parsedSource?.kind === 'youtube' && (
                  <iframe
                    src={parsedSource.embedUrl}
                    title={activeVideo.title}
                    className="video-embed-frame"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
                {parsedSource?.kind === 'direct' && (
                  <video controls className="video-embed-frame" src={parsedSource.srcUrl}>
                    Browser Anda tidak mendukung pemutar video HTML5.
                  </video>
                )}
                {parsedSource?.kind === 'invalid' && (
                  <div className="video-invalid-box">
                    <p>{parsedSource.reason}</p>
                  </div>
                )}
              </div>

              <div className="video-detail-body">
                <div className="reader-badges">
                  <span className="reader-cluster-tag">
                    {activeKlasterInfo
                      ? `${activeKlasterInfo.code}: ${activeKlasterInfo.shortTitle}`
                      : `Klaster ${activeVideo.klasterId}`}
                  </span>
                </div>
                <h2 className="reader-title">{activeVideo.title}</h2>
                <p className="reader-summary">
                  {activeVideo.description || 'Video pembelajaran materi hak anak.'}
                </p>
              </div>
            </div>

            <aside className="video-playlist" aria-label="Daftar Video Materi">
              <h2 className="playlist-heading">Daftar Video ({filteredVideos.length})</h2>
              <div className="playlist-items">
                {filteredVideos.map((vid) => {
                  const klaster = KLASTER_DATA.find((k) => k.id === vid.klasterId);
                  const isActive = vid.id === activeVideo.id;
                  return (
                    <button
                      key={vid.id}
                      type="button"
                      className={`playlist-item-btn ${isActive ? 'is-active' : ''}`}
                      onClick={() => setSelectedVideoId(vid.id)}
                    >
                      <span className="playlist-item-meta">
                        {klaster ? klaster.code : `Klaster ${vid.klasterId}`}
                      </span>
                      <span className="playlist-item-title">{vid.title}</span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

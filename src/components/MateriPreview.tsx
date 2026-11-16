import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KLASTER_DATA } from '../data/klasterData';
import { fetchVideos, VideoMateri } from '../services/portalService';
import { KlasterIcon } from './Icons';

const KLASTER_BRIEF: Record<number, string> = {
  1: 'Akta kelahiran, KIA, dan partisipasi anak melalui Forum Anak daerah.',
  2: 'Pengasuhan keluarga penuh kasih sayang dan pencegahan perkawinan anak.',
  3: 'Akses kesehatan dasar, gizi seimbang, air bersih, dan sanitasi layak.',
  4: 'Hak pendidikan wajib belajar, waktu luang, bermain, dan kegiatan budaya.',
  5: 'Perlindungan khusus dari kekerasan, eksploitasi, dan situasi darurat.'
};

export const MateriPreview: React.FC = () => {
  const [videos, setVideos] = useState<VideoMateri[]>([]);

  useEffect(() => {
    void fetchVideos().then((res) => setVideos(res.videos));
  }, []);

  return (
    <section className="klaster-split-section" id="materi">
      <div className="container klaster-split-grid">
        <div className="klaster-stagger-grid">
          {KLASTER_DATA.map((klaster) => {
            const count = videos.filter((v) => v.klasterId === klaster.id).length;
            return (
              <Link
                key={klaster.id}
                to={`/materi?klaster=${klaster.id}`}
                className="klaster-feature-card"
              >
                <span className="klaster-feature-icon">
                  <KlasterIcon klasterId={klaster.id} size={22} />
                </span>
                <h3 className="klaster-feature-title">
                  {klaster.code}: {klaster.shortTitle}
                </h3>
                <p className="klaster-feature-desc">{KLASTER_BRIEF[klaster.id]}</p>
                <span className="klaster-feature-meta">
                  {count > 0 ? `${count} video tersedia` : 'Tonton materi video'}
                </span>
              </Link>
            );
          })}

          <Link to="/materi" className="klaster-feature-card">
            <span className="klaster-feature-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.9" />
                <path d="M10 9.5L15.5 12L10 14.5V9.5Z" fill="currentColor" />
              </svg>
            </span>
            <h3 className="klaster-feature-title">Semua Video Materi</h3>
            <p className="klaster-feature-desc">
              Jelajahi seluruh daftar video pembelajaran yang diunggah admin lintas klaster.
            </p>
            <span className="klaster-feature-meta">
              {videos.length > 0 ? `${videos.length} total video` : 'Buka galeri materi'}
            </span>
          </Link>
        </div>

        <div className="klaster-editorial-copy">
          <h2 className="section-title klaster-editorial-title">
            Belajar Terstruktur
            <span className="hero-title-accent">Dalam 5 Klaster</span>
          </h2>
          <p className="klaster-editorial-text">
            Materi edukasi SIPAR disusun mengikuti lima klaster Konvensi Hak Anak agar fasilitator,
            guru, dan anggota Forum Anak Kota Tarakan mudah menemukan video pembelajaran sesuai topik
            pertemuan.
          </p>
          <p className="klaster-editorial-text">
            Video pembelajaran disiapkan secara terkurasi dan dapat ditonton langsung sebelum sesi
            diskusi atau kegiatan kelas dimulai.
          </p>
          <div>
            <Link to="/materi" className="btn btn-primary btn-lg btn-pill">
              Buka Daftar Materi
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

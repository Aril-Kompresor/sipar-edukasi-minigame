import React from 'react';
import { Link } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  return (
    <section className="hero-split-section" id="beranda">
      <div className="container hero-split-grid">
        <div className="hero-split-copy">
          <h1 className="hero-heading hero-split-title">
            Pusat Video Materi
            <span className="hero-title-accent">5 Klaster Hak Anak</span>
          </h1>
          <p className="hero-description hero-split-desc">
            Portal edukasi SIPAR dari Forum Anak dan DP3P2KB Kota Tarakan untuk mengakses video
            pembelajaran hak anak secara terstruktur.
          </p>
          <div className="hero-cta-row">
            <Link to="/materi" className="btn btn-primary btn-lg btn-pill">
              Akses Materi
            </Link>
            <Link to="/leaderboard" className="btn btn-outline btn-lg btn-pill">
              Lihat Leaderboard
            </Link>
          </div>
        </div>

        <div className="hero-split-visual">
          <img
            src="/hero-kids.jpg"
            alt="Ilustrasi lima anak belajar bersama di sekitar rumah pohon"
            width={1376}
            height={768}
            className="hero-kids-img"
          />
        </div>
      </div>
    </section>
  );
};

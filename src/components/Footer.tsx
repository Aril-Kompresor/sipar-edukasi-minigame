import React from 'react';
import { Link } from 'react-router-dom';
import { KLASTER_DATA } from '../data/klasterData';

interface FooterProps {
  appMode: 'server' | 'local';
}

export const Footer: React.FC<FooterProps> = ({ appMode }) => {
  const isLocal = appMode === 'local';

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-about">
          <span className="footer-brand-title">SIPAR (Portal Edukasi &amp; Minigame Hak Anak)</span>
          <p className="footer-brand-desc">
            {isLocal
              ? 'Versi Server Lokal untuk menjalankan sesi minigame kuis tangga dua tim dengan trigger perangkat keras ESP32.'
              : 'Portal edukasi untuk mengakses video materi 5 Klaster Hak Anak dan memantau papan skor kuis Forum Anak Kota Tarakan.'}
          </p>
        </div>

        <div className="footer-links-group">
          <div className="footer-col">
            <span className="footer-col-heading">Navigasi</span>
            {isLocal ? (
              <Link to="/">Arena Minigame Lokal</Link>
            ) : (
              <>
                <Link to="/">Beranda Materi</Link>
                <Link to="/materi">Daftar Video Materi</Link>
                <Link to="/leaderboard">Leaderboard Game</Link>
              </>
            )}
          </div>

          {!isLocal && (
            <div className="footer-col">
              <span className="footer-col-heading">5 Klaster Materi</span>
              {KLASTER_DATA.map((klaster) => (
                <Link key={klaster.id} to={`/materi?klaster=${klaster.id}`}>
                  {klaster.code}: {klaster.shortTitle}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <span>&copy; 2026 SIPAR, Forum Anak Kota Tarakan &amp; DP3P2KB Kota Tarakan</span>
          <span>{isLocal ? 'Versi Local (Minigame ESP32)' : 'Versi Server (Materi & Leaderboard)'}</span>
        </div>
      </div>
    </footer>
  );
};

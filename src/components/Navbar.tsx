import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SiparMarkIcon } from './Icons';

interface NavbarProps {
  appMode: 'server' | 'local';
}

export const Navbar: React.FC<NavbarProps> = ({ appMode }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isLocal = appMode === 'local';

  const navItems = isLocal
    ? [{ label: 'Arena Minigame ESP32', to: '/' }]
    : [
        { label: 'Beranda', to: '/' },
        { label: 'Materi Video', to: '/materi' },
        { label: 'Leaderboard', to: '/leaderboard' }
      ];

  return (
    <header className="navbar">
      <div className="container nav-container">
        <Link to="/" className="nav-brand" aria-label="SIPAR Beranda">
          <SiparMarkIcon size={32} />
          <div className="brand-text">
            <span className="brand-title">SIPAR</span>
            <span className="brand-subtitle">
              {isLocal ? 'Server Lokal Minigame ESP32' : 'Forum Anak & DP3P2KB Tarakan'}
            </span>
          </div>
        </Link>

        <nav className="nav-menu" aria-label="Navigasi Utama">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          {isLocal ? (
            <span className="source-indicator">Mode: Server Lokal</span>
          ) : (
            <Link to="/materi" className="btn btn-primary btn-sm btn-pill">
              Akses Materi
            </Link>
          )}
        </div>

        <button
          type="button"
          className="mobile-menu-btn"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span className="mobile-menu-label">{menuOpen ? 'Tutup' : 'Menu'}</span>
          <span className="hamburger-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <div id="mobile-nav-drawer" className="mobile-drawer" hidden={!menuOpen}>
        <nav className="container mobile-drawer-inner" aria-label="Navigasi Mobile">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="mobile-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {!isLocal && (
            <div className="mobile-drawer-cta">
              <Link
                to="/materi"
                className="btn btn-primary w-full btn-pill"
                onClick={() => setMenuOpen(false)}
              >
                Akses Materi
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

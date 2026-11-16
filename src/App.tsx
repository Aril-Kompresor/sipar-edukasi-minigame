import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { MateriPage } from './pages/MateriPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LocalGamePage } from './pages/LocalGamePage';

const APP_MODE: 'server' | 'local' =
  import.meta.env.VITE_APP_MODE === 'local' ? 'local' : 'server';

const ScrollManager: React.FC = () => {
  const { pathname, hash, search } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash, search]);

  return null;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollManager />
      <div className="app-shell">
        <a href="#beranda" className="skip-link">
          Lewati ke konten utama
        </a>
        <Navbar appMode={APP_MODE} />
        {APP_MODE === 'local' ? (
          <Routes>
            <Route path="/" element={<LocalGamePage />} />
            <Route path="*" element={<LocalGamePage />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/materi" element={<MateriPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="*" element={<LandingPage />} />
          </Routes>
        )}
        <Footer appMode={APP_MODE} />
      </div>
    </BrowserRouter>
  );
};

export default App;

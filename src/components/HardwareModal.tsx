import React, { useEffect } from 'react';

interface HardwareModalProps {
  open: boolean;
  onClose: () => void;
  serialConnected: boolean;
  serialLabel: string;
  bridgeOnline: boolean;
  lanEndpoint: string;
  logs: string[];
  onConnectSerial: () => void;
  onTestTrigger: (team: 'A' | 'B', choice: 'A' | 'B') => void;
}

export const HardwareModal: React.FC<HardwareModalProps> = ({
  open,
  onClose,
  serialConnected,
  serialLabel,
  bridgeOnline,
  lanEndpoint,
  logs,
  onConnectSerial,
  onTestTrigger
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-hw-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title" id="modal-hw-title">
            Pengaturan Trigger ESP32 (2 Tim A/B)
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Tutup dialog pengaturan ESP32"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-info-block">
            <h3 className="info-block-title">1. Koneksi WiFi LAN (Server Lokal HTTP + SSE)</h3>
            <p className="info-block-text">
              Status Bridge Lokal: <strong>{bridgeOnline ? 'Terhubung' : 'Tidak Aktif'}</strong>.
              Arahkan HTTP POST dari ESP32 ke:
            </p>
            <div className="key-cell">
              <code>{lanEndpoint}</code> (JSON: <code>{'{"team":"A","choice":"B"}'}</code>)
            </div>
          </div>

          <div className="modal-info-block">
            <h3 className="info-block-title">2. Koneksi USB Serial (Web Serial API)</h3>
            <p className="info-block-text">
              Hubungkan ESP32 lewat kabel USB laptop (Chrome/Edge), kirim baris teks{' '}
              <code>A:A</code>, <code>A:B</code>, <code>B:A</code>, atau <code>B:B</code>:
            </p>
            <div className="btn-serial-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={onConnectSerial}>
                {serialConnected ? 'Hubungkan Ulang Port COM' : 'Pilih Port Serial COM'}
              </button>
              <span className={`serial-status-text ${serialConnected ? 'is-connected' : ''}`}>
                {serialLabel}
              </span>
            </div>
          </div>

          <div className="modal-info-block">
            <h3 className="info-block-title">3. Uji Trigger Virtual (Pilihan A/B Tim A &amp; B)</h3>
            <div className="test-buttons-row">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onTestTrigger('A', 'A')}
              >
                Test Tim A: A
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onTestTrigger('A', 'B')}
              >
                Test Tim A: B
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onTestTrigger('B', 'A')}
              >
                Test Tim B: A
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onTestTrigger('B', 'B')}
              >
                Test Tim B: B
              </button>
            </div>
            <div className="log-stream-box" role="log" aria-live="polite">
              {logs.map((entry, idx) => (
                <div key={`${idx}-${entry}`}>{entry}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

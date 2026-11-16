import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

// Custom geometric emblem combining an open book base and protective arch for SIPAR
export const SiparMarkIcon: React.FC<IconProps> = ({ size = 28, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 28 28"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect x="2" y="2" width="24" height="24" rx="6" fill="#2563EB" />
    <path
      d="M7.5 9.5C9.8 9.5 12 10.3 14 11.7C16 10.3 18.2 9.5 20.5 9.5V19C18.2 19 16 19.7 14 21C12 19.7 9.8 19 7.5 19V9.5Z"
      fill="#FFFFFF"
    />
    <path d="M14 11.7V21" stroke="#2563EB" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="14" cy="6.8" r="1.6" fill="#FDE68A" />
  </svg>
);

// Relevant icons mapped to each of the 5 Klaster Hak Anak
export const KlasterIcon: React.FC<{ klasterId: number; size?: number }> = ({
  klasterId,
  size = 20
}) => {
  switch (klasterId) {
    case 1:
      // Klaster 1: Hak Sipil (Kartu Identitas / Dokumen Hak)
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.9" />
          <circle cx="8.5" cy="11.5" r="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13 10H17.5M13 14H16.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 2:
      // Klaster 2: Lingkungan Keluarga & Pengasuhan
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 10.5L12 4L20 10.5V19C20 19.55 19.55 20 19 20H5C4.45 20 4 19.55 4 19V10.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M9.5 20V14H14.5V20" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </svg>
      );
    case 3:
      // Klaster 3: Kesehatan Dasar & Kesejahteraan
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.9" />
          <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
      );
    case 4:
      // Klaster 4: Pendidikan & Waktu Luang
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 6.5C6.5 6.5 9.5 7.4 12 9C14.5 7.4 17.5 6.5 20 6.5V18C17.5 18 14.5 18.8 12 20C9.5 18.8 6.5 18 4 18V6.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path d="M12 9V20" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case 5:
    default:
      // Klaster 5: Perlindungan Khusus
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5L19 6.5V12C19 16.4 16 19.6 12 21C8 19.6 5 16.4 5 12V6.5L12 3.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 12.2L11.3 14L15 10"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
};

// Geometric Mascot Emblems for Team A and Team B (replaces raw OS emojis)
export const TeamMascotIcon: React.FC<{ team: 'A' | 'B'; size?: number }> = ({
  team,
  size = 20
}) => {
  if (team === 'A') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="#0369A1" />
        <path d="M8.5 16L12 7.5L15.5 16H13.6L12 11.8L10.4 16H8.5Z" fill="#FFFFFF" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="#C2410C" />
      <path
        d="M9 8H12.8C14.2 8 15 8.7 15 9.8C15 10.6 14.5 11.2 13.7 11.5C14.7 11.8 15.3 12.5 15.3 13.6C15.3 15 14.3 15.8 12.6 15.8H9V8ZM10.8 11.1H12.4C13 11.1 13.3 10.7 13.3 10.2C13.3 9.7 13 9.4 12.4 9.4H10.8V11.1ZM10.8 14.4H12.5C13.2 14.4 13.6 14 13.6 13.4C13.6 12.8 13.2 12.4 12.5 12.4H10.8V14.4Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};

export const SoundStateIcon: React.FC<{ active: boolean; size?: number }> = ({
  active,
  size = 16
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 9.5H8.5L13.5 5.5V18.5L8.5 14.5H5V9.5Z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
    />
    {active ? (
      <>
        <path d="M16.5 9.2C17.4 10.1 17.8 11 17.8 12C17.8 13 17.4 13.9 16.5 14.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
        <path d="M19 7C20.5 8.5 21.2 10.2 21.2 12C21.2 13.8 20.5 15.5 19 17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </>
    ) : (
      <path d="M16.5 9.5L21 14.5M21 9.5L16.5 14.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    )}
  </svg>
);

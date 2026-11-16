# Design Direction: Portal Edukasi Hak Anak (SIPAR)

Dokumen arah desain ini adalah panduan karakter visual dan teknis untuk portal edukasi dan game pembelajaran hak anak untuk Forum Anak Kota Tarakan bersama DP3P2KB Kota Tarakan, dirancang dengan standar anti-slop penuh.

---

## 1. Identitas & Misi Produk
- **Nama Produk**: SIPAR (Portal Edukasi & Game Hak Anak)
- **Mitra & Stakeholder**: DP3P2KB Kota Tarakan dan Forum Anak Kota Tarakan
- **Target Pengguna**:
  1. *Anak-anak dan Pelajar*: Membaca modul materi 5 Klaster Hak Anak secara mandiri atau bersama kelompok.
  2. *Fasilitator Forum Anak / Pendidik*: Menggunakan portal sebagai referensi modul sosialisasi dan mengoperasikan sesi kuis di proyektor.
- **Karakter Visual**: Bersih (*clean*), ramah pembelajar (*educational editorial*), terang (*light mode*), memiliki keterbacaan tinggi, tanpa elemen klise AI.

---

## 2. Arsitektur Antarmuka
1. **Landing Page (`index.html`)**: Halaman pembelajaran murni. Berisi rangkuman materi 5 Klaster Hak Anak, ikhtisar fitur, gambaran game edukasi, dan panduan penggunaan. Tidak memuat arena permainan interaktif di dalam aliran landing page agar fokus membaca tetap terjaga.
2. **Game Arena (`game.html`)**: Halaman arena kuis interaktif mandiri dengan simulasi bel IoT 2-tombol, tangga maskot naik-turun, Web Audio synthesizer, dan integrasi Web Serial API.

---

## 3. Dials (Liveliness Toolkit)
- **Landing Page (`index.html`)**:
  - `ENERGY 1`: Tenang, nyaman dibaca lama, tidak menyilaukan.
  - `RHYTHM 1`: Tata letak terstruktur, konsisten, hierarki modul jelas.
  - `MOTION 1`: Transisi halus pada interaksi hover/klik tombol dan menu drawer, tanpa animasi loop tak berujung.
- **Game Arena (`game.html`)**:
  - `ENERGY 2`: Interaktif, visual skor dan maskot dinamis.
  - `RHYTHM 2`: Panggung arena permainan dua kubu (Tim A vs Tim B).
  - `MOTION 2`: Gerakan maskot naik-turun dan umpan balik saat bel berbunyi.

---

## 4. Palet Warna (Sistem Light Mode Terkurasi)
Bebas gradien ungu-biru generik AI. Memenuhi standar kontras tinggi WCAG AAA/AA:

| Token | Nilai Hex | Peran & Alasan Penggunaan |
|---|---|---|
| `--bg-body` | `#FFFFFF` | Latar putih bersih untuk kenyamanan membaca |
| `--bg-subtle` | `#F8FAFC` | Latar abu-abu sangat muda untuk variasi section |
| `--text-primary` | `#0F172A` | Teks utama slate pekat (Kontras 17.85:1 terhadap putih) |
| `--text-secondary` | `#475569` | Teks deskripsi (Kontras 7.58:1 terhadap putih) |
| `--primary-blue` | `#2563EB` | Aksen biru edukatif terpercaya (Kontras 5.17:1 terhadap putih) |
| `--border-color` | `#E2E8F0` | Garis batas tipis 1px pemisah kartu dan modul |

---

## 5. Tipografi
- **Font Utama**: *Plus Jakarta Sans* (Humanist sans-serif modern, mudah dibaca anak-anak dan peserta sosialisasi pada ukuran kecil maupun besar).
- **Font Monospace**: *JetBrains Mono* (Hanya dipakai untuk label teknis tombol keyboard fisik seperti `[A]` dan `[L]`).

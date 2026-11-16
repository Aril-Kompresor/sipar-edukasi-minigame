import fs from 'node:fs';
import path from 'node:path';
import { loadStore, persistStore } from './_store.js';

function removeUploadedFileIfLocal(videoUrl) {
  const dataDir = process.env.SIPAR_DATA_DIR;
  if (!dataDir || typeof videoUrl !== 'string' || !videoUrl.startsWith('/uploads/')) return;
  const filename = videoUrl.slice('/uploads/'.length);
  if (!/^[a-zA-Z0-9_-]+\.(mp4|webm|ogg|mov|m4v)$/i.test(filename)) return;
  try {
    const filePath = path.join(dataDir, 'uploads', filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Ignore file cleanup errors
  }
}

function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSCODE || 'sipar2026';
  const headerCode = req.headers?.['x-admin-passcode'];
  return String(headerCode || '') === expected;
}

export default function handler(req, res) {
  const videoStore = loadStore('__siparVideos', 'videos.json');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const { klaster, q } = req.query || {};
    let items = [...videoStore];

    if (klaster) {
      const kId = Number.parseInt(String(klaster), 10);
      items = items.filter((item) => item.klasterId === kId);
    }

    if (q) {
      const keyword = String(q).trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword)
      );
    }

    res.status(200).json({ total: items.length, videos: items });
    return;
  }

  if (!checkAdmin(req)) {
    res.status(401).json({ error: 'Akses admin tidak valid.' });
    return;
  }

  if (req.method === 'POST') {
    const { id, klasterId, title, videoUrl, description } = req.body || {};
    const parsedKlaster = Number.parseInt(String(klasterId), 10);

    if (!title || !videoUrl || Number.isNaN(parsedKlaster) || parsedKlaster < 1 || parsedKlaster > 5) {
      res.status(400).json({ error: 'Klaster (1-5), judul, dan tautan video wajib diisi.' });
      return;
    }

    if (id) {
      const idx = videoStore.findIndex((item) => item.id === id);
      if (idx !== -1) {
        const prevUrl = videoStore[idx].videoUrl;
        const nextUrl = String(videoUrl).trim();
        videoStore[idx] = {
          ...videoStore[idx],
          klasterId: parsedKlaster,
          title: String(title).trim(),
          videoUrl: nextUrl,
          description: String(description || '').trim(),
          updatedAt: new Date().toISOString()
        };
        persistStore(videoStore, 'videos.json');
        if (prevUrl && prevUrl !== nextUrl) {
          removeUploadedFileIfLocal(prevUrl);
        }
        res.status(200).json({ video: videoStore[idx] });
        return;
      }
    }

    const newVideo = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      klasterId: parsedKlaster,
      title: String(title).trim(),
      videoUrl: String(videoUrl).trim(),
      description: String(description || '').trim(),
      createdAt: new Date().toISOString()
    };

    videoStore.unshift(newVideo);
    persistStore(videoStore, 'videos.json');
    res.status(201).json({ video: newVideo });
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    const idx = videoStore.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Video tidak ditemukan.' });
      return;
    }
    const [removed] = videoStore.splice(idx, 1);
    persistStore(videoStore, 'videos.json');
    removeUploadedFileIfLocal(removed?.videoUrl);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

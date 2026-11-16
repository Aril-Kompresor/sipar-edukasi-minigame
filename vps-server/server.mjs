import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import healthHandler from '../api/health.js';
import adminVerifyHandler from '../api/admin-verify.js';
import videosHandler from '../api/videos.js';
import questionsHandler from '../api/questions.js';
import leaderboardHandler from '../api/leaderboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const UPLOAD_DIR = path.join(process.env.SIPAR_DATA_DIR || path.join(os.tmpdir(), 'sipar-data'), 'uploads');

const PORT = Number.parseInt(process.env.PORT || '5055', 10);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_CHUNK_BYTES = 12 * 1024 * 1024;
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.ogg', '.mov', '.m4v']);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v'
};

const API_ROUTES = {
  '/api/health': healthHandler,
  '/api/admin-verify': adminVerifyHandler,
  '/api/videos': videosHandler,
  '/api/questions': questionsHandler,
  '/api/leaderboard': leaderboardHandler
};

function checkAdminPasscode(req) {
  const expected = process.env.ADMIN_PASSCODE || 'sipar2026';
  const provided = req.headers?.['x-admin-passcode'];
  return String(provided || '') === expected;
}

function readRawBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Ukuran potongan file melebihi batas.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const buf = await readRawBody(req, 1048576);
  const raw = buf.toString('utf8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Format JSON tidak valid');
  }
}

function adaptResponse(nodeRes) {
  return {
    setHeader(name, value) {
      nodeRes.setHeader(name, value);
    },
    status(code) {
      nodeRes.statusCode = code;
      return this;
    },
    json(payload) {
      if (!nodeRes.hasHeader('Content-Type')) {
        nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      nodeRes.end(JSON.stringify(payload));
      return this;
    },
    end(body) {
      nodeRes.end(body);
      return this;
    }
  };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function handleVideoUpload(req, res, url) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!checkAdminPasscode(req)) {
    sendJson(res, 401, { error: 'Akses admin tidak valid.' });
    return;
  }

  const uploadId = url.searchParams.get('uploadId') || '';
  const chunkIndex = Number.parseInt(url.searchParams.get('chunkIndex') || '', 10);
  const totalChunks = Number.parseInt(url.searchParams.get('totalChunks') || '', 10);
  const ext = (url.searchParams.get('ext') || '.mp4').toLowerCase();

  if (
    !/^[a-zA-Z0-9_-]{8,64}$/.test(uploadId) ||
    Number.isNaN(chunkIndex) ||
    Number.isNaN(totalChunks) ||
    totalChunks < 1 ||
    totalChunks > 200 ||
    chunkIndex < 0 ||
    chunkIndex >= totalChunks ||
    !ALLOWED_VIDEO_EXTS.has(ext)
  ) {
    sendJson(res, 400, { error: 'Parameter unggah video tidak valid.' });
    return;
  }

  try {
    const chunkBuf = await readRawBody(req, MAX_CHUNK_BYTES);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const partPath = path.join(UPLOAD_DIR, `${uploadId}.part`);

    if (chunkIndex === 0) {
      fs.writeFileSync(partPath, chunkBuf);
    } else {
      fs.appendFileSync(partPath, chunkBuf);
    }

    if (chunkIndex === totalChunks - 1) {
      const finalName = `${uploadId}${ext}`;
      const finalPath = path.join(UPLOAD_DIR, finalName);
      fs.renameSync(partPath, finalPath);
      sendJson(res, 201, { ok: true, videoUrl: `/uploads/${finalName}` });
      return;
    }

    sendJson(res, 200, { ok: true, receivedChunk: chunkIndex });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'Gagal menyimpan potongan video.' });
  }
}

function serveUploadedVideo(req, res, pathname) {
  const filename = pathname.slice('/uploads/'.length);
  if (!/^[a-zA-Z0-9_-]+\.(mp4|webm|ogg|mov|m4v)$/i.test(filename)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end('Video not found');
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'video/mp4';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(Number.parseInt(match[2], 10), fileSize - 1) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${fileSize}`);
      res.end();
      return;
    }

    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Length', fileSize);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function serveFile(res, filePath, isHtml = false) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Cache-Control',
    isHtml ? 'no-cache, must-revalidate' : 'public, max-age=31536000, immutable'
  );
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/api/upload-video') {
    await handleVideoUpload(req, res, url);
    return;
  }

  const apiHandler = API_ROUTES[url.pathname];
  if (apiHandler) {
    try {
      const body =
        req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH'
          ? await readJsonBody(req)
          : undefined;

      const adaptedReq = {
        method: req.method,
        headers: req.headers,
        query: Object.fromEntries(url.searchParams.entries()),
        body
      };

      await apiHandler(adaptedReq, adaptResponse(res));
    } catch (err) {
      sendJson(res, 400, { error: err instanceof Error ? err.message : 'Request tidak valid' });
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  if (url.pathname.startsWith('/uploads/')) {
    serveUploadedVideo(req, res, url.pathname);
    return;
  }

  const rawRel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const candidate = path.resolve(DIST_DIR, rawRel || 'index.html');

  if (
    candidate.startsWith(DIST_DIR + path.sep) &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    serveFile(res, candidate, candidate.endsWith('.html'));
    return;
  }

  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    serveFile(res, indexHtml, true);
    return;
  }

  res.statusCode = 500;
  res.end('dist/index.html belum dibuild.');
});

server.listen(PORT, HOST, () => {
  console.log(`[SIPAR VPS Server] Berjalan di http://${HOST}:${PORT}`);
});

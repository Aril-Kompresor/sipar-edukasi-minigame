import fs from 'node:fs';
import path from 'node:path';

/**
 * Provides an in-memory array store optionally persisted to disk when SIPAR_DATA_DIR is set.
 */
export function loadStore(globalKey, filename) {
  if (!Array.isArray(globalThis[globalKey])) {
    let initial = [];
    const dataDir = process.env.SIPAR_DATA_DIR;
    if (dataDir) {
      try {
        const filePath = path.join(dataDir, filename);
        if (fs.existsSync(filePath)) {
          const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(parsed)) initial = parsed;
        }
      } catch {
        // Fallback to empty array if disk cache is unreadable
      }
    }
    globalThis[globalKey] = initial;
  }
  return globalThis[globalKey];
}

export function persistStore(items, filename) {
  const dataDir = process.env.SIPAR_DATA_DIR;
  if (!dataDir) return;
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  } catch {
    // Ignore persistence errors on read-only serverless filesystems
  }
}

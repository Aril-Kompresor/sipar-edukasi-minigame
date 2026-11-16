import { loadStore, persistStore } from './_store.js';

function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSCODE || 'sipar2026';
  const headerCode = req.headers?.['x-admin-passcode'];
  return String(headerCode || '') === expected;
}

export default function handler(req, res) {
  const questionStore = loadStore('__siparQuestions', 'questions.json');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-passcode');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const { klaster } = req.query || {};
    let items = [...questionStore];

    if (klaster) {
      const kId = Number.parseInt(String(klaster), 10);
      if (!Number.isNaN(kId) && kId >= 1 && kId <= 5) {
        items = items.filter((item) => item.klasterId === kId);
      }
    }

    res.status(200).json({ total: items.length, questions: items });
    return;
  }

  if (!checkAdmin(req)) {
    res.status(401).json({ error: 'Akses admin tidak valid.' });
    return;
  }

  if (req.method === 'POST') {
    const { id, klasterId, text, options, correct, explanation } = req.body || {};
    const parsedKlaster = Number.parseInt(String(klasterId), 10);
    const optA = Array.isArray(options) ? String(options[0] || '').trim() : '';
    const optB = Array.isArray(options) ? String(options[1] || '').trim() : '';
    const parsedCorrect = Number(correct) === 1 ? 1 : 0;

    if (
      Number.isNaN(parsedKlaster) ||
      parsedKlaster < 1 ||
      parsedKlaster > 5 ||
      !String(text || '').trim() ||
      !optA ||
      !optB
    ) {
      res.status(400).json({
        error: 'Klaster (1-5), pertanyaan, pilihan A, dan pilihan B wajib diisi.'
      });
      return;
    }

    if (id) {
      const idx = questionStore.findIndex((item) => item.id === id);
      if (idx !== -1) {
        questionStore[idx] = {
          ...questionStore[idx],
          klasterId: parsedKlaster,
          text: String(text).trim(),
          options: [optA, optB],
          correct: parsedCorrect,
          explanation: String(explanation || '').trim(),
          updatedAt: new Date().toISOString()
        };
        persistStore(questionStore, 'questions.json');
        res.status(200).json({ question: questionStore[idx] });
        return;
      }
    }

    const newQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      klasterId: parsedKlaster,
      text: String(text).trim(),
      options: [optA, optB],
      correct: parsedCorrect,
      explanation: String(explanation || '').trim(),
      createdAt: new Date().toISOString()
    };

    questionStore.push(newQuestion);
    persistStore(questionStore, 'questions.json');
    res.status(201).json({ question: newQuestion });
    return;
  }

  if (req.method === 'DELETE') {
    const { id } = req.query || {};
    if (id === 'all') {
      questionStore.length = 0;
      persistStore(questionStore, 'questions.json');
      res.status(200).json({ ok: true });
      return;
    }
    const idx = questionStore.findIndex((item) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Soal tidak ditemukan.' });
      return;
    }
    questionStore.splice(idx, 1);
    persistStore(questionStore, 'questions.json');
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}

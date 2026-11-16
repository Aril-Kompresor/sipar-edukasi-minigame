export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const expected = process.env.ADMIN_PASSCODE || 'sipar2026';
  const { passcode } = req.body || {};

  if (!passcode || String(passcode) !== expected) {
    res.status(401).json({ ok: false, error: 'Passcode admin tidak sesuai.' });
    return;
  }

  res.status(200).json({ ok: true });
}

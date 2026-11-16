export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  res.status(200).json({
    ok: true,
    service: 'sipar-edukasi-minigame',
    runtime: 'serverless',
    timestamp: new Date().toISOString()
  });
}

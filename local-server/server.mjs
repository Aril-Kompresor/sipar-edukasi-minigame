import http from 'node:http';
import os from 'node:os';

const PORT = Number.parseInt(process.env.LOCAL_SERVER_PORT || '3001', 10);
const sseClients = new Set();

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

function broadcastEvent(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 16384) {
        reject(new Error('Payload terlalu besar'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Format JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/local/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        port: PORT,
        lanAddresses: getLanAddresses(),
        connectedClients: sseClients.size
      })
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/local/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/local/esp32') {
    try {
      const body = await readJsonBody(req);
      const rawTeam = String(body.team || url.searchParams.get('team') || '').toUpperCase();
      const rawChoice = String(body.choice || url.searchParams.get('choice') || '').toUpperCase();

      if ((rawTeam !== 'A' && rawTeam !== 'B') || (rawChoice !== 'A' && rawChoice !== 'B')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: false,
            error: 'Parameter team (A|B) dan choice (A|B) wajib valid.'
          })
        );
        return;
      }

      const eventPayload = {
        team: rawTeam,
        choice: rawChoice,
        deviceId: String(body.deviceId || 'esp32-wifi'),
        receivedAt: new Date().toISOString()
      };

      broadcastEvent('esp32_trigger', eventPayload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, deliveredTo: sseClients.size, event: eventPayload }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint lokal tidak ditemukan' }));
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLanAddresses();
  console.log(`[SIPAR Local ESP32 Server] Berjalan di http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`[SIPAR Local ESP32 Server] Endpoint ESP32 LAN: http://${ips[0]}:${PORT}/api/local/esp32`);
  }
});

// Minimal privacy-friendly analytics server (Node + Express)
// Usage: npm init -y && npm i express express-rate-limit
// Start: node analytics-server.js (set PORT env as needed)

const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8787;
const DATA_DIR = process.env.ANALYTICS_DATA_DIR || path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.ndjson');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '32kb' }));

// Basic rate limit to mitigate abuse
const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/analytics', limiter);

// Helper: anonymize IP (IPv4/IPv6)
function anonymizeIp(ip) {
  if (!ip) return '';
  // IPv6 loopback normalize
  if (ip === '::1') return '::1';
  // Remove IPv6 prefix if present
  const pure = ip.replace('::ffff:', '');
  if (pure.includes(':')) {
    // IPv6: zero out last 4 hextets
    const parts = pure.split(':');
    while (parts.length < 8) parts.push('0');
    return parts.slice(0, 4).join(':') + '::';
  }
  // IPv4: zero out last octet
  const seg = pure.split('.');
  if (seg.length === 4) return `${seg[0]}.${seg[1]}.${seg[2]}.0`;
  return '';
}

// Optional: derive coarse region via standard headers (very rough, server/infra dependent)
function deriveRegion(req) {
  // Prefer CF headers if behind Cloudflare, else none
  const country = req.headers['cf-ipcountry'] || '';
  const city = req.headers['cf-ipcity'] || '';
  return { country, city };
}

// Accept beacons
app.post('/analytics', (req, res) => {
  try {
    const ip = anonymizeIp(req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '');
    const region = deriveRegion(req);
    const ev = {
      ts: Date.now(),
      ip, // anonymized
      region,
      t: req.body?.t,
      url: req.body?.url,
      ref: req.body?.ref || '',
      lang: req.body?.lang || '',
      tz: req.body?.tz || '',
      vp: req.body?.vp || [],
      dpr: req.body?.dpr || 1,
      theme: req.body?.theme || '',
      clicks: Number(req.body?.clicks || 0),
      dwell: Number(req.body?.dwell || 0),
      sid: undefined // drop session id on disk
    };
    fs.appendFileSync(EVENTS_FILE, JSON.stringify(ev) + '\n');
    res.status(204).end();
  } catch (e) {
    res.status(204).end();
  }
});

// In-memory summary (computed on request). For production, pre-aggregate periodically.
app.get('/analytics/summary', (req, res) => {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return res.json({ total: 0 });
    const lines = fs.readFileSync(EVENTS_FILE, 'utf8').trim().split('\n').filter(Boolean);
    let totalViews = 0;
    let themes = { light: 0, dark: 0 };
    let totalClicks = 0;
    let totalDwell = 0;
    const byCountry = {};

    for (const line of lines) {
      const ev = JSON.parse(line);
      if (ev.t === 'view') totalViews += 1;
      if (ev.theme && themes[ev.theme] !== undefined) themes[ev.theme] += 1;
      if (typeof ev.clicks === 'number') totalClicks += ev.clicks;
      if (typeof ev.dwell === 'number') totalDwell += ev.dwell;
      const country = ev.region?.country || '';
      if (country) byCountry[country] = (byCountry[country] || 0) + 1;
    }

    res.json({
      total: totalViews,
      themePreference: themes,
      avgClicks: totalViews ? +(totalClicks / totalViews).toFixed(2) : 0,
      avgDwellMs: totalViews ? Math.round(totalDwell / totalViews) : 0,
      byCountry
    });
  } catch (e) {
    res.json({ total: 0 });
  }
});

// Retention: keep last 6 months (simple rolling trim). Call via cron.
app.post('/analytics/maintenance/trim', (req, res) => {
  try {
    if (!fs.existsSync(EVENTS_FILE)) return res.status(204).end();
    const sixMonthsAgo = Date.now() - 1000 * 60 * 60 * 24 * 30 * 6;
    const lines = fs.readFileSync(EVENTS_FILE, 'utf8').trim().split('\n').filter(Boolean);
    const kept = lines.filter(l => {
      try { const ts = JSON.parse(l).ts; return ts >= sixMonthsAgo; } catch { return false; }
    });
    fs.writeFileSync(EVENTS_FILE, kept.join('\n') + (kept.length ? '\n' : ''));
    res.status(204).end();
  } catch (e) {
    res.status(204).end();
  }
});

app.listen(PORT, () => console.log(`Analytics server listening on :${PORT}`));

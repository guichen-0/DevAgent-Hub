import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { router as configSyncRouter } from './routes/config-sync.js';
import { router as timeAuditRouter } from './routes/time-audit.js';
import { router as monitorRouter } from './routes/monitor.js';
import { initDatabase } from './db/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3456;

app.use(express.json());

// ─── API Routes ───

app.use('/api/config-sync', configSyncRouter);
app.use('/api/time-audit', timeAuditRouter);
app.use('/api/monitor', monitorRouter);

// ─── Serve Client ───

const clientDir = join(__dirname, '..', 'client');
const oldDashboardDir = join(__dirname, '..', 'dashboard', 'public');

app.get('/', (req, res) => {
  // Prefer new client, fallback to old dashboard
  const indexPath = join(clientDir, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const oldIndex = join(oldDashboardDir, 'index.html');
    if (existsSync(oldIndex)) {
      res.sendFile(oldIndex);
    } else {
      res.status(404).send('Frontend not found');
    }
  }
});

app.use(express.static(clientDir));
app.use(express.static(oldDashboardDir));

// ─── Start ───

async function start() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`\n  🚀 DevAgent Hub running at http://localhost:${PORT}\n`);
  });
}

start();

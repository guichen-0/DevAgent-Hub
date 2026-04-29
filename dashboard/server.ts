import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import configSyncRouter from './routes/config-sync.js';
import timeAuditRouter from './routes/time-audit.js';
import monitorRouter from './routes/monitor.js';
import { startScheduler } from './plugins/Scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3456;

app.use(express.json());

// API routes
app.use('/api/config-sync', configSyncRouter);
app.use('/api/time-audit', timeAuditRouter);
app.use('/api/monitor', monitorRouter);

// Serve static frontend
const publicDir = join(__dirname, 'public');

// Serve index.html at root
app.get('/', (req, res) => {
  const indexPath = join(publicDir, 'index.html');
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found');
  }
});

// Serve static files from /public
app.use(express.static(publicDir));

app.listen(PORT, () => {
  startScheduler();
  console.log(`\n  🚀 Dashboard running at http://localhost:${PORT}\n`);
});

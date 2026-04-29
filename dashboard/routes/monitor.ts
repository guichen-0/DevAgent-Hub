import { Router } from 'express';
import {
  createMonitor, updateMonitor, removeMonitor,
  listMonitors, getMonitor, collectOnce, collectAndSave,
  getSnapshot, getAllSnapshots, clearMonitorMetrics,
} from '../plugins/PluginManager.js';
import { scheduleMonitor, unscheduleMonitor } from '../plugins/Scheduler.js';

const router = Router();

// ─── Monitor CRUD ───

router.get('/', (req, res) => {
  const monitors = listMonitors();
  res.json({ monitors });
});

router.get('/snapshots', (req, res) => {
  const snapshots = getAllSnapshots();
  res.json({ snapshots });
});

router.get('/:id', (req, res) => {
  const monitor = getMonitor(req.params.id);
  if (!monitor) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ monitor });
});

router.post('/', (req, res) => {
  const config = createMonitor(req.body);
  if (!config) { res.status(500).json({ error: 'Failed to create' }); return; }
  if (config.enabled) scheduleMonitor(config);
  res.json({ monitor: config });
});

router.put('/:id', (req, res) => {
  const config = updateMonitor(req.params.id, req.body);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  if (config.enabled) scheduleMonitor(config);
  else unscheduleMonitor(config.id);
  res.json({ monitor: config });
});

router.delete('/:id', (req, res) => {
  unscheduleMonitor(req.params.id);
  const ok = removeMonitor(req.params.id);
  res.json({ success: ok });
});

// ─── Collection ───

router.post('/:id/collect', async (req, res) => {
  const config = getMonitor(req.params.id);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  const point = await collectAndSave(config);
  res.json({ point });
});

router.post('/:id/collect/dry', async (req, res) => {
  const config = getMonitor(req.params.id);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  const point = await collectOnce(config);
  res.json({ point });
});

// ─── Data ───

router.get('/:id/snapshot', (req, res) => {
  const snapshot = getSnapshot(req.params.id);
  if (!snapshot) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ snapshot });
});

router.post('/:id/clear', (req, res) => {
  const ok = clearMonitorMetrics(req.params.id);
  res.json({ success: ok });
});

export default router;

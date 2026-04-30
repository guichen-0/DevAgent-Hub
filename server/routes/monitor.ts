import { Router } from 'express';
import {
  createMonitor, updateMonitor, removeMonitor,
  listMonitors, getMonitor, collectOnce, collectAndSave,
  getSnapshot, getAllSnapshots, clearMonitorMetrics,
} from '../../dashboard/plugins/PluginManager.js';
import { scheduleMonitor, unscheduleMonitor } from '../../dashboard/plugins/Scheduler.js';

export const router = Router();

router.get('/', (req, res) => res.json({ monitors: listMonitors() }));
router.get('/snapshots', (req, res) => res.json({ snapshots: getAllSnapshots() }));
router.get('/:id', (req, res) => {
  const m = getMonitor(req.params.id);
  if (!m) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ monitor: m });
});

router.post('/', (req, res) => {
  const config = createMonitor(req.body);
  if (!config) { res.status(500).json({ error: 'Failed' }); return; }
  if (config.enabled) scheduleMonitor(config);
  res.json({ monitor: config });
});

router.put('/:id', (req, res) => {
  const config = updateMonitor(req.params.id, req.body);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  if (config.enabled) scheduleMonitor(config); else unscheduleMonitor(config.id);
  res.json({ monitor: config });
});

router.delete('/:id', (req, res) => {
  unscheduleMonitor(req.params.id);
  res.json({ success: removeMonitor(req.params.id) });
});

router.post('/:id/collect', async (req, res) => {
  const config = getMonitor(req.params.id);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ point: await collectAndSave(config) });
});

router.post('/:id/collect/dry', async (req, res) => {
  const config = getMonitor(req.params.id);
  if (!config) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ point: await collectOnce(config) });
});

router.get('/:id/snapshot', (req, res) => {
  const snapshot = getSnapshot(req.params.id);
  if (!snapshot) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ snapshot });
});

router.post('/:id/clear', (req, res) => res.json({ success: clearMonitorMetrics(req.params.id) }));

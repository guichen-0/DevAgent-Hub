import { loadConfigs } from './Storage.js';
import { collectAndSave } from './PluginManager.js';
import type { MonitorConfig } from './types.js';

const timers = new Map<string, ReturnType<typeof setInterval>>();
let running = false;

export function startScheduler() {
  if (running) return;
  running = true;

  const configs = loadConfigs();
  for (const cfg of configs) {
    if (cfg.enabled) scheduleMonitor(cfg);
  }

  // Watch for new configs every 30s
  const watcher = setInterval(() => {
    const current = loadConfigs();
    const currentIds = new Set(current.filter(c => c.enabled).map(c => c.id));

    // Remove stale timers
    for (const [id, timer] of timers) {
      if (!currentIds.has(id)) {
        clearInterval(timer);
        timers.delete(id);
      }
    }

    // Add new timers
    for (const cfg of current) {
      if (cfg.enabled && !timers.has(cfg.id)) {
        scheduleMonitor(cfg);
      }
    }
  }, 30000);

  timers.set('_watcher', watcher);
  console.log(`[Scheduler] Started with ${configs.length} monitor(s)`);
}

export function stopScheduler() {
  for (const [id, timer] of timers) {
    clearInterval(timer);
  }
  timers.clear();
  running = false;
  console.log('[Scheduler] Stopped');
}

export function scheduleMonitor(config: MonitorConfig) {
  if (timers.has(config.id)) {
    clearInterval(timers.get(config.id)!);
  }

  // Do first collection immediately
  collectAndSave(config).catch(() => {});

  const timer = setInterval(() => {
    collectAndSave(config).catch(() => {});
  }, config.interval * 1000);

  timers.set(config.id, timer);
  console.log(`[Scheduler] Scheduled ${config.id} (${config.name}) every ${config.interval}s`);
}

export function unscheduleMonitor(id: string) {
  const timer = timers.get(id);
  if (timer) {
    clearInterval(timer);
    timers.delete(id);
  }
}

export function isScheduled(id: string): boolean {
  return timers.has(id);
}

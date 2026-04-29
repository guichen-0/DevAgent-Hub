import type { MonitorConfig, MetricPoint, MonitorSnapshot } from './types.js';
import { loadConfigs, saveConfig, deleteConfig, getConfig, appendMetric, loadMetrics, clearMetrics, getLatestSnapshot } from './Storage.js';
import { collectHttp } from './builtins/http-monitor.js';
import { collectProcess } from './builtins/process-monitor.js';
import { collectFile } from './builtins/file-monitor.js';
import { collectCommand } from './builtins/command-monitor.js';
import { collectGit } from './builtins/git-monitor.js';

function generateId(): string {
  return `mon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── CRUD ───

export function createMonitor(data: Partial<MonitorConfig>): MonitorConfig | null {
  const config: MonitorConfig = {
    id: generateId(),
    name: data.name || 'Unnamed',
    description: data.description || '',
    type: data.type || 'http',
    interval: Math.max(10, data.interval || 60),
    enabled: data.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    http: data.http,
    process: data.process,
    file: data.file,
    command: data.command,
    git: data.git,
  };

  if (!saveConfig(config)) return null;
  return config;
}

export function updateMonitor(id: string, data: Partial<MonitorConfig>): MonitorConfig | null {
  const existing = getConfig(id);
  if (!existing) return null;
  const updated: MonitorConfig = {
    ...existing,
    ...data,
    id, // id cannot change
    updatedAt: new Date().toISOString(),
  };
  return saveConfig(updated) ? updated : null;
}

export function removeMonitor(id: string): boolean {
  return deleteConfig(id);
}

export function listMonitors(): MonitorConfig[] {
  return loadConfigs();
}

export function getMonitor(id: string): MonitorConfig | undefined {
  return getConfig(id);
}

// ─── Collection ───

export async function collectOnce(config: MonitorConfig): Promise<MetricPoint> {
  switch (config.type) {
    case 'http':
      return collectHttp(config);
    case 'process':
      return collectProcess(config);
    case 'file':
      return collectFile(config);
    case 'command':
      return collectCommand(config);
    case 'git':
      return collectGit(config);
    default:
      return { timestamp: Date.now(), value: 0, status: 'error', label: 'error', detail: `Unknown type: ${config.type}` };
  }
}

export async function collectAndSave(config: MonitorConfig): Promise<MetricPoint> {
  const point = await collectOnce(config);
  appendMetric(config.id, point);
  return point;
}

// ─── Snapshot ───

export function getSnapshot(id: string): MonitorSnapshot | null {
  const config = getConfig(id);
  if (!config) return null;
  const snapshot = getLatestSnapshot(id);
  return snapshot ? {
    id: config.id,
    lastValue: snapshot.lastValue,
    lastStatus: snapshot.lastStatus as 'ok' | 'warn' | 'error',
    lastLabel: snapshot.lastLabel,
    lastTimestamp: snapshot.lastTimestamp,
    lastDetail: snapshot.lastDetail,
    history: snapshot.history,
  } : {
    id: config.id,
    lastValue: 0,
    lastStatus: 'warn' as const,
    lastLabel: 'pending',
    lastTimestamp: Date.now(),
    history: [],
  };
}

export function getAllSnapshots(): MonitorSnapshot[] {
  return loadConfigs()
    .filter(c => c.enabled)
    .map(c => getSnapshot(c.id))
    .filter((s): s is MonitorSnapshot => s !== null);
}

export function clearMonitorMetrics(id: string): boolean {
  try {
    clearMetrics(id);
    return true;
  } catch { return false; }
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MonitorConfig, MetricPoint } from './types.js';

const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data');
const MONITORS_FILE = path.join(DATA_DIR, 'monitors.json');
const METRICS_DIR = path.join(DATA_DIR, 'metrics');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Monitor Configs ───

export function loadConfigs(): MonitorConfig[] {
  ensureDir(DATA_DIR);
  try {
    if (!fs.existsSync(MONITORS_FILE)) return [];
    const raw = fs.readFileSync(MONITORS_FILE, 'utf-8');
    return JSON.parse(raw) as MonitorConfig[];
  } catch {
    return [];
  }
}

export function saveConfig(config: MonitorConfig): boolean {
  const configs = loadConfigs();
  const idx = configs.findIndex(c => c.id === config.id);
  if (idx >= 0) configs[idx] = config;
  else configs.push(config);
  try {
    writeJson(MONITORS_FILE, configs);
    return true;
  } catch { return false; }
}

export function deleteConfig(id: string): boolean {
  const configs = loadConfigs().filter(c => c.id !== id);
  try {
    writeJson(MONITORS_FILE, configs);
    // Clean up metrics
    const metricsFile = getMetricsFile(id);
    if (fs.existsSync(metricsFile)) fs.unlinkSync(metricsFile);
    return true;
  } catch { return false; }
}

export function getConfig(id: string): MonitorConfig | undefined {
  return loadConfigs().find(c => c.id === id);
}

// ─── Metrics ───

const MAX_POINTS = 1440; // 24h at 1/min, or more at lower intervals

function getMetricsFile(monitorId: string): string {
  ensureDir(METRICS_DIR);
  return path.join(METRICS_DIR, `${monitorId}.json`);
}

export function loadMetrics(monitorId: string): MetricPoint[] {
  try {
    const file = getMetricsFile(monitorId);
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as MetricPoint[];
  } catch {
    return [];
  }
}

export function appendMetric(monitorId: string, point: MetricPoint): void {
  const metrics = loadMetrics(monitorId);
  metrics.push(point);
  // Trim to max points
  if (metrics.length > MAX_POINTS) {
    metrics.splice(0, metrics.length - MAX_POINTS);
  }
  writeJson(getMetricsFile(monitorId), metrics);
}

export function clearMetrics(monitorId: string): void {
  const file = getMetricsFile(monitorId);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

export function getLatestSnapshot(monitorId: string): { lastValue: number; lastStatus: string; lastLabel: string; lastTimestamp: number; lastDetail?: string; history: MetricPoint[] } | null {
  const history = loadMetrics(monitorId);
  if (history.length === 0) return null;
  const last = history[history.length - 1];
  return {
    lastValue: last.value,
    lastStatus: last.status,
    lastLabel: last.label ?? '',
    lastTimestamp: last.timestamp,
    lastDetail: last.detail,
    history,
  };
}

// ─── Utils ───

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

import type { MonitorConfig, MetricPoint } from '../types.js';

export async function collectHttp(config: MonitorConfig): Promise<MetricPoint> {
  const httpCfg = config.http!;
  const url = httpCfg.url;
  const timeout = httpCfg.timeout || 10000;

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(url, {
      method: httpCfg.method || 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const elapsed = Date.now() - start;
    const expected = httpCfg.expectedStatus || 200;
    const ok = res.status === expected;

    return {
      timestamp: Date.now(),
      value: elapsed,
      status: ok ? 'ok' : 'warn',
      label: `${res.status}`,
      detail: ok ? `${elapsed}ms` : `Expected ${expected}, got ${res.status}`,
    };
  } catch (err) {
    return {
      timestamp: Date.now(),
      value: 0,
      status: 'error',
      label: 'error',
      detail: (err as Error).message,
    };
  }
}

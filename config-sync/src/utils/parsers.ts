import type { ConfigFormat } from '../types/index.js';

export function formatFromExtension(filePath: string): ConfigFormat {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json': return 'json';
    case 'yaml':
    case 'yml': return 'yaml';
    case 'toml': return 'toml';
    default: return 'plaintext';
  }
}

export function parseJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function formatLabel(filePath: string): string {
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  // Remove extension and convert to title case
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

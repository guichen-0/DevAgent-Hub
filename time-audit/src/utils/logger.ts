import chalk from 'chalk';

export function info(msg: string): void {
  console.log(chalk.blue('ℹ'), msg);
}

export function success(msg: string): void {
  console.log(chalk.green('✓'), msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('⚠'), msg);
}

export function error(msg: string): void {
  console.error(chalk.red('✗'), msg);
}

export function dim(msg: string): void {
  console.log(chalk.dim(msg));
}

export function header(msg: string): void {
  console.log(chalk.bold(`\n${msg}`));
}

export function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${(value / total * 100).toFixed(1)}%`;
}

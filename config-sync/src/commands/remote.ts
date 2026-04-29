import { initRemote, push, pull, getSyncStatus, disconnectRemote } from '../core/remote-sync.js';

export async function executeRemoteCommand(action: string, args: string[]): Promise<void> {
  switch (action) {
    case 'init': {
      const url = args[0];
      if (!url) {
        console.error('Usage: config-sync remote init <remote-url> [--branch <name>]');
        process.exit(1);
      }
      console.log('Initializing remote sync...');
      const branchIndex = args.indexOf('--branch');
      const branch = branchIndex !== -1 ? args[branchIndex + 1] : 'main';
      const ok = initRemote(url, branch);
      if (ok) {
        console.log(`Remote configured: ${url} (branch: ${branch})`);
        console.log('Run "config-sync remote push" to sync.');
      } else {
        console.error('Failed to initialize remote.');
        process.exit(1);
      }
      break;
    }

    case 'push': {
      console.log('Pushing to remote...');
      const result = push();
      if (result.success) {
        console.log(result.message);
      } else {
        console.error(`Push failed: ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'pull': {
      console.log('Pulling from remote...');
      const result = pull();
      if (result.success) {
        console.log(result.message);
      } else {
        console.error(`Pull failed: ${result.message}`);
        process.exit(1);
      }
      break;
    }

    case 'status': {
      const st = getSyncStatus();
      if (!st.isGitRepo) {
        console.log('Remote sync not configured. Run "config-sync remote init <url>".');
        return;
      }
      console.log(`Branch: ${st.branch}`);
      console.log(`Remote: ${st.remoteUrl ?? 'not configured'}`);
      if (st.lastCommit) {
        console.log(`Last commit: ${st.lastCommit.hash.slice(0, 8)} (${st.lastCommit.date})`);
        console.log(`  ${st.lastCommit.message}`);
      }
      if (st.status.length > 0) {
        console.log(`\nUncommitted changes (${st.status.length}):`);
        for (const line of st.status) {
          console.log(`  ${line}`);
        }
      } else if (st.isGitRepo) {
        console.log('Working tree clean.');
      }
      if (st.config?.lastSync) {
        console.log(`\nLast sync: ${new Date(st.config.lastSync).toLocaleString()}`);
      }
      break;
    }

    case 'disconnect': {
      console.log('Disconnecting remote...');
      const ok = disconnectRemote();
      console.log(ok ? 'Remote disconnected.' : 'Failed to disconnect.');
      break;
    }

    default:
      console.error('Unknown action. Usage: config-sync remote <init|push|pull|status|disconnect> [args...]');
      process.exit(1);
  }
}

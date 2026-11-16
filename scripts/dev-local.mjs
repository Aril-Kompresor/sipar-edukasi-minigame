import { spawn } from 'node:child_process';

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npx.cmd' : 'npx';

const localServer = spawn('node', ['local-server/server.mjs'], {
  stdio: 'inherit'
});

const viteDev = spawn(npmCmd, ['vite', '--mode', 'arena'], {
  stdio: 'inherit',
  shell: isWin,
  env: {
    ...process.env,
    VITE_APP_MODE: 'local'
  }
});

function shutdown() {
  localServer.kill();
  viteDev.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

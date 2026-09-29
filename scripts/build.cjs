const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const env = { ...process.env };
if (process.platform === 'win32') {
  const shim = join(__dirname, 'windows-readlink-workaround.cjs');
  env.NODE_OPTIONS = [env.NODE_OPTIONS, `--require=${shim}`].filter(Boolean).join(' ');
}
const result = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
  stdio: 'inherit', env,
});
process.exit(result.status ?? 1);

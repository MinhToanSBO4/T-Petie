const { lstatSync, rmSync, realpathSync } = require('node:fs');
const { resolve, join } = require('node:path');

const root = realpathSync(process.cwd());
const target = resolve(root, '.next');
if (target !== join(root, '.next')) throw new Error('Unexpected cache path');
const info = lstatSync(target);
if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Cache target is not a plain directory');
rmSync(target, { recursive: true });
console.log('Cleared local Next.js cache');

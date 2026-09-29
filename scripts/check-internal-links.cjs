const { readdirSync, readFileSync, statSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

const pages = new Set(files(join(process.cwd(), 'src', 'app')).filter((path) => path.endsWith(`${sep}page.tsx`))
  .map((path) => '/' + relative(join(process.cwd(), 'src', 'app'), path).replace(/\\/g, '/').replace(/\/page\.tsx$/, '').replace(/^\/$/, '')));
const missing = new Set();
for (const path of files(join(process.cwd(), 'src')).filter((path) => /\.(tsx|ts)$/.test(path))) {
  const source = readFileSync(path, 'utf8');
  for (const match of source.matchAll(/href="(\/[a-zA-Z0-9/-]+)"/g)) {
    const route = match[1].replace(/\/$/, '') || '/';
    if (route.startsWith('/api/') || pages.has(route)) continue;
    missing.add(`${relative(process.cwd(), path)} -> ${route}`);
  }
}
if (missing.size) { console.error([...missing].join('\n')); process.exitCode = 1; }
else console.log('Static internal links point to existing pages');

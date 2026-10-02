// Load server TypeScript in Node integration tests. Only framework cache hooks are replaced;
// Prisma, business services, transactions and SMTP message rendering remain real.
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs');
const ts = require('typescript');
const resolve = Module._resolveFilename;
const load = Module._load;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(process.cwd(), 'src', request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
Module._load = function (request, ...rest) {
  if (request === 'server-only') return {};
  if (request === 'next/cache') return { revalidateTag() {}, unstable_cache: (fn) => fn };
  return load.call(this, request, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }, fileName: filename });
  module._compile(output.outputText, filename);
};

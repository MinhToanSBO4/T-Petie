// Some Windows non-NTFS drives report EISDIR for readlink(non-symlink).
// Webpack expects EINVAL. Normalize only existing non-symlink paths.
const fs = require('node:fs');
const originalSync = fs.readlinkSync;
const originalCallback = fs.readlink;
const originalPromise = fs.promises.readlink;

function normalize(error, path) {
  if (error?.code !== 'EISDIR') return error;
  try {
    if (!fs.lstatSync(path).isSymbolicLink()) error.code = 'EINVAL';
  } catch { /* keep original error */ }
  return error;
}

fs.readlinkSync = function (path, options) {
  try { return originalSync.call(fs, path, options); }
  catch (error) { throw normalize(error, path); }
};
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') { callback = options; options = undefined; }
  return originalCallback.call(fs, path, options, (error, value) => callback(normalize(error, path), value));
};
fs.promises.readlink = async function (path, options) {
  try { return await originalPromise.call(fs.promises, path, options); }
  catch (error) { throw normalize(error, path); }
};

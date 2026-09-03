const fs = require('node:fs');
const path = require('node:path');

const packageRoot = __dirname;
const destination = path.resolve(process.argv[2] || path.join(packageRoot, 'export'));
const files = [
  'README.md',
  'package.json',
  'build.cjs',
  'export.cjs',
  'index.js',
  'annotation.js',
  'iteration.js',
  'storage.js',
  'theme.js'
];
const directories = ['src', 'dist', 'tests'];

fs.mkdirSync(destination, { recursive: true });
files.forEach((file) => fs.copyFileSync(
  path.join(packageRoot, file),
  path.join(destination, file)
));
directories.forEach((directory) => fs.cpSync(
  path.join(packageRoot, directory),
  path.join(destination, directory),
  { recursive: true }
));

console.log(`Exported Prototype Tools to ${destination}`);

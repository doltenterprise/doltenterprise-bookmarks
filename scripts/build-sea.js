const { buildSync } = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Bundling application ---');
buildSync({
  entryPoints: ['app.js'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'bundle.js',
  external: ['sql.js'],
});

console.log('--- Generating SEA config ---');
const seaConfig = {
  main: 'bundle.js',
  output: 'sea-prep.blob',
  disableSentinel: false,
  useCodeCache: true,
  assets: {
    "views/index.ejs": "views/index.ejs",
    "views/login.ejs": "views/login.ejs",
    "views/register.ejs": "views/register.ejs",
    "views/bookmark_form.ejs": "views/bookmark_form.ejs",
    "views/categories.ejs": "views/categories.ejs",
    "views/partials/header.ejs": "views/partials/header.ejs",
    "views/partials/footer.ejs": "views/partials/footer.ejs",
    "public/css/style.css": "public/css/style.css",
    "public/js/main.js": "public/js/main.js"
  }
};

fs.writeFileSync('sea-config.json', JSON.stringify(seaConfig, null, 2));

console.log('--- Creating SEA blob ---');
execSync('node --experimental-sea-config sea-config.json');

console.log('--- Patching binary ---');
const nodePath = process.execPath;
const binaryName = process.platform === 'win32' ? 'linkboard.exe' : 'linkboard';
fs.copyFileSync(nodePath, binaryName);

try {
    execSync(`node --build-sea sea-config.json`);
} catch (e) {
    console.log('Standard SEA build failed, trying manual injection...');
}

console.log(`--- Binary ${binaryName} created ---`);

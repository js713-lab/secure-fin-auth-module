/**
 * Copy ogl ESM sources into public/vendor/ogl for the login ferrofluid shader.
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../node_modules/ogl/src');
const dest = path.join(__dirname, '../public/vendor/ogl');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

if (!fs.existsSync(src)) {
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
copyDir(src, dest);

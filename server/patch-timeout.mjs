import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(__dirname, 'node_modules/@distube/ytdl-core/dist/solver/worker.js'),
  path.resolve(__dirname, '../node_modules/@distube/ytdl-core/dist/solver/worker.js'),
];

let patched = false;
for (const workerFile of candidates) {
  if (fs.existsSync(workerFile)) {
    let content = fs.readFileSync(workerFile, 'utf8');
    if (content.includes('TIMEOUT_MS = 2000')) {
      content = content.replace('TIMEOUT_MS = 2000', 'TIMEOUT_MS = 30000');
      fs.writeFileSync(workerFile, content, 'utf8');
      console.log('[Patch] Successfully increased ytdl solver TIMEOUT_MS from 2000 to 30000 at:', workerFile);
      patched = true;
      break;
    } else {
      console.log('[Patch] TIMEOUT_MS already patched at:', workerFile);
      patched = true;
      break;
    }
  }
}

if (!patched) {
  console.log('[Patch] worker.js not found in candidates:', candidates);
}


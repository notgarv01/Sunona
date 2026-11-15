import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const searchDirs = [
  path.resolve(__dirname, 'node_modules/@distube/ytdl-core/dist/solver'),
  path.resolve(__dirname, '../node_modules/@distube/ytdl-core/dist/solver'),
];

for (const dir of searchDirs) {
  if (!fs.existsSync(dir)) continue;

  const workerFile = path.join(dir, 'worker.js');
  if (fs.existsSync(workerFile)) {
    let content = fs.readFileSync(workerFile, 'utf8');
    if (content.includes('TIMEOUT_MS = 2000')) {
      content = content.replace('TIMEOUT_MS = 2000', 'TIMEOUT_MS = 60000');
      fs.writeFileSync(workerFile, content, 'utf8');
      console.log('[Patch] Increased solver/worker.js TIMEOUT_MS to 60000');
    }
  }

  const indexFile = path.join(dir, 'index.js');
  if (fs.existsSync(indexFile)) {
    let content = fs.readFileSync(indexFile, 'utf8');
    if (content.includes('CALL_DEADLINE_MS = 10_000')) {
      content = content.replace('CALL_DEADLINE_MS = 10_000', 'CALL_DEADLINE_MS = 60_000');
      fs.writeFileSync(indexFile, content, 'utf8');
      console.log('[Patch] Increased solver/index.js CALL_DEADLINE_MS to 60000');
    }
  }
}



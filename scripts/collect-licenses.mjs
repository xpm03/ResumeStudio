import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Ship full runtime dependency licenses with the static build, including
// transitive packages. Generated from installed packages; never from user data.
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const output = ['ResumeStudio third-party dependency licenses', 'Fonts are distributed separately under public/fonts/OFL.txt.'];
for (const [path, info] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!path || info.dev || !path.startsWith('node_modules/')) continue;
  try {
    const files = (await readdir(path)).filter(name => /^(licen[sc]e|copying|notice)(\.|$)/i.test(name)).sort();
    if (!files.length) continue;
    output.push(`\n${'='.repeat(72)}\n${path} @ ${info.version}\n`);
    for (const file of files) {
      try { output.push(`${file}\n${await readFile(join(path, file), 'utf8')}`); } catch { /* A few packages use a directory for license files. */ }
    }
  } catch { /* Platform-specific optional packages need not be installed. */ }
}
await writeFile('public/THIRD_PARTY_LICENSES.txt', output.join('\n\n') + '\n');

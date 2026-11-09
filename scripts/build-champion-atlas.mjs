import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const run = (...args) => new Promise((resolve, reject) => execFile('magick', args, { encoding: 'utf8' }, (error, stdout) => error ? reject(error) : resolve(stdout)));
const names = ['Hrodan', 'Korvek', 'Sereth', 'Veyra', 'Aeska', 'Elaris', 'Nyra', 'Velin', 'Thessa', 'Drathos'];
const source = path.join(root, 'assets/champions/source/portraits-generated.png');
const [w, h] = (await run('identify', '-format', '%w %h', source)).split(' ').map(Number);
const out = path.join(root, 'assets/champions');
mkdirSync(out, { recursive: true });
mkdirSync(path.join(root, 'docs/art'), { recursive: true });
const entries = [];
for (const [i, name] of names.entries()) {
  const championId = name.toLowerCase();
  const col = i % 5, row = Math.floor(i / 5);
  const left = Math.round(col * w / 5), top = Math.round(row * h / 2);
  const width = Math.round((col + 1) * w / 5) - left;
  const height = Math.round((row + 1) * h / 2) - top;
  // Remove the generated sheet's thin separator lines before resampling.
  const icon = `assets/champions/${championId}.png`;
  const icon64 = `assets/champions/${championId}-64.png`;
  await run(source, '-crop', `${width - 4}x${height - 4}+${left + 2}+${top + 2}`, '+repage', '-filter', 'Lanczos', '-resize', '256x256!', '-alpha', 'off', path.join(root, icon));
  await run(path.join(root, icon), '-filter', 'Lanczos', '-resize', '64x64', '-strip', path.join(root, icon64));
  await run(path.join(root, icon64), '-filter', 'Lanczos', '-resize', '48x48', path.join(root, `docs/art/${championId}-48.png`));
  entries.push({ championId, name, x: col * 256, y: row * 256, width: 256, height: 256, icon, icon64 });
}
await run('-size', '1280x512', 'xc:#10151b', ...entries.flatMap(e => [path.join(root, e.icon), '-geometry', `+${e.x}+${e.y}`, '-composite']), '-strip', path.join(out, 'atlas.png'));
await run('-size', '240x96', 'xc:#10151b', ...entries.flatMap((e, i) => [path.join(root, `docs/art/${e.championId}-48.png`), '-geometry', `+${i % 5 * 48}+${Math.floor(i / 5) * 48}`, '-composite']), path.join(root, 'docs/art/champions-48.png'));
writeFileSync(path.join(out, 'atlas.json'), JSON.stringify({ atlas: 'assets/champions/atlas.png', width: 1280, height: 512, columns: 5, rows: 2, champions: entries }, null, 2) + '\n');
console.log('Built 10 portraits, 10 optimized icons, atlas, manifest and 48px previews.');

// Copies what <juel-pdf> loads at run time from pdfjs-dist (pinned in package.json) into a folder:
// `node tools/copy-pdfjs.mjs [dest]`, default `dist/pdfjs`. Jetty runs it too, for the folder it ships beside a
// deck. The library and its worker, the standard fonts (PDFs that don't carry Helvetica, Times…), the
// character maps (Chinese, Japanese, Korean text), the image decoders (JPEG 2000 and JBIG2 scans), the
// colour profiles, and pdf.js's licence.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '..', 'package.json'));
const source = path.dirname(require.resolve('pdfjs-dist/package.json'));
const dest = path.resolve(process.argv[2] ?? path.join(here, '..', 'dist', 'pdfjs'));

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
for (const file of ['build/pdf.min.mjs', 'build/pdf.worker.min.mjs', 'LICENSE'])
    fs.copyFileSync(path.join(source, file), path.join(dest, path.basename(file)));
for (const folder of ['standard_fonts', 'cmaps', 'wasm', 'iccs'])
    if (fs.existsSync(path.join(source, folder)))
        fs.cpSync(path.join(source, folder), path.join(dest, folder), { recursive: true });

const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
fs.writeFileSync(path.join(dest, 'VERSION'), `pdfjs-dist ${version}\n`);
console.log(`pdf.js ${version} → ${path.relative(process.cwd(), dest) || '.'}`);

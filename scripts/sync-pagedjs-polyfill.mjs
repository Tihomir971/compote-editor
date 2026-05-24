import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve('node_modules/pagedjs/dist/paged.polyfill.js');
const target = resolve('src/lib/print/paged.polyfill.txt');

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);


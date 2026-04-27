#!/usr/bin/env node
// Marks isAoE: true on grenade launcher, missile launcher, mortar, and
// similar area-effect weapon categories in firearms.json.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const AOE_CATEGORIES = new Set(['GrLn', 'MisLn', 'BlsTa', 'GATGM', 'VJMP', 'MrTr']);

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, 'firearms.json');

const items = JSON.parse(readFileSync(filePath, 'utf8'));

let patched = 0;
for (const item of items) {
  if (AOE_CATEGORIES.has(item.system?.category)) {
    item.system.isAoE = true;
    patched++;
  }
}

writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
console.log(`Done. Set isAoE: true on ${patched} items.`);

#!/usr/bin/env node
// Marks isAoE: true on grenades, bombs, and similar area-effect projectiles.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dir, 'sr3e-projectiles-compendium.json');

const items = JSON.parse(readFileSync(filePath, 'utf8'));

let patched = 0;
for (const item of items) {
  const cat = item.system?.category;
  const name = (item.name ?? '').toLowerCase();
  if (cat === 'GR' || (cat === 'other' && (name.includes('grenade') || name.includes('bomb')))) {
    item.system.isAoE = true;
    patched++;
  }
}

writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
console.log(`Done. Set isAoE: true on ${patched} items.`);

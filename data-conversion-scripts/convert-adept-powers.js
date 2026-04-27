#!/usr/bin/env node
// Converts rawdata/AdeptPowers.json → sr3e-adept-powers-compendium.json
// HasLevels: true means the power can be bought multiple times at cost per level.
// Level defaults to 1 on all entries; players set their actual level in-world.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/AdeptPowers.json'), 'utf8'));

const out = raw.map((src, idx) => ({
  _id: `sr3e-adeptpower-${String(idx).padStart(4, '0')}`,
  name: String(src.Name ?? '').trim(),
  type: 'adeptpower',
  img: 'icons/svg/aura.svg',
  system: {
    powerCost:   Math.round(parseFloat(String(src.Cost ?? '0').trim()) * 1000) / 1000,
    hasLevels:   src.HasLevels === true,
    level:       1,
    mods:        String(src.Mods  ?? '').trim(),
    bookPage:    String(src.BookPage ?? '').trim(),
    description: String(src.Notes ?? '').trim(),
  },
}));

const outPath = join(__dir, 'sr3e-adept-powers-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

const levelled = out.filter(p => p.system.hasLevels).length;
console.log(`Written ${out.length} powers → ${outPath}`);
console.log(`  Levelled: ${levelled}  Fixed: ${out.length - levelled}`);

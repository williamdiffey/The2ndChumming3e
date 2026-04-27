#!/usr/bin/env node
// Converts rawdata/Spells.json → sr3e-spells-compendium.json
// Type:     P=Physical, M=Mana
// Duration: I=Instant, S=Sustained, P=Permanent
// Class:    C=Combat, D=Detection, H=Health, I=Illusion, M=Manipulation,
//           E=Elemental, N=Illusion(variant), T=Transformation, Z=Manipulation(variant)

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/Spells.json'), 'utf8'));

const TYPE = { P: 'Physical', M: 'Mana' };

const DURATION = { I: 'Instant', S: 'Sustained', P: 'Permanent' };

const CATEGORY = {
  C: 'Combat',
  D: 'Detection',
  H: 'Health',
  I: 'Illusion',
  M: 'Manipulation',
  E: 'Elemental',
  N: 'Illusion',
  T: 'Transformation',
  Z: 'Manipulation',
};

const out = raw.map((src, idx) => ({
  _id: `sr3e-spell-${String(idx).padStart(4, '0')}`,
  name: String(src.Name ?? '').trim(),
  type: 'spell',
  img: 'icons/svg/magic-swirl.svg',
  system: {
    category:    CATEGORY[src.Class]  ?? src.Class  ?? '',
    type:        TYPE[src.Type]       ?? src.Type    ?? '',
    duration:    DURATION[src.Duration] ?? src.Duration ?? '',
    range:       String(src.Range    ?? '').trim(),
    drain:       String(src.Drain    ?? '').trim(),
    target:      String(src.Target   ?? '').trim(),
    bookPage:    String(src.BookPage ?? '').trim(),
    damage:      '',
    description: String(src.Notes   ?? '').trim(),
  },
}));

const outPath = join(__dir, 'sr3e-spells-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

const cats = {};
for (const s of out) cats[s.system.category] = (cats[s.system.category] ?? 0) + 1;
console.log(`Written ${out.length} spells → ${outPath}`);
console.log('By category:', cats);

#!/usr/bin/env node
// Converts rawdata/Bioware.json → sr3e-bioware-compendium.json
// Type codes: s=Standard, c=Cultured, x=Exotic (cosmetic/nano/genetech)
// One entry has a non-numeric cost ("? 10% of implant cost") — cost set to 0,
// description appended with the cost note.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/Bioware.json'), 'utf8'));

const GRADE = { s: 'Standard', c: 'Cultured', x: 'Exotic' };

const CATEGORY_LABELS = {
  'STANDARD': 'Standard',
  'CULTURED':  'Cultured',
  'COSMETIC':  'Cosmetic',
  'NANOWARE':  'Nanoware',
  'GENETECH':  'Genetech',
};

const out = [];
let idx = 0;

for (const [sectionKey, items] of Object.entries(raw)) {
  const biowareCategory = CATEGORY_LABELS[sectionKey] ?? sectionKey;

  for (const src of items) {
    const id = `sr3e-bioware-${String(idx).padStart(4, '0')}`;
    idx++;

    const costRaw    = String(src.Cost ?? '0').trim();
    const costIsNum  = /^\d+$/.test(costRaw);
    const costNum    = costIsNum ? parseInt(costRaw) : 0;
    const costNote   = !costIsNum ? `Cost: ${costRaw}` : '';

    const bioIndex = Math.round(parseFloat(String(src.BioIndex ?? '0').trim()) * 1000) / 1000;

    let description = String(src.Notes ?? '').trim();
    if (costNote) description = [description, costNote].filter(Boolean).join(' | ');

    out.push({
      _id: id,
      name: String(src.Name ?? '').trim(),
      type: 'bioware',
      img: 'icons/svg/biohazard.svg',
      system: {
        biowareCategory,
        grade:        GRADE[src.Type] ?? 'Standard',
        bioIndex,
        cost:         costNum,
        availability: String(src.Availability ?? '').trim(),
        streetIndex:  parseFloat(String(src.StreetIndex ?? '0').trim()) || 0,
        mods:         String(src.Mods ?? '').trim(),
        bookPage:     String(src.BookPage ?? '').trim(),
        rating:       0,
        description,
      },
    });
  }
}

const outPath = join(__dir, 'sr3e-bioware-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

const counts = {};
for (const item of out) {
  const c = item.system.biowareCategory;
  counts[c] = (counts[c] ?? 0) + 1;
}
console.log(`Written ${out.length} items → ${outPath}`);
console.log('Breakdown:', counts);

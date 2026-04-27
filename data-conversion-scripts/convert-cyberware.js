#!/usr/bin/env node
// Converts rawdata/Cyberware.json → sr3e-cyberware-compendium.json
// Source is a keyed object with 15 sections; each section maps to
// cyberwareCategory on the output item.
// Names prefixed with "+" are add-ons/upgrades — preserved as-is.
// Category letters in source (E/H/R/A/D/F) are stored in legalCode
// subCategory field but not mapped to grade (no reliable SR3 mapping).

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/Cyberware.json'), 'utf8'));

// Section name → clean category label
const CATEGORY_LABELS = {
  'BODYWARE':       'Bodyware',
  'COMMUNICATIONS': 'Communications',
  'CYBERWEAPONS':   'Cyberweapons',
  'EARS':           'Earware',
  'EYES':           'Eyeware',
  'HEADWEAR':       'Headware',
  'CYBERLIMBS':     'Cyberlimbs',
  'CYBERLIMB MODS': 'Cyberlimb Mods',
  'FEET':           'Feet',
  'HANDS':          'Hands',
  'MATRIXWARE':     'Matrixware',
  'RIGGER':         'Rigger',
  'SENSEWARE':      'Senseware',
  'NANOWARE':       'Nanoware',
  'VARIOUS':        'Various',
};

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseEssence(raw) {
  // Handles "0.10", ".025", "0.00", etc.
  const n = parseFloat(String(raw ?? '0').trim());
  return isNaN(n) ? 0 : Math.round(n * 1000) / 1000;
}

function parseCost(raw) {
  const s = String(raw ?? '0').replace(/[^\d]/g, '');
  return parseInt(s) || 0;
}

function parseFloat2(raw) {
  const n = parseFloat(String(raw ?? '0').trim());
  return isNaN(n) ? 0 : n;
}

// ── Convert ───────────────────────────────────────────────────────────────────

const out = [];
let idx = 0;

for (const [sectionKey, items] of Object.entries(raw)) {
  const cyberwareCategory = CATEGORY_LABELS[sectionKey] ?? sectionKey;

  for (const src of items) {
    const id = `sr3e-cyberware-${String(idx).padStart(4, '0')}`;
    idx++;

    out.push({
      _id: id,
      name: String(src.Name ?? '').trim(),
      type: 'cyberware',
      img: 'icons/svg/implant.svg',
      system: {
        cyberwareCategory,
        essenceCost:   parseEssence(src.EssCost),
        cost:          parseCost(src.Cost),
        availability:  String(src.Availability ?? '').trim(),
        streetIndex:   parseFloat2(src.StreetIndex),
        legalCode:     String(src.LegalCode ?? '').trim(),
        mods:          String(src.Mods ?? '').trim(),
        capacity:      parseFloat2(src.Capacity),
        isReplacement: src.Replacement === true,
        bookPage:      String(src.BookPage ?? '').trim(),
        grade:         'Standard',
        rating:        0,
        description:   String(src.Notes ?? '').trim(),
      },
    });
  }
}

const outPath = join(__dir, 'sr3e-cyberware-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

const counts = {};
for (const item of out) {
  const c = item.system.cyberwareCategory;
  counts[c] = (counts[c] ?? 0) + 1;
}
console.log(`Written ${out.length} items → ${outPath}`);
console.log('Breakdown:', counts);

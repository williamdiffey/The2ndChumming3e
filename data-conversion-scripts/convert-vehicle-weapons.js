#!/usr/bin/env node
// Converts rawdata/VehicleWeapons.json → sr3e-vehicle-weapons-compendium.json
// Availability and Street Index stored as strings — many entries use "GM".

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/VehicleWeapons.json'), 'utf8'));

const out = raw.map((src, idx) => ({
  _id: `sr3e-vehicleweapon-${String(idx).padStart(4, '0')}`,
  name: String(src.name ?? '').trim(),
  type: 'vehicleweapon',
  img: 'icons/svg/cannon.svg',
  system: {
    weaponType:   String(src.Type         ?? '').trim(),
    mode:         String(src.Mode         ?? '').trim(),
    damage:       String(src.Damage       ?? '').trim(),
    ammunition:   String(src.Ammunition   ?? '').trim(),
    weight:       parseFloat(String(src.Weight ?? '0').trim()) || 0,
    cost:         parseInt(String(src['$Cost'] ?? '0').replace(/[^\d]/g, '')) || 0,
    availability: String(src.Availability   ?? '').trim(),
    streetIndex:  String(src['Street Index'] ?? '').trim(),
    bookPage:     String(src['Book.Page']    ?? '').trim(),
    notes:        '',
  },
}));

const outPath = join(__dir, 'sr3e-vehicle-weapons-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

const byType = {};
for (const w of out) byType[w.system.weaponType] = (byType[w.system.weaponType] ?? 0) + 1;
console.log(`Written ${out.length} vehicle weapons → ${outPath}`);
console.log('By type:', byType);

#!/usr/bin/env node
// Converts rawdata/VehicleMods.json → sr3e-vehicle-mods-compendium.json
// Street Index stored as string — some entries use "GM" (GM's discretion).
// CF stored as string — one entry uses formula "3*Armor".
// Load stored as string — includes unit suffix (e.g. "15kg").

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/VehicleMods.json'), 'utf8'));

const out = raw.map((src, idx) => ({
  _id: `sr3e-vehiclemod-${String(idx).padStart(4, '0')}`,
  name: String(src.name ?? '').trim(),
  type: 'vehiclemod',
  img: 'icons/svg/upgrade.svg',
  system: {
    cost:             parseInt(String(src['$Cost'] ?? '0').replace(/[^\d]/g, '')) || 0,
    availability:     String(src['Availability']         ?? '').trim(),
    streetIndex:      String(src['Street Index']         ?? '').trim(),
    installEquipment: String(src['Equipment']            ?? '').trim(),
    installTime:      String(src['Base Time/Skill Test'] ?? '').trim(),
    cfCost:           String(src['CF']                   ?? '0').trim(),
    load:             String(src['Load']                 ?? '').trim(),
    bookPage:         String(src['Book.Page']            ?? '').trim(),
    description:      String(src['Notes']               ?? '').trim(),
  },
}));

const outPath = join(__dir, 'sr3e-vehicle-mods-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Written ${out.length} vehicle mods → ${outPath}`);

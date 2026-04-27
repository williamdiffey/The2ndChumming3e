#!/usr/bin/env node
// Converts rawdata/Drones.json → sr3e-drones-compendium.json
// Paired stats (X/Y) are split into separate fields.
// Bracketed alt-mode values like "90(45)/5(3)" are preserved in notes.
// Handling X/Y → handling (urban/normal) / handlingOffRoad.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/Drones.json'), 'utf8'));

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Strip bracketed alt-mode values and return the base number. "90(45)" → 90 */
function stripAlt(str) {
  return str?.replace(/\(.*?\)/g, '').trim();
}

/** True if a stat value has bracketed alt-mode data. */
function hasAlt(str) {
  return /\(/.test(str ?? '');
}

/** Parse "X/Y" compound field → [x, y]. Returns null for "-" or "*". */
function parsePair(raw) {
  const clean = (s) => {
    const t = stripAlt(s).trim();
    if (t === '-' || t === '*' || t === '') return null;
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  };
  if (!raw) return [null, null];
  const parts = raw.split('/');
  return [clean(parts[0] ?? ''), clean(parts[1] ?? '')];
}

function vAttr(val) {
  const v = val ?? 0;
  return { value: v, base: v };
}

// ── Convert ───────────────────────────────────────────────────────────────────

const out = raw.map((src, idx) => {
  const id = `sr3e-drone-${String(idx).padStart(4, '0')}`;

  const [handlingUrban, handlingOffRoad] = parsePair(src['Handling']);
  const [speed, accel]                  = parsePair(src['Speed/Accel']);
  const [body, armor]                   = parsePair(src['Body/Armor']);
  const [sig, autonav]                  = parsePair(src['Sig/Autonav']);
  const [pilot, sensor]                 = parsePair(src['Pilot/Sensor']);
  const [cargo, load]                   = parsePair(src['Cargo/Load']);

  const cost        = parseInt(String(src['$Cost'] ?? '0').replace(/[^\d]/g, '')) || 0;
  const streetIndex = parseFloat(String(src['Street Index'] ?? '0').trim()) || 0;

  // Collect alt-mode notes (e.g. amphibious submersible alternate stats)
  const altNotes = [];
  for (const [field, label] of [
    ['Speed/Accel', 'Speed/Accel'],
    ['Sig/Autonav', 'Sig/Autonav'],
    ['Body/Armor',  'Body/Armor'],
  ]) {
    if (hasAlt(src[field])) altNotes.push(`Alt-mode ${label}: ${src[field]}`);
  }

  let notes = String(src['Notes'] ?? '').trim();
  if (altNotes.length) notes = [notes, ...altNotes].filter(Boolean).join(' | ');

  return {
    _id: id,
    name: src.name,
    type: 'vehicle',
    img: 'icons/svg/drone.svg',
    system: {
      vehicleType:  'drone',
      cost,
      streetIndex,
      availability: String(src['Availability'] ?? '').trim(),
      seating:      0,
      bookPage:     String(src['Book.Page'] ?? '').trim(),
      notes,
      damage: { value: 0 },
      attributes: {
        handling:        vAttr(handlingUrban),
        handlingOffRoad: vAttr(handlingOffRoad ?? handlingUrban),
        speed:           vAttr(speed),
        accel:           vAttr(accel),
        body:            vAttr(body),
        armor:           vAttr(armor),
        sig:             vAttr(sig),
        autonav:         vAttr(autonav),
        pilot:           vAttr(pilot),
        sensor:          vAttr(sensor),
        cargo:           vAttr(cargo),
        load:            vAttr(load),
      },
    },
  };
});

const outPath = join(__dir, 'sr3e-drones-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log(`Written ${out.length} drones → ${outPath}`);

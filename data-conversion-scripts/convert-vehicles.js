#!/usr/bin/env node
// Converts rawdata/Vehicles.json → sr3e-vehicles-compendium.json
// Handles: X/Y stat pairs, alt-mode brackets, European comma-decimals,
// bracket PS cargo values, letter suffixes on armor/cargo, and
// keyword-based vehicleType classification.

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dir, '../rawdata/Vehicles.json'), 'utf8'));

// ── Type classifier ───────────────────────────────────────────────────────────

const MOTORCYCLE_SEATING = /\d+m/i;

const TYPE_KEYWORDS = [
  ['submarine', ['submarine', ' sub ', 'triton class', 'new hampshire', 'vaneyev', 'patrol sub', 'attack sub', 'locker', 'anago']],
  ['ship',      ['supercarrier', 'corvette', 'frigate', 'liner', 'merchantman', 'supercarrier', 'akihito', 'stuart class', 'aohana', 'jorgensen', 'electronaut']],
  ['boat',      ['marine ', 'riverine', 'hydro', 'tiburon', 'dolphin', 'watersport', 'marlin', 'seacop', 'swordsman', 'biohm', 'harland', 'otter ', 'cigarette', 'delphin', 'vodianoi']],
  ['hovercraft',['hovertruck', 'hovercraft', 'kvp-', 'skimmer', 'beachcraft', 'red ranger', 'patroller', 'vacationer']],
  ['airship',   ['airship', 'skyswimmer', 'goodyear', 'luftschiffbau', 'zeppelin', 'commuter-47', 'la-2049', 'la-2051']],
  ['fixedwing', ['suborbital', 'semiballistic', 'skytruck', 'china clipper', 'ilyushin', 'cessna', 'airbus', 'embraer', 'lear-cessna', 'mistral', 'nightglider', 'avenger', 'tendai', 'eagle ', 'banshee', 'harpy', 'bergen', 'halcon', 'raven', 'gd sv', 'lobo medium', 'aztech lobo', 'federated boeing', 'bac-dessault', 'fiat-fokker', 'cloud nine', 'platinum', 'a1570']],
  ['helicopter',['eurocopter', 'tiger ', 'sperber', 'argus', 'mosquito', 'northrup wasp', 'yellowjacket', 'ares dragon', 'hughes ', 'osprey', 'agusta', 'dorocilo', 'tsumukari', 'airstar', 'tr-55', 'doc wagon crt air', 'doc wagon srt', 'fed-boeing commuter', 'aguilar']],
  ['military',  ['apc', ' tank', 'afv', 'lav-', 'striker', 'leopard', 'falkener', 'frettchen', 'keller a', 'wolf ii', 'kreuzritter', 'semaphore', 'citymaster', 'mobmaster', 'roadmaster', 'black mariah', 'agincourt', 'appaloosa light scout', 'devil rat', 'hachiman', 'nizhinyi', 'bmv-2', 'scout lav']],
];

function classifyType(name, seating) {
  if (MOTORCYCLE_SEATING.test(seating ?? '')) return 'motorcycle';
  const lower = name.toLowerCase();
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some(k => lower.includes(k))) return type;
  }
  return 'car';
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Replace European comma-decimals with period, but only between digits. */
function fixComma(str) {
  return String(str ?? '').replace(/(\d),(\d)/g, '$1.$2');
}

/** Strip [bracketed PS values] from cargo strings. "4[84 PS]" → "4" */
function stripBrackets(str) {
  return str?.replace(/\[.*?\]/g, '').trim();
}

/** Strip bracketed alt-mode values. "90(45)" → "90" */
function stripAlt(str) {
  return str?.replace(/\(.*?\)/g, '').trim();
}

/** True if value contains alt-mode brackets or PS brackets. */
function hasExtra(str) {
  return /[(\[]/.test(str ?? '');
}

/** Strip trailing non-numeric suffixes from a stat value. "4P" → "4" */
function stripSuffix(str) {
  return String(str ?? '').replace(/[A-Za-z]+$/, '').trim();
}

/** Parse "X/Y" compound field → [x, y]. Null for "-", "*", or missing. */
function parsePair(raw) {
  const clean = (s) => {
    const t = stripSuffix(stripAlt(fixComma(s ?? ''))).trim();
    if (t === '-' || t === '*' || t === '') return null;
    const n = parseFloat(t);
    return isNaN(n) ? null : n;
  };
  if (!raw) return [null, null];
  const fixed = stripBrackets(fixComma(raw));
  const parts = fixed.split('/');
  return [clean(parts[0] ?? ''), clean(parts[1] ?? '')];
}

function vAttr(val) {
  const v = val ?? 0;
  return { value: v, base: v };
}

/** Sum all integers in a seating string. "1+2b" → 3, "124" → 124, "-" → 0 */
function parseSeating(raw) {
  if (!raw || raw.trim() === '-') return 0;
  const nums = (raw.match(/\d+/g) ?? []).map(Number);
  return nums.reduce((a, b) => a + b, 0);
}

// ── Convert ───────────────────────────────────────────────────────────────────

const out = raw.map((src, idx) => {
  const id = `sr3e-vehicle-${String(idx).padStart(4, '0')}`;

  const rawHandling  = src['Handling']    ?? '';
  const rawSpeedAccel = src['Speed/Accel'] ?? '';
  const rawBodyArmor = src['Body/Armor']  ?? '';
  const rawSigAuto   = src['Sig/Autonav'] ?? '';
  const rawPilotSens = src['Pilot/Sensor'] ?? '';
  const rawCargoLoad = src['Cargo/Load']  ?? '';
  const rawSeating   = String(src['Seating'] ?? '-').trim();

  const [handlingUrban, handlingOffRoad] = parsePair(rawHandling);
  const [speed, accel]                  = parsePair(rawSpeedAccel);
  const [body, armor]                   = parsePair(rawBodyArmor);
  const [sig, autonav]                  = parsePair(rawSigAuto);
  const [pilot, sensor]                 = parsePair(rawPilotSens);
  const [cargo, load]                   = parsePair(rawCargoLoad);

  const costRaw     = fixComma(String(src['$Cost'] ?? '0'));
  const cost        = parseInt(costRaw.replace(/[^\d]/g, '')) || 0;
  const siRaw       = fixComma(String(src['Street Index'] ?? '0'));
  const streetIndex = parseFloat(siRaw.replace(/[^\d.]/g, '')) || 0;
  const seating     = parseSeating(rawSeating);

  // Collect alt-mode / unusual notes
  const altNotes = [];
  if (hasExtra(rawSpeedAccel)) altNotes.push(`Alt-mode Speed/Accel: ${rawSpeedAccel}`);
  if (hasExtra(rawSigAuto))    altNotes.push(`Alt-mode Sig/Autonav: ${rawSigAuto}`);
  if (hasExtra(rawCargoLoad))  altNotes.push(`Alt-mode Cargo/Load: ${rawCargoLoad}`);
  if (hasExtra(rawBodyArmor))  altNotes.push(`Alt-mode Body/Armor: ${rawBodyArmor}`);
  if (hasExtra(rawPilotSens))  altNotes.push(`Alt-mode Pilot/Sensor: ${rawPilotSens}`);
  // Preserve complex seating descriptions
  if (/[a-zA-Z+]/.test(rawSeating) && rawSeating !== '-') {
    altNotes.push(`Seating: ${rawSeating}`);
  }

  let notes = String(src['Notes'] ?? '').trim();
  if (altNotes.length) notes = [notes, ...altNotes].filter(Boolean).join(' | ');

  const vehicleType = classifyType(src.name ?? '', rawSeating);

  return {
    _id: id,
    name: src.name,
    type: 'vehicle',
    img: 'icons/svg/vehicle.svg',
    system: {
      vehicleType,
      cost,
      streetIndex,
      availability: String(src['Availability'] ?? '').trim(),
      bookPage:     String(src['Book.Page'] ?? '').trim(),
      seating,
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

const outPath = join(__dir, 'sr3e-vehicles-compendium.json');
writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

// Summary of type distribution
const counts = {};
for (const v of out) counts[v.system.vehicleType] = (counts[v.system.vehicleType] ?? 0) + 1;
console.log(`Written ${out.length} vehicles → ${outPath}`);
console.log('Type breakdown:', counts);

// ════════════════════════════════════════════════════════════════════════════
//  Nullsheen.com SR3 Character JSON → The 2nd Chumming 3e Importer
//  Run this macro, then paste the JSON exported from nullsheen.com.
//  Supports: attributes, skills, gear, weapons, armor, ammo, cyberware,
//            bioware, spells, adept powers.
//  Vehicles are noted but not imported (create them manually).
// ════════════════════════════════════════════════════════════════════════════

// ── Lookup tables ────────────────────────────────────────────────────────────

const ATTR_MAP = {
  QCK: 'quickness', STR: 'strength',    CHA: 'charisma',
  INT: 'intelligence', WIL: 'willpower', BOD: 'body',    REA: 'reaction',
};

// Fallback linked-attribute for active skills missing an attribute code
const SKILL_ATTR_FALLBACK = {
  Biotech:    'intelligence',
  Athletics:  'quickness',
  Bike:       'reaction',
  Stealth:    'quickness',
  Swimming:   'quickness',
  Climbing:   'quickness',
  Running:    'quickness',
  Driving:    'reaction',
  Pilot:      'reaction',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function _num(v, fallback = 0)  { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
function _int(v, fallback = 0)  { const n = parseInt(v);   return isNaN(n) ? fallback : n; }
function _str(v)                { return v != null ? String(v) : ''; }

/** Pull the firearm category code out of a name like "Morrissey Alta (HPist)" */
function _fireCat(name) {
  const m = (name ?? '').match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : '';
}

// ── Item builders ─────────────────────────────────────────────────────────────

function _skillItem(s) {
  const attr = ATTR_MAP[s.attribute ?? ''] ?? SKILL_ATTR_FALLBACK[s.name] ?? 'intelligence';
  const cat  = s.type === 'Active' ? 'active'
             : s.type === 'Language' ? 'language'
             : 'knowledge';
  return {
    name: s.name,
    type: 'skill',
    system: {
      skillName:       s.name,
      rating:          _int(s.rating),
      linkedAttribute: attr,
      specialisation:  _str(s.specialization),
      category:        cat,
    },
  };
}

function _gearItems(gear) {
  const items = [];
  for (const g of gear ?? []) {
    const qty      = Math.max(1, _int(g.Amount, 1));
    const type     = _str(g.Type);
    const balStr   = _str(g.Ballistic);
    const impStr   = _str(g.Impact);
    const hasBal   = balStr !== '' && balStr !== '-' && !isNaN(parseFloat(balStr));

    if (type === 'Firearms') {
      items.push({
        name: g.Name,
        type: 'firearm',
        system: {
          category:       _fireCat(g.Name),
          concealability: _str(g.Concealability),
          ammunition:     _str(g.Ammunition),
          mode:           _str(g.Mode),
          damage:         _str(g.Damage),
          weight:         _num(g.Weight),
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          accessories:    _str(g.Accessories),
          bookPage:       _str(g.BookPage),
        },
      });

    } else if (type === 'Clothing and Armor' && hasBal) {
      items.push({
        name: g.Name,
        type: 'armor',
        system: {
          concealability: _str(g.Concealability),
          ballistic:      Math.round(_num(balStr)),
          impact:         Math.round(_num(impStr)),
          weight:         _num(g.Weight),
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          bookPage:       _str(g.BookPage),
        },
      });

    } else if (type === 'Ammunition') {
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'ammunition',
        system: {
          concealability: _str(g.Concealability),
          damage:         _str(g.Damage),
          weight:         _num(g.Weight) * qty,
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          bookPage:       _str(g.BookPage),
        },
      });

    } else {
      // Plain gear: clothing without armour stats, drugs, misc
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'gear',
        system: {
          quantity: qty,
          cost:     _int(g.Cost),
          weight:   _num(g.Weight) * qty,
        },
      });
    }
  }
  return items;
}

/** Weapons array (separate from gear) — handles both firearm and melee entries */
function _weaponItems(weapons) {
  return (weapons ?? []).map(w => {
    const name = _str(w.Name ?? w.name);
    const hasReach = w.Reach != null || w.reach != null;
    const wtype = _str(w.Type ?? w.type).toLowerCase();

    if (wtype === 'melee' || hasReach) {
      return {
        name,
        type: 'melee',
        system: {
          category:       _str(w.Category ?? w.category),
          concealability: _str(w.Concealability),
          reach:          _int(w.Reach ?? w.reach),
          damage:         _str(w.Damage ?? w.damage),
          weight:         _num(w.Weight ?? w.weight),
          availability:   _str(w.Availability),
          cost:           _int(w.Cost ?? w.cost),
          streetIndex:    _str(w['Street Index'] ?? w.streetIndex),
          bookPage:       _str(w.BookPage ?? w.bookPage),
        },
      };
    }
    return {
      name,
      type: 'firearm',
      system: {
        category:       _fireCat(name),
        concealability: _str(w.Concealability),
        ammunition:     _str(w.Ammunition),
        mode:           _str(w.Mode),
        damage:         _str(w.Damage ?? w.damage),
        weight:         _num(w.Weight ?? w.weight),
        availability:   _str(w.Availability),
        cost:           _int(w.Cost ?? w.cost),
        streetIndex:    _str(w['Street Index'] ?? w.streetIndex),
        bookPage:       _str(w.BookPage ?? w.bookPage),
      },
    };
  });
}

// ── Dialog ────────────────────────────────────────────────────────────────────

let jsonText = '';
await foundry.applications.api.DialogV2.wait({
  window: { title: 'Import Nullsheen 3e Character' },
  content: `
    <p style="margin:0 0 4px;font-size:13px">
      Go to <strong>nullsheen.com</strong>, build your character, then use
      <em>Export → JSON</em>. Paste the result below:
    </p>
    <textarea id="sr3json"
      style="width:100%;height:280px;font-size:11px;font-family:monospace;
             background:#111;color:#ccc;border:1px solid #444;border-radius:4px;
             padding:6px;box-sizing:border-box"
      placeholder='{ "street_name": "...", "skills": [...], "gear": [...] }'></textarea>
    <p style="margin:6px 0 0;font-size:11px;color:#888">
      Imports: attributes · skills · gear · weapons · armor · ammo ·
      cyberware · bioware · spells · adept powers
    </p>`,
  buttons: [
    {
      label: 'Import',
      action: 'import',
      default: true,
      callback: (_e, _b, dialog) => {
        jsonText = dialog.element.querySelector('#sr3json')?.value ?? '';
      },
    },
    { label: 'Cancel', action: 'cancel' },
  ],
});

if (!jsonText.trim()) return;

let cj;
try { cj = JSON.parse(jsonText); }
catch (e) { return void ui.notifications.error(`SR3 Import — invalid JSON: ${e.message}`); }

// ── Build actor data ──────────────────────────────────────────────────────────

const a     = cj.attributes ?? {};
const nuyen = Math.max(0, _int(cj.chargenCash) - _int(cj.cashSpent)) + _int(cj.cash);

const actorData = {
  name: (_str(cj.street_name) || _str(cj.name) || 'Imported Character').trim(),
  type: 'character',
  system: {
    age:       _str(cj.age),
    metatype:  (_str(cj.race) || 'human').toLowerCase(),
    nuyen,
    karma:     _int(cj.karma),
    karmaPool: _int(cj.karmaPool),
    notes:     cj.notes     ? `<p>${cj.notes}</p>`     : '',
    biography: cj.description ? `<p>${cj.description}</p>` : '',
    attributes: {
      body:         { base: a.Body         ?? 3, value: a.Body         ?? 3 },
      quickness:    { base: a.Quickness    ?? 3, value: a.Quickness    ?? 3 },
      strength:     { base: a.Strength     ?? 3, value: a.Strength     ?? 3 },
      charisma:     { base: a.Charisma     ?? 3, value: a.Charisma     ?? 3 },
      intelligence: { base: a.Intelligence ?? 3, value: a.Intelligence ?? 3 },
      willpower:    { base: a.Willpower    ?? 3, value: a.Willpower    ?? 3 },
      // essence.value is re-derived from cyberware costs by prepareDerivedData
      essence:      { base: 6, value: 6 },
      magic:        { base: a.Magic        ?? 0, value: a.Magic        ?? 0 },
      reaction:     { base: a.Reaction     ?? 3, value: a.Reaction     ?? 3 },
    },
  },
};

// Awakened / Adept flags
if (cj.magical && (a.Magic ?? 0) > 0) {
  const trad = typeof cj.magicalTradition === 'string' ? cj.magicalTradition : '';
  actorData.system.magicTradition = trad;
  actorData.system.magicType = 'Full';
} else if (cj.adept && (a.Magic ?? 0) > 0) {
  actorData.system.magicType = 'Adept';
}

// ── Create actor ──────────────────────────────────────────────────────────────

const actor = await Actor.create(actorData);
if (!actor) return void ui.notifications.error('SR3 Import — failed to create actor.');

// ── Collect items ─────────────────────────────────────────────────────────────

const items = [];

for (const s of cj.skills   ?? []) items.push(_skillItem(s));
items.push(..._gearItems(cj.gear));
items.push(..._weaponItems(cj.weapons));

for (const c of cj.cyberware ?? []) {
  items.push({
    name: c.Name,
    type: 'cyberware',
    system: {
      essenceCost:       _num(c.EssCost ?? c.essCost, 0.5),
      grade:             _str(c.Grade) || 'Standard',
      cost:              _int(c.Cost),
      availability:      _str(c.Availability),
      streetIndex:       _num(c.StreetIndex ?? c['Street Index']),
      legalCode:         _str(c.LegalCode),
      mods:              _str(c.Mods),
      capacity:          _num(c.Capacity),
      cyberwareCategory: _str(c.Category),
      bookPage:          _str(c.BookPage),
    },
  });
}

for (const b of cj.bioware ?? []) {
  items.push({
    name: b.Name,
    type: 'bioware',
    system: {
      bioIndex:         _num(b.BioIndex ?? b.EssCost, 0.25),
      grade:            _str(b.Grade) || 'Standard',
      cost:             _int(b.Cost),
      availability:     _str(b.Availability),
      streetIndex:      _num(b.StreetIndex ?? b['Street Index']),
      mods:             _str(b.Mods),
      biowareCategory:  _str(b.Category),
      bookPage:         _str(b.BookPage),
    },
  });
}

for (const sp of cj.spells ?? []) {
  items.push({
    name: _str(sp.name),
    type: 'spell',
    system: {
      category: _str(sp.category),
      type:     _str(sp.type)     || 'Physical',
      range:    _str(sp.range)    || 'LOS',
      damage:   _str(sp.damage),
      duration: _str(sp.duration) || 'Instant',
      drain:    _str(sp.drain),
      target:   _str(sp.target),
      bookPage: _str(sp.bookPage ?? sp.BookPage),
    },
  });
}

for (const pw of cj.powers ?? []) {
  items.push({
    name: _str(pw.name),
    type: 'adeptpower',
    system: {
      powerCost: _num(pw.powerCost ?? pw.cost, 0.5),
      hasLevels: pw.hasLevels ?? false,
      level:     _int(pw.level, 1),
      mods:      _str(pw.mods),
      bookPage:  _str(pw.bookPage ?? pw.BookPage),
    },
  });
}

// ── Embed items ───────────────────────────────────────────────────────────────

const created = await actor.createEmbeddedDocuments('Item', items);

// ── Auto-equip the highest-ballistic armor piece ──────────────────────────────

const armorItems = created.filter(i => i.type === 'armor');
if (armorItems.length) {
  const best = armorItems.reduce((a, b) =>
    (b.system.ballistic ?? 0) > (a.system.ballistic ?? 0) ? b : a);
  await actor.update({ 'system.equippedArmor': best.id });
}

// ── Summary notification ──────────────────────────────────────────────────────

const count    = t => created.filter(i => i.type === t).length;
const weapons  = ['firearm', 'melee', 'projectile', 'thrown'].reduce((n, t) => n + count(t), 0);
const vehicles = (cj.vehicles ?? []).length;

ui.notifications.info(
  `Imported "${actor.name}": ` +
  `${count('skill')} skills · ${weapons} weapons · ${count('armor')} armor · ` +
  `${count('ammunition')} ammo · ${count('gear')} gear · ` +
  `${count('cyberware')} cyber · ${count('bioware')} bio · ` +
  `${count('spell')} spells · ${count('adeptpower')} powers` +
  (vehicles ? ` — ${vehicles} vehicle(s) not imported, create manually` : '')
);

actor.sheet.render(true);

// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Sample Characters Compendium Populator
//  Paste into a Foundry macro (Type: Script) and run once.
//  Requires a full Foundry restart after updating system.json so that
//  the "Sample Characters" compendium pack is registered.
// ════════════════════════════════════════════════════════════════════════════

const PACK_ID = 'The2ndChumming3e.sr3e-sample-characters';

// ── Item builder helpers ──────────────────────────────────────────────────────

function skill(name, rating, linkedAttribute, category = 'active', specialisation = '') {
  return { name, type: 'skill', system: { skillName: name, rating, linkedAttribute, category, specialisation } };
}

function firearm(name, category, damage, mode, ammunition, concealability = '', cost = 0, accessories = '') {
  return { name, type: 'firearm', system: { category, damage, mode, ammunition, concealability, cost, accessories } };
}

function melee(name, category, damage, reach, concealability = '', cost = 0) {
  return { name, type: 'melee', system: { category, damage, reach, concealability, cost } };
}

function armor(name, ballistic, impact, concealability = '', cost = 0) {
  return { name, type: 'armor', system: { ballistic, impact, concealability, cost } };
}

function cyberware(name, essenceCost, grade = 'Standard', cyberwareCategory = '', cost = 0) {
  return { name, type: 'cyberware', system: { essenceCost, grade, cyberwareCategory, cost } };
}

function gear(name, quantity = 1, cost = 0) {
  return { name, type: 'gear', system: { quantity, cost } };
}

function spell(name, category, type, range, damage, duration, drain) {
  return { name, type: 'spell', system: { category, type, range, damage, duration, drain } };
}

function adeptpower(name, powerCost, hasLevels = false, level = 1, mods = '') {
  return { name, type: 'adeptpower', system: { powerCost, hasLevels, level, mods } };
}

function ammo(name, cost = 0) {
  return { name, type: 'ammunition', system: { cost } };
}

function program(name, rating, category = 'Operational', degradable = false) {
  return { name, type: 'program', system: { rating, category, degradable } };
}

function cyberdeck(name, mpcp = 0, cost = 0) {
  return { name, type: 'cyberdeck', system: { attributes: { mpcp: { value: mpcp, base: mpcp } }, cost } };
}

// ── Characters ────────────────────────────────────────────────────────────────

const CHARACTERS = [

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Jade "Chrome" Nakamura — Street Samurai (Human)
  //    The close-protection specialist. Wired Reflexes 1 gives her REA 6 and
  //    2d6 initiative. Combat Pool 7, quick and hard to kill.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Jade "Chrome" Nakamura',
    type: 'character',
    system: {
      metatype:   'human',
      gender:     'female',
      age:        '28',
      nuyen:      42000,
      karma:      5,
      totalKarma: 50,
      biography: `<p>Former Lone Star patrol officer — decorated twice and burned out once. Three tours in the Barrens taught her that law is a service available only to those who can pay for it. Now she runs the shadows: same job, better pay, nobody pretending it's about justice.</p><p>Specialises in close protection and wet work. Doesn't like being lied to.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 7 · <strong>Initiative:</strong> 6 + 2d6 (Wired Reflexes 1)<br><strong>Essence:</strong> 3.75 (WR1 −2.0, Smartlink −0.25)<br><strong>Tip:</strong> Equip Armor Jacket and Combat Knife from the Items tab before play.</p>`,
      attributes: {
        body:         { base: 5, value: 5 },
        quickness:    { base: 6, value: 6 },
        strength:     { base: 4, value: 4 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 4, value: 4 },
        willpower:    { base: 4, value: 4 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: {
          base: 5, value: 6,
          reactionBonus: 1,  // Wired Reflexes 1
          diceBonus:     1,  // Wired Reflexes 1
          override: false, force: 0,
        },
      },
    },
    items: [
      // Active skills
      skill('Pistols',        6, 'quickness',    'active', 'Heavy Pistols'),
      skill('SMG',            5, 'quickness',    'active'),
      skill('Armed Combat',   5, 'quickness',    'active', 'Edged Weapons'),
      skill('Unarmed Combat', 4, 'quickness',    'active'),
      skill('Athletics',      5, 'quickness',    'active'),
      skill('Stealth',        5, 'quickness',    'active'),
      skill('Intimidation',   4, 'charisma',     'active'),
      skill('Car',            3, 'reaction',     'active'),
      skill('First Aid',      3, 'intelligence', 'active'),
      // Knowledge
      skill('Lone Star Procedures', 5, 'intelligence', 'knowledge'),
      skill('Sprawl Gangs',         4, 'intelligence', 'knowledge'),
      skill('English',              5, 'intelligence', 'language'),
      skill('Japanese',             3, 'intelligence', 'language'),
      // Weapons
      firearm('Ares Predator II', 'HPist', '9M',  'SA',          '15(c)',  '5', 550),
      firearm('HK MP-5 TX',       'SMG',   '7M',  'SA/BF/FA',   '30(c)',  '4', 2000),
      melee('Combat Knife',       'EDG',   '5M',  0,             '5',      75),
      // Armor
      armor('Armor Jacket', 5, 3, '-', 900),
      // Ammo
      ammo('Ex-Explosive Rounds ×30', 60),
      ammo('Hollow Point ×60',        40),
      // Cyberware — essence costs sum to 2.25; derived value = 3.75
      cyberware('Wired Reflexes 1', 2.00, 'Standard', 'Headware', 55000),
      cyberware('Smartlink',        0.25, 'Alpha',    'Headware',  3200),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. "Ghost" — Decker (Elf)
  //    The data thief. INT 6, Computer/Decking 7/6, Fuchi Cyber-7 deck.
  //    Light on combat stats; needs cover while jacked in.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Ghost"',
    type: 'character',
    system: {
      metatype:   'elf',
      gender:     '',
      age:        '32',
      nuyen:      18000,
      karma:      8,
      totalKarma: 45,
      biography: `<p>Nobody knows Ghost's real name. Eleven years running data through some of the most hostile corporate networks on the eastern seaboard. Three megacorps audited, two SINs burned, one very expensive price on a very anonymous head.</p><p>Works alone. Pays well. Trusts nobody — which has kept them alive this long.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 7 · <strong>Initiative:</strong> 5 + 1d6<br><strong>Essence:</strong> 5.9 (Datajack Alpha −0.1)<br><strong>Tip:</strong> Equip Armored Clothing from the Items tab. The Fuchi Cyber-7 cyberdeck appears on the Matrix tab.</p>`,
      attributes: {
        body:         { base: 3, value: 3 },
        quickness:    { base: 5, value: 5 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 4, value: 4 },
        intelligence: { base: 6, value: 6 },
        willpower:    { base: 4, value: 4 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: { base: 5, value: 5, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Computer',     7, 'intelligence', 'active'),
      skill('Decking',      6, 'intelligence', 'active'),
      skill('Electronics',  5, 'intelligence', 'active'),
      skill('Stealth',      4, 'quickness',    'active'),
      skill('Pistols',      4, 'quickness',    'active'),
      skill('Negotiations', 5, 'charisma',     'active'),
      skill('Etiquette',    4, 'charisma',     'active'),
      // Knowledge
      skill('Corporate Security Protocols', 5, 'intelligence', 'knowledge'),
      skill('Seattle Matrix Topology',      4, 'intelligence', 'knowledge'),
      skill('Seattle Underworld',           3, 'intelligence', 'knowledge'),
      skill('English',                      6, 'intelligence', 'language'),
      skill('Japanese',                     4, 'intelligence', 'language'),
      // Weapons
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      // Armor
      armor('Armored Clothing', 3, 2, '-', 700),
      // Cyberware — essence cost 0.1; derived value = 5.9
      cyberware('Datajack', 0.1, 'Alpha', 'Headware', 1000),
      // Deck & programs
      cyberdeck('Fuchi Cyber-7', 7, 120000),
      // Gear
      gear('Optical Memory Chips ×10', 10, 100),
      gear('Jammer Rating 6',           1, 3000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Sister Maria Reyes — Hermetic Mage (Human)
  //    Full mage: Sorcery 7, Spell Pool 9, Astral Pool 5.
  //    Six spells covering offence, illusion, manipulation, detection, heal.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Sister Maria Reyes',
    type: 'character',
    system: {
      metatype:       'human',
      gender:         'female',
      age:            '45',
      nuyen:          28000,
      karma:          12,
      totalKarma:     55,
      magicTradition: 'Hermetic',
      magicType:      'Full',
      biography: `<p>Retired Professor of Applied Thaumatology, Aztechnology-Sponsored Institute of Seattle. When the corporation asset-stripped her department and sold fifteen years of graduate research without attribution or compensation, she burned her tenure papers and started accepting paid consultancy — for different clients.</p><p>Quiet, precise, and possessed of an academic's patience for detail. Very bad at suffering fools.</p>`,
      notes: `<p><strong>Spell Pool:</strong> 9 · <strong>Astral Pool:</strong> 5 · <strong>Combat Pool:</strong> 7<br><strong>Initiative:</strong> 4 + 1d6 · <strong>Essence:</strong> 6 (no cyberware)<br><strong>Tip:</strong> Equip Armored Clothing. Power Focus and Sustaining Focus are in gear — handle as foci once focus rules are implemented.</p>`,
      attributes: {
        body:         { base: 3, value: 3 },
        quickness:    { base: 3, value: 3 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 4, value: 4 },
        intelligence: { base: 6, value: 6 },
        willpower:    { base: 6, value: 6 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 6, value: 6 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Sorcery',      7, 'intelligence', 'active'),
      skill('Conjuring',    5, 'intelligence', 'active'),
      skill('Aura Reading', 5, 'intelligence', 'active'),
      skill('Negotiations', 5, 'charisma',     'active'),
      skill('Etiquette',    4, 'charisma',     'active'),
      skill('Computer',     4, 'intelligence', 'active'),
      skill('Pistols',      2, 'quickness',    'active'),
      // Knowledge
      skill('Hermetic Theory',    6, 'intelligence', 'knowledge'),
      skill('Arcane History',     4, 'intelligence', 'knowledge'),
      skill('Corporate Law',      4, 'intelligence', 'knowledge'),
      skill('Aztechnology (Int)', 5, 'intelligence', 'knowledge'),
      skill('English',            6, 'intelligence', 'language'),
      skill('Latin',              4, 'intelligence', 'language'),
      skill('Spanish',            3, 'intelligence', 'language'),
      // Spells
      spell('Manabolt',       'Combat',       'Mana',     'LOS',   'S', 'Instant',   '(F/2+1)S'),
      spell('Stunball',       'Combat',       'Mana',     'LOS',   'M', 'Instant',   '(F/2+1)S'),
      spell('Levitate',       'Manipulation', 'Physical', 'LOS',   '',  'Sustained', '(F/2)S'),
      spell('Invisibility',   'Illusion',     'Physical', 'LOS',   '',  'Sustained', '(F/2)S'),
      spell('Heal',           'Health',       'Mana',     'Touch', '',  'Permanent', '(F/2)S'),
      spell('Detect Enemies', 'Detection',    'Mana',     'Self',  '',  'Sustained', '(F/2)S'),
      // Weapons & armor
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      armor('Armored Clothing', 3, 2, '-', 700),
      // Gear (foci — handle manually until focus sheet support is added)
      gear('Power Focus Rating 3',      1, 45000),
      gear('Sustaining Focus Rating 3', 1, 45000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. "Razorblade" Rivera — Physical Adept (Ork)
  //    The tank. MAG 5 = 5 power points spent across six powers.
  //    Improved Reflexes 1 gives +1 REA and +1d6 initiative.
  //    Enhanced Strength 1 raises effective STR to 7 for damage codes.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Razorblade" Rivera',
    type: 'character',
    system: {
      metatype:   'ork',
      gender:     'male',
      age:        '24',
      nuyen:      15000,
      karma:      3,
      totalKarma: 40,
      magicType:  'Adept',
      biography: `<p>Former Halloweeners enforcer. Woke up in a Puyallup Barrens gutter one morning with a head full of magic and a body that flat-out refused to quit. Spent two years figuring out what he'd become. Now he hires out — muscle, extraction, the kind of job where talking has already failed.</p><p>Doesn't like guns. Uses them anyway when he has to.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 7 · <strong>Initiative:</strong> 5 + 2d6 (Improved Reflexes 1)<br><strong>Essence:</strong> 6 (no cyberware — adept) · <strong>Power Points:</strong> 5/5 spent<br><strong>Effective STR:</strong> 7 (Enhanced Strength 1) — knife 8M, mono whip 9M<br><strong>Tip:</strong> Equip Armor Jacket and Monofilament Whip from the Items tab.</p>`,
      attributes: {
        body:         { base: 6, value: 6 },
        quickness:    { base: 5, value: 5 },
        strength:     { base: 6, value: 6, force: 1 },  // Enhanced Strength 1 adds 1 via adept force
        charisma:     { base: 2, value: 2 },
        intelligence: { base: 4, value: 4 },
        willpower:    { base: 5, value: 5 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 5, value: 5 },
        reaction: {
          base: 4, value: 5,
          reactionBonus: 1,  // Improved Reflexes 1
          diceBonus:     1,  // Improved Reflexes 1
          override: false, force: 0,
        },
      },
    },
    items: [
      // Active skills
      skill('Unarmed Combat', 7, 'quickness',    'active'),
      skill('Armed Combat',   6, 'quickness',    'active', 'Monofilament Whip'),
      skill('Athletics',      6, 'quickness',    'active'),
      skill('Stealth',        5, 'quickness',    'active'),
      skill('Intimidation',   5, 'charisma',     'active'),
      // Knowledge
      skill('Gang Operations',  4, 'intelligence', 'knowledge'),
      skill('Seattle Barrens',  4, 'intelligence', 'knowledge'),
      skill('English',          4, 'intelligence', 'language'),
      skill('Or\'zet',          3, 'intelligence', 'language'),
      // Adept powers — total PP spent: 0.5+1.0+1.5+1.0+0.5+0.5 = 5.0
      adeptpower('Killing Hands',             0.5, false, 1,  'Physical damage, unarmed'),
      adeptpower('Bone Density Augmentation', 0.5, true,  2,  '+2 BOD vs. damage resistance, +2 impact armour'),
      adeptpower('Improved Reflexes',         1.5, true,  1,  '+1 REA, +1d6 initiative'),
      adeptpower('Pain Resistance',           0.5, true,  2,  'Ignore 2 wound boxes of penalties'),
      adeptpower('Mystic Armor',              0.5, true,  1,  '+1 impact armour rating'),
      adeptpower('Enhanced Strength',         0.5, true,  1,  '+1 STR (tracked via STR force field)'),
      // Weapons — damage codes use effective STR 7 (base 6 + Enhanced Strength 1)
      melee('Monofilament Whip', 'WHP', '9M', 1,  '8', 12000),
      melee('Combat Knife',      'EDG', '8M', 0,  '5',    75),
      firearm('Ares Predator II', 'HPist', '9M', 'SA', '15(c)', '5', 550),
      // Armor
      armor('Armor Jacket', 5, 3, '-', 900),
      // Ammo
      ammo('Hollow Point ×30', 40),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Konstantin "Kay" Voronov — Face / Fixer (Human)
  //    The negotiator. CHA 7, Negotiations 7, Etiquette 6.
  //    Former Aztechnology Regional Director with a briefcase full of secrets.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Konstantin "Kay" Voronov',
    type: 'character',
    system: {
      metatype:   'human',
      gender:     'male',
      age:        '38',
      nuyen:      65000,
      karma:      15,
      totalKarma: 60,
      biography: `<p>Fifteen years climbing Aztechnology's corporate ladder. Regional Director, Pacific Northwest Resource Extraction, Grade 7. Three months after filing an internal ethics report on human-rights abuses in the Seattle arcology, he was reassigned to a Siberian mineral extraction posting. He did not report for duty.</p><p>Now he brokers runs for people who know how to keep secrets, using skills that took fifteen years to develop and information that Aztechnology would pay considerably to suppress.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 7 · <strong>Initiative:</strong> 4 + 1d6<br><strong>Essence:</strong> 5.8 (Datajack Standard −0.2)<br><strong>Tip:</strong> Equip Lined Coat from the Items tab. Kay is best kept out of firefights; his value is information and contacts.</p>`,
      attributes: {
        body:         { base: 3, value: 3 },
        quickness:    { base: 3, value: 3 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 7, value: 7 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 5, value: 5 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Negotiations',  7, 'charisma',     'active'),
      skill('Etiquette',     6, 'charisma',     'active', 'Corporate'),
      skill('Leadership',    5, 'charisma',     'active'),
      skill('Intimidation',  4, 'charisma',     'active'),
      skill('Pistols',       4, 'quickness',    'active'),
      skill('Stealth',       3, 'quickness',    'active'),
      skill('Computer',      4, 'intelligence', 'active'),
      // Knowledge
      skill('Corporate Secrets (Aztechnology)', 6, 'intelligence', 'knowledge'),
      skill('Corporate Hierarchy',              5, 'intelligence', 'knowledge'),
      skill('Seattle Politics',                 5, 'intelligence', 'knowledge'),
      skill('Corporate Law',                    4, 'intelligence', 'knowledge'),
      skill('English',                          6, 'intelligence', 'language'),
      skill('Russian',                          5, 'intelligence', 'language'),
      skill('Japanese',                         4, 'intelligence', 'language'),
      // Weapons
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      // Armor
      armor('Lined Coat', 4, 2, '4', 700),
      // Cyberware — essence cost 0.2; derived value = 5.8
      cyberware('Datajack', 0.2, 'Standard', 'Headware', 500),
      // Gear
      gear('Encrypted Commlink', 1, 2500),
      gear('Fake SIN Rating 4',  1, 4000),
    ],
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(
    `SR3E: Sample Characters pack not found (${PACK_ID}). ` +
    `Make sure Foundry was fully restarted after adding the pack to system.json.`
  );
  return;
}

// Warn if already populated
const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Sample Characters — Already Populated' },
    content: `<p>The compendium already contains <strong>${existing.length}</strong> document(s).</p>
              <p>Re-running will create duplicates. Continue anyway?</p>`,
    buttons: [
      {
        label: 'Yes, create anyway',
        action: 'yes',
        default: false,
        callback: () => { proceed = true; },
      },
      { label: 'Cancel', action: 'cancel', default: true },
    ],
  });
  if (!proceed) return;
}

await pack.configure({ locked: false });

let created = 0;
for (const charData of CHARACTERS) {
  try {
    const { items = [], ...actorData } = charData;
    const tmpActor = await Actor.create(actorData, { renderSheet: false });
    if (items.length) await tmpActor.createEmbeddedDocuments('Item', items);
    await pack.importDocument(tmpActor);
    await tmpActor.delete();
    created++;
  } catch (err) {
    console.error(`SR3E | Failed to create "${charData.name}":`, err);
    ui.notifications.warn(`SR3E: Failed to create "${charData.name}" — see console (F12) for details.`);
  }
}

await pack.configure({ locked: true });

ui.notifications.info(
  created === CHARACTERS.length
    ? `SR3E: ${created} sample characters added to the compendium.`
    : `SR3E: ${created}/${CHARACTERS.length} created — ${CHARACTERS.length - created} failed (check console).`
);

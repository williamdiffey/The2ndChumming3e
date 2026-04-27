// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Sample Characters Compendium Populator (Batch 2)
//  Run AFTER populate-sample-characters.js (or independently — both target
//  the same compendium and will warn on duplicates).
//
//  Characters 6–14:
//    6.  Delilah "Deli" Hawkes      — Coyote Shaman      (Human)
//    7.  Thomas Greyhorse           — Wolf Shaman         (Human)
//    8.  "Void" Eilidh MacAllister  — Hermetic Conjurer   (Elf)
//    9.  "Ironwood" Mbeki           — Gator Shaman        (Troll)
//   10.  "Gearshift" Nikolai Petrov — Ground Rigger       (Human)
//   11.  "Overwatch" Maya Chen      — Combat Drone Rigger (Dwarf)
//   12.  "Shadowstep"               — Stealth Decker      (Human)
//   13.  "Jackhammer"               — Combat Decker       (Ork)
//   14.  "Packrat" Vera Okonkwo     — Gear-Heavy Decker   (Dwarf)
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
  // 6. Delilah "Deli" Hawkes — Coyote Shaman (Human)
  //    The trickster. CHA 6, illusion and mental manipulation spells.
  //    Coyote totem: +2 dice for Illusion spells, −2 for Health spells.
  //    Best deployment: social infiltration backed by magical misdirection.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Delilah "Deli" Hawkes',
    type: 'character',
    system: {
      metatype:       'human',
      gender:         'female',
      age:            '31',
      nuyen:          22000,
      karma:          10,
      totalKarma:     48,
      magicTradition: 'Shamanic',
      magicType:      'Full',
      magicTotem:     'Coyote',
      biography: `<p>Grifter before she was a shaman. Running con jobs from Tacoma to Everett when the magic woke up — she thought she was just getting better at reading marks until she realised she was actually rewriting what they saw. Coyote found her first, which explains a lot about her personality.</p><p>Does not distinguish clearly between "illusion spell" and "talking her way out of it". Both work. Why pick one?</p>`,
      notes: `<p><strong>Spell Pool:</strong> 8 · <strong>Astral Pool:</strong> 5 · <strong>Combat Pool:</strong> 7<br><strong>Initiative:</strong> 4 + 1d6 · <strong>Essence:</strong> 6 (no cyberware)<br><strong>Totem:</strong> Coyote — +2 dice to Illusion spells, −2 dice to Health spells.<br><strong>Tip:</strong> Equip Armored Clothing. Use Mask and Improved Invisibility to put the team in position before a fight starts.</p>`,
      attributes: {
        body:         { base: 3, value: 3 },
        quickness:    { base: 4, value: 4 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 6, value: 6 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 5, value: 5 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 6, value: 6 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Sorcery',          6, 'intelligence', 'active'),
      skill('Conjuring',        7, 'intelligence', 'active'),
      skill('Aura Reading',     5, 'intelligence', 'active'),
      skill('Negotiations',     6, 'charisma',     'active'),
      skill('Etiquette',        5, 'charisma',     'active', 'Street'),
      skill('Con',              5, 'charisma',     'active'),
      skill('Stealth',          4, 'quickness',    'active'),
      skill('Pistols',          2, 'quickness',    'active'),
      // Knowledge
      skill('Con Artistry',     6, 'intelligence', 'knowledge'),
      skill('Seattle Fences',   4, 'intelligence', 'knowledge'),
      skill('Underworld Etiquette', 5, 'charisma', 'knowledge'),
      skill('English',          6, 'intelligence', 'language'),
      skill('Salish',           3, 'intelligence', 'language'),
      // Spells — Coyote loves illusion and trickery
      spell('Mask',                 'Illusion',     'Physical', 'Touch',       '', 'Sustained', '(F/2)S'),
      spell('Improved Invisibility','Illusion',     'Physical', 'LOS',         '', 'Sustained', '(F/2+1)S'),
      spell('Silence',              'Illusion',     'Physical', 'LOS (Area)',  '', 'Sustained', '(F/2)S'),
      spell('Confusion',            'Manipulation', 'Mana',     'LOS',         '', 'Sustained', '(F/2+1)M'),
      spell('Levitate',             'Manipulation', 'Physical', 'LOS',         '', 'Sustained', '(F/2)S'),
      spell('Treat',                'Health',       'Mana',     'Touch',       '', 'Instant',   '(F/2)S'),
      // Weapons & armor
      firearm('Fichetti Security 500', 'LPist', '6L', 'SA', '16(c)', '8', 250),
      armor('Armored Clothing', 3, 2, '-', 700),
      // Gear (foci)
      gear('Sustaining Focus Rating 3', 1, 45000),
      gear('Ally Spirit Formulae', 1, 50000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Thomas "Brother Wolf" Greyhorse — Wolf Shaman (Human)
  //    The combat shaman. WIL 6, MAG 6, backed up with a combat knife and
  //    genuine physical capability. Wolf totem: +2 dice for Combat spells
  //    when protecting packmates, −2 for Illusion spells.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: 'Thomas "Brother Wolf" Greyhorse',
    type: 'character',
    system: {
      metatype:       'human',
      gender:         'male',
      age:            '36',
      nuyen:          18000,
      karma:          8,
      totalKarma:     44,
      magicTradition: 'Shamanic',
      magicType:      'Full',
      magicTotem:     'Wolf',
      biography: `<p>Former tribal enforcement officer for the Salish-Shidhe Council border zones. Ten years walking the line between awakened threat and corporate encroachment before his contract expired and nobody renewed it. Wolf called him before the spirits did — the totem found a man already running in packs, already defending territory.</p><p>Works with teams, not for them. There's a difference. Doesn't cast on people he considers pack.</p>`,
      notes: `<p><strong>Spell Pool:</strong> 8 · <strong>Astral Pool:</strong> 4 · <strong>Combat Pool:</strong> 7<br><strong>Initiative:</strong> 4 + 1d6 · <strong>Essence:</strong> 6 (no cyberware)<br><strong>Totem:</strong> Wolf — +2 dice to Combat spells when defending team, −2 for Illusion spells.<br><strong>Tip:</strong> Equip Armor Jacket and Combat Knife. Use Armor and Heal to support the team; Powerbolt and Bind for offence.</p>`,
      attributes: {
        body:         { base: 5, value: 5 },
        quickness:    { base: 4, value: 4 },
        strength:     { base: 4, value: 4 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 6, value: 6 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 6, value: 6 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Sorcery',       7, 'intelligence', 'active'),
      skill('Conjuring',     6, 'intelligence', 'active'),
      skill('Aura Reading',  5, 'intelligence', 'active'),
      skill('Armed Combat',  5, 'quickness',    'active', 'Edged Weapons'),
      skill('Athletics',     4, 'quickness',    'active'),
      skill('Intimidation',  5, 'charisma',     'active'),
      skill('Tracking',      4, 'intelligence', 'active'),
      skill('Stealth',       3, 'quickness',    'active'),
      // Knowledge
      skill('Wilderness Survival',       5, 'intelligence', 'knowledge'),
      skill('Salish-Shidhe Border Zones', 5, 'intelligence', 'knowledge'),
      skill('Awakened Flora/Fauna',       4, 'intelligence', 'knowledge'),
      skill('English',     5, 'intelligence', 'language'),
      skill('Salish',      5, 'intelligence', 'language'),
      // Spells — Wolf favours direct damage and binding
      spell('Powerbolt', 'Combat',       'Physical', 'LOS',   'S', 'Instant',   '(F/2+1)S'),
      spell('Manabolt',  'Combat',       'Mana',     'LOS',   'S', 'Instant',   '(F/2+1)S'),
      spell('Bind',      'Manipulation', 'Physical', 'LOS',   'M', 'Sustained', '(F/2+1)S'),
      spell('Armor',     'Manipulation', 'Physical', 'Touch', '',  'Sustained', '(F/2)M'),
      spell('Heal',      'Health',       'Mana',     'Touch', '',  'Permanent', '(F/2)S'),
      // Weapons & armor
      melee('Combat Knife', 'EDG', '5M', 0, '5', 75),
      armor('Armor Jacket', 5, 3, '-', 900),
      // Gear
      gear('Spirit Focus Rating 4', 1, 40000),
      gear('Sustaining Focus Rating 2', 1, 20000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. "Void" (Eilidh MacAllister) — Hermetic Conjurer (Elf)
  //    Near-pure summoning specialist. Conjuring 8 is her entire combat
  //    strategy. Keeps only utility spells — the elementals handle the rest.
  //    Spell Pool 9, Astral Pool 5.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Void" (Eilidh MacAllister)',
    type: 'character',
    system: {
      metatype:       'elf',
      gender:         'female',
      age:            '67',
      nuyen:          55000,
      karma:          18,
      totalKarma:     62,
      magicTradition: 'Hermetic',
      magicType:      'Full',
      biography: `<p>Forty-two years of hermetic practice. Former senior researcher at Ares Macrotechnology's awakened resources division, until she understood what "awakened resources" meant in practice. She severed her employment contract and three fire elemental binding agreements simultaneously, which made for an eventful afternoon in the Detroit office.</p><p>Rarely casts directly. Her elementals arrive first. By the time anyone sees Void herself, the work is usually done.</p>`,
      notes: `<p><strong>Spell Pool:</strong> 9 · <strong>Astral Pool:</strong> 5 · <strong>Combat Pool:</strong> 8<br><strong>Initiative:</strong> 5 + 1d6 · <strong>Essence:</strong> 6 (no cyberware)<br><strong>Tip:</strong> Equip Armored Clothing. Void's power comes entirely from summoned elementals — Conjuring 8 lets her bind very powerful ones. The spells are defensive fallbacks only.</p>`,
      attributes: {
        body:         { base: 2, value: 2 },
        quickness:    { base: 4, value: 4 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 6, value: 6 },
        willpower:    { base: 6, value: 6 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 6, value: 6 },
        reaction: { base: 5, value: 5, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Conjuring',          8, 'intelligence', 'active'),
      skill('Sorcery',            4, 'intelligence', 'active'),
      skill('Aura Reading',       6, 'intelligence', 'active'),
      skill('Negotiations',       4, 'charisma',     'active'),
      skill('Computer',           4, 'intelligence', 'active'),
      skill('Pistols',            2, 'quickness',    'active'),
      // Knowledge
      skill('Elemental Theory',         7, 'intelligence', 'knowledge'),
      skill('Arcane History',           5, 'intelligence', 'knowledge'),
      skill('Ares Corporate Structure', 5, 'intelligence', 'knowledge'),
      skill('Awakened Ecology',         4, 'intelligence', 'knowledge'),
      skill('English',     6, 'intelligence', 'language'),
      skill('Latin',       5, 'intelligence', 'language'),
      skill('Scottish Gaelic', 3, 'intelligence', 'language'),
      // Spells — minimal, all utility or self-defence
      spell('Armor',        'Manipulation', 'Physical', 'Touch', '',  'Sustained', '(F/2)M'),
      spell('Levitate',     'Manipulation', 'Physical', 'LOS',  '',  'Sustained', '(F/2)S'),
      spell('Detect Magic', 'Detection',    'Mana',     'Self', '',  'Sustained', '(F/2)S'),
      spell('Analyze Magic','Detection',    'Mana',     'LOS',  '',  'Instant',   '(F/2)S'),
      spell('Manabolt',     'Combat',       'Mana',     'LOS',  'S', 'Instant',   '(F/2+1)S'),
      // Weapons & armor
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      armor('Armored Clothing', 3, 2, '-', 700),
      // Gear (powerful elemental foci)
      gear('Elemental Focus Rating 5', 1, 100000),
      gear('Sustaining Focus Rating 4', 1, 80000),
      gear('Hermetic Library (Rating 6)', 1, 48000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. "Ironwood" Mbeki — Gator Shaman (Troll)
  //    The ambush predator. BOD 8, STR 8, MAG 5. Gator totem: +2 dice for
  //    Combat spells, −2 for Detection spells.
  //    Note: Trolls have natural armour (+4 ballistic/+4 impact) and +1 unarmed
  //    reach — apply these manually as the sheet doesn't auto-calculate racial
  //    traits. He also hits like a freight train: staff damage 11M (STR+3).
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Ironwood" Mbeki',
    type: 'character',
    system: {
      metatype:       'troll',
      gender:         'male',
      age:            '29',
      nuyen:          12000,
      karma:          4,
      totalKarma:     38,
      magicTradition: 'Shamanic',
      magicType:      'Full',
      magicTotem:     'Gator',
      biography: `<p>Nobody summoned Ironwood to shadowrunning. He arrived the way Gator arrives — patient, submerged, and already in exactly the right position when things went wrong for everyone else. The Ork Underground put him in contact with the right fixer; the fixer has not yet stopped questioning this decision.</p><p>Talks less than he looks like he should. Hits considerably harder.</p>`,
      notes: `<p><strong>Spell Pool:</strong> 7 · <strong>Astral Pool:</strong> 4 · <strong>Combat Pool:</strong> 6<br><strong>Initiative:</strong> 3 + 1d6 · <strong>Essence:</strong> 6 (no cyberware)<br><strong>Totem:</strong> Gator — +2 dice to Combat spells, −2 to Detection spells.<br><strong>Racial:</strong> Troll natural armour +4B/+4I (add manually to soak). Unarmed reach +1. Thermographic vision.<br><strong>Staff damage:</strong> (STR+3)M = <strong>11M</strong>, Reach 2.<br><strong>Tip:</strong> Equip Armor Jacket and Staff. Ironwood wades into close combat while his spells suppress ranged threats.</p>`,
      attributes: {
        body:         { base: 8, value: 8 },
        quickness:    { base: 2, value: 2 },
        strength:     { base: 8, value: 8 },
        charisma:     { base: 2, value: 2 },
        intelligence: { base: 4, value: 4 },
        willpower:    { base: 6, value: 6 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 5, value: 5 },
        reaction: { base: 3, value: 3, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Sorcery',        6, 'intelligence', 'active'),
      skill('Conjuring',      5, 'intelligence', 'active'),
      skill('Aura Reading',   4, 'intelligence', 'active'),
      skill('Unarmed Combat', 6, 'quickness',    'active'),
      skill('Armed Combat',   5, 'quickness',    'active', 'Pole Arms'),
      skill('Intimidation',   5, 'charisma',     'active'),
      skill('Athletics',      4, 'quickness',    'active'),
      // Knowledge
      skill('Ork Underground (Seattle)', 5, 'intelligence', 'knowledge'),
      skill('Urban Terrain Tactics',     4, 'intelligence', 'knowledge'),
      skill('Awakened Paracritters',     4, 'intelligence', 'knowledge'),
      skill('English',        4, 'intelligence', 'language'),
      skill('Or\'zet',        3, 'intelligence', 'language'),
      skill('Swahili',        3, 'intelligence', 'language'),
      // Spells — Gator flavour: close-range destruction, suppression
      spell('Powerball',  'Combat',       'Physical', 'LOS (Area)', 'S', 'Instant',   '(F/2+2)D'),
      spell('Stunball',   'Combat',       'Mana',     'LOS (Area)', 'M', 'Instant',   '(F/2+1)S'),
      spell('Clout',      'Combat',       'Physical', 'Touch',      'L', 'Instant',   '(F/2)M'),
      spell('Armor',      'Manipulation', 'Physical', 'Touch',      '',  'Sustained', '(F/2)M'),
      spell('Stabilize',  'Health',       'Mana',     'Touch',      '',  'Sustained', '(F/2)M'),
      // Weapons & armor — troll-sized gear; natural armour stacks on top
      melee('Troll-Sized Staff',  'POL', '11M', 2, '-', 200),
      melee('Troll-Sized Knife',  'EDG', '9M',  0, '-',  90),
      armor('Armor Jacket (Troll-Sized)', 5, 3, '-', 1800),
      // Spirit focus
      gear('Spirit Focus Rating 3', 1, 30000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. "Gearshift" Nikolai Petrov — Ground Vehicle Rigger (Human)
  //     VCR 1, Car 7, Pilot: Drones 5. Surveillance and support from a
  //     moving vehicle. Reaction Enhancers 1 keep his initiative competitive
  //     when unrigged. ESS 2.7 (VCR1 + RE1 + datajack).
  //     Note: set activeVCRItemId from the sheet after loading.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Gearshift" Nikolai Petrov',
    type: 'character',
    system: {
      metatype:   'human',
      gender:     'male',
      age:        '41',
      nuyen:      38000,
      karma:      6,
      totalKarma: 42,
      biography: `<p>Twenty years driving for people who needed to not be seen. Lone Star courier, Aztechnology executive transport, one brief and inadvisable stint as a Mafia wheelman in Vladivostok. The VCR came after a run where the driver died and Nikolai finished the job from the back seat with a jury-rigged cable. Seemed easier to just build it in.</p><p>Never speeds. Never misses a turn. Never explains how he got here so fast.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 6 · <strong>Initiative:</strong> 5 + 1d6 (Reaction Enhancers 1)<br><strong>Essence:</strong> 2.7 (VCR1 −3.0, RE1 −0.2, Datajack −0.1)<br><strong>Rigging:</strong> Open the Items tab and activate the VCR to set <em>activeVCRItemId</em>. When rigged, uses VCR-derived initiative pool.<br><strong>Drones:</strong> Listed as gear — create as Actor vehicles and link via the Linked Vehicles tab when ready.<br><strong>Tip:</strong> Equip Lined Coat from the Items tab.</p>`,
      attributes: {
        body:         { base: 3, value: 3 },
        quickness:    { base: 4, value: 4 },
        strength:     { base: 3, value: 3 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 4, value: 4 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: {
          base: 4, value: 5,
          reactionBonus: 1,  // Reaction Enhancers 1
          diceBonus: 0, override: false, force: 0,
        },
      },
    },
    items: [
      // Active skills
      skill('Car',              7, 'reaction',     'active'),
      skill('Motorcycle',       5, 'reaction',     'active'),
      skill('Pilot: Drones',    5, 'reaction',     'active'),
      skill('Electronics',      6, 'intelligence', 'active'),
      skill('Mechanical',       5, 'intelligence', 'active'),
      skill('Gunnery',          4, 'intelligence', 'active'),
      skill('Pistols',          3, 'quickness',    'active'),
      skill('Stealth',          3, 'quickness',    'active'),
      // Knowledge
      skill('Seattle Road Network',     6, 'intelligence', 'knowledge'),
      skill('Vehicle Modifications',    5, 'intelligence', 'knowledge'),
      skill('Small Unit Tactics',       4, 'intelligence', 'knowledge'),
      skill('Corporate Security Patterns', 4, 'intelligence', 'knowledge'),
      skill('English',    5, 'intelligence', 'language'),
      skill('Russian',    5, 'intelligence', 'language'),
      // Weapons & armor
      firearm('Ares Predator II', 'HPist', '9M', 'SA', '15(c)', '5', 550),
      armor('Lined Coat', 4, 2, '4', 700),
      ammo('Ex-Explosive Rounds ×30', 60),
      // Cyberware — essence sum 3.3; derived ESS = 2.7
      cyberware('Vehicle Control Rig 1',    3.00, 'Standard', 'Headware', 150000),
      cyberware('Reaction Enhancers 1',     0.20, 'Alpha',    'Headware',  15000),
      cyberware('Datajack',                 0.10, 'Alpha',    'Headware',   1000),
      // Drones (listed as gear — create as Actor vehicles for full rigging)
      gear('MCT Fly-Spy Surveillance Drone', 2, 5000),
      gear('Leyland-Rover Step-Van (rigger-adapted)', 1, 28000),
      gear('Electronic Warfare Suite Rating 4', 1, 18000),
      gear('Remote Control Deck Rating 4',      1, 12000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. "Overwatch" Maya Chen — Combat Drone Rigger (Dwarf)
  //     VCR 1, Gunnery 7, Pilot: Drones 7. Never in the field — operates
  //     from a hardened relay point and sends the drones instead.
  //     ESS 2.65 (VCR1 + Smartlink + Datajack).
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Overwatch" Maya Chen',
    type: 'character',
    system: {
      metatype:   'dwarf',
      gender:     'female',
      age:        '44',
      nuyen:      52000,
      karma:      9,
      totalKarma: 46,
      biography: `<p>Former Ares Macrotechnology remote-security contractor. Seventeen years of never being anywhere near the violence she was authorising. The work suited her: excellent pay, company benefits, clean hands. When the contract ended and the clean hands turned out to be a liability, she kept the skills and revised her pricing model.</p><p>Runs three drones simultaneously without breaking a sweat. Currently on her second Steel Lynx after the first one fell off a highway overpass in Bellevue.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 7 · <strong>Initiative:</strong> 4 + 1d6 (unrigged)<br><strong>Essence:</strong> 2.65 (VCR1 −3.0, Smartlink −0.25, Datajack −0.1)<br><strong>Rigging:</strong> Activate VCR from the Items tab to set <em>activeVCRItemId</em>. All combat is conducted through drones via Gunnery + Combat Pool.<br><strong>Drones:</strong> Listed as gear — create as Actor vehicles and link via Linked Vehicles tab.<br><strong>Tip:</strong> Equip Armor Jacket. Maya stays back; the drones are her combat stats.</p>`,
      attributes: {
        body:         { base: 5, value: 5 },
        quickness:    { base: 3, value: 3 },
        strength:     { base: 4, value: 4 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 6, value: 6 },
        willpower:    { base: 5, value: 5 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Gunnery',          7, 'intelligence', 'active'),
      skill('Pilot: Drones',    7, 'reaction',     'active'),
      skill('Electronics',      6, 'intelligence', 'active'),
      skill('Computer',         5, 'intelligence', 'active'),
      skill('Car',              4, 'reaction',     'active'),
      skill('Mechanical',       4, 'intelligence', 'active'),
      skill('Pistols',          3, 'quickness',    'active'),
      // Knowledge
      skill('Military Tactics',       5, 'intelligence', 'knowledge'),
      skill('Drone Engineering',       5, 'intelligence', 'knowledge'),
      skill('Ares Drone Specifications', 5, 'intelligence', 'knowledge'),
      skill('Corporate Security',      4, 'intelligence', 'knowledge'),
      skill('English',    6, 'intelligence', 'language'),
      skill('Cantonese',  4, 'intelligence', 'language'),
      // Weapons & armor
      firearm('Ares Predator II', 'HPist', '9M', 'SA', '15(c)', '5', 550),
      armor('Armor Jacket', 5, 3, '-', 900),
      ammo('Hollow Point ×30', 40),
      // Cyberware — essence sum 3.35; derived ESS = 2.65
      cyberware('Vehicle Control Rig 1', 3.00, 'Standard', 'Headware', 150000),
      cyberware('Smartlink',             0.25, 'Alpha',    'Headware',   3200),
      cyberware('Datajack',              0.10, 'Alpha',    'Headware',   1000),
      // Combat drones (listed as gear — create as Actor vehicles for full rigging)
      gear('Steel Lynx Combat Drone',               2,  65000),
      gear('MCT Fly-Spy Surveillance Drone',         3,   5000),
      gear('Ares Duelist Rotodrone',                1,  22000),
      gear('Remote Control Deck Rating 6',          1,  48000),
      gear('Drone Weapon Mount — LMG (Steel Lynx)', 2,   8000),
      gear('Electronic Warfare Suite Rating 5',     1,  28000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. "Shadowstep" — Stealth Decker (Human)
  //     The invisible hand. INT 7, Computer/Decking 8/8, Stealth 5 in both
  //     meat and matrix. Leaves no logs, raises no alerts, and has never
  //     been traced. Patient, precise, and expensive.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Shadowstep"',
    type: 'character',
    system: {
      metatype:   'human',
      gender:     '',
      age:        '',
      nuyen:      35000,
      karma:      11,
      totalKarma: 52,
      biography: `<p>Identity: unknown. Nationality: unverifiable. SIN: burned so thoroughly that the record of its burning no longer exists. Shadowstep has been active in the Seattle matrix for at least eight years based on trace patterns, though "active" is generous — what they leave behind is closer to absence than presence.</p><p>Does not take extraction jobs, does not work under time pressure, does not accept work from anyone they haven't vetted twice. Costs accordingly.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 8 · <strong>Initiative:</strong> 5 + 1d6<br><strong>Essence:</strong> 5.9 (Datajack Alpha −0.1)<br><strong>Matrix approach:</strong> Low-noise entry, Sleaze and Mirrors programs, never trips passive IC. Takes longer than Jackhammer; never leaves a trace.<br><strong>Tip:</strong> Equip Armored Clothing. The Fuchi Cyber-6 mk.2 cyberdeck and stealth programs appear on the Matrix tab.</p>`,
      attributes: {
        body:         { base: 2, value: 2 },
        quickness:    { base: 3, value: 3 },
        strength:     { base: 2, value: 2 },
        charisma:     { base: 2, value: 2 },
        intelligence: { base: 7, value: 7 },
        willpower:    { base: 6, value: 6 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: { base: 5, value: 5, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Computer',         8, 'intelligence', 'active'),
      skill('Decking',          8, 'intelligence', 'active'),
      skill('Electronics',      5, 'intelligence', 'active'),
      skill('Stealth',          5, 'quickness',    'active'),
      skill('Pistols',          3, 'quickness',    'active'),
      skill('Biotech',          3, 'intelligence', 'active'),
      // Knowledge
      skill('Corporate Network Architecture', 7, 'intelligence', 'knowledge'),
      skill('Matrix System Security',         6, 'intelligence', 'knowledge'),
      skill('IC Behaviour Patterns',          5, 'intelligence', 'knowledge'),
      skill('SIN Forgery Techniques',         5, 'intelligence', 'knowledge'),
      skill('English',    7, 'intelligence', 'language'),
      skill('Japanese',   4, 'intelligence', 'language'),
      // Weapons & armor
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      armor('Armored Clothing', 3, 2, '-', 700),
      // Cyberware — ESS 5.9
      cyberware('Datajack', 0.10, 'Alpha', 'Headware', 1000),
      // Deck & programs
      cyberdeck('Fuchi Cyber-6 mk.2 (Stealth-Modified)', 6, 185000),
      program('Sleaze',    8, 'Operational', true),
      program('Deception', 7, 'Offensive',   false),
      program('Browse',    6, 'Offensive',   false),
      program('Analyze',   6, 'Offensive',   false),
      program('Mirrors',   6, 'Defensive',   true),
      // Gear
      gear('ECM Rating 8 (Portable)',                   1, 55000),
      gear('Micro-Transceiver (Encrypted, Rating 8)',   1,  8000),
      gear('Fake SIN Rating 5',                         2, 10000),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 13. "Jackhammer" — Combat Decker (Ork)
  //     The sledgehammer approach. Crashes IC fast and loud, burns through
  //     systems with raw offensive program ratings. Wired Reflexes 1 means
  //     he can also handle himself in meatspace if things go sideways.
  //     ESS 3.9.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Jackhammer"',
    type: 'character',
    system: {
      metatype:   'ork',
      gender:     'male',
      age:        '26',
      nuyen:      20000,
      karma:      5,
      totalKarma: 40,
      biography: `<p>Grew up in Redmond Barrens. Learned to deck by looting a crashed Fuchi exec's briefcase at age fourteen. Nobody taught him to be subtle because nobody had time to teach him anything and subtle was never the family tradition anyway. He cracks systems the way his cousins crack skulls: fast, loud, and completely committed to the outcome.</p><p>Still surprised that corps pay this much to get owned this hard.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 6 · <strong>Initiative:</strong> 5 + 2d6 (Wired Reflexes 1)<br><strong>Essence:</strong> 3.9 (WR1 −2.0, Datajack −0.1)<br><strong>Matrix approach:</strong> Offensive crash programs, force through ICE fast, accept the damage. Blunt instrument, very effective.<br><strong>Tip:</strong> Equip Armor Jacket. Jackhammer can fight in meatspace when the run goes wrong — and it usually does.</p>`,
      attributes: {
        body:         { base: 4, value: 4 },
        quickness:    { base: 4, value: 4 },
        strength:     { base: 4, value: 4 },
        charisma:     { base: 2, value: 2 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 4, value: 4 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: {
          base: 4, value: 5,
          reactionBonus: 1,  // Wired Reflexes 1
          diceBonus:     1,  // Wired Reflexes 1
          override: false, force: 0,
        },
      },
    },
    items: [
      // Active skills
      skill('Computer',         7, 'intelligence', 'active'),
      skill('Decking',          7, 'intelligence', 'active'),
      skill('Electronics',      5, 'intelligence', 'active'),
      skill('Pistols',          5, 'quickness',    'active'),
      skill('Unarmed Combat',   4, 'quickness',    'active'),
      skill('Intimidation',     4, 'charisma',     'active'),
      // Knowledge
      skill('Matrix Combat Tactics',          5, 'intelligence', 'knowledge'),
      skill('Corporate System Architecture',  4, 'intelligence', 'knowledge'),
      skill('Redmond Barrens',                4, 'intelligence', 'knowledge'),
      skill('English',    5, 'intelligence', 'language'),
      skill('Or\'zet',    3, 'intelligence', 'language'),
      // Weapons & armor
      firearm('Ares Predator II', 'HPist', '9M', 'SA', '15(c)', '5', 550),
      melee('Survival Knife', 'EDG', '5M', 0, '6', 50),
      armor('Armor Jacket', 5, 3, '-', 900),
      ammo('Ex-Explosive Rounds ×30', 60),
      // Cyberware — ESS 3.9
      cyberware('Wired Reflexes 1', 2.00, 'Standard', 'Headware', 55000),
      cyberware('Datajack',         0.10, 'Alpha',    'Headware',  1000),
      // Deck & programs
      cyberdeck('Sony CTY-360 Combat Deck', 7, 95000),
      program('Attack', 7, 'Combat',       false),
      program('Slow',   7, 'Combat',       false),
      program('Armor',  6, 'Operational',  true),
      program('Medic',  5, 'Offensive',    true),
      program('Analyze',5, 'Offensive',    false),
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. "Packrat" Vera Okonkwo — Gear-Heavy Decker (Dwarf)
  //     The mobile electronics fortress. Electronics 7, Mechanical 5,
  //     B/R Electronics 5. Has a backup for everything, including the backup.
  //     The joke in every team she's run with: if you need a widget, Packrat
  //     has two of them and knows where to get a third.
  // ─────────────────────────────────────────────────────────────────────────
  {
    name: '"Packrat" Vera Okonkwo',
    type: 'character',
    system: {
      metatype:   'dwarf',
      gender:     'female',
      age:        '52',
      nuyen:      28000,
      karma:      12,
      totalKarma: 49,
      biography: `<p>Former Renraku Electronics field engineer. Spent sixteen years going to the places where expensive corporate hardware had broken down, carrying everything she might need in a single over-engineered backpack. When the megacorp downsized her entire division during a hostile acquisition, she kept the backpack, upgraded the deck, and started offering her services to people whose equipment problems were more legally complicated.</p><p>Has never been on a run where she didn't have the right piece of kit. This has made her indispensable and difficult to travel with.</p>`,
      notes: `<p><strong>Combat Pool:</strong> 6 · <strong>Initiative:</strong> 4 + 1d6<br><strong>Essence:</strong> 5.9 (Datajack Alpha −0.1)<br><strong>Specialty:</strong> Electronics 7 means she builds, repairs, and modifies all her own gear. Carries two cyberdecks (primary + hot-spare), full repair kit, and programs for every situation.<br><strong>Tip:</strong> Equip Armor Jacket. Vera is the team's electronics support — decking is secondary to her role as the person who keeps everyone's gear running.</p>`,
      attributes: {
        body:         { base: 5, value: 5 },
        quickness:    { base: 3, value: 3 },
        strength:     { base: 4, value: 4 },
        charisma:     { base: 3, value: 3 },
        intelligence: { base: 5, value: 5 },
        willpower:    { base: 4, value: 4 },
        essence:      { base: 6, value: 6 },
        magic:        { base: 0, value: 0 },
        reaction: { base: 4, value: 4, reactionBonus: 0, diceBonus: 0, override: false, force: 0 },
      },
    },
    items: [
      // Active skills
      skill('Electronics',    7, 'intelligence', 'active'),
      skill('Mechanical',     5, 'intelligence', 'active'),
      skill('B/R Electronics',5, 'intelligence', 'active'),
      skill('Computer',       6, 'intelligence', 'active'),
      skill('Decking',        6, 'intelligence', 'active'),
      skill('Negotiations',   4, 'charisma',     'active'),
      skill('Pistols',        3, 'quickness',    'active'),
      skill('Stealth',        3, 'quickness',    'active'),
      // Knowledge
      skill('Electronics (Street Market)',   6, 'intelligence', 'knowledge'),
      skill('Renraku Systems Architecture',  5, 'intelligence', 'knowledge'),
      skill('Drone Systems',                 5, 'intelligence', 'knowledge'),
      skill('Corporate Supply Chains',       4, 'intelligence', 'knowledge'),
      skill('English',     5, 'intelligence', 'language'),
      skill('Igbo',        4, 'intelligence', 'language'),
      skill('Japanese',    3, 'intelligence', 'language'),
      // Weapons & armor
      firearm('Ares Light Fire 70', 'LPist', '6L', 'SA', '16(c)', '8', 350),
      armor('Armor Jacket', 5, 3, '-', 900),
      // Cyberware — ESS 5.9
      cyberware('Datajack', 0.10, 'Alpha', 'Headware', 1000),
      // Decks & programs
      cyberdeck('Fuchi Cyber-7 (Primary)',    7, 120000),
      cyberdeck('Fuchi Cyber-5 (Hot Spare)',  5,  48000),
      program('Analyze', 6, 'Offensive',   false),
      program('Browse',  6, 'Offensive',   false),
      program('Decrypt', 5, 'Offensive',   false),
      program('Snoop',   6, 'Offensive',   false),
      program('Medic',   4, 'Offensive',   true),
      program('Encrypt', 5, 'Operational', false),
      // Workshop and field kit
      gear('Electronic Warfare Suite Rating 4',         1,  18000),
      gear('Electronics Tool Kit (Rating 6)',            1,   6000),
      gear('Mechanical Tool Kit (Rating 4)',             1,   2000),
      gear('Micro-Transceiver Set (Encrypted, Rtg 6)',  4,   3000),
      gear('Optical Memory Chips ×50',                 50,    500),
      gear('Spare Cyberdeck Components Kit',            1,   8000),
      gear('Fake SIN Rating 3',                         1,   1000),
    ],
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────

const pack = game.packs.get(PACK_ID);
if (!pack) {
  ui.notifications.error(
    `SR3E: Sample Characters pack not found (${PACK_ID}). ` +
    `Ensure Foundry was fully restarted after adding the pack to system.json.`
  );
  return;
}

const existing = await pack.getDocuments();
if (existing.length > 0) {
  let proceed = false;
  await foundry.applications.api.DialogV2.wait({
    window: { title: 'Sample Characters — Pack Not Empty' },
    content: `<p>The compendium already contains <strong>${existing.length}</strong> document(s).</p>
              <p>This macro adds characters 6–14 (shamans, riggers, additional deckers). Running it again will create duplicates. Continue?</p>`,
    buttons: [
      {
        label: 'Yes, add them',
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
    ? `SR3E: ${created} additional sample characters added to the compendium.`
    : `SR3E: ${created}/${CHARACTERS.length} created — ${CHARACTERS.length - created} failed (check console).`
);

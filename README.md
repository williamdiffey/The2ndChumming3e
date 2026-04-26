# The 2nd Chumming (3e): Shadowrun 3rd Edition — Foundry VTT System

Unofficial Foundry VTT **v14** system for **Shadowrun 3rd Edition**.
Built with **ApplicationV2** — zero Handlebars template files.
All sheet HTML is rendered directly from JavaScript using tagged template literals.

## Installation

https://raw.githubusercontent.com/williamdiffey/The2ndChumming3e/main/system.json
  
Restart Foundry, create a World, select **Shadowrun 3rd Edition**.

---

## Architecture

```
sr3e/
├── system.json                   ← Foundry manifest (requires v13+) + documentTypes declaration
├── lang/en.json                  ← Localisation strings
├── styles/sr3e.css               ← All styles, CSS custom properties
└── scripts/
    ├── sr3e.js                   ← Entry point — registers models, classes, hooks, button handlers
    ├── config.js                 ← SR3E constants (metatypes, weapon codes, modes, etc.)
    ├── SR3EVehicleChase.js       ← SR3E chase scene aid
    ├── data/
    │   ├── ActorDataModels.js    ← TypeDataModel subclasses: CharacterData, NpcData, VehicleData
    │   └── ItemDataModels.js     ← TypeDataModel subclasses: all 16 item types
    ├── documents/
    │   ├── SR3EActor.js          ← Actor: derived data, all roll/combat methods
    │   ├── SR3EItem.js           ← Item: skill/weapon/melee roll methods
    │   ├── SR3ESpiritSummoning.js           ← Item: skill/weapon/melee roll methods
    │   └── SR3ECombat.js         ← Combat: SR2/SR3 initiative, end-of-round pool refresh

    └── sheets/
        ├── SR3EActorSheet.js     ← ApplicationV2 actor sheet
        ├── SR3EVehicleSheet.js      ← ApplicationV2 item sheet
        └── SR3EItemSheet.js      ← ApplicationV2 item sheet
        

```

**No `templates/` directory, no `template.json`.** All default field values are defined as
`TypeDataModel` subclasses in `scripts/data/`. All markup is built in `_renderHTML()` via
tagged template literals. Tab switching, wound boxes, and all interactivity are handled with
`data-action` attributes and AppV2's static action system.

---

## Key design decisions

### Technical

| Decision | Reason |
|----------|--------|
| ApplicationV2 (not ActorSheet V1) | Foundry v13 deprecates V1 sheets; future-proof |
| TypeDataModel for all document types | Replaces deprecated template.json; typed defaults, schema validation |
| No Handlebars templates | Removes compile step; full JS type safety; easier to refactor |
| `data-action` static handlers | AppV2 pattern; clean separation of concerns |
| Single CSS file | Easier to maintain; all custom properties in one place |
| `game.sr3e` runtime registry | Breaks circular imports between SR3EActor and SR3EItem |

### Design philosophy

| Decision | Reason |
|----------|--------|
| Transparent mechanics | VTT is there to remind you what skills to use, how many dice to use, remind you of modifiers to apply and then do those calculations for you if you want. |
| Minimal guard rails | The GM is trusted. Players are adults. Edge cases and houserules should always be achievable without fighting the system. |
| No automation of outcomes | More dramatic, more deliberate, more fun. |
| Manual wound application | Everyone is aware of what happened, processes the results, and plans accordingly. A broken automated system kills a session; a manual one doesn't. |
| Interactive exploding dice | Getting 15 successes in one click is boring. Clicking to explode each die is one of the most exciting moments in SR — it stays manual. |
| Shift-click to bypass digital dice | Physical dice are more fun, VTTs aren't only for the terminally online |
| Matrix Defragged for Matrix | A modern, AR enabling system that keeps enough crunch and gear lust from the original but integrates it with the rest of the game, but mainly it's the system that I like. |


---

## Actor types

| Type | Description |
|------|-------------|
| `character` | Full PC sheet: Attributes, Skills, Combat, Gear, Magic, Matrix, Bio, Storage, tabs |
| `npc` | Simplified sheet — same roll mechanics, lighter UI |
| `vehicle` | Vehicle stats (Handling, Speed, Accel, Body, Armour, Sig, Autonav, Pilot, Sensor), damage track, linked weapons; supports VCR/rigger control |

---

## Item types

| Type | Key fields |
|------|-----------|
| `melee` | Damage code, reach, concealability, category (EDG/CLB/POL etc.), isFocus flag |
| `thrown` | Damage code, STR minimum, concealability, category |
| `projectile` | Damage code, STR minimum (bows/crossbows) |
| `firearm` | Damage code, fire mode, ammunition type, accessories, concealability, category |
| `ammunition` | Damage modifier, availability, cost |
| `armor` | Ballistic rating, Impact rating, concealability |
| `skill` | Rating, linked attribute, category, specialisation |
| `quality` | Positive/Negative, karma cost |
| `cyberware` | Essence cost, grade (Standard/Alpha/Beta/Delta), rating |
| `bioware` | Essence cost (BioIndex), grade, rating |
| `spell` | Category, type (Mana/Physical), range, damage level, drain formula, duration |
| `summoning` | Spirit type |
| `complex_form` | Rating, duration, fade value |
| `program` | Type, category, rating, size (Mp), multiplier, degradable flag, associated prompt |
| `cyberdeck` | Full attribute block (MPCP, Firewall, Response, Memory, Utility Slots, DTR, Flux Rating), matrix condition monitor, burned slots, derived stats |
| `gear` | Quantity, cost, weight |

---

## Auto-derived values

| Value | Formula |
|-------|---------|
| Reaction | ⌊(Quickness + Intelligence) / 2⌋ + reaction bonus |
| Essence | 6 − Σ(cyberware + bioware essence costs) |
| Combat Pool | ⌊(QUI + INT + WIL) / 2⌋ + wound modifier |
| Magic Pool | ⌊(INT + WIL + MAG) / 2⌋ + wound modifier (Awakened only) |
| Wound Modifier | −⌊Stun/3⌋ − ⌊Physical/3⌋ |
| Initiative (default) | Reaction + wound modifier (base) + initiative dice d6 |
| Initiative (Matrix VR-Hot) | Reaction + (Response × 2) base + (1 + Response) d6 |
| Initiative (Astral Projection) | Intelligence + 20 base + 1d6 |

---

## Dice rolling — Rule of Six

All rolls use SR3e success-counting (d6 ≥ TN = success).

- **Exploding dice** require an extra click per die — getting 15 successes in one click is boring and kills one of the most exciting moments in SR. Each die showing 6 gets a button; click to roll it again and add to its running total.
- **Glitch** triggers when more than half the first-wave dice show 1s.
- **Critical Glitch** = glitch + zero successes.
- Rolls prompt for TN and optional combat pool allocation before rolling.

---

## Initiative tracking

- **SR3 mode** (default): Pass-based. Everyone acts once per pass in init order; subtract 10 after each pass. Repeat until all initiatives ≤ 0.
- **SR2 mode**: Flat queue. All action slots pre-built and sorted descending. Walk the queue top to bottom.
- Mode selectable in game settings at any time.
- Wounds automatically modify initiative rolls.
- Reaction is manually editable on the actor sheet to reflect cyberware, drugs, etc.
- Initiative results can be manually adjusted in the combat tracker for situational bonuses/penalties.
- **Shift-click** on any initiative roll button opens a physical dice dialog — shows the formula, lets the user type in the result directly (for when real dice are used at the table).

---

## Astral state (Awakened characters)

Toggled on the Magic tab. Three mutually exclusive states — clicking the active state deactivates it:

| State | Badge colour | Initiative formula |
|-------|--------------|--------------------|
| Physical Plane | Grey | Default (Reaction-based) |
| Dual Natured | Amber | Default (Reaction-based) |
| Astral Projection | Purple | INT + 20 + 1d6 |

Active state is shown as a coloured badge next to the combatant's name in the combat tracker.

---

## Combat flows

### Ranged combat
1. Attacker clicks weapon on sheet → select target
2. Defender declares dodge or commits combat pool dice to dodge
3. Attacker allocates combat pool to attack → rolls (interactive Rule of Six)
4. If dodge committed: dodge roll button appears on final wave; otherwise soak card auto-posts
5. Dodge is binary — hits ≥ attack hits = complete miss; otherwise full staged damage proceeds
6. Soak card: editable Body pool, TN = Power − Armour, armour type dropdown (Ballistic/Impact)
7. GM applies damage manually via wound track buttons

### Melee combat
1. Attacker clicks melee weapon → select target
2. Defender auto-uses their equipped melee weapon (fallback: unarmed/cyber, then bare hands)
3. Boxing card shows both sides: skill, weapon, damage code, reach, dice pool, editable TN
4. TN = 4 − reach + wound modifier
5. Both roll simultaneously; winner = most successes; ties = no damage
6. Winner's damage stages up by net successes; loser gets a Resist Damage button → soak flow

### Spellcasting
1. Caster clicks Cast on a spell row → choose Force → select targets
2. Allocate Magic Pool dice → roll Sorcery + Magic Pool vs TN (Essence for Mana / Body for Physical)
3. 0 successes = fizzle; 1+ successes = staged damage (Force + level, every 2 hits = +1 stage)
4. Each target gets a Resist Spell button; caster always gets a Resist Drain button
5. Drain: Willpower vs TN from drain formula — Stun if Force ≤ Sorcery; Physical if Force > Sorcery

### Conjuring
1. All works fine, trust me bro. 

### Astral Combat
1. Weapons focus can be added and activated for any melee weapon (adds bonus to melee combat)

### Matrix
1. 4 matrix modes are selectable. Hot VR mode modifies initiative rolls. 
2. Slots show if burnt and loaded programs. 
3. Programs can be loaded by dragging and dropping or ejected. 
4. Degradable programs are tracked.

### Damage staging
Power (number) + Level (L/M/S/D) + optional Stun flag.
Each 2 net successes = +1 stage (L→M→S→D). At D, each additional 2 successes = +1 power.

---

## Vehicles & Chase Scenes

- Vehicle actors track all standard SR3 attributes (Handling, Speed, Accel, Body, Armour, Sig, Autonav, Pilot, Sensor, Cargo, Load).
- Damage track is a single box (Condition Monitor derived from Body).
- Weapons can be added to vehicles.
- Characters can be linked to vehicles; VCR/rigger mode tracked per-actor.
- VCR mode modifies initiative rolls and gives pilot +8 penalty to physical rolls. 
- **Chase Scene** button in the combat tracker opens the vehicle chase interface.

- Driving test button on vehicle sheet can be used as per CRB pages 134-135
---

## Weapons & Skills

Weapons carry a `category` code that maps to the correct active skill automatically:

| Codes | Skill |
|-------|-------|
| HOPist / LPist / MPist / HPist / VHP | Pistols |
| MaPist / SMG | SMGs |
| Carb / AsRf / SptR / Snip / LCarb | Rifles |
| LMG / MMG / HMG / MinG | LMG |
| ShtG | Shotguns |
| GrLn | Grenade Launchers |
| EDG | Edged Weapons |
| CLB | Clubs |
| POL | Pole Arms/Staff |
| WHP | Whips/Flails |
| CYB / UNA | Unarmed Combat |

Weapon compendiums (melee, firearms, armour, projectile) ship with the system. JSON data sourced from Critical Glitch / Null Sheen and converted to include `category` codes for automatic skill resolution. All item data is fully editable on the item sheet.

---

## Armour

Equip one armour item via the actor sheet. Only the equipped piece contributes to soak (helmets do not stack at present). Armour type (Ballistic/Impact) is selectable at soak time.

---


## What is not yet implemented
- Full Defense posture (melee/ranged defensive mode)
- ECM/ECCM
- Flux
- Field for Race needs adding back in
- Matrix data sheath could be useful
- All compendiums need to be added (not via macro) and cleaned up
- Matrix compendium needs to be compiled


## Legal Disclaimer

**Shadowrun** is a registered trademark of The Topps Company, Inc. and/or its subsidiaries. The Shadowrun 3rd Edition rules, setting, and terminology are the intellectual property of The Topps Company, Inc. (currently licensed to Catalyst Game Labs). This project is an unofficial, fan-made Foundry VTT system for personal use and is not affiliated with, endorsed by, or connected to The Topps Company, Inc., Catalyst Game Labs, or any official Shadowrun rights holders. No copyright infringement is intended.

**The Matrix Defragged** is a Shadowrun 3rd Edition Matrix rules supplement available at [DriveThruRPG](https://www.drivethrurpg.com/en/product/481686/the-matrix-defragged). The Matrix rules implementation in this system draws inspiration from this work. All rights to The Matrix Defragged belong to its respective author(s) and publisher. 

All original code, design, and implementation in this system are released under the MIT License.
# CLAUDE.md — Shadowrun 3rd Edition Foundry VTT System

This file gives Claude Code the context it needs to work on this project effectively.
Read it fully before touching any code.

---

## What this is

An unofficial Foundry VTT v13 system for **Shadowrun 3rd Edition**.
Built with **ApplicationV2** — zero Handlebars template files.
All sheet HTML is rendered directly from JavaScript using tagged template literals.

---

## Design ethos — read this first

- **Minimal guardrails.** The GM is trusted. Players are adults. The system presents the right information and dice but humans make all narrative decisions.
- **No automation of outcomes.** Damage is never applied automatically. The system announces what happened and the GM clicks wound boxes manually.
- **All stats are manually editable.** Edge cases, houserules, and situational modifiers should always be achievable without fighting the system.
- **No jQuery.** This is Foundry v13 — use native DOM throughout (`querySelector`, `addEventListener`, `querySelectorAll`). Never use `.find()`, `.val()`, `.on()`.
- **No Handlebars.** All markup lives in `_renderHTML()` as template literals.

---

## Foundry v13 API patterns — critical knowledge

### Dialogs
Always use `DialogV2`, never the old `Dialog`.
To wait for user input, use `DialogV2.wait()` not `.render(true)` (which doesn't block).

```js
let result = null;
await foundry.applications.api.DialogV2.wait({
  window: { title: 'My Dialog' },
  content: `<input type="number" id="my-input" value="4"/>`,
  buttons: [
    {
      label: 'Confirm',
      action: 'confirm',
      default: true,
      callback: (_e, _b, dialog) => {
        result = parseInt(dialog.element.querySelector('#my-input')?.value);
      }
    },
    { label: 'Cancel', action: 'cancel' },
  ],
});
```

### ApplicationV2 sheet form handling — critical

Every sheet (ActorSheetV2, ItemSheetV2) **must** declare `tag: 'form'` in `DEFAULT_OPTIONS`
and configure `form.submitOnChange: true`. Without `tag: 'form'`, ApplicationV2 never
wires up its change-to-save pipeline, and form edits are silently lost.

```js
static DEFAULT_OPTIONS = {
  tag: 'form',
  form: {
    submitOnChange: true,
    closeOnSubmit:  false,
  },
  // ... classes, position, actions, etc.
};
```

When `tag: 'form'` is set, the **application element itself** is the `<form>`.
Do **not** wrap `_buildSheet` / `_build` content in a `<form>` tag — that creates illegal
nested forms and breaks the framework. Use `<div class="sr3e-inner">` instead.

`DocumentSheetV2` has a built-in submit handler that calls `document.update()`.
You do **not** need a custom `form.handler` for basic persistence.

`_activateListeners` does **not** exist in the Foundry v13 parent chain — do not call it.
Use `_onRender(context, options)` for any post-render DOM wiring (e.g. class-based
click/change listeners that can't use `data-action`). `_onRender` is called by the
framework after every render, so listeners re-attach automatically.

### Chat message hooks
Use `renderChatMessageHTML` not `renderChatMessage` (deprecated in v13).
The `html` argument is a native `HTMLElement`, not jQuery.

```js
Hooks.on('renderChatMessageHTML', (_message, html, _data) => {
  html.querySelectorAll('.my-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      // handle click
    });
  });
});
```

### Actor system data — most important gotcha

`prepareDerivedData` must always initialise fields in-place on `sys`, never via `??` fallback:

```js
// WRONG — creates a disconnected object, writes are lost
const attr = sys.attributes ?? {};

// CORRECT — always initialise in place so writes persist
if (!sys.attributes) sys.attributes = {};
const attr = sys.attributes;
```

If you read `this.system` from a button click handler and find attributes missing,
it means `prepareDerivedData` ran but `sys.attributes` was undefined so nothing was written.
Calling `this.prepareDerivedData()` before reading will fix this IF the initialisation is in-place.

### Cross-module references
`SR3EActor` imports `SR3EItem` and vice versa would create a circular dependency.
Break cycles by registering classes on `game.sr3e` in `sr3e.js` and referencing them at runtime:

```js
// sr3e.js
game.sr3e = { SR3E, SR3EActor, SR3EItem };

// SR3EItem.js — reference SR3EActor without importing it
await game.sr3e.SR3EActor.someStaticMethod(ctx);
```

### Data models — no template.json

`template.json` has been removed. Default values for all document types are defined as
`TypeDataModel` subclasses in `scripts/data/`. Do **not** recreate `template.json`.

Adding a new persisted field:
1. Add it to the appropriate model in `ActorDataModels.js` or `ItemDataModels.js`
2. If it's a new Actor/Item type, also declare it in `system.json` → `documentTypes`
3. Guard reads with `?? defaultValue` in `prepareDerivedData` for existing documents
4. **Requires a full Foundry restart** (not just F5) — data model changes are not hot-reloaded

```js
// Example field in a TypeDataModel
static defineSchema() {
  const { StringField, NumberField } = foundry.data.fields;
  return {
    myField: new StringField({ initial: '' }),
    myNumber: new NumberField({ integer: true, initial: 0, min: 0 }),
  };
}
```

---

## File structure

```
sr3e/
├── system.json                   ← Foundry manifest + documentTypes declaration
├── lang/en.json                  ← Localisation strings
├── styles/sr3e.css               ← All styles, CSS custom properties
└── scripts/
    ├── sr3e.js                   ← Entry point: registers models, classes, hooks, button handlers
    ├── config.js                 ← SR3E constants
    ├── data/
    │   ├── ActorDataModels.js    ← TypeDataModel subclasses: CharacterData, NpcData, VehicleData
    │   └── ItemDataModels.js     ← TypeDataModel subclasses: all item types
    ├── documents/
    │   ├── SR3EActor.js          ← Actor: derived data, all roll/combat methods
    │   ├── SR3EItem.js           ← Item: skill/weapon/melee roll methods
    │   └── SR3ECombat.js         ← Combat: SR2/SR3 initiative, endCombat pool refresh
    └── sheets/
        ├── SR3EActorSheet.js     ← ApplicationV2 actor sheet
        └── SR3EItemSheet.js      ← ApplicationV2 item sheet
```

---

## SR3 rules implemented so far

### Dice rolling — Rule of Six
- All rolls are d6 success-counting (result ≥ TN = success)
- Any die showing 6 explodes — player clicks a button to roll that die again, adding to its total
- A die stops exploding when its running total ≥ TN (success, no more rolling needed)
- Glitch: more than half the original pool shows 1s (only first wave counts for glitch)
- Critical glitch: glitch AND zero successes
- Initiative never explodes interactively — resolved silently as a sum

### Initiative
Two modes selectable in game settings:
- **SR3 mode**: Pass-based. Everyone acts once per pass in init order. Subtract 10 after each pass. Repeat until all initiatives ≤ 0.
- **SR2 mode**: Flat queue. All action slots pre-built (init, init-10, init-20...) merged and sorted descending. Walk queue top to bottom.
Both modes end combat when the round is complete and prompt GM to re-roll initiative.

**Shift-click** on any initiative roll button (actor sheet bolt or combat tracker d20) opens a
physical dice dialog — shows the formula, lets the user type in the result directly.

**Initiative formulas by mode:**
- Default: `Reaction + woundMod` base + `initiativeDice` d6
- Matrix (VR-Hot): `Reaction + (Response × 2)` base + `(1 + Response)` d6
- Astral Projection: `Intelligence + 20` base + `1d6`
- Physical Plane / Dual Natured: use default formula

### Astral state (Awakened characters)
Toggled on the Magic tab. Stored as `system.astralMode` (persisted):
- `''` — no state set (default)
- `'physical'` — explicitly Physical Plane (grey badge in combat tracker)
- `'dual'` — Dual Natured (amber "Dual Nat." badge)
- `'astral'` — Astral Projection (purple "Astral" badge); uses INT+20+1d6 initiative

Only one state active at a time; clicking the active button deactivates it.

### Ranged combat flow
1. Attacker clicks weapon on sheet
2. Target selection dialog (radio buttons, single actor)
3. Defender declares: no dodge OR dodge with X combat pool dice (committed immediately, pool spent)
4. Attacker allocates combat pool to attack
5. Attack rolls (interactive Rule of Six)
6. On final wave: if dodge committed → "Roll to dodge" button appears; if no dodge → soak card auto-posts
7. Dodge roll (interactive Rule of Six, TN 4)
8. Dodge result: **binary** — dodge hits ≥ attack hits = complete miss; otherwise full hit lands
9. Dodge does NOT reduce staging. Net hits are irrelevant to damage. Full staged damage proceeds to soak.
10. Soak card posts for target: editable Body pool, TN (power − armour), armour type dropdown (ballistic default, impact for melee)
11. Soak roll (interactive Rule of Six)
12. Soak result: each 2 soak hits = stage down (D→S→M→L). Below L = completely soaked.
13. GM applies damage manually using wound track buttons.

### Melee combat flow
1. Attacker clicks melee weapon on sheet
2. Target selection dialog
3. Defender auto-uses equipped melee weapon (equippedMelee field), falls back to unarmed/cyber item, then bare hands (STR + M)
4. Boxing card shows both sides: skill name/rating, weapon, damage code, reach, skill dice, editable combat pool (0 default), editable TN
5. TN = 4 − reach (your own reach reduces your TN) + wound modifier
6. Both roll simultaneously when GM clicks Roll
7. Compare: winner = most successes. Tie = no damage.
8. Winner's weapon damage code stages up by net successes (winner hits − loser hits)
9. Loser gets Resist Damage button → soak flow as above

### Damage staging
Power (number) + Level (L/M/S/D) + optional Stun flag
- Each 2 net successes = +1 stage (L→M→S→D)
- Once at D, each additional 2 successes = +1 power
- Stun damage goes to stun track; physical to physical track
- GM applies manually

### Combat pool
- Derived: ⌊(QUI + INT + WIL) / 2⌋ + wound modifier
- Tracked via `combatPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to attack, dodge, or melee
- Refreshed at end of combat (GM prompted: "Refresh all combat pools?")

### Magic pool (Awakened characters only)
- Derived: ⌊(INT + WIL + MAG) / 2⌋ + wound modifier
- Tracked via `magicPoolSpent` on actor system
- Available = derived − spent
- Spent when allocated to spellcasting
- Null / hidden for non-Awakened actors (Magic attribute = 0)

### Spellcasting flow
1. Caster clicks "Cast" on a spell row (magic tab)
2. Choose Force dialog — note shown if Force > Sorcery (drain becomes Physical)
3. Select targets dialog — checkboxes, shows Essence or Body TN per target
4. Allocate Magic Pool dice dialog (if any available)
5. Roll Sorcery + Magic Pool dice vs TN = target Essence (Mana spells) or Body (Physical spells)
6. Rule of Six applies throughout
7. On final wave (allDone):
   - 0 successes: spell fizzles — no damage, but drain button still posted
   - 1+ successes: stage damage up (base = Force + level, every 2 hits = +1 stage)
   - Each target gets a "Resist Spell" button
   - Caster always gets a "Resist Drain" button
8. Target resist: Willpower (Mana) or Body (Physical) dice, TN = Force, stage down
9. Drain resist: Willpower dice, TN from parsed drain formula (min 2), stage down
   - Remaining drain = Stun if Force ≤ Sorcery, Physical if Force > Sorcery
- Sheet displays as "available / total"

---

## Actor data model

### Key system fields (character/npc)
```
system.attributes.body.base / .value
system.attributes.quickness.base / .value
system.attributes.strength.base / .value
system.attributes.intelligence.base / .value
system.attributes.willpower.base / .value
system.attributes.reaction.value / .reactionBonus / .diceBonus / .override
system.attributes.essence.value
system.attributes.magic.base / .value
system.wounds.stun.value / .max
system.wounds.physical.value / .max
system.woundMod                    ← derived, written by prepareDerivedData
system.derived.combatPool          ← derived
system.derived.availableCombatPool ← derived (combatPool − combatPoolSpent)
system.derived.magicPool           ← derived ⌊(INT+WIL+MAG)/2⌋+wm, null if not Awakened
system.derived.availableMagicPool  ← derived (magicPool − magicPoolSpent), null if not Awakened
system.derived.initiative          ← derived (reaction + woundMod)
system.derived.initiativeDice      ← derived
system.combatPoolSpent             ← persisted, tracks pool usage mid-combat
system.magicPoolSpent              ← persisted, tracks magic pool usage mid-combat
system.equippedArmor               ← item ID string
system.equippedMelee               ← item ID string
system.karmaPool                   ← persisted
system.astralMode                  ← persisted: '' | 'physical' | 'dual' | 'astral'
system.matrixUserMode              ← persisted: '' | 'TRM' | 'AR' | 'VR-Cold' | 'VR-Hot'
```

### Item types and key fields
- `firearm` / `melee` / `projectile` / `thrown`: `damage` (string e.g. "9M"), `reach` (number), `category` (weapon code)
- `armor`: `ballistic` (number), `impact` (number)
- `skill`: `rating`, `linkedAttribute`, `specialisation`
- `spell`: `type` ("Mana"/"Physical"), `damage` (level letter e.g. "S" — power = Force at cast time), `drain` (formula string e.g. "(F/2)S"), `category`, `range`, `duration`

### Weapon category codes → skills
```
HOPist/LPist/MPist/HPist/VHP → Pistols
MaPist/SMG → SMG
Carb/AsRf/SptR/Snip/LCarb → Rifles
LMG/MMG/HMG/MinG → LMG
ShtG → Shotguns
GrLn → Grenade Launchers
EDG → Edged Weapons
CLB → Clubs
POL → Pole Arms/Staff
WHP → Whips/Flails
CYB/UNA → Unarmed Combat
```

---

## Key methods reference

### SR3EActor
- `rollPool(pool, tn, label, options)` — entry point for all skill/attribute rolls
- `_rollWave(count, tn, isFirstWave, prevDice, explodeIdx)` — rolls one wave of dice
- `_postWaveCard(state)` — posts a chat card for a wave result
- `handleExplosionClick(payloadJson)` — static, handles explosion button clicks
- `spendCombatPool(amount)` — spends from available pool, returns actual spent
- `refreshCombatPool()` — resets combatPoolSpent to 0
- `_postSoakCard(payload)` — posts editable soak card for this actor
- `postSoakCard(actorId, payload)` — static wrapper, safe actor lookup
- `handleSoakRollClick(btn)` — static, handles soak roll button
- `postMeleeCard(ctx)` — static, posts boxing card
- `handleMeleeRoll(btn)` — static, rolls both sides and posts result
- `_rollDodge(targetActor, dodgeDice, dodgeContext)` — static, fires dodge roll
- `rollInitiative(options)` — rolls initiative; `options.physicalDice` skips virtual roll and prompts for manual entry

### SR3EItem
- `rollWeapon(tn, options)` — ranged attack flow
- `rollMelee()` — melee attack flow
- `parseDamageCode(code)` — static, returns `{ power, level, isStun }`
- `stageDamage(base, netSuccesses)` — static, returns staged `{ power, level, isStun }`
- `_buildMeleePoolInfo(actor, weapon)` — static, returns rich pool info for boxing card
- `_getEquippedMelee(actor)` — static, finds equipped/fallback melee weapon
- `_promptTarget(attacker)` — static, shows target selection dialog
- `_promptDodgeDeclaration(defender, attackerName, weaponName)` — static, defender commits dodge dice

### SR3ECombat
- `_nextTurnSR3()` — SR3 pass-based initiative advancement
- `_nextTurnSR2()` — SR2 flat queue advancement
- `endCombat()` — override, prompts pool refresh before ending

---

## CSS custom properties
```css
--sr-bg, --sr-surface, --sr-card   ← background layers
--sr-border, --sr-border-hi        ← borders
--sr-text, --sr-muted, --sr-dim    ← text colours
--sr-accent                        ← blue, primary interactive colour
--sr-gold                          ← #c8a040, used for karma/explosion/soak
--sr-green, --sr-green-bg          ← success/dodge success
--sr-red, --sr-red-bg              ← failure/damage/melee
--sr-amber, --sr-amber-bg          ← warnings/defaulting
--r, --r-lg                        ← border radius tokens
```

---

## What is NOT yet implemented
- Spirit summoning (SR3ESpiritSummoning.js exists but is not wired in)
- Full Defense (melee/ranged defensive posture — deferred)
- Vehicle sheets
- Matrix/hacking combat
- Magic combat (spellcasting rolls exist, combat application not wired)
- Karma spending in character advancement
- Pool refresh prompts for astral/hacking pools (only combat pool currently)

---

## Known issues / watch out for
- **`system.json` changes require a full Foundry restart** — a browser reload is not enough. JS/CSS changes hot-reload; manifest/data-model changes do not.
- `prepareDerivedData` must initialise missing fields in-place: `if (!sys.x) sys.x = {}` not `const x = sys.x ?? {}`
- TypeDataModel defaults only apply to **newly created** documents — always guard reads with `?? defaultValue` for existing actors
- Circular import between SR3EActor and SR3EItem is broken via `game.sr3e` registry
- `DialogV2.render(true)` does NOT await user input — always use `DialogV2.wait()`
- Chat button handlers must use `renderChatMessageHTML` hook (v13), not `renderChatMessage`
- Explosion button payloads must carry all context fields forward through every wave or final-wave logic loses context
- `renderCombatTracker` fires on every render — guard any DOM insertions with a class check to avoid duplicates (e.g. `if (!el.querySelector('.sr3e-chase-btn'))`)

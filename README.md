# The 2nd Chumming (3e): Shadowrun 3rd Edition — Foundry VTT System
Unofficial Foundry VTT **v14** system for **Shadowrun 3rd Edition** and Matrix Defragged. 

## Installation
Under 'Game Systems', click Install System and past the URL below into the Manifest URL field. This will install the setting and associated compendiums. 
https://raw.githubusercontent.com/williamdiffey/The2ndChumming3e/main/system.json
Create a new world, select **The 2nd Chumming** as your system. 

## What to expect
- This is not a fully automated Foundry system, it will prompt, poke and nudge you, it will track wounds and modifiers, it will deal with initiative, it will reduce your - book-keeping and it will make it much easier to do the horrible bits like car chases and tracking a character's carry load. It is designed to show you what it is doing at - each stage so if you are looking to learn or brush up, this may help but you will need to know the basics. 
- Everything is editable at every stage, if you want to change the attribute, skill or TN used, you can.
- It definitely won't help you build your character but you can import one that you have made at Null Sheen dot com if you look in the macros section.
---

## Dice rolling — Rule of Six
All rolls use SR3e success-counting (d6 ≥ TN = success).
- **Exploding dice** require an extra click per die — getting 15 successes in one click is boring and kills one of the most exciting moments in SR. Each die showing 6 gets a button; click to roll it again and add to its running total.
- **Glitch** triggers when more than half the first-wave dice show 1s.
- **Critical Glitch** = glitch + zero successes.
- Rolls prompt for TN and optional combat pool allocation before rolling.
---

## Physical Dice Support
- Shift-Clicking on dice icons / roll buttons will ask you to enter the number of successes, perfect if somone wants to use real dice. 

## Initiative tracking
- **SR3 mode** (default): Pass-based. Everyone acts once per pass in init order; subtract 10 after each pass. Repeat until all initiatives ≤ 0.
- **SR2 mode**: Flat queue. All action slots pre-built and sorted descending. Walk the queue top to bottom. (change in the setgting menu).
- Wounds automatically modify initiative rolls.
- Reaction is manually editable on the actor sheet to reflect cyberware, drugs, etc.
- Initiative results can be manually adjusted in the combat tracker for situational bonuses/penalties.
---

## Magic Users 
- Select the school, type, element or totem to hide/show relevant section in the magic tab. For totem users, advantages/disadvantages will be shown in the magic notes field.
- Spell dispelling button for quick dispell actions.
- Spell casting direct automatically triggers auto-filled drain tests.
- AoE spells allow multiple targets to resist damage. 
- Conjuring automatically triggers auto-filled drain tests and notes number of acts owed to the conjurer. 
Correct damage is reported.
---

## Astral state (Awakened characters)
- Astral state is tracked in the magic tab, initiative modifiers automatically applied.
- Weapon focus can be applied to any melee weapon toggled active/inactive for when you need to stay unseen.
- Astral combat button automatically uses the correct skills and report damage.
- Assensing button allow for quick assensing tests. 
---

## Riggers
- Select VCR, RCB and Autopilot control for your vehicles and drones, automatically modifying initiative and attacks.
- Add and use weapons with the appropriate skills selected automatically.
- Driving test button allows for quick vehicle maneuver tests.
- Chase Scene works out maneuver scores from km/h speeds and vehicle stats - no more km per combat turn. 
- Chase scene calculates TNs and dice pools for accel/dec, position etc. No more handwaving getaway chases.
---

## Deckers
- Use the Matrix Unfragged system.
- Track slot damage.
- Attack using programs.
- Drag/drop and eject programs with automatic updates to memory.
- When making a new program, the program size will be automatically reported. 
- 4 matrix modes are selectable. Hot VR mode modifies initiative rolls. 
- Degradable programs are tracked.
---

## Ranged combat
- Attacks show appropriate damage code and TN, target rolls auto-completed resistance tests. 
- Dodge prompts allow defender to allocate dodge dice at the appropriate time. 
- If hit, the defender rolls auto-completed soak test.
- AoE weapons allow multiple targets to resist damage. 
- Correct damage is reported.
---

### Melee combat
- Select your target and complete a contested roll. 
- Loser completes auto-completed soak roll.
- Correct damage is reported.
---

## Vehicles
- Vehicle actors track all standard SR3 attributes (Handling, Speed, Accel, Body, Armour, Sig, Autonav, Pilot, Sensor, Cargo, Load).
- Damage track is a single box (Condition Monitor derived from Body).
- Weapons can be added to vehicles.
- Characters can be linked to vehicles; VCR/rigger mode tracked per-actor.
- VCR mode modifies initiative rolls and gives pilot +8 penalty to physical rolls. 
---

## Armour
- Equip one armour item via the actor sheet. Only the equipped piece contributes to soak (helmets do not stack at present). 
- Armour type (Ballistic/Impact) is selectable at soak time.
---

## Storage
- Weight is tracked so leave anything you don't need in storage but clicking on the home icon.


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


## What is not yet implemented
- Full Defense posture (melee/ranged defensive mode)
- add compendium for random actors, cyberdecks, programs, agents
- Matrix data sheath could be useful
- All compendiums need to be added (not via macro) and cleaned up
- Matrix compendium needs to be compiled


## Legal Disclaimer

**Shadowrun** is a registered trademark of The Topps Company, Inc. and/or its subsidiaries. The Shadowrun 3rd Edition rules, setting, and terminology are the intellectual property of The Topps Company, Inc. (currently licensed to Catalyst Game Labs). This project is an unofficial, fan-made Foundry VTT system for personal use and is not affiliated with, endorsed by, or connected to The Topps Company, Inc., Catalyst Game Labs, or any official Shadowrun rights holders. No copyright infringement is intended.

**The Matrix Defragged** is a Shadowrun 3rd Edition Matrix rules supplement available at [DriveThruRPG](https://www.drivethrurpg.com/en/product/481686/the-matrix-defragged). The Matrix rules implementation in this system draws inspiration from this work. All rights to The Matrix Defragged belong to its respective author(s) and publisher. 

All original code, design, and implementation in this system are released under the MIT License.
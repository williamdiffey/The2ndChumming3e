import { CharacterData, NpcData, VehicleData } from './data/ActorDataModels.js';
import {
  MeleeData, ProjectileData, ThrownData, FirearmData, AmmunitionData,
  ArmorData, GearData, SkillData, QualityData, CyberwareData, BiowareData,
  SpellData, ComplexFormData, SummoningData, AdeptPowerData, VehicleWeaponData, VehicleModData, ProgramData, CyberdeckData,
} from './data/ItemDataModels.js';
import { SR3EActor } from './documents/SR3EActor.js';
import { SR3EItem } from './documents/SR3EItem.js';
import { SR3EActorSheet } from './sheets/SR3EActorSheet.js';
import { SR3EVehicleSheet } from './sheets/SR3EVehicleSheet.js';
import { SR3EItemSheet } from './sheets/SR3EItemSheet.js';
import { SR3E } from './config.js';
import { SR3ECombat } from './documents/SR3ECombat.js';
import { SR3ESpiritSummoning } from './documents/SR3ESpiritSummoning.js';
import { SR3EVehicleChase } from './SR3EVehicleChase.js';

Hooks.once('init', () => {
  console.log('SR3E | Initialising');

  game.sr3e = { SR3E, SR3EActor, SR3EItem, SR3ESpiritSummoning, SR3EVehicleChase };

  // Data models (replace template.json defaults)
  CONFIG.Actor.dataModels.character = CharacterData;
  CONFIG.Actor.dataModels.npc       = NpcData;
  CONFIG.Actor.dataModels.vehicle   = VehicleData;

  CONFIG.Item.dataModels.melee        = MeleeData;
  CONFIG.Item.dataModels.projectile   = ProjectileData;
  CONFIG.Item.dataModels.thrown       = ThrownData;
  CONFIG.Item.dataModels.firearm      = FirearmData;
  CONFIG.Item.dataModels.ammunition   = AmmunitionData;
  CONFIG.Item.dataModels.armor        = ArmorData;
  CONFIG.Item.dataModels.gear         = GearData;
  CONFIG.Item.dataModels.skill        = SkillData;
  CONFIG.Item.dataModels.quality      = QualityData;
  CONFIG.Item.dataModels.cyberware    = CyberwareData;
  CONFIG.Item.dataModels.bioware      = BiowareData;
  CONFIG.Item.dataModels.spell        = SpellData;
  CONFIG.Item.dataModels.complex_form = ComplexFormData;
  CONFIG.Item.dataModels.summoning    = SummoningData;
  CONFIG.Item.dataModels.adeptpower   = AdeptPowerData;
  CONFIG.Item.dataModels.vehicleweapon = VehicleWeaponData;
  CONFIG.Item.dataModels.vehiclemod    = VehicleModData;
  CONFIG.Item.dataModels.program      = ProgramData;
  CONFIG.Item.dataModels.cyberdeck    = CyberdeckData;

  // Default icons for each item type (must reference paths that exist in Foundry v14)
  CONFIG.Item.typeIcons = {
    melee:        'icons/svg/sword.svg',
    projectile:   'icons/svg/thrust.svg',
    thrown:       'icons/svg/target.svg',
    firearm:      'icons/svg/combat.svg',
    ammunition:   'icons/svg/skull.svg',
    armor:        'icons/svg/shield.svg',
    gear:         'icons/svg/chest.svg',
    skill:        'icons/svg/book.svg',
    quality:      'icons/svg/aura.svg',
    cyberware:    'icons/svg/upgrade.svg',
    bioware:      'icons/svg/biohazard.svg',
    spell:        'icons/svg/fire.svg',
    complex_form: 'icons/svg/net.svg',
    summoning:    'icons/svg/angel.svg',
    adeptpower:   'icons/svg/lightning.svg',
    vehicleweapon:'icons/svg/explosion.svg',
    vehiclemod:   'icons/svg/clockwork.svg',
    program:      'icons/svg/net.svg',
    cyberdeck:    'icons/svg/portal.svg',
  };

  CONFIG.Actor.documentClass = SR3EActor;
  CONFIG.Item.documentClass = SR3EItem;
  CONFIG.Combat.documentClass = SR3ECombat;

  // Register sheets
  foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EActorSheet, {
    types: ['character', 'npc'],
    makeDefault: true,
    label: 'SR3E Character Sheet'
  });

  foundry.documents.collections.Actors.registerSheet('The2ndChumming3e', SR3EVehicleSheet, {
    types: ['vehicle'],
    makeDefault: true,
    label: 'SR3E Vehicle Sheet'
  });

  foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet('The2ndChumming3e', SR3EItemSheet, {
    makeDefault: true,
    label: 'SR3E Item Sheet'
  });

  // Register system setting for initiative mode
  game.settings.register('The2ndChumming3e', 'initiativeMode', {
    name: 'Initiative Mode',
    hint: 'SR3: Everyone acts once in order, then fast characters get additional passes. SR2: Pure descending order, subtract 10 per pass.',
    scope: 'world',
    config: true,
    type: String,
    choices: {
      'sr3': 'SR3 (Everyone acts once, then extra passes)',
      'sr2': 'SR2 (Pure descending order)'
    },
    default: 'sr3'
  });

  console.log('SR3E | Ready');
});

// Auto-create GM utility macros on first load
Hooks.once('ready', async () => {
  if (!game.user.isGM) return;

  const macros = [
    {
      name: 'Import Nullsheen 3e Character json',
      path: 'scripts/macros/import-sr3-character.js',
      img:  'icons/svg/mystery-man.svg',
    },
    {
      name: 'Populate SR3E Sample Characters (1–5)',
      path: 'scripts/macros/populate-sample-characters.js',
      img:  'icons/svg/mystery-man.svg',
    },
    {
      name: 'Populate SR3E Sample Characters (6–14)',
      path: 'scripts/macros/populate-sample-characters-2.js',
      img:  'icons/svg/mystery-man.svg',
    },
  ];

  for (const def of macros) {
    if (game.macros.find(m => m.name === def.name)) continue;
    try {
      const src = await fetch(`systems/The2ndChumming3e/${def.path}`).then(r => r.text());
      await Macro.create({ name: def.name, type: 'script', command: src, img: def.img });
      ui.notifications.info(`SR3E: "${def.name}" macro added to your macro library.`);
    } catch (err) {
      console.warn(`SR3E | Could not auto-create macro "${def.name}":`, err);
    }
  }
});

// Vehicle Chase button + drone/VCR labels in the combat tracker sidebar
Hooks.on('renderCombatTracker', (_app, html) => {
  const el  = html instanceof HTMLElement ? html : html[0];

  // Label drone and jumped-in combatants
  const combat = game.combat;
  if (combat) {
    el.querySelectorAll('[data-combatant-id]').forEach(row => {
      const cid  = row.dataset.combatantId;
      const cbt  = combat.combatants.get(cid);
      if (!cbt?.actor) return;

      // Vehicle in combat: show RCD / VCR mode tag
      if (cbt.actor.type === 'vehicle') {
        const vcrMode   = cbt.actor.system.vcrMode ?? false;
        const pilotName = cbt.actor.system.controlledBy?.trim() ?? '';
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        if (!pilotName) {
          tag.textContent  = 'Auto';
          tag.style.background = '#2a2010';
          tag.style.color      = '#c8a040';
        } else if (vcrMode) {
          tag.textContent  = `VCR: ${pilotName}`;
          tag.style.background = '#1a3a5c';
          tag.style.color      = '#5ab4f5';
        } else {
          tag.textContent  = 'RCD';
          tag.style.background = '#1c2a1c';
          tag.style.color      = '#7db87d';
        }
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Jacked-in decker: show VR mode badge
      const matrixMode = cbt.actor.system?.matrixUserMode ?? '';
      if (matrixMode === 'VR-Cold' || matrixMode === 'VR-Hot') {
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        tag.textContent   = matrixMode === 'VR-Hot' ? 'VR-Hot 🔥' : 'VR-Cold';
        tag.style.background = matrixMode === 'VR-Hot' ? '#3a1a1a' : '#1a2a3a';
        tag.style.color      = matrixMode === 'VR-Hot' ? '#f57070' : '#70b8f5';
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // Astral state badge
      const astralMode = cbt.actor.system?.astralMode ?? '';
      if (astralMode) {
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;margin-left:4px;';
        if (astralMode === 'astral') {
          tag.textContent      = 'Astral';
          tag.style.background = '#2a1a3a';
          tag.style.color      = '#c070f5';
        } else if (astralMode === 'dual') {
          tag.textContent      = 'Dual Nat.';
          tag.style.background = '#2a2200';
          tag.style.color      = '#c8a040';
        } else if (astralMode === 'physical') {
          tag.textContent      = 'Physical';
          tag.style.background = '#1a1a1a';
          tag.style.color      = '#888';
        }
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }

      // VCR rigger: reminder badge — vehicle bonus and non-vehicle penalty
      const jumpedInto = cbt.flags?.The2ndChumming3e?.jumpedInto;
      if (jumpedInto) {
        const vcrRating = cbt.actor?.system?.derived?.vcrRating ?? 0;
        const tnBonus   = vcrRating * 2;
        const tag = document.createElement('span');
        tag.style.cssText = 'font-size:10px;color:var(--sr-accent);margin-left:6px;';
        const bonusPart = tnBonus ? ` veh TN−${tnBonus}` : '';
        tag.textContent = `VCR: ${jumpedInto} |${bonusPart} non-veh TN+8`;
        const nameEl = row.querySelector('.combatant-name, .token-name, h4');
        if (nameEl) nameEl.appendChild(tag);
      }
    });
  }

  // Replace d20 icon with bolt to match actor sheet style
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) icon.className = 'fas fa-bolt';
    btn.title = 'Roll Initiative (Shift: physical dice)';
  });

  // Shift-click initiative buttons → physical dice mode
  el.querySelectorAll('[data-action="rollInitiative"]').forEach(btn => {
    btn.addEventListener('click', async event => {
      if (!event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const row = btn.closest('[data-combatant-id]');
      if (!row) return;
      const cbt = game.combat?.combatants.get(row.dataset.combatantId);
      if (!cbt?.actor) return;

      await cbt.actor.clearSpellDefense?.();
      const score = await cbt.actor.rollInitiative({ physicalDice: true });
      if (score === null || score === undefined) return;

      await cbt.update({
        initiative: score,
        flags: {
          The2ndChumming3e: {
            baseInitiative:    score,
            currentInitiative: score,
            passesRemaining:   Math.floor(score / 10) + 1,
          }
        }
      });
      await game.combat?.update({ flags: { The2ndChumming3e: { sr2Queue: null, sr2QueueIndex: 0 } } });
      if (ui.combat) ui.combat.render();
    }, true); // capture phase so we intercept before Foundry's bubble handler
  });

  // Intercept "Begin Encounter" → show multi-actor initiative selector
  const startBtn = el.querySelector('[data-action="startCombat"]');
  if (startBtn && combat) {
    startBtn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopImmediatePropagation();

      let combatants = combat.combatants.contents;

      // No combatants yet — let the GM pick tokens from the scene first
      if (!combatants.length) {
        const sceneTokens = (canvas.tokens?.placeables ?? []).filter(t => t.actor);

        if (!sceneTokens.length) {
          ui.notifications.warn('No actors selected for combat.');
          return;
        }

        const addRows = sceneTokens.map(t => `
          <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;">
            <input type="checkbox" data-token-id="${t.id}" data-actor-id="${t.actorId ?? ''}"/>
            <span>${t.name}</span>
          </label>
        `).join('');

        let toAdd = [];
        let addProceed = false;
        await foundry.applications.api.DialogV2.wait({
          window: { title: 'Add Actors to Encounter' },
          content: `
            <p style="margin:0 0 8px;color:var(--sr-muted);font-size:11px;">
              No actors are in the encounter. Select tokens to add.
            </p>
            <div>${addRows}</div>
          `,
          buttons: [
            {
              label: 'Add & Continue',
              action: 'add',
              default: true,
              callback: (_e, _b, dialog) => {
                addProceed = true;
                toAdd = [...dialog.element.querySelectorAll('[data-token-id]:checked')]
                  .map(cb => ({ tokenId: cb.dataset.tokenId, actorId: cb.dataset.actorId || undefined, sceneId: canvas.scene?.id }));
              }
            },
            { label: 'Cancel', action: 'cancel' },
          ],
        });

        if (!addProceed) return;
        if (!toAdd.length) {
          ui.notifications.warn('No actors selected for combat.');
          return;
        }

        await combat.createEmbeddedDocuments('Combatant', toAdd);
        combatants = combat.combatants.contents;
      }

      const rows = combatants.map(c => `
        <label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;">
          <input type="checkbox" data-cbt-id="${c.id}" checked/>
          <span>${c.actor?.name ?? c.name}</span>
        </label>
      `).join('');

      let selectedIds = [];
      let proceed = false;
      await foundry.applications.api.DialogV2.wait({
        window: { title: 'Roll Initiative & Begin Encounter' },
        content: `
          <p style="margin:0 0 8px;color:var(--sr-muted);font-size:11px;">
            Select combatants to roll initiative for before starting the encounter.
          </p>
          <div>${rows}</div>
        `,
        buttons: [
          {
            label: 'Auto-roll Initiative',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              proceed = true;
              selectedIds = [...dialog.element.querySelectorAll('[data-cbt-id]:checked')]
                .map(cb => cb.dataset.cbtId);
              if (!selectedIds.length) {
                const random = combatants[Math.floor(Math.random() * combatants.length)];
                selectedIds = [random.id];
              }
            }
          },
          {
            label: 'Roll Initiative',
            action: 'skip',
            callback: () => { proceed = true; }
          },
          { label: 'Cancel', action: 'cancel' },
        ],
      });

      if (!proceed) return;
      if (selectedIds.length) await combat.rollInitiative(selectedIds);
      await combat.startCombat();
    }, true); // capture phase — intercepts before Foundry's bubble handler
  }

  if (!el.querySelector('.sr3e-chase-btn')) {
    const footer = el.querySelector('footer') ?? el.querySelector('.combat-controls');
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'sr3e-chase-btn';
    btn.textContent = '🚗 Chase Scene';
    btn.style.cssText = 'display:block;box-sizing:border-box;margin:4px 8px 0;width:calc(100% - 16px);';
    btn.addEventListener('click', () => game.sr3e.SR3EVehicleChase.open());
    if (footer) footer.insertAdjacentElement('afterend', btn);
    else el.appendChild(btn);
  }
});

// Re-render combat tracker when a vehicle actor's control mode changes so the
// VCR / RCD / Auto badge in the sidebar stays current without needing a turn advance.
Hooks.on('updateActor', (actor, changes) => {
  if (actor.type !== 'vehicle') return;
  const sys = changes?.system ?? {};
  if ('vcrMode' in sys || 'controlledBy' in sys) {
    ui.combat?.render();
  }
});

// Attach explosion button handler to each chat message as it renders.
// renderChatMessage fires for every new message, ensuring buttons are always wired.
Hooks.on('renderChatMessageHTML', (_message, html, _data) => {
  // Rule of Six explosion button
  html.querySelectorAll('.sr-explode-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Rolling\u2026';
      await SR3EActor.handleExplosionClick(payload);
    });
  });

  // "Resist Damage" button — posts soak card for the identified target
  html.querySelectorAll('.sr-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Preparing\u2026';
      const p = JSON.parse(payload);
      await SR3EActor.postSoakCard(p.targetActorId, p);
    });
  });

  // Dodge roll button — triggered by player after seeing attack hits
  html.querySelectorAll('.sr-dodge-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const payload = btn.dataset.payload;
      if (!payload) return;
      btn.disabled    = true;
      btn.textContent = '\u23f3 Rolling\u2026';
      const p           = JSON.parse(payload);
      const targetActor = game.actors.get(p.targetActorId);
      if (targetActor) await SR3EActor._rollDodge(targetActor, p.committedDodgeDice, p, event.shiftKey);
    });
  });

  // Melee Roll! button on boxing card
  html.querySelectorAll('.sr-melee-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleMeleeRoll(btn, event.shiftKey);
    });
  });

  // Roll Soak button on soak card (also handles spell-resist soak via same handler)
  html.querySelectorAll('.sr-soak-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSoakRollClick(btn, event.shiftKey);
    });
  });

  // Spell resist button — posts a spell-specific soak card (Willpower/Body, TN = Force)
  html.querySelectorAll('.sr-spell-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postSpellSoakCard(p.targetActorId, p);
    });
  });

  // Confirm Summoning button — creates the spirit actor
  html.querySelectorAll('.sr-summon-confirm-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Summoning…';
      await SR3ESpiritSummoning.confirmSummoning(p);
    });
  });

  // Drain button — posts drain resist card for the caster
  html.querySelectorAll('.sr-drain-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postDrainCard(p.actorId, p);
    });
  });

  // Roll Drain button on drain card
  html.querySelectorAll('.sr-drain-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleDrainRollClick(btn, event.shiftKey);
    });
  });

  // Spell Defense declaration card — Commit
  html.querySelectorAll('.sr-sd-declare-commit-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseDeclareCommit(btn);
    });
  });

  // Spell Defense declaration card — Skip (delete card without committing)
  html.querySelectorAll('.sr-sd-declare-skip-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const msgEl = btn.closest('[data-message-id]');
      const msg = msgEl ? game.messages.get(msgEl.dataset.messageId) : null;
      if (msg) await msg.delete();
    });
  });

  // Spell Defense roll button — on the spell defense phase card
  html.querySelectorAll('.sr-spell-defense-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseRoll(btn, event.shiftKey);
    });
  });

  // Proceed to Resist Spell — skips remaining defense rolls
  html.querySelectorAll('.sr-spell-defense-proceed-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleSpellDefenseProceed(btn);
    });
  });

  // Astral Combat Roll! button on boxing card
  html.querySelectorAll('.sr-astral-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleAstralRoll(btn, event.shiftKey);
    });
  });

  // Astral soak button — posts astral resist card (INT dice, TN = winner's CHA)
  html.querySelectorAll('.sr-astral-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      const p = JSON.parse(btn.dataset.payload);
      btn.disabled    = true;
      btn.textContent = '⏳ Preparing…';
      await SR3EActor.postAstralSoakCard(p.actorId, p);
    });
  });

  // Roll to Resist (Astral) button on astral soak card
  html.querySelectorAll('.sr-astral-soak-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleAstralSoakRoll(btn, event.shiftKey);
    });
  });

  // Aura Reading complementary roll button on assensing result card
  html.querySelectorAll('.sr-aura-reading-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleAuraReadingClick(btn, event.shiftKey);
    });
  });

  // Universal contested roll button
  html.querySelectorAll('.sr-contested-roll-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      btn.disabled    = true;
      btn.textContent = '⏳ Rolling…';
      await SR3EActor.handleContestedRoll(btn, event.shiftKey);
    });
  });

  // Ramming — vehicle soak button (body + control pool vs TN power)
  html.querySelectorAll('.sr-ram-vehicle-soak-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleRamVehicleSoak(btn, event.shiftKey);
    });
  });

  // Ramming — individual passenger resist button
  html.querySelectorAll('.sr-ram-passenger-resist-btn').forEach(btn => {
    btn.addEventListener('click', async event => {
      event.preventDefault();
      event.stopPropagation();
      await SR3EActor.handleRamPassengerResist(btn, event.shiftKey);
    });
  });
});
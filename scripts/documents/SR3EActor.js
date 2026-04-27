import { SR3EItem } from './SR3EItem.js';

export class SR3EActor extends Actor {

  /** @inheritdoc — see SR3EItem.migrateData for explanation */
  static migrateData(source) {
    if ( source.flags ) {
      const desc = Object.getOwnPropertyDescriptor(source.flags, "exportSource");
      if ( desc?.get ) {
        delete source.flags.exportSource;
      } else if ( desc?.value !== undefined ) {
        source._stats ??= {};
        source._stats.exportSource = {
          worldId:       source.flags.exportSource?.world ?? null,
          uuid:          null,
          coreVersion:   source.flags.exportSource?.coreVersion ?? null,
          systemId:      source.flags.exportSource?.system ?? null,
          systemVersion: source.flags.exportSource?.systemVersion ?? null,
        };
        delete source.flags.exportSource;
      }
    }
    return super.migrateData(source);
  }

  // /** @override */
  // constructor(data, context) {
  //   super(data, context);
    
  //   // Ensure system object exists
  //   if (!this.system) {
  //     this.system = {};
  //   }
  //   if (!this.system.attributes) {
  //     this.system.attributes = {};
  //   }
  //   if (!this.system.wounds) {
  //     this.system.wounds = {
  //       stun: { value: 0, max: 10 },
  //       physical: { value: 0, max: 10 },
  //       overflow: { value: 0 }
  //     };
  //   }
  // }

  /** @override */
  prepareDerivedData() {
   // Guard: If system isn't ready yet, don't proceed with data preparation.
    if (!this.system) return;

    const sys  = this.system;
    // Always ensure attributes and wounds exist on sys so writes persist
    if (!sys.attributes) sys.attributes = {};
    if (!sys.wounds)     sys.wounds     = { stun: { value: 0, max: 10 }, physical: { value: 0, max: 10 }, overflow: { value: 0 } };
    const attr = sys.attributes;
    const w    = sys.wounds;

    // FIX: Ensure attributes have value property for rolling
    this._ensureAttributeValues(attr);

    const stunVal = w.stun?.value     ?? 0;
    const physVal = w.physical?.value ?? 0;
    sys.woundMod  = -(Math.floor(stunVal / 3) + Math.floor(physVal / 3));

    if (this.type === 'character' || this.type === 'npc') {
      this._prepareCharacter(sys, attr);
    } else if (this.type === 'vehicle') {
      this._prepareVehicle(sys, attr);
    }
  }

  // ... rest of the file remains the same ...

  /**
 * Ensure all attributes have a numeric value property
 * @protected
 */
_ensureAttributeValues(attr) {
  if (!attr) {
    this.system.attributes = {};
    return;
  }
  
  const defaults = {
    body: 3, quickness: 3, strength: 3, charisma: 3,
    intelligence: 3, willpower: 3, essence: 6, magic: 0
  };
  
  for (const [key, defaultVal] of Object.entries(defaults)) {
    if (!attr[key]) {
      attr[key] = { base: defaultVal, value: defaultVal };
    } else {
      // Ensure base exists
      if (attr[key].base === undefined || attr[key].base === null) {
        attr[key].base = defaultVal;
      }
      // Ensure value exists and is a number
      if (attr[key].value === undefined || attr[key].value === null) {
        attr[key].value = attr[key].base;
      }
      // Convert to numbers
      attr[key].base = Number(attr[key].base);
      attr[key].value = Number(attr[key].value);
    }
  }
  
  // Special handling for reaction
  if (!attr.reaction) {
    const quick = attr.quickness?.base ?? 3;
    const intel = attr.intelligence?.base ?? 3;
    attr.reaction = {
      base: Math.floor((quick + intel) / 2),
      value: Math.floor((quick + intel) / 2),
      bonus: 0,
      override: false
    };
  } else {
    if (attr.reaction.base === undefined) {
      const quick = attr.quickness?.base ?? 3;
      const intel = attr.intelligence?.base ?? 3;
      attr.reaction.base = Math.floor((quick + intel) / 2);
    }
    if (attr.reaction.value === undefined) {
      attr.reaction.value = attr.reaction.base + (attr.reaction.bonus ?? 0);
    }
    if (attr.reaction.bonus === undefined) attr.reaction.bonus = 0;
    if (attr.reaction.override === undefined) attr.reaction.override = false;
    
    // Convert to numbers
    attr.reaction.base = Number(attr.reaction.base);
    attr.reaction.value = Number(attr.reaction.value);
    attr.reaction.bonus = Number(attr.reaction.bonus);
  }
}

_prepareVehicle(sys, attr) {
  if (!sys.derived) sys.derived = {};
  if (!sys.damage)  sys.damage  = { value: 0 };
  const body = attr.body?.base ?? 4;
  sys.derived.damageMax      = body * 2;
  sys.derived.damageDisabled = body;
}

_prepareCharacter(sys, attr) {
  const wm      = sys.woundMod ?? 0;
  const isAdept = (sys.magicType ?? '') === 'Adept';

  // Apply adept force to core attributes first — derivations below use .value
  for (const key of ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower']) {
    if (attr[key]) {
      attr[key].value = (attr[key].base ?? 0) + (isAdept ? (attr[key].force ?? 0) : 0);
    }
  }

  // Reaction — derived from force-enhanced QUI + INT per RAW
  if (attr.reaction) {
    const baseReaction = Math.floor(
      ((attr.quickness?.value ?? 0) + (attr.intelligence?.value ?? 0)) / 2
    );
    attr.reaction.base = baseReaction;

    if (!attr.reaction.override) {
      attr.reaction.value = baseReaction
        + (attr.reaction.reactionBonus ?? 0)
        + (isAdept ? (attr.reaction.force ?? 0) : 0);
    }
  }

  // Essence — reduced by cyberware only (M&M rules: bioware uses Bio Index, not Essence)
  if (attr.essence) {
    let essenceLoss = 0;
    for (const item of (this.items ?? [])) {
      if (item.type === 'cyberware') {
        essenceLoss += parseFloat(item.system?.essenceCost ?? 0);
      }
    }
    attr.essence.value = Math.max(0, parseFloat((6 - essenceLoss).toFixed(2)));
  }

  // Bio Index (M&M p.XX): capacity = Essence + 3; effective magic = Essence − (totalBioIndex ÷ 2)
  let totalBioIndex = 0;
  for (const item of (this.items ?? [])) {
    if (item.type === 'bioware') {
      totalBioIndex += parseFloat(item.system?.bioIndex ?? 0);
    }
  }
  totalBioIndex = Math.round(totalBioIndex * 1000) / 1000;
  const bioIndexCapacity = Math.round(((attr.essence?.value ?? 6) + 3) * 100) / 100;
  const bioIndexOver     = totalBioIndex > bioIndexCapacity;

  // Magic — capped by effective magic (Essence − bioIndex÷2), then add adept force
  const magicBase     = attr.magic?.base ?? 0;
  const essenceVal    = attr.essence?.value ?? 6;
  const effectiveMagic = Math.max(0, essenceVal - (totalBioIndex / 2));
  if (attr.magic && magicBase > 0) {
    attr.magic.value = Math.min(magicBase, Math.floor(effectiveMagic))
      + (isAdept ? (attr.magic.force ?? 0) : 0);
  }
  const magicSuppressed = magicBase > 0 && effectiveMagic < magicBase;

  // Derived pools — all use .value so adept force benefits every relevant pool
  const combatPoolBase = Math.max(0, Math.floor(
    ((attr.quickness?.value    ?? 0) +
     (attr.intelligence?.value ?? 0) +
     (attr.willpower?.value    ?? 0)) / 2
  ) + wm);
  const combatPool          = combatPoolBase + (sys.combatPoolMod ?? 0);
  const combatPoolSpent     = sys.combatPoolSpent ?? 0;
  const availableCombatPool = Math.max(0, combatPool - combatPoolSpent);

  const magicEff      = attr.magic?.value ?? 0;
  const spellPoolBase = magicBase > 0
    ? Math.max(0, Math.floor(
        ((attr.intelligence?.value ?? 0) +
         (attr.willpower?.value    ?? 0) +
         magicEff) / 2
      ) + wm)
    : null;
  const spellPool          = spellPoolBase !== null ? spellPoolBase + (sys.spellPoolMod ?? 0) : null;
  const spellPoolSpent     = magicBase > 0 ? (sys.spellPoolSpent ?? 0) : 0;
  const availableSpellPool = spellPool !== null ? Math.max(0, spellPool - spellPoolSpent) : null;

  const hackingPoolBase = Math.floor((attr.intelligence?.value ?? 0) / 2) + (sys.hackingBonus ?? 0) + wm;

  // Astral pool (magic users only): floor((INT + CHA + WIL) / 3) + woundMod
  const astralPoolBase = magicBase > 0
    ? Math.max(0, Math.floor(
        ((attr.intelligence?.value ?? 0) +
         (attr.charisma?.value    ?? 0) +
         (attr.willpower?.value   ?? 0)) / 3
      ) + wm)
    : null;
  const astralPool          = astralPoolBase !== null ? astralPoolBase + (sys.astralPoolMod ?? 0) : null;
  const astralPoolSpent     = magicBase > 0 ? (sys.astralPoolSpent ?? 0) : 0;
  const availableAstralPool = astralPool !== null ? Math.max(0, astralPool - astralPoolSpent) : null;

  const vcrItem   = sys.activeVCRItemId ? this.items?.get(sys.activeVCRItemId) : null;
  const vcrRating = vcrItem ? (vcrItem.system?.rating ?? 0) : 0;

  sys.derived = {
    initiative:         (attr.reaction?.value ?? 0) + wm,
    initiativeDice:     1 + (sys.initiativeDiceBonus ?? 0) + (attr.reaction?.diceBonus ?? 0),
    combatPoolBase,
    combatPool,
    availableCombatPool,
    karmaPool:          Math.max(0, sys.karmaPool ?? 0),
    spellPoolBase,
    spellPool,
    availableSpellPool,
    astralPoolBase,
    astralPool,
    availableAstralPool,
    hackingPoolBase,
    hackingPool:        Math.max(0, hackingPoolBase),
    vcrRating,
    vcrActive:          vcrRating > 0,
    totalBioIndex,
    bioIndexCapacity,
    bioIndexOver,
    effectiveMagic:     Math.round(effectiveMagic * 100) / 100,
    magicSuppressed,
  };
}

  // ---------------------------------------------------------------------------
  // ROLLING — Interactive Rule of Six
  //
  // Each die is tracked as a state object throughout the explosion chain:
  //   { index, total, faces, isOne, needsExplosion, done, success }
  //
  // Wave 0  — initial roll of the full pool, one face per die.
  // Wave N  — roll only dice whose last face was 6 AND whose running total
  //           is still below TN. A die that rolls 6 but is already >= TN
  //           is a success and stops immediately.
  //
  // Between waves the player clicks "Roll explosions" in the chat card.
  // All state is serialised into a data attribute on the button so no
  // server-side storage is needed.
  // ---------------------------------------------------------------------------

  /**
   * Entry point for all skill/weapon/attribute rolls.
   */
  async rollPool(pool, tn = 4, label = 'Roll', options = {}) {
    pool = parseInt(pool) || 0;
    if (pool < 1) {
      ui.notifications.warn(`${this.name}: dice pool is 0.`);
      return null;
    }

    // If this actor is jumped into a vehicle via VCR, apply the stored TN modifier
    const vcrCombatant = game.combat?.combatants.find(c => c.actorId === this.id);
    const vcrTnMod     = vcrCombatant?.flags?.The2ndChumming3e?.vcrTnMod ?? 0;
    const effectiveTN  = Math.max(2, tn + vcrTnMod);

    if (options.physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) return null;
      await this._postWaveCard({
        actorId:             this.id,
        label,
        tn:                  effectiveTN,
        pool,
        wave:                0,
        dice:                SR3EActor._buildPhysicalDice(pool, successes),
        ones:                0,
        glitch:              false,
        physicalDice:        true,
        physicalSuccesses:   successes,
        isWeaponRoll:        options.isWeaponRoll       ?? false,
        isMelee:             options.isMelee            ?? false,
        isAoE:               options.isAoE              ?? false,
        aoeTargetIds:        options.aoeTargetIds       ?? null,
        rawDamage:           options.rawDamage          ?? '',
        damageBase:          options.damageBase         ?? null,
        weaponItemId:        options.weaponItemId       ?? null,
        attackerActorId:     this.id,
        targetActorId:       options.targetActorId      ?? null,
        committedDodgeDice:  options.committedDodgeDice ?? 0,
        isSpellRoll:         options.isSpellRoll        ?? false,
        spellContext:        options.spellContext        ?? null,
        isDispelRoll:        options.isDispelRoll       ?? false,
        dispelContext:       options.dispelContext       ?? null,
        isConjuringRoll:     options.isConjuringRoll    ?? false,
        conjuringContext:    options.conjuringContext    ?? null,
        isAssensingRoll:     options.isAssensingRoll    ?? false,
        isAuraReadingRoll:   options.isAuraReadingRoll  ?? false,
        auraReadingContext:  options.auraReadingContext  ?? null,
        isRammingRoll:       options.isRammingRoll      ?? false,
        rammingContext:      options.rammingContext      ?? null,
        isCrashRoll:         options.isCrashRoll         ?? false,
        crashContext:        options.crashContext         ?? null,
        isSoakRoll:          options.isSoakRoll         ?? false,
        soakPayload:         options.soakPayload        ?? null,
        isVehicleSoakRoll:   options.isVehicleSoakRoll  ?? false,
        vehicleSoakContext:  options.vehicleSoakContext  ?? null,
        footerNote:          options.footerNote         ?? null,
      });
      return successes;
    }

    const dice = this._rollWave(pool, effectiveTN, /* isFirstWave */ true);
    const ones   = dice.filter(d => d.isOne).length;
    const glitch = ones > Math.floor(pool / 2);

    await this._postWaveCard({
      actorId:         this.id,
      label,
      tn:              effectiveTN,
      pool,
      wave:            0,
      dice,
      ones,
      glitch,
      isWeaponRoll:        options.isWeaponRoll       ?? false,
      isMelee:             options.isMelee            ?? false,
      isAoE:               options.isAoE              ?? false,
      aoeTargetIds:        options.aoeTargetIds       ?? null,
      rawDamage:           options.rawDamage          ?? '',
      damageBase:          options.damageBase         ?? null,
      weaponItemId:        options.weaponItemId       ?? null,
      attackerActorId:     this.id,
      targetActorId:       options.targetActorId      ?? null,
      committedDodgeDice:  options.committedDodgeDice ?? 0,
      isSpellRoll:         options.isSpellRoll        ?? false,
      spellContext:        options.spellContext        ?? null,
      isDispelRoll:        options.isDispelRoll       ?? false,
      dispelContext:       options.dispelContext      ?? null,
      isConjuringRoll:     options.isConjuringRoll    ?? false,
      conjuringContext:    options.conjuringContext   ?? null,
      isAssensingRoll:     options.isAssensingRoll    ?? false,
      isAuraReadingRoll:   options.isAuraReadingRoll  ?? false,
      auraReadingContext:  options.auraReadingContext  ?? null,
      isRammingRoll:       options.isRammingRoll      ?? false,
      rammingContext:      options.rammingContext      ?? null,
      isCrashRoll:         options.isCrashRoll         ?? false,
      crashContext:        options.crashContext         ?? null,
      isSoakRoll:          options.isSoakRoll         ?? false,
      soakPayload:         options.soakPayload        ?? null,
      isVehicleSoakRoll:   options.isVehicleSoakRoll  ?? false,
      vehicleSoakContext:  options.vehicleSoakContext  ?? null,
      footerNote:          options.footerNote         ?? null,
    });
  }

  /**
   * Roll one wave of dice.
   *
   * Wave 0: builds a fresh array of `count` dice, each rolled once.
   * Wave N: clones prevDice, advances only the indices listed in explodeIdx.
   *
   * Stopping rule: a die stops exploding when either
   *   (a) its running total >= TN  (success, done), or
   *   (b) its latest face != 6     (failure or success without explosion).
   */
  _rollWave(count, tn, isFirstWave = false, prevDice = [], explodeIdx = []) {
    if (isFirstWave) {
      const dice = [];
      for (let i = 0; i < count; i++) {
        const face    = Math.floor(Math.random() * 6) + 1;
        const total   = face;
        const success = total >= tn;
        // A 6 that already meets TN is a success — no explosion.
        const needsExplosion = face === 6 && !success;
        dice.push({
          index: i,
          total,
          faces: [face],
          isOne: face === 1,
          needsExplosion,
          done:    !needsExplosion,
          success,
        });
      }
      return dice;
    }

    // Clone previous state and advance only the exploding dice.
    const dice = prevDice.map(d => ({ ...d, faces: [...d.faces] }));
    for (const idx of explodeIdx) {
      const d    = dice[idx];
      const face = Math.floor(Math.random() * 6) + 1;
      d.faces.push(face);
      d.total  += face;
      d.success = d.total >= tn;

      if (d.success) {
        // Hit or exceeded TN — done regardless of face.
        d.needsExplosion = false;
        d.done           = true;
      } else if (face === 6) {
        // Still below TN and another 6 — keep going.
        d.needsExplosion = true;
        d.done           = false;
      } else {
        // Below TN, no 6 — final failure.
        d.needsExplosion = false;
        d.done           = true;
      }
    }
    return dice;
  }

  static async _promptPhysicalSuccesses(pool, tn, label) {
    let successes = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${label} — Physical Dice` },
      content: `
        <div style="padding:8px 0">
          <p>TN: <strong>${tn}</strong> &nbsp;—&nbsp; Pool: <strong>${pool}</strong> dice</p>
          <p style="color:var(--sr-amber);font-size:11px;margin-bottom:10px">⚠ Re-roll any 6s before entering your total.</p>
          <label style="display:flex;align-items:center;gap:8px">
            Successes:
            <input type="number" id="phys-successes" value="0" min="0" max="${pool * 5}"
                   style="width:60px" autofocus/>
          </label>
        </div>`,
      buttons: [
        {
          label: 'Confirm',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dlg) => {
            successes = parseInt(dlg.element.querySelector('#phys-successes')?.value) || 0;
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    return successes;
  }

  static _buildPhysicalDice(pool, successes) {
    return Array.from({ length: pool }, (_, i) => ({
      index:          i,
      total:          i < successes ? 4 : 1,
      faces:          [i < successes ? 4 : 1],
      isOne:          false,
      needsExplosion: false,
      done:           true,
      success:        i < successes,
    }));
  }

  /**
   * Post a wave result as a chat card.
   *
   * All roll state is embedded as JSON in the explosion button's data-payload
   * attribute so the click handler can resume without any server storage.
   */
  async _postWaveCard(state) {
    const { actorId, label, tn, pool, wave, dice, ones, glitch } = state;
    const successes     = state.physicalDice ? (state.physicalSuccesses ?? 0) : dice.filter(d => d.success).length;
    const explodingDice = state.physicalDice ? [] : dice.filter(d => d.needsExplosion);
    const allDone       = state.physicalDice || explodingDice.length === 0;

    // Build dice display — exploding dice show a ★ and a pending style.
    const diceHtml = state.physicalDice
      ? `<span class="sr-die sr-hit" title="Physical dice result">📋 ${successes} success${successes !== 1 ? 'es' : ''} entered</span>`
      : dice.map(d => {
          const cls = ['sr-die'];
          if (d.done && d.success)  cls.push('sr-hit');
          else if (d.done)          cls.push('sr-miss');
          else                      cls.push('sr-exploding');
          if (d.isOne)              cls.push('sr-one');

          const title   = d.faces.length > 1 ? `${d.faces.join(' + ')} = ${d.total}` : `${d.total}`;
          const display = d.needsExplosion ? `${d.total}★` : `${d.total}`;
          return `<span class="${cls.join(' ')}" title="${title}">${display}</span>`;
        }).join('');

    // Result block — only shown when all dice are resolved.
    let resultHtml = '';
    if (allDone) {
      const criticalGlitch = glitch && successes === 0;
      const glitchHtml     = criticalGlitch
        ? '<div class="sr-critical-glitch">⚠ CRITICAL GLITCH! ⚠</div>'
        : glitch
          ? '<div class="sr-glitch">⚠ Glitch</div>'
          : '';

      // Weapon roll result — dodge was pre-declared, so we resolve immediately
      let stagingHtml = '';
      let postRollHtml = '';

      if (state.isWeaponRoll && state.damageBase) {
        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">0 hits — no damage</div>';
        } else {
          const staged     = SR3EItem.stageDamage(state.damageBase, successes);
          const trackLabel = staged.isStun ? 'Stun' : 'Physical';
          const stagedStr  = `${staged.power}${staged.level}`;
          stagingHtml = `
            <div class="sr-staging-result">
              📊 ${state.rawDamage} + ${successes} hits → <strong>${stagedStr} ${trackLabel}</strong>
            </div>`;

          const targetActor  = game.actors.get(state.targetActorId);
          const targetName   = targetActor?.name ?? 'Target';
          const attackerName = game.actors.get(state.attackerActorId)?.name ?? 'Attacker';

          if (state.isAoE && state.aoeTargetIds?.length) {
            // AoE weapon — soak button for every target, no dodge
            for (const tid of state.aoeTargetIds) {
              const tActor = game.actors.get(tid);
              if (!tActor) continue;
              const soakCtx = JSON.stringify({
                attackerActorId: state.attackerActorId,
                targetActorId:   tid,
                weaponItemId:    state.weaponItemId,
                isMelee:         false,
                stagedPower:     staged.power,
                stagedLevel:     staged.level,
                isStun:          staged.isStun,
                rawDamage:       state.rawDamage,
              }).replace(/'/g, '&#39;');
              postRollHtml += `
                <div class="sr-soak-action">
                  <button class="sr-soak-btn" data-payload='${soakCtx}'>
                    🛡 ${tActor.name}: Resist Damage
                  </button>
                </div>`;
            }
          } else if ((state.committedDodgeDice ?? 0) > 0) {
            // Defender committed dice — show a button to trigger the dodge roll
            const dodgeContext = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   state.targetActorId,
              weaponItemId:    state.weaponItemId,
              isMelee:         state.isMelee,
              attackSuccesses: successes,
              committedDodgeDice: state.committedDodgeDice,
              stagedPower:     staged.power,
              stagedLevel:     staged.level,
              isStun:          staged.isStun,
              rawDamage:       state.rawDamage,
            }).replace(/'/g, '&#39;');

            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-dodge-roll-btn" data-payload='${dodgeContext}'>
                  🎯 ${targetName}: ${attackerName} got ${successes} hit${successes !== 1 ? 's' : ''} — Roll to dodge!
                </button>
              </div>`;
          } else {
            // No dodge — show resist button
            const soakContext = JSON.stringify({
              attackerActorId: state.attackerActorId,
              targetActorId:   state.targetActorId,
              weaponItemId:    state.weaponItemId,
              isMelee:         state.isMelee,
              stagedPower:     staged.power,
              stagedLevel:     staged.level,
              isStun:          staged.isStun,
              rawDamage:       state.rawDamage,
            }).replace(/'/g, '&#39;');

            postRollHtml = `
              <div class="sr-soak-action">
                <button class="sr-soak-btn" data-payload='${soakContext}'>
                  🛡 ${targetName}: Resist Damage
                </button>
              </div>`;
          }
        }
      } else if (state.isWeaponRoll && !state.damageBase) {
        stagingHtml = '<div class="sr-staging-result sr-warn">⚠ No damage code set on this weapon</div>';

      } else if (state.isSpellRoll && state.spellContext) {
        const sc = state.spellContext;

        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">0 hits — spell fizzles, no effect on targets</div>';
        } else {
          const staged     = SR3EItem.stageDamage(sc.damageBase, successes);
          const trackLabel = staged.isStun ? 'Stun' : 'Physical';
          stagingHtml = `
            <div class="sr-staging-result">
              🔮 ${sc.rawDamage} + ${successes} hits → <strong>${staged.power}${staged.level} ${trackLabel}</strong>
            </div>`;

          // Check whether any actor (excluding the caster) has an active Spell Defense pool
          const spellDefenders = game.actors.contents.filter(
            a => (a.system.spellDefensePool ?? 0) > 0 && a.id !== sc.attackerActorId
          );
          if (spellDefenders.length > 0) {
            // Schedule defense card to post AFTER this wave card
            state._pendingDefenseCard = { currentSuccesses: successes, sc, force: sc.force };
          } else if (!sc.isAoE && (sc.committedDodgeDice ?? 0) > 0) {
            // Non-AoE spell with committed dodge — show dodge roll button
            const targetId    = sc.targetActorIds?.[0];
            const tActor      = game.actors.get(targetId);
            const targetName  = tActor?.name ?? 'Target';
            const casterName  = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';
            const dodgeCtx    = JSON.stringify({
              attackerActorId:    sc.attackerActorId,
              targetActorId:      targetId,
              attackSuccesses:    successes,
              committedDodgeDice: sc.committedDodgeDice,
              stagedPower:        staged.power,
              stagedLevel:        staged.level,
              isStun:             staged.isStun,
              rawDamage:          sc.rawDamage,
              isSpellSoak:        true,
              spellType:          sc.spellType,
              spellTarget:        sc.spellTarget ?? '',
              force:              sc.force,
            }).replace(/'/g, '&#39;');
            postRollHtml += `
              <div class="sr-soak-action">
                <button class="sr-dodge-roll-btn" data-payload='${dodgeCtx}'>
                  🎯 ${targetName}: ${casterName} got ${successes} hit${successes !== 1 ? 's' : ''} — Roll to dodge!
                </button>
              </div>`;
          } else {
            // No active defenders and no dodge — post Resist Spell buttons directly
            for (const targetId of (sc.targetActorIds ?? [])) {
              const tActor = game.actors.get(targetId);
              if (!tActor) continue;
              const spellSoakPayload = JSON.stringify({
                actorId:         targetId,
                targetActorId:   targetId,
                attackerActorId: sc.attackerActorId,
                isSpellSoak:     true,
                spellType:       sc.spellType,
                spellTarget:     sc.spellTarget ?? '',
                force:           sc.force,
                stagedPower:     staged.power,
                stagedLevel:     staged.level,
                isStun:          staged.isStun,
                rawDamage:       sc.rawDamage,
              }).replace(/'/g, '&#39;');
              postRollHtml += `
                <div class="sr-soak-action">
                  <button class="sr-spell-soak-btn" data-payload='${spellSoakPayload}'>
                    🔮 ${tActor.name}: Resist Spell
                  </button>
                </div>`;
            }
          }
        }

        // Drain button always — caster pays drain regardless of hit/miss
        const drainPayload = JSON.stringify({
          actorId:          sc.attackerActorId,
          drainStr:         sc.drainStr,
          force:            sc.force,
          sorceryRating:    sc.sorceryRating,
          drainIsPhysical:  sc.drainIsPhysical,
          spellName:        sc.spellName,
          spellPoolForDrain: sc.spellPoolForDrain ?? 0,
        }).replace(/'/g, '&#39;');
        const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${casterName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isDispelRoll && state.dispelContext) {
        const dc = state.dispelContext;
        const dispellerName = game.actors.get(dc.actorId)?.name ?? 'Dispeller';
        const dispelled    = Math.min(successes, dc.originalSuccesses);
        const remaining    = dc.originalSuccesses - dispelled;
        stagingHtml = `
          <div class="sr-staging-result">
            ✦ ${dispellerName}: ${successes} dispel hit${successes !== 1 ? 's' : ''}
            — ${dispelled} of ${dc.originalSuccesses} successes dispelled,
            <strong>${remaining}</strong> remain${remaining !== 1 ? '' : 's'}
          </div>`;

        // Drain button — dispeller always resists drain
        const drainPayload = JSON.stringify({
          actorId:         dc.actorId,
          drainStr:        dc.drainCode,
          force:           dc.force,
          sorceryRating:   dc.sorceryRating,
          drainIsPhysical: dc.drainIsPhysical,
          spellName:       `Dispel [F${dc.force}]`,
          spellPoolForDrain: dc.spellPoolForDrain ?? 0,
        }).replace(/'/g, '&#39;');
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${dispellerName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isConjuringRoll && state.conjuringContext) {
        const cc       = state.conjuringContext;
        const conjurer = game.actors.get(cc.conjurerActorId);
        const conjName = conjurer?.name ?? 'Conjurer';
        const tnConj   = Math.max(2, cc.conjuringSkill);

        if (successes === 0) {
          stagingHtml = '<div class="sr-staging-result">0 hits — the spirit does not answer</div>';
        } else {
          // Spirit resistance: rolls Force dice vs TN = Conjuring skill rating
          const spiritDice  = cc.force;
          let   spiritHits  = 0;
          const spiritFaces = [];
          for (let i = 0; i < spiritDice; i++) {
            const face = Math.floor(Math.random() * 6) + 1;
            spiritFaces.push(face);
            if (face >= tnConj) spiritHits++;
          }
          const netServices = Math.max(0, successes - spiritHits);

          const faceStr = spiritFaces.join(', ');
          stagingHtml = `
            <div class="sr-staging-result">
              🌀 Conjurer: <strong>${successes}</strong> hit${successes !== 1 ? 's' : ''}
            </div>
            <div class="sr-staging-result" style="color:var(--sr-muted)">
              🌀 Spirit resists: ${spiritDice}d6 vs TN ${tnConj} → [${faceStr}] = <strong>${spiritHits}</strong> hit${spiritHits !== 1 ? 's' : ''}
            </div>`;

          if (netServices > 0) {
            stagingHtml += `
              <div class="sr-staging-result">
                Net: <strong>${netServices} service${netServices !== 1 ? 's' : ''}</strong>
              </div>`;
            const confirmPayload = JSON.stringify({
              conjurerActorId: cc.conjurerActorId,
              spiritTypeKey:   cc.spiritTypeKey,
              force:           cc.force,
              services:        netServices,
            }).replace(/'/g, '&#39;');
            postRollHtml += `
              <div class="sr-soak-action">
                <button class="sr-summon-confirm-btn" data-payload='${confirmPayload}'>
                  🌀 Confirm Summoning (${netServices} service${netServices !== 1 ? 's' : ''})
                </button>
              </div>`;
          } else {
            stagingHtml += `<div class="sr-staging-result sr-soak-blocked">Spirit fully resists — no services owed, spirit departs</div>`;
          }
        }

        // Drain button — always posted regardless of success
        // TN = Force; drain damage level derived from floor(Force/2)
        const drainLevels = ['L', 'L', 'L', 'M', 'M', 'S', 'S', 'D', 'D', 'D', 'D', 'D', 'D'];
        const drainLevel  = drainLevels[Math.floor(cc.force / 2)] ?? 'D';
        const drainPayload = JSON.stringify({
          actorId:          cc.conjurerActorId,
          drainTNOverride:  cc.force,
          drainLevel:       drainLevel,
          drainIsPhysical:  cc.drainIsPhysical,
          spellName:        `Conjure ${cc.spiritLabel} [F${cc.force}]`,
          spellPoolForDrain: cc.spellPoolSpent ?? 0,
        }).replace(/'/g, '&#39;');
        postRollHtml += `
          <div class="sr-soak-action">
            <button class="sr-drain-btn" data-payload='${drainPayload}'>
              ⚡ ${conjName}: Resist Drain
            </button>
          </div>`;

      } else if (state.isSpellDefenseRoll && state.spellDefenseContext) {
        // Spell Defense wave resolved — reduce the carried success count
        const sdc         = state.spellDefenseContext;
        const newSuccesses = Math.max(0, sdc.currentSuccesses - successes);
        const defenderName = game.actors.get(sdc.defenderActorId)?.name ?? 'Defender';

        stagingHtml = `
          <div class="sr-staging-result">
            🛡 ${defenderName}: ${successes} defense hit${successes !== 1 ? 's' : ''}
            — caster successes ${sdc.currentSuccesses} → <strong>${newSuccesses}</strong>
          </div>`;

        if (newSuccesses === 0) {
          stagingHtml += `<div class="sr-staging-result sr-soak-blocked">✨ Spell completely defended!</div>`;
          // Only drain remains
          state._pendingDefenseCard = { currentSuccesses: 0, sc: sdc.spellContext, force: sdc.force };
        } else {
          state._pendingDefenseCard = { currentSuccesses: newSuccesses, sc: sdc.spellContext, force: sdc.force };
        }
      } else if (state.isRammingRoll && state.rammingContext) {
        stagingHtml = SR3EActor._buildRamDamageHtml(successes, state.rammingContext);
      } else if (state.isCrashRoll && state.crashContext) {
        if (successes === 0) {
          stagingHtml = SR3EActor._buildCrashDamageHtml(state.crashContext);
        } else {
          stagingHtml = `<div class="sr-staging-result" style="color:#4caf50;">✅ ${successes} success${successes !== 1 ? 'es' : ''} — vehicle remains under control.</div>`;
        }
      }

      const footerNoteHtml = state.footerNote
        ? `<div class="sr-roll-note">${state.footerNote.replace('{successes}', successes)}</div>`
        : '';

      resultHtml = `
        <div class="sr-roll-stats">
          <span class="sr-stat">🎲 Successes: ${successes}</span>
          <span class="sr-stat">⚠️ 1s: ${ones}</span>
        </div>
        <div class="sr-roll-result">
          <strong>${successes}</strong> success${successes !== 1 ? 'es' : ''}
        </div>
        ${stagingHtml}
        ${glitchHtml}
        ${postRollHtml}
        ${footerNoteHtml}
      `;
    } else {
      resultHtml = `
        <div class="sr-roll-stats">
          <span class="sr-stat">🎲 Successes so far: ${successes}</span>
          <span class="sr-stat">💥 Exploding: ${explodingDice.length}</span>
        </div>
      `;
    }

    // Explosion button with full state payload.
    let explodeBtn = '';
    if (!allDone) {
      const payload = JSON.stringify({
        actorId, label, tn, pool, wave: wave + 1, dice, ones, glitch,
        explodeIdx: explodingDice.map(d => d.index),
        isWeaponRoll:       state.isWeaponRoll       ?? false,
        isMelee:            state.isMelee            ?? false,
        isAoE:              state.isAoE              ?? false,
        aoeTargetIds:       state.aoeTargetIds       ?? null,
        rawDamage:          state.rawDamage          ?? '',
        damageBase:         state.damageBase         ?? null,
        weaponItemId:       state.weaponItemId       ?? null,
        attackerActorId:    state.attackerActorId    ?? null,
        targetActorId:      state.targetActorId      ?? null,
        committedDodgeDice: state.committedDodgeDice ?? 0,
        isSoakRoll:         state.isSoakRoll         ?? false,
        soakPayload:        state.soakPayload        ?? null,
        isSpellRoll:        state.isSpellRoll        ?? false,
        spellContext:       state.spellContext        ?? null,
        isDrainRoll:        state.isDrainRoll         ?? false,
        drainPayload:       state.drainPayload        ?? null,
        isDispelRoll:       state.isDispelRoll        ?? false,
        dispelContext:      state.dispelContext       ?? null,
        isConjuringRoll:    state.isConjuringRoll     ?? false,
        conjuringContext:   state.conjuringContext    ?? null,
        isAssensingRoll:    state.isAssensingRoll     ?? false,
        isAuraReadingRoll:  state.isAuraReadingRoll   ?? false,
        auraReadingContext: state.auraReadingContext   ?? null,
        isRammingRoll:      state.isRammingRoll       ?? false,
        rammingContext:     state.rammingContext       ?? null,
        isCrashRoll:        state.isCrashRoll          ?? false,
        crashContext:       state.crashContext          ?? null,
        isVehicleSoakRoll:  state.isVehicleSoakRoll   ?? false,
        vehicleSoakContext: state.vehicleSoakContext   ?? null,
        footerNote:         state.footerNote          ?? null,
      }).replace(/'/g, '&#39;');
      explodeBtn = `
        <div class="sr-explode-action">
          <button class="sr-explode-btn" data-payload='${payload}'>
            💥 Roll explosions (${explodingDice.length} ${explodingDice.length === 1 ? 'die' : 'dice'})
          </button>
        </div>
      `;
    }

    // Dodge result announcement — shown when dodge wave fully resolves
    let dodgeResultHtml = '';
    if (allDone && state.isDodgeRoll && state.dodgePayload) {
      const dp          = state.dodgePayload;
      const dodgerName  = game.actors.get(dp.targetActorId)?.name   ?? 'Defender';
      const attackerName = game.actors.get(dp.attackerActorId)?.name ?? 'Attacker';
      const netHits     = dp.attackSuccesses - successes;

      if (netHits <= 0) {
        // Dodge cancelled all hits — miss
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-success">
            ✅ ${dodgerName} dodges! ${successes} dodge hits vs ${dp.attackSuccesses} attack hits (net ${netHits}) — ${attackerName}'s attack missed!
          </div>`;
      } else {
        // Dodge failed — full hit lands, staging based on raw attack successes (dodge doesn't reduce staging)
        const trackLabel = dp.isStun ? 'Stun' : 'Physical';
        const soakBtn    = dp.isSpellSoak
          ? SR3EActor._spellSoakButtonHtml(dp)
          : SR3EActor._soakButtonHtml(dp);
        dodgeResultHtml = `
          <div class="sr-dodge-result sr-dodge-fail">
            ❌ ${dodgerName}: ${successes} dodge hits vs ${dp.attackSuccesses} attack hits — dodge failed, full hit lands.
            Incoming: <strong>${dp.stagedPower}${dp.stagedLevel} ${trackLabel}</strong>
          </div>
          ${soakBtn}`;
      }
    }

    // Drain roll result — shown when drain resist wave fully resolves
    let drainResultHtml = '';
    if (allDone && state.isDrainRoll && state.drainPayload) {
      const dp     = state.drainPayload;
      const STAGES = ['L', 'M', 'S', 'D'];
      let idx      = STAGES.indexOf(dp.drainLevel);
      const origIdx = idx;
      let remaining = successes;
      while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }
      const trackLabel = dp.drainIsPhysical ? 'Physical' : 'Stun';
      if (idx < 0) {
        drainResultHtml = '<div class="sr-soak-result sr-soak-blocked">⚡ Drain completely resisted!</div>';
      } else {
        const finalLevel = STAGES[idx];
        const unchanged  = idx === origIdx;
        const resultLine = unchanged
          ? `${successes} hit${successes !== 1 ? 's' : ''} — drain unchanged: <strong>${finalLevel} ${trackLabel}</strong>`
          : `${successes} hit${successes !== 1 ? 's' : ''} — <strong>${dp.drainLevel} ${trackLabel}</strong> staged down to <strong>${finalLevel} ${trackLabel}</strong>`;
        drainResultHtml = `
          <div class="sr-soak-result">⚡ ${resultLine}</div>
          <div class="sr-soak-hint">Apply drain manually using the wound track.</div>
        `;
      }
    }

    // Soak result announcement — shown when soak wave fully resolves
    let soakResultHtml = '';
    if (allDone && state.isSoakRoll && state.soakPayload) {
      const sp      = state.soakPayload;
      const STAGES  = ['L', 'M', 'S', 'D'];
      let idx       = STAGES.indexOf(sp.stagedLevel);
      let power     = sp.stagedPower;
      let remaining = successes;
      const origIdx = idx;

      while (remaining >= 2 && idx >= 0) {
        remaining -= 2;
        idx--;
      }

      if (idx < 0) {
        soakResultHtml = '<div class="sr-soak-result sr-soak-blocked">🛡 Damage completely soaked!</div>';
      } else {
        const finalLevel = STAGES[idx];
        const trackLabel = sp.isStun ? 'Stun' : 'Physical';
        const unchanged  = idx === origIdx && power === sp.stagedPower;
        const resultLine = unchanged
          ? `${successes} soak hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${power}${finalLevel} ${trackLabel}</strong>`
          : `${successes} soak hit${successes !== 1 ? 's' : ''} — <strong>${sp.stagedPower}${sp.stagedLevel}</strong> staged down to <strong>${power}${finalLevel} ${trackLabel}</strong>`;
        soakResultHtml = `
          <div class="sr-soak-result">🛡 ${resultLine}</div>
          <div class="sr-soak-hint">Apply damage manually using the wound track buttons.</div>
        `;
      }
    }

    let vehicleSoakResultHtml = '';
    if (allDone && state.isVehicleSoakRoll && state.vehicleSoakContext) {
      vehicleSoakResultHtml = SR3EActor._buildVehicleSoakResultHtml(successes, state.vehicleSoakContext);
    }

    const waveMeta = wave === 0
      ? `${pool} dice vs TN ${tn}`
      : `Wave ${wave} — ${explodingDice.length} dice exploding`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">${label}</div>
          <div class="sr-roll-meta">${waveMeta}</div>
          <div class="sr-roll-dice">${diceHtml}</div>
          ${resultHtml}
          ${dodgeResultHtml}
          ${soakResultHtml}
          ${vehicleSoakResultHtml}
          ${drainResultHtml}
          ${explodeBtn}
        </div>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });

    // Post the Spell Defense phase card after the wave card so messages are in order
    if (state._pendingDefenseCard) {
      await SR3EActor.postSpellDefenseCard(state._pendingDefenseCard);
    }

    // Post assensing result after all explosions resolve
    if (allDone && state.isAssensingRoll) {
      const actorName = game.actors.get(state.actorId)?.name ?? 'Unknown';
      await SR3EActor._postAssensingResult(successes, state.tn, actorName, { actorId: state.actorId });
    }

    // Post updated assensing result after Aura Reading complementary roll resolves
    if (allDone && state.isAuraReadingRoll && state.auraReadingContext) {
      const arc      = state.auraReadingContext;
      const bonus    = Math.floor(successes / 2);
      const newTotal = arc.originalSuccesses + bonus;
      await SR3EActor._postAssensingResult(newTotal, state.tn, arc.actorName ?? game.actors.get(arc.actorId)?.name ?? 'Unknown', {
        actorId:       arc.actorId,
        auraBonus:     bonus,
        auraSuccesses: successes,
      });
    }
  }

  /**
   * Handle a click on "Roll explosions".
   * Registered as a static handler in sr3e.js via a delegated click listener
   * on the chat log. Deserialises state from the button payload and fires the
   * next wave.
   *
   * @param {string} payloadJson
   */
  static async handleExplosionClick(payloadJson) {
    const state = JSON.parse(payloadJson);
    const actor = game.actors.get(state.actorId);
    if (!actor) return;

    const newDice = actor._rollWave(
      state.explodeIdx.length,
      state.tn,
      /* isFirstWave */ false,
      state.dice,
      state.explodeIdx,
    );

    await actor._postWaveCard({
      ...state,
      dice: newDice,
      wave: state.wave,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Ramming damage resolution                                           */
  /* ------------------------------------------------------------------ */

  static _buildRamDamageHtml(successes, ctx) {
    // speeds in km/ct; standard SR3 impact table in km/ct
    const speedDiff = Math.abs((ctx.attackerSpeed ?? 0) - (ctx.defenderSpeed ?? 0));
    const power     = Math.max(1, Math.ceil(speedDiff / 10));
    const STAGES    = ['L', 'M', 'S', 'D'];
    const baseLevel = speedDiff >= 201 ? 'D' : speedDiff >= 61 ? 'S' : speedDiff >= 21 ? 'M' : 'L';

    // Attacker benefits: stage DOWN by floor(successes/2)
    let atkIdx    = STAGES.indexOf(baseLevel);
    const stageDn = Math.floor(successes / 2);
    atkIdx = Math.max(-1, atkIdx - stageDn);

    const atkDamage = atkIdx >= 0 ? `${power}${STAGES[atkIdx]} Physical` : 'No damage (completely staged off)';

    const _ctx = (soakPool, power, level, isAtk) => JSON.stringify({
      vehicleActorId:    isAtk ? ctx.attackerVehicleActorId : ctx.defenderVehicleActorId,
      vehicleName:       isAtk ? ctx.attackerVehicleName    : ctx.defenderVehicleName,
      driverActorId:     isAtk ? ctx.attackerDriverActorId  : ctx.defenderDriverActorId,
      soakPool,
      power,
      level,
      passengerActorIds: isAtk ? (ctx.attackerPassengerActorIds ?? []) : (ctx.defenderPassengerActorIds ?? []),
    }).replace(/'/g, '&#39;');

    let html = `
      <div class="sr-staging-result">
        💥 Speed difference: ${Math.round(speedDiff * 1.2)} km/h (${speedDiff.toFixed(1)} km/ct) → Base damage: <strong>${power}${baseLevel} Physical</strong>
      </div>
      <div class="sr-staging-result">
        Attacker ${successes} success${successes !== 1 ? 'es' : ''}: −${stageDn} stage${stageDn !== 1 ? 's' : ''} → <strong>${atkDamage}</strong>
      </div>`;

    if (atkIdx >= 0) {
      html += `
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${_ctx(ctx.attackerSoakPool ?? 4, power, STAGES[atkIdx], true)}'>
          🚗 ${ctx.attackerVehicleName}: Soak Damage (${power}${STAGES[atkIdx]}, TN ${power})
        </button>
      </div>`;
    }

    html += `
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${_ctx(ctx.defenderSoakPool ?? 4, power, baseLevel, false)}'>
          🚗 ${ctx.defenderVehicleName}: Soak Damage (${power}${baseLevel}, TN ${power})
        </button>
      </div>`;

    return html;
  }

  static _buildCrashDamageHtml(ctx) {
    // speedKmct stored in km/ct; standard SR3 impact table
    const speedKmct = ctx.speedKmct ?? 0;
    const power     = Math.max(1, Math.ceil(speedKmct / 10));
    const level     = speedKmct >= 201 ? 'D' : speedKmct >= 61 ? 'S' : speedKmct >= 21 ? 'M' : 'L';
    const soakCtx   = JSON.stringify({
      vehicleActorId:    ctx.vehicleActorId,
      vehicleName:       ctx.vehicleName,
      driverActorId:     ctx.driverActorId,
      soakPool:          ctx.vehicleBody ?? 4,
      power,
      level,
      passengerActorIds: ctx.passengerActorIds ?? [],
      useStaged:         true,
    }).replace(/'/g, '&#39;');

    return `
      <div class="sr-staging-result" style="color:#c94040;">
        💥 CRASH! ${ctx.vehicleName} has crashed — speed reduced to 0.
      </div>
      <div class="sr-staging-result">
        Impact at ${Math.round(speedKmct * 1.2)} km/h (${speedKmct.toFixed(1)} km/ct) → Damage: <strong>${power}${level} Physical</strong>
      </div>
      <div class="sr-soak-action">
        <button class="sr-ram-vehicle-soak-btn" data-payload='${soakCtx}'>
          🚗 ${ctx.vehicleName}: Soak Impact (${power}${level}, ${ctx.vehicleBody ?? 4} Body, TN ${power})
        </button>
      </div>`;
  }

  static _buildVehicleSoakResultHtml(successes, ctx) {
    const STAGES  = ['L', 'M', 'S', 'D'];
    let idx       = STAGES.indexOf(ctx.level);
    const origIdx = idx;
    let remaining = successes;
    while (remaining >= 2 && idx >= 0) { remaining -= 2; idx--; }

    let html = '';
    if (idx < 0) {
      html += `<div class="sr-soak-result sr-soak-blocked">🛡 ${ctx.vehicleName}: Damage completely soaked!</div>`;
    } else {
      const finalLevel = STAGES[idx];
      const unchanged  = idx === origIdx;
      const resultLine = unchanged
        ? `${successes} soak hit${successes !== 1 ? 's' : ''} — damage unchanged: <strong>${ctx.power}${finalLevel} Physical</strong>`
        : `${successes} soak hit${successes !== 1 ? 's' : ''} — <strong>${ctx.power}${ctx.level}</strong> staged down to <strong>${ctx.power}${finalLevel} Physical</strong>`;
      html += `
        <div class="sr-soak-result">🛡 ${ctx.vehicleName}: ${resultLine}</div>
        <div class="sr-soak-hint">Apply damage manually using the vehicle wound track.</div>`;
    }

    // Occupants resist the staged-down level (ctx.useStaged=true for crash)
    // or the original level (ramming default).
    const resistLevel = (ctx.useStaged && idx >= 0) ? STAGES[idx] : ctx.level;
    const resistLabel = resistLevel ? `${ctx.power}${resistLevel}` : 'No damage';

    // Driver resists damage as a passenger would
    const driverActor = game.actors.get(ctx.driverActorId);
    if (driverActor && resistLevel) {
      const body = driverActor.system?.attributes?.body?.value ?? driverActor.system?.attributes?.body?.base ?? 3;
      const dCtx = JSON.stringify({ passengerActorId: driverActor.id, passengerName: driverActor.name, power: ctx.power, level: resistLevel, body }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-action">
          <button class="sr-ram-passenger-resist-btn" data-payload='${dCtx}'>
            🧑 ${driverActor.name} (Driver): Resist Damage (${resistLabel}, ${body} Body, TN ${ctx.power})
          </button>
        </div>`;
    }

    for (const pid of (ctx.passengerActorIds ?? [])) {
      const pActor = game.actors.get(pid);
      if (!pActor || !resistLevel) continue;
      const body = pActor.system?.attributes?.body?.value ?? pActor.system?.attributes?.body?.base ?? 3;
      const pCtx = JSON.stringify({ passengerActorId: pid, passengerName: pActor.name, power: ctx.power, level: resistLevel, body }).replace(/'/g, '&#39;');
      html += `
        <div class="sr-soak-action">
          <button class="sr-ram-passenger-resist-btn" data-payload='${pCtx}'>
            🧑 ${pActor.name}: Resist Passenger Damage (${resistLabel}, ${body} Body, TN ${ctx.power})
          </button>
        </div>`;
    }

    return html;
  }

  static async handleRamVehicleSoak(btn, physicalDice = false) {
    const ctx       = JSON.parse(btn.dataset.payload);
    btn.disabled    = true;
    btn.textContent = '⏳ Posting…';
    const driverActor = game.actors.get(ctx.driverActorId);
    const rollActor   = driverActor ?? game.actors.get(ctx.vehicleActorId);
    if (!rollActor) { ui.notifications.warn('No driver/vehicle actor found for soak.'); return; }
    const pool = ctx.soakPool ?? 4;
    const tn   = Math.max(2, ctx.power ?? 4);
    await rollActor.rollPool(pool, tn, `🛡 ${ctx.vehicleName}: Vehicle Soak`, {
      isVehicleSoakRoll:  true,
      vehicleSoakContext: ctx,
      physicalDice,
    });
  }

  static async handleRamPassengerResist(btn, physicalDice = false) {
    const ctx    = JSON.parse(btn.dataset.payload);
    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';
    const pActor = game.actors.get(ctx.passengerActorId);
    if (!pActor) { ui.notifications.warn('Passenger actor not found.'); return; }
    const pool = ctx.body ?? pActor.system?.attributes?.body?.value ?? pActor.system?.attributes?.body?.base ?? 3;
    const tn   = Math.max(2, ctx.power ?? 4);
    await pActor.rollPool(pool, tn, `🧑 ${pActor.name}: Resist Passenger Damage`, {
      isSoakRoll:  true,
      soakPayload: { stagedPower: ctx.power, stagedLevel: ctx.level, isStun: false },
      physicalDice,
    });
  }

  /**
   * Karma reroll — available after all explosions are resolved.
   * Replaces up to `amount` failed dice with fresh single-face rolls;
   * any of those that show 6 and are still below TN start a new chain.
   * Karma rerolls never contribute to the glitch count.
   */
  async _handleKarmaReroll(dice, tn, ones, glitch, pool, label) {
    const failures = dice.filter(d => !d.success);
    if (failures.length === 0) {
      ui.notifications.info('No failures to re-roll with Karma.');
      return;
    }

    const maxKarma = Math.min(this.system.karmaPool, failures.length);

    return foundry.applications.api.DialogV2.wait({
      window: { title: 'Use Karma Pool' },
      content: `
        <p>You have ${this.system.karmaPool} Karma available.</p>
        <p>${failures.length} dice failed. How many Karma points to spend?</p>
        <input type="number" id="karma-amount" min="1" max="${maxKarma}" value="1" style="width:80px"/>
      `,
      buttons: [
        {
          label: 'Re-roll',
          action: 'reroll',
          default: true,
          callback: async (_event, _button, dialog) => {
            const amount = parseInt(dialog.element.querySelector('#karma-amount')?.value) || 0;
            if (amount <= 0) return;

            await this.update({ 'system.karmaPool': this.system.karmaPool - amount });

            const newDice = [...dice];
            let replaced  = 0;
            for (let i = 0; i < newDice.length && replaced < amount; i++) {
              if (!newDice[i].success) {
                const face  = Math.floor(Math.random() * 6) + 1;
                const total = face;
                newDice[i] = {
                  ...newDice[i],
                  total,
                  faces:          [face],
                  isOne:          false,
                  needsExplosion: face === 6 && total < tn,
                  done:           !(face === 6 && total < tn),
                  success:        total >= tn,
                };
                replaced++;
              }
            }
            await this._postWaveCard({
              actorId: this.id,
              label:   `${label} (Karma re-roll)`,
              tn, pool, wave: 0, dice: newDice, ones, glitch,
              isWeaponRoll: false,
            });
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
  }

  // ---------------------------------------------------------------------------
  // MELEE
  // ---------------------------------------------------------------------------

  /**
   * Post the boxing card — shows both combatants side by side.
   * GM can edit TN and pool before clicking Roll.
   */
  static async postMeleeCard(ctx) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    ctx.atkSkillDice = ctx.atkInfo?.skillDice ?? ctx.atkPool ?? 1;
    ctx.defSkillDice = ctx.defInfo?.skillDice ?? ctx.defPool ?? 1;

    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const _corner = (name, info, weaponName, rawDamage, damageBase, reach, tn, poolClass, tnClass, damageClass) => {
      const specLine  = info?.specName
        ? `<div class="sr-melee-spec">${info.skillRating} (${info.skillRating + info.specBonus}) — ${info.specName}</div>`
        : '';
      const woundMod  = info?.woundMod ?? 0;
      const availPool = info?.availPool ?? 0;
      const skillDice = info?.skillDice ?? 1;
      const tnCalc    = [
        '4',
        woundMod < 0 ? ` ${woundMod} wounds` : '',
        reach > 0    ? ` −${reach} reach`    : '',
      ].join('');
      const displayDamage = damageBase && /STR/i.test(rawDamage)
        ? `${damageBase.power}${damageBase.level}${damageBase.isStun ? ' Stun' : ''}`
        : (rawDamage || '');

      return `
        <div class="sr-melee-corner">
          <div class="sr-melee-name">${name}</div>
          <div class="sr-melee-skill">
            ${info?.isDefault
              ? `<span style="color:var(--sr-amber)">${info.skillName} (defaulting — ${info.skillRating})</span>`
              : `${info?.skillName ?? 'Unknown skill'}${info?.specName ? '' : ` (${info?.skillRating ?? '?'})`}`}
          </div>
          ${specLine}
          <div class="sr-melee-weapon">${weaponName}
            ${reach > 0 ? `<span class="sr-melee-reach"> Reach ${reach}</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:var(--sr-muted);white-space:nowrap">
            Damage: <input type="text" class="${damageClass}" value="${displayDamage}"
                     style="width:55px;flex-shrink:0"/>
          </div>
          <div style="font-size:11px;color:var(--sr-text);margin-top:4px">
            Skill dice: <strong>${skillDice}</strong>${woundMod < 0 ? ` <span style="color:var(--sr-red)">(${woundMod})</span>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:var(--sr-muted);white-space:nowrap">
            Pool: <input type="number" class="${poolClass}" value="0"
                   min="0" max="${availPool}" style="width:40px;flex-shrink:0"/> / ${availPool}
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:11px;color:var(--sr-muted);white-space:nowrap">
            TN: <input type="number" class="${tnClass}" value="${tn}"
                   min="2" max="30" style="width:40px;flex-shrink:0"/>
            <span style="font-size:10px;color:var(--sr-muted)">(${tnCalc})</span>
          </div>
        </div>`;
    };

    await ChatMessage.create({
      speaker: { alias: 'Melee Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ MELEE — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkInfo, ctx.atkWeaponName, ctx.atkRawDamage, ctx.atkDamageBase,
                      ctx.atkReach ?? 0, ctx.atkTN, 'sr-melee-atk-pool', 'sr-melee-atk-tn', 'sr-melee-atk-damage')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defInfo, ctx.defWeaponName, ctx.defRawDamage, ctx.defDamageBase,
                      ctx.defReach ?? 0, ctx.defTN, 'sr-melee-def-pool', 'sr-melee-def-tn', 'sr-melee-def-damage')}
          </div>
          <div class="sr-soak-action">
            <button class="sr-melee-roll-btn" data-payload='${payload}'>
              ⚔ Roll!
            </button>
          </div>
        </div>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

    /**
   * Handle the Roll! button click on a melee card.
   * Reads live pool/TN values, rolls both sides, posts results, then compares.
   */
  static async handleMeleeRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    // Pool = skill dice + combat pool dice added by player
    const atkCombatPool = parseInt(card.querySelector('.sr-melee-atk-pool')?.value) || 0;
    const defCombatPool = parseInt(card.querySelector('.sr-melee-def-pool')?.value) || 0;
    const atkPool = Math.max(1, (ctx.atkSkillDice ?? 1) + atkCombatPool);
    const defPool = Math.max(1, (ctx.defSkillDice ?? 1) + defCombatPool);
    const atkTN   = Math.max(2, parseInt(card.querySelector('.sr-melee-atk-tn')?.value) || 4);
    const defTN   = Math.max(2, parseInt(card.querySelector('.sr-melee-def-tn')?.value) || 4);

    // Read edited damage codes
    const atkRawDamage = card.querySelector('.sr-melee-atk-damage')?.value.trim() || ctx.atkRawDamage;
    const defRawDamage = card.querySelector('.sr-melee-def-damage')?.value.trim() || ctx.defRawDamage;
    const atkDamageBase = game.sr3e.SR3EItem.parseDamageCode(atkRawDamage, game.actors.get(ctx.attackerActorId)) ?? ctx.atkDamageBase;
    const defDamageBase = game.sr3e.SR3EItem.parseDamageCode(defRawDamage, game.actors.get(ctx.defenderActorId)) ?? ctx.defDamageBase;

    // Spend combat pool
    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (atkCombatPool > 0 && atkActor) await atkActor.spendCombatPool(atkCombatPool);
    if (defCombatPool > 0 && defActor) await defActor.spendCombatPool(defCombatPool);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    let atkDice, defDice;
    if (physicalDice) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `⚔ ${atk.name} attacks`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      const defSuccesses = await SR3EActor._promptPhysicalSuccesses(defPool, defTN, `⚔ ${def.name} defends`);
      if (defSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      defDice = SR3EActor._buildPhysicalDice(defPool, defSuccesses);
    } else {
      atkDice = atk._rollWave(atkPool, atkTN, true);
      defDice = def._rollWave(defPool, defTN, true);
    }

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const defGlitch = defOnes > Math.floor(defPool / 2);

    // Post both wave cards with melee context (use edited damage codes)
    const meleeCtx = {
      ...ctx,
      atkPool, atkTN, defPool, defTN,
      atkRawDamage, atkDamageBase,
      defRawDamage, defDamageBase,
      isMeleeOpposed: true,
    };

    await atk._postWaveCard({
      actorId:          ctx.attackerActorId,
      label:            `⚔ ${atk.name} attacks`,
      tn:               atkTN,
      pool:             atkPool,
      wave:             0,
      dice:             atkDice,
      ones:             atkOnes,
      glitch:           atkGlitch,
      physicalDice,
      physicalSuccesses: physicalDice ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll:     false,
      isMeleeAtk:       true,
      meleeCtx,
    });

    await def._postWaveCard({
      actorId:          ctx.defenderActorId,
      label:            `⚔ ${def.name} defends`,
      tn:               defTN,
      pool:             defPool,
      wave:             0,
      dice:             defDice,
      ones:             defOnes,
      glitch:           defGlitch,
      physicalDice,
      physicalSuccesses: physicalDice ? defDice.filter(d => d.success).length : undefined,
      isWeaponRoll:     false,
      isMeleeDef:       true,
      meleeCtx,
    });

    // Post comparison card once both are done
    await SR3EActor._postMeleeResult(meleeCtx, atkDice, defDice);
  }

  /**
   * Post the melee result — announces winner, staged damage, and resist button.
   */
  static async _postMeleeResult(ctx, atkDice, defDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const defSuccesses = defDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - defSuccesses);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);

    let resultHtml;

    if (atkSuccesses === defSuccesses) {
      // Tie — no damage
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${defSuccesses} — no damage dealt.
        </div>`;
    } else {
      const winnerIsAtk  = atkSuccesses > defSuccesses;
      const winner       = winnerIsAtk ? atk : def;
      const loser        = winnerIsAtk ? def : atk;
      const winnerName   = winner?.name ?? 'Winner';
      const loserName    = loser?.name  ?? 'Loser';

      // Winner's weapon damage code
      const winnerWeaponId = winnerIsAtk ? ctx.atkWeaponId : ctx.defWeaponId;
      const winnerRawDmg   = winnerIsAtk ? ctx.atkRawDamage : ctx.defRawDamage;
      const winnerDmgBase  = winnerIsAtk ? ctx.atkDamageBase : ctx.defDamageBase;

      let stagingHtml = '';
      let soakBtn     = '';

      if (winnerDmgBase && net > 0) {
        // Stage damage — need SR3EItem, use inline fallback if import failed
        const STAGES = ['L','M','S','D'];
        let idx   = STAGES.indexOf(winnerDmgBase.level);
        let power = winnerDmgBase.power;
        let rem   = net;
        const origIdx = idx;
        while (rem >= 2 && idx < STAGES.length - 1) { rem -= 2; idx++; }
        if (idx === STAGES.length - 1 && rem >= 2) { power += Math.floor(rem / 2); }

        const finalLevel = STAGES[idx];
        const trackLabel = winnerDmgBase.isStun ? 'Stun' : 'Physical';
        const unchanged  = idx === origIdx && power === winnerDmgBase.power;

        stagingHtml = unchanged
          ? `<div class="sr-staging-result">${winnerRawDmg} — net ${net} hit${net !== 1 ? 's' : ''}, no stage up → <strong>${power}${finalLevel} ${trackLabel}</strong></div>`
          : `<div class="sr-staging-result">📊 ${winnerRawDmg} + ${net} net hits → <strong>${power}${finalLevel} ${trackLabel}</strong></div>`;

        const soakPayload = JSON.stringify({
          attackerActorId: ctx.attackerActorId,
          targetActorId:   loser?.id,
          isMelee:         true,
          stagedPower:     power,
          stagedLevel:     finalLevel,
          isStun:          winnerDmgBase.isStun,
          rawDamage:       winnerRawDmg,
        }).replace(/'/g, '&#39;');

        soakBtn = `
          <div class="sr-soak-action">
            <button class="sr-soak-btn" data-payload='${soakPayload}'>
              🛡 ${loserName}: Resist Damage
            </button>
          </div>`;
      }

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ⚔ ${winnerName} wins! ${atkSuccesses} vs ${defSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Melee Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ ${atk?.name ?? ''} vs ${def?.name ?? ''} — Result</div>
          ${resultHtml}
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ---------------------------------------------------------------------------
  // SOAK
  // ---------------------------------------------------------------------------

  /**
   * Present the "who's soaking?" multi-select, then post a soak card for
   * each selected actor. Called from the soak button in a weapon roll card.
   *
   * @param {object} payload  — deserialised from the button's data-payload
   */
  // handleSoakClick removed — target is always identified from the attack context.

    /**
   * Build the soak button HTML — shared between no-dodge and failed-dodge paths.
   */
  static _soakButtonHtml(payload) {
    const targetActor = game.actors.get(payload.targetActorId);
    const targetName  = targetActor?.name ?? 'Target';
    const soakPayload = JSON.stringify({
      attackerActorId: payload.attackerActorId,
      targetActorId:   payload.targetActorId,
      weaponItemId:    payload.weaponItemId,
      isMelee:         payload.isMelee,
      stagedPower:     payload.stagedPower,
      stagedLevel:     payload.stagedLevel,
      isStun:          payload.isStun,
      rawDamage:       payload.rawDamage,
    }).replace(/'/g, '&#39;');

    return `
      <div class="sr-soak-action">
        <button class="sr-soak-btn" data-payload='${soakPayload}'>
          🛡 ${targetName}: Resist Damage
        </button>
      </div>`;
  }

  static _spellSoakButtonHtml(payload) {
    const targetActor      = game.actors.get(payload.targetActorId);
    const targetName       = targetActor?.name ?? 'Target';
    const spellSoakPayload = JSON.stringify({
      actorId:         payload.targetActorId,
      targetActorId:   payload.targetActorId,
      attackerActorId: payload.attackerActorId,
      isSpellSoak:     true,
      spellType:       payload.spellType,
      spellTarget:     payload.spellTarget ?? '',
      force:           payload.force,
      stagedPower:     payload.stagedPower,
      stagedLevel:     payload.stagedLevel,
      isStun:          payload.isStun,
      rawDamage:       payload.rawDamage,
    }).replace(/'/g, '&#39;');
    return `
      <div class="sr-soak-action">
        <button class="sr-spell-soak-btn" data-payload='${spellSoakPayload}'>
          🔮 ${targetName}: Resist Spell
        </button>
      </div>`;
  }

    /**
   * Roll committed dodge dice and post result card.
   * Called automatically after the attack roll resolves.
   */
  static async _rollDodge(targetActor, dodgeDice, dodgeContext, physicalDice = false) {
    const DODGE_TN = 4;
    const label    = `🎯 ${targetActor.name} dodges`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(dodgeDice, DODGE_TN, label);
      if (successes === null) return;
      dice = SR3EActor._buildPhysicalDice(dodgeDice, successes); ones = 0; glitch = false;
    } else {
      dice   = targetActor._rollWave(dodgeDice, DODGE_TN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(dodgeDice / 2);
    }

    await targetActor._postWaveCard({
      actorId:           targetActor.id,
      label,
      tn:                DODGE_TN,
      pool:              dodgeDice,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        false,
      isDodgeRoll:       true,
      dodgePayload:      dodgeContext,
    });
  }

  static async postSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      console.error('SR3E | postSoakCard: actor not found', actorId);
      return;
    }
    return actor._postSoakCard(payload);
  }

  /**
   * Post an editable resist card for this actor.
   */
  async _postSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, isMelee, rawDamage } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';

    // Ensure derived data is current — prepareDerivedData now guarantees sys.attributes exists
    this.prepareDerivedData();
    const bodyAttr = this.system.attributes?.body;
    const body     = Math.max(bodyAttr?.value ?? 0, bodyAttr?.base ?? 0, 1);

    let ballistic, impact;
    if (this.type === 'vehicle') {
      // Vehicles use their Armor attribute directly; no equipped-armor item
      const vArmor = this.system.attributes?.armor?.base ?? 0;
      ballistic = vArmor;
      impact    = vArmor;
    } else {
      const equippedId = this.system.equippedArmor;
      const armorItem  = equippedId ? this.items.get(equippedId) : null;
      ballistic = armorItem?.system?.ballistic ?? 0;
      impact    = armorItem?.system?.impact    ?? 0;
    }
    const defaultArmor = isMelee ? impact : ballistic;

    const soakTN = Math.max(2, stagedPower - defaultArmor);

    const soakPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      targetActorId:   payload.targetActorId ?? this.id,
      isMelee,
      stagedPower,
      stagedLevel,
      isStun,
      rawDamage,
      ballistic,
      impact,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">🛡 ${this.name} — Resist Damage</div>
          <div class="sr-roll-meta">
            Incoming: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool (Body ${body} + bonuses):
              <input type="number" class="sr-soak-pool" value="${body}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Power ${stagedPower} − Armour):
              <input type="number" class="sr-soak-tn" value="${soakTN}" min="2" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              Armour type:
              <select class="sr-soak-armor-type">
                <option value="ballistic" ${!isMelee ? 'selected' : ''}>Ballistic (${ballistic})</option>
                <option value="impact"    ${isMelee  ? 'selected' : ''}>Impact (${impact})</option>
              </select>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-roll-btn" data-payload='${soakPayload}'>
              🎲 ${this.name}: Roll to Resist
            </button>
          </div>
        </div>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /**
   * Handle a click on "Roll to Resist".
   */
  static async handleSoakRollClick(btn, physicalDice = false) {
    const payload   = JSON.parse(btn.dataset.payload);
    const card      = btn.closest('.sr-soak-card');
    const pool      = parseInt(card.querySelector('.sr-soak-pool')?.value) || 1;
    const tn        = parseInt(card.querySelector('.sr-soak-tn')?.value)   || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    const effectiveTN = Math.max(2, tn);
    const label       = `🛡 ${actor.name} resists`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll Soak'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice  = actor._rollWave(pool, effectiveTN, true);
      ones  = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:      payload.actorId,
      label,
      tn:           effectiveTN,
      pool,
      wave:         0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll: false,
      isSoakRoll:   true,
      soakPayload:  payload,
    });
  }

  /**
   * Spend combat pool dice, clamped to available pool.
   * Returns how many were actually spent.
   */
  async spendCombatPool(amount) {
    const available = this.system.derived?.availableCombatPool ?? 0;
    const spend     = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.combatPoolSpent': (this.system.combatPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  /**
   * Reset combat pool spending.
   */
  async refreshCombatPool() {
    await this.update({ 'system.combatPoolSpent': 0 });
  }

  /**
   * Spend spell pool dice, clamped to available pool.
   */
  async spendSpellPool(amount) {
    // Compute available directly — derived cache may be stale
    const attr       = this.system.attributes ?? {};
    const magicBase  = attr.magic?.base ?? 0;
    let available    = 0;
    if (magicBase > 0) {
      const stunVal  = this.system.wounds?.stun?.value     ?? 0;
      const physVal  = this.system.wounds?.physical?.value ?? 0;
      const wm       = -(Math.floor(stunVal / 3) + Math.floor(physVal / 3));
      const int2     = attr.intelligence?.base ?? 0;
      const wil2     = attr.willpower?.base    ?? 0;
      const spBase   = Math.max(0, Math.floor((int2 + wil2 + magicBase) / 2) + wm);
      const spTotal  = spBase + (this.system.spellPoolMod ?? 0);
      available      = Math.max(0, spTotal - (this.system.spellPoolSpent ?? 0));
    }
    const spend = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.spellPoolSpent': (this.system.spellPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  /**
   * Reset spell pool spending.
   */
  async refreshSpellPool() {
    await this.update({ 'system.spellPoolSpent': 0 });
  }

  async spendAstralPool(amount) {
    const available = this.system.derived?.availableAstralPool ?? 0;
    const spend     = Math.min(amount, available);
    if (spend > 0) {
      await this.update({ 'system.astralPoolSpent': (this.system.astralPoolSpent ?? 0) + spend });
    }
    return spend;
  }

  async refreshAstralPool() {
    await this.update({ 'system.astralPoolSpent': 0 });
  }

  // ---------------------------------------------------------------------------
  // SPELL DEFENSE
  // ---------------------------------------------------------------------------

  /**
   * Commit dice to the Spell Defense pool for this round.
   * Spell Pool dice are spent immediately; Sorcery dice are tracked separately
   * so they can be restored at round end without touching spellPoolSpent.
   */
  async commitSpellDefense(sorceryDice, spellDice) {
    const pool = Math.max(0, sorceryDice + spellDice);
    if (pool <= 0) return;
    await this.update({
      'system.spellDefensePool':        pool,
      'system.spellDefenseSorceryDice': sorceryDice,
    });
    if (spellDice > 0) await this.spendSpellPool(spellDice);
  }

  /**
   * Deduct n dice from the Spell Defense pool (clamped to available).
   */
  async useSpellDefenseDice(n) {
    const current = this.system.spellDefensePool ?? 0;
    const spend   = Math.min(n, current);
    if (spend > 0) await this.update({ 'system.spellDefensePool': current - spend });
    return spend;
  }

  /**
   * Clear Spell Defense state at round end.
   * Sorcery dice are "returned" (commitment removed); Spell Pool dice
   * remain spent until the GM manually refreshes pools.
   */
  async clearSpellDefense() {
    await this.update({
      'system.spellDefensePool':        0,
      'system.spellDefenseSorceryDice': 0,
    });
  }

  /**
   * Show the Spell Defense declaration dialog for all Sorcery-capable actors
   * in the current combat. Called after initiative is rolled each round.
   */
  static async promptSpellDefenseDeclaration(combatants) {
    const sorceryActors = combatants
      .map(c => c.actor)
      .filter(a => a && a.items.some(i => i.type === 'skill' && /sorcery/i.test(i.name)));
    if (sorceryActors.length === 0) return;

    const rows = sorceryActors.map(actor => {
      const sorcery      = actor.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
      const sorRating    = sorcery?.system?.rating ?? 0;
      const hasSDSpec    = /spell.?defense/i.test(sorcery?.system?.specialisation ?? '');
      const sorEffective = hasSDSpec ? sorRating + 2 : sorRating;
      const specNote     = hasSDSpec ? ` <span style="color:var(--sr-accent)">(${sorRating}+2 spec)</span>` : '';
      const spellAvail   = actor.system.derived?.availableSpellPool ?? 0;
      return `
        <tr>
          <td style="padding:4px 8px;font-weight:bold">${actor.name}</td>
          <td style="padding:4px 8px;text-align:center">
            <span style="color:var(--sr-muted);font-size:11px">Sorcery ${sorEffective}${specNote}</span>
            <input type="number" class="sd-sor" data-actor-id="${actor.id}"
                   value="0" min="0" max="${sorEffective}" style="width:45px;margin-left:4px"/>
          </td>
          <td style="padding:4px 8px;text-align:center">
            <span style="color:var(--sr-muted);font-size:11px">Spell Pool ${spellAvail}</span>
            <input type="number" class="sd-sp" data-actor-id="${actor.id}"
                   value="0" min="0" max="${spellAvail}" style="width:45px;margin-left:4px"/>
          </td>
        </tr>`;
    }).join('');

    const alloc = {};
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Declare Spell Defense' },
      content: `
        <p style="margin-bottom:8px;font-size:12px;color:var(--sr-muted)">
          Allocate Sorcery and/or Spell Pool dice to Spell Defense.
          These dice are locked for this round. Spell Pool dice are spent immediately;
          Sorcery dice return at round end.
        </p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--sr-border);font-size:11px;color:var(--sr-muted)">
              <th style="text-align:left;padding:4px 8px">Actor</th>
              <th style="padding:4px 8px">Sorcery dice</th>
              <th style="padding:4px 8px">Spell Pool dice</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`,
      buttons: [
        {
          label: 'Commit',
          action: 'commit',
          default: true,
          callback: (_e, _b, dialog) => {
            dialog.element.querySelectorAll('.sd-sor').forEach(inp => {
              const id = inp.dataset.actorId;
              if (!alloc[id]) alloc[id] = {};
              alloc[id].sorcery = parseInt(inp.value) || 0;
            });
            dialog.element.querySelectorAll('.sd-sp').forEach(inp => {
              const id = inp.dataset.actorId;
              if (!alloc[id]) alloc[id] = {};
              alloc[id].spell = parseInt(inp.value) || 0;
            });
          },
        },
        { label: 'Skip', action: 'skip' },
      ],
    });

    for (const [actorId, a] of Object.entries(alloc)) {
      if ((a.sorcery ?? 0) + (a.spell ?? 0) === 0) continue;
      const actor = game.actors.get(actorId);
      if (actor) await actor.commitSpellDefense(a.sorcery ?? 0, a.spell ?? 0);
    }
  }

  /**
   * Post the Spell Defense phase card.
   * Shows remaining hit count and a roll button for each actor with defense dice.
   * When currentSuccesses reaches 0, shows "completely defended" + drain only.
   */
  static async postSpellDefenseCard({ currentSuccesses, sc, force }) {
    const defenders  = game.actors.contents.filter(
      a => (a.system.spellDefensePool ?? 0) > 0 && a.id !== sc.attackerActorId
    );
    const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';

    if (currentSuccesses === 0 || defenders.length === 0) {
      // Nothing left to defend or no one active — go straight to post-spell cleanup
      await SR3EActor._postSpellResistOrDoneCard({ currentSuccesses, sc, force });
      return;
    }

    const defenderHtml = defenders.map(a => {
      const pool       = a.system.spellDefensePool;
      const btnPayload = JSON.stringify({
        defenderActorId:  a.id,
        currentSuccesses,
        sc,
        force,
      }).replace(/'/g, '&#39;');
      return `
        <div class="sr-soak-action">
          <button class="sr-spell-defense-btn" data-payload='${btnPayload}'>
            🛡 ${a.name}: Roll Spell Defense (${pool} ${pool === 1 ? 'die' : 'dice'} vs TN ${force})
          </button>
        </div>`;
    }).join('');

    const proceedPayload = JSON.stringify({ currentSuccesses, sc, force }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: { alias: 'Spell Defense' },
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header">🛡 Spell Defense — ${sc.spellName} [F${force}]</div>
          <div class="sr-roll-meta">
            ${casterName} — <strong>${currentSuccesses}</strong> hit${currentSuccesses !== 1 ? 's' : ''} remaining
          </div>
          ${defenderHtml}
          <div class="sr-soak-action">
            <button class="sr-spell-defense-proceed-btn" data-payload='${proceedPayload}'>
              ➡ Proceed to Resist Spell
            </button>
          </div>
        </div>`,
    });
  }

  /**
   * Post the final Resist Spell / drain buttons after defense is resolved.
   */
  static async _postSpellResistOrDoneCard({ currentSuccesses, sc, force }) {
    const casterName = game.actors.get(sc.attackerActorId)?.name ?? 'Caster';
    let html = `<div class="sr-roll-card">`;

    if (currentSuccesses > 0) {
      const staged     = SR3EItem.stageDamage(sc.damageBase, currentSuccesses);
      const trackLabel = staged.isStun ? 'Stun' : 'Physical';
      html += `<div class="sr-roll-meta">
        🔮 ${sc.spellName} — <strong>${staged.power}${staged.level} ${trackLabel}</strong>
        (${currentSuccesses} hit${currentSuccesses !== 1 ? 's' : ''} after defense)
      </div>`;
      for (const targetId of (sc.targetActorIds ?? [])) {
        const tActor = game.actors.get(targetId);
        if (!tActor) continue;
        const p = JSON.stringify({
          actorId:         targetId,
          targetActorId:   targetId,
          attackerActorId: sc.attackerActorId,
          isSpellSoak:     true,
          spellType:       sc.spellType,
          spellTarget:     sc.spellTarget ?? '',
          force,
          stagedPower:     staged.power,
          stagedLevel:     staged.level,
          isStun:          staged.isStun,
          rawDamage:       sc.rawDamage,
        }).replace(/'/g, '&#39;');
        html += `<div class="sr-soak-action">
          <button class="sr-spell-soak-btn" data-payload='${p}'>
            🔮 ${tActor.name}: Resist Spell
          </button>
        </div>`;
      }
    } else {
      html += `<div class="sr-roll-meta">✨ Spell completely defended — no damage to resist.</div>`;
    }

    // Drain is always owed
    const drainPayload = JSON.stringify({
      actorId:         sc.attackerActorId,
      drainStr:        sc.drainStr,
      force,
      sorceryRating:   sc.sorceryRating,
      drainIsPhysical: sc.drainIsPhysical,
      spellName:       sc.spellName,
    }).replace(/'/g, '&#39;');
    html += `<div class="sr-soak-action">
      <button class="sr-drain-btn" data-payload='${drainPayload}'>
        ⚡ ${casterName}: Resist Drain
      </button>
    </div></div>`;

    await ChatMessage.create({ speaker: { alias: 'Spell Defense' }, content: html });
  }

  /**
   * Handle click on "Roll Spell Defense" button.
   */
  static async handleSpellDefenseRoll(btn, physicalDice = false) {
    const p        = JSON.parse(btn.dataset.payload);
    const { defenderActorId, currentSuccesses, sc, force } = p;

    const defender = game.actors.get(defenderActorId);
    if (!defender) return;

    const poolAvail = defender.system.spellDefensePool ?? 0;
    if (poolAvail <= 0) {
      ui.notifications.warn(`${defender.name} has no Spell Defense dice remaining.`);
      return;
    }

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const rollLabel = `🛡 ${defender.name} — Spell Defense vs ${sc.spellName} [F${force}]`;

    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(poolAvail, force, rollLabel);
      if (successes === null) { btn.disabled = false; btn.textContent = `🛡 Roll Spell Defense`; return; }
      await defender.useSpellDefenseDice(poolAvail);
      await defender.rollPool(poolAvail, force, rollLabel, {
        isSpellDefenseRoll:  true,
        spellDefenseContext: { defenderActorId, currentSuccesses, spellContext: sc, force },
        physicalDice:        true,
      });
      return;
    }

    let dicesToUse = 0;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${defender.name} — Spell Defense` },
      content: `
        <p>Defending against <strong>${sc.spellName}</strong> [F${force}]</p>
        <p style="font-size:11px;color:var(--sr-muted)">TN: <strong>${force}</strong> &nbsp;|&nbsp; Available: <strong>${poolAvail}</strong></p>
        <label style="display:flex;align-items:center;gap:8px">
          Dice to use:
          <input type="number" id="sd-dice" value="${poolAvail}" min="1" max="${poolAvail}" style="width:55px"/>
        </label>`,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            dicesToUse = Math.min(
              parseInt(dialog.element.querySelector('#sd-dice')?.value) || 0,
              poolAvail
            );
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (dicesToUse <= 0) {
      btn.disabled    = false;
      btn.textContent = `🛡 ${defender.name}: Roll Spell Defense (${poolAvail} ${poolAvail === 1 ? 'die' : 'dice'} vs TN ${force})`;
      return;
    }

    await defender.useSpellDefenseDice(dicesToUse);

    await defender.rollPool(
      dicesToUse,
      force,
      rollLabel,
      {
        isSpellDefenseRoll:   true,
        spellDefenseContext:  { defenderActorId, currentSuccesses, spellContext: sc, force },
      }
    );
  }

  /**
   * Handle click on "Proceed to Resist Spell" button.
   */
  static async handleSpellDefenseProceed(btn) {
    btn.disabled    = true;
    btn.textContent = '⏳ Proceeding…';
    const { currentSuccesses, sc, force } = JSON.parse(btn.dataset.payload);
    await SR3EActor._postSpellResistOrDoneCard({ currentSuccesses, sc, force });
  }

  // ---------------------------------------------------------------------------
  // SPELLCASTING — Spell soak and drain
  // ---------------------------------------------------------------------------

  static async postSpellSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) { console.error('SR3E | postSpellSoakCard: actor not found', actorId); return; }
    return actor._postSpellSoakCard(payload);
  }

  /**
   * Post a resist-spell card for this actor.
   * Resist attribute derived from spell's target field: W(R)=Willpower, B(R)=Body, F(R)=Willpower.
   * TN = Force (no armour).
   */
  async _postSpellSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, spellType, spellTarget, force, rawDamage } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';

    const t = String(spellTarget ?? '').trim().toUpperCase();
    let resistAttr, resistName;
    if (t === 'W(R)' || t === 'W') {
      resistAttr = 'willpower'; resistName = 'Willpower';
    } else if (t === 'B(R)' || t === 'B') {
      resistAttr = 'body'; resistName = 'Body';
    } else if (t === 'F(R)' || t === 'F') {
      resistAttr = 'willpower'; resistName = 'Willpower';
    } else {
      const isManaSpell = spellType !== 'Physical';
      resistAttr = isManaSpell ? 'willpower' : 'body';
      resistName = isManaSpell ? 'Willpower' : 'Body';
    }

    this.prepareDerivedData();
    const attrVal = this.system.attributes?.[resistAttr]?.value
                 ?? this.system.attributes?.[resistAttr]?.base
                 ?? 1;
    const pool   = Math.max(1, attrVal);
    const soakTN = Math.max(2, force);

    const soakPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      targetActorId:   this.id,
      isSpellSoak:     true,
      stagedPower,
      stagedLevel,
      isStun,
      rawDamage,
      ballistic:       0,
      impact:          0,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">🔮 ${this.name} — Resist Spell</div>
          <div class="sr-roll-meta">
            Incoming: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool (${resistName} ${attrVal}):
              <input type="number" class="sr-soak-pool" value="${pool}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Force ${force}):
              <input type="number" class="sr-soak-tn" value="${soakTN}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-soak-roll-btn" data-payload='${soakPayload}'>
              🎲 ${this.name}: Roll to Resist
            </button>
          </div>
        </div>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async postDrainCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) { console.error('SR3E | postDrainCard: actor not found', actorId); return; }
    return actor._postDrainCard(payload);
  }

  /**
   * Post an editable drain resist card for this actor (the caster).
   */
  async _postDrainCard(payload) {
    const { drainStr, force, sorceryRating, drainIsPhysical, spellName } = payload;

    let drainTN, drainLevel;
    if (payload.drainTNOverride !== undefined) {
      // Pre-computed values (conjuring drain: TN = Force, level from Force/2)
      drainTN    = payload.drainTNOverride;
      drainLevel = payload.drainLevel ?? 'S';
    } else {
      const parsed = SR3EItem.parseDrainFormula(drainStr, force);
      if (!parsed) {
        ui.notifications.warn(`SR3E: Could not parse drain formula "${drainStr}". Check the spell item.`);
        return;
      }
      drainTN    = parsed.tn;
      drainLevel = parsed.level;
    }
    const trackLabel = drainIsPhysical ? 'Physical' : 'Stun';

    const attr2      = this.system.attributes ?? {};
    const wil        = attr2.willpower?.base ?? 1;
    const willPool   = Math.max(1, wil);
    const magicBase  = attr2.magic?.base ?? 0;

    // Use the spell pool count computed at roll time and carried in the payload.
    // This avoids any stale-derived-cache or wrong-actor-reference issues.
    const availSpell = payload.spellPoolForDrain ?? 0;

    const drainRollPayload = JSON.stringify({
      actorId:         this.id,
      drainStr,
      drainLevel,
      drainTN,
      drainIsPhysical,
      force,
      sorceryRating,
      spellName,
    }).replace(/'/g, '&#39;');

    const physWarning = drainIsPhysical
      ? `<div style="color:var(--sr-red);font-size:11px;margin-top:4px">⚠ Force (${force}) &gt; Magic (${magicBase}) — Drain is Physical!</div>`
      : '';

    const spellPoolField = availSpell > 0
      ? `<label class="sr-soak-label">
           Spell Pool (${availSpell} available):
           <input type="number" class="sr-drain-spell-pool" value="0" min="0" max="${availSpell}" style="width:55px"/>
         </label>`
      : '';

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-soak-card">
          <div class="sr-roll-header">⚡ ${this.name} — Resist Drain</div>
          <div class="sr-roll-meta">
            Drain: <strong>${drainLevel} ${trackLabel}</strong>
            (${drainStr ? `formula: ${drainStr}, F=${force} → ` : ''}TN ${drainTN})
            ${physWarning}
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Drain Pool (Willpower ${wil}):
              <input type="number" class="sr-drain-pool" value="${willPool}" min="1" max="30" style="width:55px"/>
            </label>
            ${spellPoolField}
            <label class="sr-soak-label">
              TN:
              <input type="number" class="sr-drain-tn" value="${drainTN}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-drain-roll-btn" data-payload='${drainRollPayload}'>
              🎲 ${this.name}: Roll to Resist Drain
            </button>
          </div>
        </div>
      `,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  /**
   * Handle click on "Roll to Resist Drain".
   */
  static async handleDrainRollClick(btn, physicalDice = false) {
    const payload   = JSON.parse(btn.dataset.payload);
    const card      = btn.closest('.sr-soak-card');
    const willDice  = parseInt(card.querySelector('.sr-drain-pool')?.value)       || 1;
    const spellDice = parseInt(card.querySelector('.sr-drain-spell-pool')?.value) || 0;
    const tn        = parseInt(card.querySelector('.sr-drain-tn')?.value)         || 2;
    const pool      = willDice + spellDice;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    if (spellDice > 0) await actor.spendSpellPool(spellDice);

    const effectiveTN = Math.max(2, tn);
    const label       = `⚡ ${actor.name} resists drain`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll Drain'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice   = actor._rollWave(pool, effectiveTN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:           payload.actorId,
      label,
      tn:                effectiveTN,
      pool,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        false,
      isDrainRoll:       true,
      drainPayload:      payload,
    });
  }

  async rollInitiative(options = {}) {
    // --- Vehicle: RCD or VCR initiative ---
    if (this.type === 'vehicle') {
      const vcrMode   = this.system.vcrMode ?? false;
      const pilotName = this.system.controlledBy?.trim() ?? '';
      const pilotRating = this.system.attributes?.pilot?.base ?? 0;

      if (vcrMode && pilotName) {
        const rigger = game.actors.find(a => a.name === pilotName);
        if (rigger) {
          const d    = rigger.system.derived ?? {};

          // VCR level from the rigger's active VCR cyberware item
          let vcrLevel = 0;
          const activeVCRId = rigger.system.activeVCRItemId ?? '';
          if (activeVCRId) {
            const vcrItem = rigger.items.get(activeVCRId);
            if (vcrItem) vcrLevel = vcrItem.system.rating ?? 0;
          }
          if (!vcrLevel) {
            // Fallback: search cyberware items for VCR by name
            const vcrItem = rigger.items.find(i =>
              i.type === 'cyberware' && /vcr|vehicle\s*control\s*rig/i.test(i.name)
            );
            if (vcrItem) vcrLevel = vcrItem.system.rating ?? 1;
          }

          // VCR bonus: +2 Reaction per level (adds to initiative base), +1d6 per level
          const base = (d.initiative ?? 0) + (vcrLevel * 2);
          const dice = (d.initiativeDice ?? 1) + vcrLevel;

          const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
          const rolled = rolls.reduce((s, r) => s + r, 0);
          const score  = base + rolled;
          const diceHtml = rolls.map(r => `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}">${r}</span>`).join('');
          const bonusNote = vcrLevel
            ? `<div class="sr-roll-meta" style="color:var(--sr-accent)">VCR Lv${vcrLevel}: +${vcrLevel * 2} Reaction, +${vcrLevel}d6</div>`
            : '';
          await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this }),
            content: `
              <div class="sr-roll-card">
                <div class="sr-roll-header">⚡ Initiative — ${this.name}
                  <span style="font-size:11px;font-weight:normal;color:var(--sr-accent)"> VCR: ${rigger.name}</span>
                </div>
                <div class="sr-roll-meta">${base} base (${rigger.name}) + ${dice}d6</div>
                ${bonusNote}
                <div class="sr-roll-dice">${diceHtml}</div>
                <div class="sr-roll-result">Score: <strong>${score}</strong>
                  <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${rolled})</span>
                </div>
              </div>`,
            type: CONST.CHAT_MESSAGE_STYLES.ROLL,
          });
          return score;
        }
      }

      // RCD mode: (Pilot × 2) + 1d6
      const base = pilotRating * 2;
      const roll = Math.floor(Math.random() * 6) + 1;
      const score = base + roll;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        content: `
          <div class="sr-roll-card">
            <div class="sr-roll-header">⚡ Initiative — ${this.name}
              <span style="font-size:11px;font-weight:normal;color:var(--sr-muted)"> RCD</span>
            </div>
            <div class="sr-roll-meta">Pilot ${pilotRating} × 2 = ${base} + 1d6</div>
            <div class="sr-roll-dice"><span class="sr-die ${roll === 6 ? 'sr-hit' : ''}">${roll}</span></div>
            <div class="sr-roll-result">Score: <strong>${score}</strong>
              <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${roll})</span>
            </div>
          </div>`,
        type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      });
      return score;
    }

    // --- Character / NPC initiative ---
    const d           = this.system.derived ?? {};
    const matrixMode  = this.system.matrixUserMode ?? '';
    const astralMode  = this.system.astralMode ?? '';
    const jackedIn    = matrixMode === 'VR-Cold' || matrixMode === 'VR-Hot';
    const useMatrix   = matrixMode === 'VR-Hot';
    const useAstral   = astralMode === 'astral';

    let base, dice, modeNote;

    if (useAstral) {
      // Astral initiative: Intelligence + 20 + 1d6
      const intel = this.system.attributes?.intelligence?.value ?? 0;
      base = intel + 20;
      dice = 1;
      modeNote = `<div class="sr-roll-meta" style="color:#c070f5">✦ Astral Init — INT ${intel} + 20</div>`;
    } else if (useMatrix) {
      // Matrix initiative (VR-Hot): Reaction + (Response × 2) + (1 + Response)d6
      const reaction  = this.system.attributes?.reaction?.value ?? d.initiative ?? 0;
      const deckId    = this.system.equippedCyberdeck ?? '';
      const deck      = deckId ? this.items.get(deckId) : null;
      const response  = deck?.system?.attributes?.response?.base ?? 0;
      base = reaction + (response * 2);
      dice = 1 + response;
      modeNote = `<div class="sr-roll-meta" style="color:var(--sr-accent)">💻 Matrix Init (VR-Hot) — Response ${response}</div>`;
    } else {
      base = d.initiative     ?? 0;
      dice = d.initiativeDice ?? 1;
      modeNote = jackedIn
        ? `<div class="sr-roll-meta" style="color:var(--sr-accent)">🔌 Jacked In (${matrixMode})</div>`
        : '';
    }

    let score;
    let cardContent;

    if (options.physicalDice) {
      let entered = null;
      await foundry.applications.api.DialogV2.wait({
        window: { title: `⚡ Initiative — ${this.name}` },
        content: `
          <div style="padding:8px 0">
            <p style="margin-bottom:8px">${base} base + ${dice}d6 — roll your dice then enter the total.</p>
            <label style="display:flex;align-items:center;gap:8px">
              Score:
              <input type="number" id="init-score" value="${base}" min="0" max="99"
                     style="width:60px" autofocus/>
            </label>
          </div>`,
        buttons: [
          { label: 'Confirm', action: 'confirm', default: true,
            callback: (_e, _b, dlg) => { entered = parseInt(dlg.element.querySelector('#init-score')?.value) || base; } },
          { label: 'Cancel', action: 'cancel' },
        ],
      });
      if (entered === null) return null;
      score = entered;
      cardContent = `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚡ Initiative — ${this.name}</div>
          <div class="sr-roll-meta">${base} base + ${dice}d6</div>
          ${modeNote}
          <div class="sr-roll-dice"><span class="sr-die sr-hit" title="Physical dice">📋 ${score}</span></div>
          <div class="sr-roll-result">Score: <strong>${score}</strong></div>
        </div>`;
    } else {
      const rolls = Array.from({ length: dice }, () => Math.floor(Math.random() * 6) + 1);
      const initiativeRoll = rolls.reduce((sum, r) => sum + r, 0);
      score = base + initiativeRoll;
      const diceHtml = rolls.map(r =>
        `<span class="sr-die ${r === 6 ? 'sr-hit' : ''}" title="${r}">${r}</span>`
      ).join('');
      cardContent = `
        <div class="sr-roll-card">
          <div class="sr-roll-header">⚡ Initiative — ${this.name}</div>
          <div class="sr-roll-meta">${base} base + ${dice}d6</div>
          ${modeNote}
          <div class="sr-roll-dice">${diceHtml}</div>
          <div class="sr-roll-result">
            Score: <strong>${score}</strong>
            <span style="font-size:11px;color:var(--sr-muted)">(${base} + ${initiativeRoll})</span>
          </div>
        </div>`;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: cardContent,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });

    return score;
  }

  /**
   * Dispel a spell: roll Sorcery vs TN=Force, report successes vs original cast hits,
   * then post a drain card for the dispeller.
   */
  async rollDispel() {
    const magicBase = this.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${this.name} is not Awakened (Magic attribute is 0).`);
      return null;
    }

    // Find Sorcery skill and check Dispelling specialisation
    const sorcerySkill  = this.items.find(i => i.type === 'skill' && /sorcery/i.test(i.name));
    const sorceryRating = sorcerySkill?.system?.rating ?? 0;
    const sorcerySpec   = sorcerySkill?.system?.specialisation ?? '';
    const hasDispelSpec = /dispel/i.test(sorcerySpec);

    // Dialog: gather spell info
    let force = null, originalSuccesses = null, drainCode = '', cancelled = true;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${this.name} — Dispel Spell` },
      content: `
        <p>Enter the details of the spell you are dispelling.</p>
        <div style="font-size:12px;margin-bottom:8px">
          Sorcery dice:
          <strong>${hasDispelSpec
            ? `${sorceryRating} <span style="color:var(--sr-accent)">(${sorceryRating + 2})</span> — Dispelling spec`
            : (sorceryRating || '(none)')
          }</strong>
        </div>
        <div style="display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px 12px">
          <label>Force:</label>
          <input type="number" id="dispel-force" value="4" min="1" max="99" style="width:70px"/>
          <label>Original Successes:</label>
          <input type="number" id="dispel-orig" value="1" min="0" max="99" style="width:70px"/>
          <label>Drain Code:</label>
          <input type="text" id="dispel-drain" value="" placeholder="e.g. (F/2)S" style="width:120px"/>
        </div>
      `,
      buttons: [
        {
          label: 'Roll Dispel',
          action: 'confirm',
          default: true,
          callback: (_e, _b, dialog) => {
            cancelled           = false;
            force               = Math.max(1, parseInt(dialog.element.querySelector('#dispel-force')?.value) || 1);
            originalSuccesses   = Math.max(0, parseInt(dialog.element.querySelector('#dispel-orig')?.value) || 0);
            drainCode           = dialog.element.querySelector('#dispel-drain')?.value?.trim() ?? '';
          }
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (cancelled || force === null) return null;

    // Compute wound mod and spell pool total from raw fields (don't trust derived cache)
    const stunVal   = this.system.wounds?.stun?.value     ?? 0;
    const physVal   = this.system.wounds?.physical?.value ?? 0;
    const woundMod  = -(Math.floor(stunVal / 3) + Math.floor(physVal / 3));
    const specBonus = hasDispelSpec ? 2 : 0;
    const sorceryDice = Math.max(0, sorceryRating + specBonus + woundMod);

    const intVal    = this.system.attributes?.intelligence?.base ?? 0;
    const wilVal    = this.system.attributes?.willpower?.base    ?? 0;
    const spBase    = Math.max(0, Math.floor((intVal + wilVal + magicBase) / 2) + woundMod);
    const spTotal   = spBase + (this.system.spellPoolMod ?? 0);
    const spSpent   = this.system.spellPoolSpent ?? 0;
    const availSpell = Math.max(0, spTotal - spSpent);

    let spellDice = 0;
    if (availSpell > 0) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: `${this.name} — Spell Pool (Dispel)` },
        content: `
          <p>Allocate Spell Pool dice to the dispel roll.</p>
          <p style="font-size:11px;color:var(--sr-muted)">Available: <strong>${availSpell}</strong> dice (0 = none)</p>
          <input type="number" id="dispel-spell-dice" min="0" max="${availSpell}" value="0" style="width:80px"/>
        `,
        buttons: [
          {
            label: 'Confirm',
            action: 'confirm',
            default: true,
            callback: (_e, _b, dialog) => {
              spellDice = Math.min(availSpell, Math.max(0, parseInt(dialog.element.querySelector('#dispel-spell-dice')?.value) || 0));
            }
          },
          { label: 'Skip', action: 'skip' },
        ],
      });
      if (spellDice > 0) await this.spendSpellPool(spellDice);
    }

    const pool = Math.max(1, sorceryDice + spellDice);
    // Remaining spell pool for drain resist (spent is now updated)
    const spellPoolForDrain = Math.max(0, spTotal - (this.system.spellPoolSpent ?? 0));

    const sorceryLabel = hasDispelSpec
      ? `Sorcery ${sorceryRating} (${sorceryRating + 2}) — Dispelling`
      : `Sorcery ${sorceryRating}`;
    const label = `✦ ${this.name} — Dispel [F${force}] ${sorceryLabel}`;

    // Drain is Physical if Force > Magic attribute (same rule as casting)
    const drainIsPhysical = force > magicBase;

    return this.rollPool(pool, force, label, {
      isDispelRoll:  true,
      dispelContext: {
        actorId:          this.id,
        force,
        originalSuccesses,
        drainCode,
        drainIsPhysical,
        sorceryRating,
        spellPoolForDrain,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // ASTRAL COMBAT
  // ---------------------------------------------------------------------------

  async rollAstralCombat(options = {}) {
    const magicBase = this.system.attributes?.magic?.base ?? 0;
    if (magicBase <= 0) {
      ui.notifications.warn(`${this.name} is not Awakened and cannot initiate astral combat.`);
      return null;
    }

    const _getAstralInfo = (actor) => {
      const cha        = actor.system.attributes?.charisma?.base   ?? 1;
      const wil        = actor.system.attributes?.willpower?.base  ?? 1;
      const astralPool = actor.system.derived?.availableAstralPool ?? 0;

      // Damage: armed if active weapon focus, unarmed otherwise
      const weaponFocus = actor.items.find(i =>
        i.type === 'melee' && (i.system.isFocus ?? false) && (i.system.focusActive ?? false)
      );
      let rawDamage;
      if (weaponFocus) {
        const focusBase = SR3EItem.parseDamageCode(weaponFocus.system.damage ?? '', actor);
        if (focusBase) {
          rawDamage = `${cha + focusBase.power}${focusBase.level}`;
        } else {
          rawDamage = `${cha}M`; // fallback if focus has no damage code
        }
      } else {
        rawDamage = `${cha}M`;
      }

      // Attack dice: Sorcery skill (+2 if Astral Combat specialisation)
      const sorcery = actor.items.find(i =>
        i.type === 'skill' && i.name.toLowerCase() === 'sorcery'
      );
      if (sorcery) {
        const rating  = sorcery.system.skillRating ?? sorcery.system.rating ?? 1;
        const hasSpec = (sorcery.system.specialisation ?? '').toLowerCase() === 'astral combat';
        return {
          skillName:  hasSpec ? `Sorcery (Astral Combat spec)` : `Sorcery`,
          skillDice:  hasSpec ? rating + 2 : rating,
          isDefault:  false,
          rawDamage,
          astralPool,
        };
      }

      // Default: Willpower − 2
      return {
        skillName:  'Willpower (defaulting)',
        skillDice:  Math.max(1, wil - 2),
        isDefault:  true,
        rawDamage,
        astralPool,
      };
    };

    const atkInfo     = _getAstralInfo(this);
    const targetActor = await SR3EItem._promptTarget(this);
    if (!targetActor) return null;

    const defInfo = _getAstralInfo(targetActor);

    const atkTN = 4;
    const defTN = 4;

    await SR3EActor.postAstralCard({
      attackerActorId: this.id,
      defenderActorId: targetActor.id,
      atkSkillName:    atkInfo.skillName,
      atkSkillDice:    atkInfo.skillDice,
      atkIsDefault:    atkInfo.isDefault,
      atkAstralPool:   atkInfo.astralPool,
      atkRawDamage:    atkInfo.rawDamage,
      atkTN,
      defSkillName:    defInfo.skillName,
      defSkillDice:    defInfo.skillDice,
      defIsDefault:    defInfo.isDefault,
      defAstralPool:   defInfo.astralPool,
      defRawDamage:    defInfo.rawDamage,
      defTN,
    });
  }

  static async postAstralCard(ctx) {
    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const _corner = (name, skillName, skillDice, isDefault, rawDamage, astralPool, tn, poolClass, tnClass, dmgClass) => `
      <div class="sr-melee-corner sr-astral-corner">
        <div class="sr-melee-name">${name}</div>
        <div class="sr-astral-skill-line">
          ${isDefault
            ? `<span style="color:var(--sr-amber)">${skillName} (${skillDice})</span>`
            : `${skillName} (${skillDice})`}
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">Damage</label>
          <input type="text" class="${dmgClass} sr-astral-input" value="${rawDamage}" style="width:60px"/>
        </div>
        <div class="sr-astral-field-row">
          <span class="sr-astral-field-label">Charisma dice</span>
          <strong class="sr-astral-field-value">${skillDice}</strong>
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">+ Astral Pool (avail. ${astralPool})</label>
          <input type="number" class="${poolClass} sr-astral-input" value="0" min="0" max="${astralPool}"/>
        </div>
        <div class="sr-astral-field-row">
          <label class="sr-astral-field-label">TN</label>
          <input type="number" class="${tnClass} sr-astral-input" value="${tn}" min="2" max="30"/>
        </div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Astral Combat' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">✦ ASTRAL COMBAT — ${atk.name} vs ${def.name}</div>
          <div class="sr-melee-boxing">
            ${_corner(atk.name, ctx.atkSkillName, ctx.atkSkillDice, ctx.atkIsDefault, ctx.atkRawDamage,
                      ctx.atkAstralPool, ctx.atkTN, 'sr-astral-atk-pool', 'sr-astral-atk-tn', 'sr-astral-atk-damage')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(def.name, ctx.defSkillName, ctx.defSkillDice, ctx.defIsDefault, ctx.defRawDamage,
                      ctx.defAstralPool, ctx.defTN, 'sr-astral-def-pool', 'sr-astral-def-tn', 'sr-astral-def-damage')}
          </div>
          <div style="margin:8px 0 4px;font-size:11px;color:var(--sr-muted)">
            <label style="display:flex;align-items:center;gap:6px">
              <input type="checkbox" class="sr-astral-physical-dmg"/>
              Physical Damage (unchecked = Stun)
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-astral-roll-btn" data-payload='${payload}'>✦ Roll!</button>
          </div>
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleAstralRoll(btn, physicalDice = false) {
    const ctx  = JSON.parse(btn.dataset.payload);
    const card = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const atkAstralPool = parseInt(card.querySelector('.sr-astral-atk-pool')?.value) || 0;
    const defAstralPool = parseInt(card.querySelector('.sr-astral-def-pool')?.value) || 0;
    const atkPool       = Math.max(1, (ctx.atkSkillDice ?? 1) + atkAstralPool);
    const defPool       = Math.max(1, (ctx.defSkillDice ?? 1) + defAstralPool);
    const atkTN         = Math.max(2, parseInt(card.querySelector('.sr-astral-atk-tn')?.value) || 4);
    const defTN         = Math.max(2, parseInt(card.querySelector('.sr-astral-def-tn')?.value) || 4);
    const atkRawDamage  = card.querySelector('.sr-astral-atk-damage')?.value.trim() || ctx.atkRawDamage;
    const defRawDamage  = card.querySelector('.sr-astral-def-damage')?.value.trim() || ctx.defRawDamage;
    const isPhysical    = card.querySelector('.sr-astral-physical-dmg')?.checked ?? false;

    const atkActor = game.actors.get(ctx.attackerActorId);
    const defActor = game.actors.get(ctx.defenderActorId);
    if (atkAstralPool > 0 && atkActor) await atkActor.spendAstralPool(atkAstralPool);
    if (defAstralPool > 0 && defActor) await defActor.spendAstralPool(defAstralPool);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);
    if (!atk || !def) return;

    let atkDice, defDice;
    if (physicalDice) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `✦ ${atk.name} — Astral Combat`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      const defSuccesses = await SR3EActor._promptPhysicalSuccesses(defPool, defTN, `✦ ${def.name} — Astral Combat`);
      if (defSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll!'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      defDice = SR3EActor._buildPhysicalDice(defPool, defSuccesses);
    } else {
      atkDice = atk._rollWave(atkPool, atkTN, true);
      defDice = def._rollWave(defPool, defTN, true);
    }

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const defOnes   = defDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const defGlitch = defOnes > Math.floor(defPool / 2);

    const astralCtx = { ...ctx, atkPool, atkTN, defPool, defTN, atkRawDamage, defRawDamage, isPhysical };

    await atk._postWaveCard({
      actorId: atk.id, label: `✦ ${atk.name} — Astral Combat`,
      tn: atkTN, pool: atkPool, wave: 0,
      dice: atkDice, ones: atkOnes, glitch: atkGlitch,
      physicalDice, physicalSuccesses: physicalDice ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeAtk: true, meleeCtx: astralCtx,
    });

    await def._postWaveCard({
      actorId: def.id, label: `✦ ${def.name} — Astral Combat`,
      tn: defTN, pool: defPool, wave: 0,
      dice: defDice, ones: defOnes, glitch: defGlitch,
      physicalDice, physicalSuccesses: physicalDice ? defDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeDef: true, meleeCtx: astralCtx,
    });

    await SR3EActor._postAstralResult(astralCtx, atkDice, defDice);
  }

  static async _postAstralResult(ctx, atkDice, defDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const defSuccesses = defDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - defSuccesses);

    const atk = game.actors.get(ctx.attackerActorId);
    const def = game.actors.get(ctx.defenderActorId);

    let resultHtml;

    if (atkSuccesses === defSuccesses) {
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${defSuccesses} — no damage dealt.
        </div>`;
    } else {
      const winnerIsAtk = atkSuccesses > defSuccesses;
      const winner      = winnerIsAtk ? atk : def;
      const loser       = winnerIsAtk ? def : atk;
      const winnerName  = winner?.name ?? 'Winner';
      const loserName   = loser?.name  ?? 'Loser';

      const winnerCha    = winner?.system?.attributes?.charisma?.base ?? 1;
      const isStun       = !(ctx.isPhysical ?? false);
      const winnerRaw    = winnerIsAtk ? (ctx.atkRawDamage || `${winnerCha}M`) : (ctx.defRawDamage || `${winnerCha}M`);
      const baseDamage   = SR3EItem.parseDamageCode(winnerRaw, winner) ?? { power: winnerCha, level: 'M', isStun: false };
      const staged       = SR3EItem.stageDamage(baseDamage, net);
      const finalIsStun  = isStun ?? staged.isStun;
      const trackLabel   = finalIsStun ? 'Stun' : 'Physical';

      const stagingHtml = `<div class="sr-staging-result">📊 ${winnerRaw} + ${net} net hit${net !== 1 ? 's' : ''} → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;

      const soakPayload = JSON.stringify({
        actorId:         loser?.id,
        attackerActorId: winner?.id,
        winnerCha,
        stagedPower:     staged.power,
        stagedLevel:     staged.level,
        isStun:          finalIsStun,
      }).replace(/'/g, '&#39;');

      const soakBtn = `
        <div class="sr-soak-action">
          <button class="sr-astral-soak-btn" data-payload='${soakPayload}'>
            🛡 ${loserName}: Resist Damage (Astral)
          </button>
        </div>`;

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ✦ ${winnerName} wins! ${atkSuccesses} vs ${defSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Astral Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">✦ ${atk?.name ?? ''} vs ${def?.name ?? ''} — Astral Result</div>
          ${resultHtml}
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async postAstralSoakCard(actorId, payload) {
    const actor = game.actors.get(actorId);
    if (!actor) return;
    return actor._postAstralSoakCard(payload);
  }

  async _postAstralSoakCard(payload) {
    const { stagedPower, stagedLevel, isStun, winnerCha } = payload;
    const trackLabel = isStun ? 'Stun' : 'Physical';

    this.prepareDerivedData();
    const wilAttr = this.system.attributes?.willpower;
    const wilVal  = Math.max(wilAttr?.value ?? 0, wilAttr?.base ?? 0, 1);
    const soakTN  = Math.max(2, winnerCha ?? stagedPower);

    const soakPayload = JSON.stringify({
      actorId:         this.id,
      attackerActorId: payload.attackerActorId,
      stagedPower,
      stagedLevel,
      isStun,
      winnerCha,
    }).replace(/'/g, '&#39;');

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      content: `
        <div class="sr-roll-card sr-astral-soak-card">
          <div class="sr-roll-header">✦ ${this.name} — Resist Astral Damage</div>
          <div class="sr-roll-meta">
            Incoming: <strong>${stagedPower}${stagedLevel} ${trackLabel}</strong>
          </div>
          <div class="sr-soak-fields">
            <label class="sr-soak-label">
              Resist Pool — Willpower / Astral Body (${wilVal}):
              <input type="number" class="sr-astral-soak-pool" value="${wilVal}" min="1" max="30" style="width:55px"/>
            </label>
            <label class="sr-soak-label">
              TN (Winner's Charisma ${winnerCha ?? stagedPower}):
              <input type="number" class="sr-astral-soak-tn" value="${soakTN}" min="2" max="30" style="width:55px"/>
            </label>
          </div>
          <div class="sr-soak-action">
            <button class="sr-astral-soak-roll-btn" data-payload='${soakPayload}'>
              🎲 ${this.name}: Roll to Resist (Astral)
            </button>
          </div>
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  static async handleAstralSoakRoll(btn, physicalDice = false) {
    const payload = JSON.parse(btn.dataset.payload);
    const card    = btn.closest('.sr-astral-soak-card');
    const pool    = parseInt(card.querySelector('.sr-astral-soak-pool')?.value) || 1;
    const tn      = parseInt(card.querySelector('.sr-astral-soak-tn')?.value)   || 2;

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const actor = game.actors.get(payload.actorId);
    if (!actor) return;

    const effectiveTN = Math.max(2, tn);
    const label       = `✦ ${actor.name} resists astral damage`;

    let dice, ones, glitch;
    if (physicalDice) {
      const successes = await SR3EActor._promptPhysicalSuccesses(pool, effectiveTN, label);
      if (successes === null) { btn.disabled = false; btn.textContent = 'Roll to Resist'; return; }
      dice = SR3EActor._buildPhysicalDice(pool, successes); ones = 0; glitch = false;
    } else {
      dice   = actor._rollWave(pool, effectiveTN, true);
      ones   = dice.filter(d => d.isOne).length;
      glitch = ones > Math.floor(pool / 2);
    }

    await actor._postWaveCard({
      actorId:           payload.actorId,
      label,
      tn:                effectiveTN,
      pool,
      wave:              0,
      dice,
      ones,
      glitch,
      physicalDice,
      physicalSuccesses: physicalDice ? dice.filter(d => d.success).length : undefined,
      isWeaponRoll:      false,
      isSoakRoll:        true,
      soakPayload:       payload,
    });
  }

  // ---------------------------------------------------------------------------
  // ASSENSING
  // ---------------------------------------------------------------------------

  static async _postAssensingResult(successes, tn, actorName, { actorId = null, auraBonus = null, auraSuccesses = null } = {}) {
    const _li = text => `<li class="sr-assen-item">${text}</li>`;

    const TIER_1_2 = `
      <ul class="sr-assen-list">
        ${_li('The general state of the subject\'s health (healthy, injured, ill, etc.) along with the presence or absence of cyberware implants.')}
        ${_li('The subject\'s general emotional state or impression.')}
        ${_li('The class of a magical subject (fire elemental, manipulation spell, power focus, and so on).')}
        ${_li('Whether the subject is mundane or Awakened.')}
        ${_li('If you have seen the subject\'s aura before, you will recognise it regardless of physical disguises or alterations.')}
      </ul>`;

    const TIER_3_4_EXTRA = `
      <ul class="sr-assen-list sr-assen-extra">
        ${_li('Whether the subject\'s Essence and Magic Attribute are higher, lower, or equal to your own.')}
        ${_li('The general location of any implants.')}
        ${_li('A general diagnosis for any maladies (diseases or toxins) the subject suffers from.')}
        ${_li('The subject\'s <em>exact</em> emotional state or impression.')}
        ${_li('Whether the subject\'s Force is higher, lower, or equal to your Magic Attribute.')}
        ${_li('Any astral signatures present on the subject.')}
      </ul>`;

    const TIER_5_EXTRA = `
      <ul class="sr-assen-list sr-assen-extra">
        ${_li('The <strong>exact</strong> Essence, Magic Attribute, and Force of the subject.')}
        ${_li('The exact location of any implants.')}
        ${_li('An accurate diagnosis of any disease or toxin the subject suffers from.')}
        ${_li('The general cause of any emotional impression (a murder, a riot, a religious ceremony, and so on).')}
        ${_li('The general cause of any astral signature (combat spell, hearth spirit, and so on).')}
      </ul>`;

    let tierLabel, tierClass, bodyHtml;

    if (successes === 0) {
      tierLabel = 'No Information';
      tierClass = 'sr-assen-tier-fail';
      bodyHtml  = `
        <p class="sr-assen-fail-text">You learn nothing from this assensing attempt.</p>
        <p class="sr-assen-retry">💡 You may try again with a TN+2 penalty (retry at TN ${tn + 2}).</p>`;
    } else if (successes <= 2) {
      tierLabel = `${successes} Success${successes > 1 ? 'es' : ''} — Basic Reading`;
      tierClass = 'sr-assen-tier-low';
      bodyHtml  = TIER_1_2;
    } else if (successes <= 4) {
      tierLabel = `${successes} Successes — Detailed Reading`;
      tierClass = 'sr-assen-tier-mid';
      bodyHtml  = TIER_1_2 + `<div class="sr-assen-also">Additionally:</div>` + TIER_3_4_EXTRA;
    } else {
      tierLabel = `${successes} Successes — Full Aura Read`;
      tierClass = 'sr-assen-tier-high';
      bodyHtml  = TIER_1_2 + `<div class="sr-assen-also">Additionally:</div>` + TIER_3_4_EXTRA
                + `<div class="sr-assen-also">Furthermore:</div>` + TIER_5_EXTRA;
    }

    // Aura Reading bonus line (shown when a complementary roll was applied)
    const bonusHtml = auraBonus !== null
      ? `<div class="sr-assen-bonus">✦ Aura Reading: ${auraSuccesses} hit${auraSuccesses !== 1 ? 's' : ''} → +${auraBonus} bonus success${auraBonus !== 1 ? 'es' : ''}</div>`
      : '';

    // Complementary roll offer — only when 1–4 successes and not already a bonus result
    const canOfferAura = actorId && successes >= 1 && successes <= 4 && auraBonus === null;
    const auraPayload  = canOfferAura
      ? JSON.stringify({ actorId, originalSuccesses: successes }).replace(/'/g, '&#39;')
      : null;
    const auraBtn = canOfferAura
      ? `<div class="sr-soak-action">
           <button class="sr-aura-reading-btn" data-payload='${auraPayload}'>
             ✦ Roll Aura Reading (Complementary)
           </button>
         </div>`
      : '';

    await ChatMessage.create({
      speaker: { alias: actorName },
      content: `
        <div class="sr-roll-card sr-assen-card">
          <div class="sr-roll-header">👁 ASSENSING — ${actorName}</div>
          ${bonusHtml}
          <div class="sr-assen-tier ${tierClass}">${tierLabel}</div>
          <div class="sr-assen-body">${bodyHtml}</div>
          ${auraBtn}
        </div>
      `,
    });
  }

  static async handleAuraReadingClick(btn, physicalDice = false) {
    const p     = JSON.parse(btn.dataset.payload);
    const actor = game.actors.get(p.actorId);
    if (!actor) return;

    const skill = actor.items.find(i =>
      i.type === 'skill' && i.name.toLowerCase() === 'aura reading'
    );
    if (!skill) {
      ui.notifications.warn(`${actor.name} does not have the Aura Reading skill.`);
      btn.disabled    = false;
      btn.textContent = '✦ Roll Aura Reading (Complementary)';
      return;
    }

    const rating   = skill.system.skillRating ?? 1;
    const woundMod = actor.system.woundMod ?? 0;
    const basePool = Math.max(1, rating + woundMod);

    let opts = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Aura Reading — Complementary Roll' },
      content: `
        <div style="padding:8px 0">
          <div style="margin-bottom:10px">
            <label>Dice Pool (Aura Reading ${rating}):
              <input type="number" id="ar-pool" value="${basePool}" min="1" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="margin-bottom:10px">
            <label>Target Number:
              <input type="number" id="ar-tn" value="4" min="2" max="30" style="width:60px;margin-left:8px"/>
            </label>
          </div>
          <div style="color:var(--sr-muted);font-size:11px;margin-top:4px">Every 2 successes add 1 to the Assensing result</div>
        </div>
      `,
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const html = dialog.element;
            opts = {
              pool: Math.max(1, parseInt(html.querySelector('#ar-pool')?.value) || 1),
              tn:   Math.max(2, parseInt(html.querySelector('#ar-tn')?.value)   || 4),
            };
          }
        },
        { label: 'Cancel', action: 'cancel' }
      ],
    });
    if (!opts) return;

    await actor.rollPool(opts.pool, opts.tn, `Aura Reading (Complementary)`, {
      isAuraReadingRoll:  true,
      auraReadingContext: {
        originalSuccesses: p.originalSuccesses,
        actorId:           actor.id,
        actorName:         actor.name,
      },
      physicalDice,
    });
  }

  // ---------------------------------------------------------------------------
  // UNIVERSAL CONTESTED ROLL
  // ---------------------------------------------------------------------------

  static async openContestedDialog(defaultActor, shiftKey = false) {
    const buildSources = (a) => {
      const attr    = a.system.attributes ?? {};
      const sources = [];
      const defs = a.type === 'vehicle'
        ? [['handling','Handling'],['speed','Speed'],['accel','Accel'],['body','Body'],['armor','Armor'],['sig','Sig'],['autonav','Autonav'],['pilot','Pilot'],['sensor','Sensor'],['cargo','Cargo'],['load','Load']]
        : [['body','Body'],['quickness','Quickness'],['strength','Strength'],['charisma','Charisma'],
           ['intelligence','Intelligence'],['willpower','Willpower'],['reaction','Reaction'],['essence','Essence']];
      for (const [key, label] of defs) {
        const val = attr[key]?.base ?? attr[key]?.value ?? 0;
        // Always include vehicle stats (even if 0); filter characters to non-zero only
        if (a.type === 'vehicle' || val > 0) sources.push({ group: 'attr', label: `${label} (${val})`, value: val });
      }
      if (a.type !== 'vehicle') {
        const mag = attr.magic?.base ?? 0;
        if (mag > 0) sources.push({ group: 'attr', label: `Magic (${mag})`, value: mag });
      }
      for (const sk of a.items.filter(i => i.type === 'skill').sort((x,y) => x.name.localeCompare(y.name))) {
        const rating = sk.system.skillRating ?? sk.system.rating ?? 0;
        sources.push({ group: 'skill', label: `${sk.name} (${rating})`, value: rating });
      }
      return sources;
    };

    const buildOptions = (sources) => {
      const attrs  = sources.filter(s => s.group === 'attr');
      const skills = sources.filter(s => s.group === 'skill');
      const ao = attrs.map(s  => `<option value="${s.value}">${s.label}</option>`).join('');
      const so = skills.map(s => `<option value="${s.value}">${s.label}</option>`).join('');
      return `${ao.length ? `<optgroup label="Attributes">${ao}</optgroup>` : ''}
              ${so.length ? `<optgroup label="Skills">${so}</optgroup>` : ''}`;
    };

    const allActors    = game.actors.contents;
    const allActorData = {};
    for (const a of allActors) {
      const srcs = buildSources(a);
      allActorData[a.id] = { name: a.name, sources: srcs, firstVal: srcs[0]?.value ?? 4 };
    }

    const defaultAtkId   = defaultActor.id;
    const defaultAtkData = allActorData[defaultAtkId];
    const otherActors    = allActors.filter(a => a.id !== defaultAtkId);
    const defaultOppId   = otherActors[0]?.id ?? 'other';
    const defaultOppData = defaultOppId !== 'other' ? allActorData[defaultOppId] : null;

    const atkActorOptions = allActors.map(a =>
      `<option value="${a.id}"${a.id === defaultAtkId ? ' selected' : ''}>${a.name}</option>`
    ).join('');
    const oppActorOptions = [
      '<option value="other">Other (manual)</option>',
      ...allActors.map(a => `<option value="${a.id}"${a.id === defaultOppId ? ' selected' : ''}>${a.name}</option>`),
    ].join('');

    let result = null;

    const ContestedDialog = class extends foundry.applications.api.DialogV2 {
      async _onRender(context, options) {
        await super._onRender(context, options);
        const el = this.element;

        el.querySelector('#atk-actor')?.addEventListener('change', (e) => {
          const data = allActorData[e.target.value];
          if (!data) return;
          el.querySelector('#atk-source').innerHTML = buildOptions(data.sources);
          el.querySelector('#atk-pool').value = data.firstVal ?? 4;
        });
        el.querySelector('#atk-source')?.addEventListener('change', (e) => {
          el.querySelector('#atk-pool').value = parseInt(e.target.value) || 1;
        });
        el.querySelector('#opp-actor')?.addEventListener('change', (e) => {
          const id  = e.target.value;
          const src = el.querySelector('#opp-source');
          const poo = el.querySelector('#opp-pool');
          if (id === 'other') {
            src.innerHTML = '<option value="4">Manual</option>';
            if (poo) poo.value = 4;
          } else {
            const data = allActorData[id];
            if (data) { src.innerHTML = buildOptions(data.sources); if (poo) poo.value = data.firstVal ?? 4; }
          }
        });
        el.querySelector('#opp-source')?.addEventListener('change', (e) => {
          el.querySelector('#opp-pool').value = parseInt(e.target.value) || 1;
        });
      }
    };

    const _side = (actorOptsHtml, defaultData, srcId, actorId, poolId, tnId, dmgId) => `
      <label style="display:block;margin-bottom:6px;font-size:12px;font-weight:bold">Actor:
        <select id="${actorId}" style="width:100%;margin-top:2px;font-weight:normal">${actorOptsHtml}</select>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">Pool source:
        <select id="${srcId}" style="width:100%;margin-top:2px">${defaultData ? buildOptions(defaultData.sources) : '<option value="4">Manual</option>'}</select>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">Pool:
        <input type="number" id="${poolId}" value="${defaultData?.firstVal ?? 4}" min="1" max="30" style="width:55px;margin-left:4px"/>
      </label>
      <label style="display:block;margin-bottom:6px;font-size:12px">TN:
        <input type="number" id="${tnId}" value="4" min="2" max="30" style="width:55px;margin-left:4px"/>
      </label>
      <label style="display:block;margin-bottom:0;font-size:12px">Damage:
        <input type="text" id="${dmgId}" value="4L" style="width:55px;margin-left:4px"/>
      </label>`;

    await new Promise(resolve => {
      new ContestedDialog({
        window: { title: 'Contested Roll Setup' },
        content: `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:8px 0">
            <div>${_side(atkActorOptions, defaultAtkData, 'atk-source', 'atk-actor', 'atk-pool', 'atk-tn', 'atk-damage')}</div>
            <div>${_side(oppActorOptions, defaultOppData, 'opp-source', 'opp-actor', 'opp-pool', 'opp-tn', 'opp-damage')}</div>
          </div>`,
        buttons: [
          {
            label: shiftKey ? '✏ Enter Successes' : 'Continue',
            action: 'confirm',
            default: true,
            callback: (_e, _b, dialog) => {
              const el       = dialog.element;
              const atkSrc   = el.querySelector('#atk-source');
              const oppSrc   = el.querySelector('#opp-source');
              const atkActId = el.querySelector('#atk-actor')?.value  ?? defaultAtkId;
              const oppActId = el.querySelector('#opp-actor')?.value  ?? 'other';
              result = {
                atkActorId:     atkActId,
                atkActorName:   game.actors.get(atkActId)?.name ?? 'Actor',
                atkSourceLabel: atkSrc?.options[atkSrc.selectedIndex]?.text ?? '',
                atkPool:   Math.max(1, parseInt(el.querySelector('#atk-pool')?.value)   || 4),
                atkTN:     Math.max(2, parseInt(el.querySelector('#atk-tn')?.value)     || 4),
                atkDamage: el.querySelector('#atk-damage')?.value.trim() || '4L',
                oppActorId:     oppActId === 'other' ? null : oppActId,
                oppActorName:   oppActId === 'other' ? 'Other' : (game.actors.get(oppActId)?.name ?? 'Other'),
                oppSourceLabel: oppSrc?.options[oppSrc.selectedIndex]?.text ?? '',
                oppPool:   Math.max(1, parseInt(el.querySelector('#opp-pool')?.value)   || 4),
                oppTN:     Math.max(2, parseInt(el.querySelector('#opp-tn')?.value)     || 4),
                oppDamage: el.querySelector('#opp-damage')?.value.trim() || '4L',
                physicalDice: shiftKey,
              };
              resolve();
            },
          },
          { label: 'Cancel', action: 'cancel', callback: () => resolve() },
        ],
      }).render(true);
    });

    if (!result) return;
    await SR3EActor.postContestedCard(result);
  }

  static async postContestedCard(ctx) {
    const payload = JSON.stringify(ctx).replace(/'/g, '&#39;');

    const INP = 'background:#1c2030;border:1px solid #3a9fd6;color:#dde1f0;border-radius:3px;padding:2px 5px;width:100%;box-sizing:border-box;';
    const _corner = (name, sourceLabel, pool, tn, damage, poolClass, tnClass, dmgClass, color) => `
      <div class="sr-melee-corner">
        <div class="sr-melee-name" style="color:${color}">${name}</div>
        ${sourceLabel ? `<div style="font-size:11px;color:#7880a0;margin-top:2px">${sourceLabel}</div>` : ''}
        <div class="sr-contested-fields" style="display:grid;grid-template-columns:52px 1fr;gap:4px 8px;align-items:center;margin-top:8px;font-size:11px;color:#7880a0;">
          <span>Pool</span>   <input type="number" class="${poolClass}" value="${pool}" min="1" max="30" style="${INP}"/>
          <span>TN</span>     <input type="number" class="${tnClass}"   value="${tn}"   min="2" max="30" style="${INP}"/>
          <span>Damage</span> <input type="text"   class="${dmgClass}"  value="${damage}"                style="${INP}"/>
        </div>
      </div>`;

    await ChatMessage.create({
      speaker: { alias: 'Contested Roll' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ CONTESTED — ${ctx.atkActorName} vs ${ctx.oppActorName}</div>
          <div class="sr-melee-boxing">
            ${_corner(ctx.atkActorName, ctx.atkSourceLabel, ctx.atkPool, ctx.atkTN, ctx.atkDamage,
                      'sr-contested-atk-pool', 'sr-contested-atk-tn', 'sr-contested-atk-damage',
                      'var(--sr-accent)')}
            <div class="sr-melee-vs">VS</div>
            ${_corner(ctx.oppActorName, ctx.oppSourceLabel, ctx.oppPool, ctx.oppTN, ctx.oppDamage,
                      'sr-contested-opp-pool', 'sr-contested-opp-tn', 'sr-contested-opp-damage',
                      'var(--sr-red)')}
          </div>
          <div class="sr-soak-action">
            <button class="sr-contested-roll-btn" data-payload='${payload}'
                    title="Shift-click to enter successes manually">
              ${ctx.physicalDice ? '✏ Enter Successes' : '⚔ Roll!'}
            </button>
          </div>
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }

  // ---------------------------------------------------------------------------
  // STANDALONE RESIST DAMAGE
  // ---------------------------------------------------------------------------

  async resistDamagePrompt(shiftKey = false) {
    this.prepareDerivedData();
    const sys  = this.system;
    const attr = sys.attributes ?? {};

    const body  = attr.body?.value         ?? attr.body?.base         ?? 1;
    const qui   = attr.quickness?.value    ?? attr.quickness?.base    ?? 1;
    const str   = attr.strength?.value     ?? attr.strength?.base     ?? 1;
    const cha   = attr.charisma?.value     ?? attr.charisma?.base     ?? 1;
    const int_  = attr.intelligence?.value ?? attr.intelligence?.base ?? 1;
    const wil   = attr.willpower?.value    ?? attr.willpower?.base    ?? 1;
    const react = attr.reaction?.value     ?? 0;
    const mag   = attr.magic?.value        ?? attr.magic?.base        ?? 0;

    let ball = 0, imp = 0;
    if (this.type === 'vehicle') {
      ball = imp = attr.armor?.base ?? 0;
    } else {
      const armorItem = sys.equippedArmor ? this.items.get(sys.equippedArmor) : null;
      ball = armorItem?.system?.ballistic ?? 0;
      imp  = armorItem?.system?.impact    ?? 0;
    }

    const statOpts = [
      { label: `Body (${body})`,                                                    dice: body,          ad: 0        },
      { label: `Body + Ballistic Armour (${body} + ${ball} = ${body+ball})`,        dice: body + ball,   ad: ball     },
      { label: `Body + Impact Armour (${body} + ${imp} = ${body+imp})`,             dice: body + imp,    ad: imp      },
      { label: `Body + Ballistic + Impact (${body} + ${ball+imp} = ${body+ball+imp})`, dice: body+ball+imp, ad: ball+imp },
      { label: `Willpower (${wil})`,                                                dice: wil,           ad: 0        },
      { label: `Body + Willpower (${body + wil})`,                                  dice: body + wil,    ad: 0        },
      { label: `Intelligence (${int_})`,                                            dice: int_,          ad: 0        },
      { label: `Quickness (${qui})`,                                                dice: qui,           ad: 0        },
      { label: `Strength (${str})`,                                                 dice: str,           ad: 0        },
      { label: `Charisma (${cha})`,                                                 dice: cha,           ad: 0        },
      { label: `Reaction (${react})`,                                               dice: react,         ad: 0        },
    ];
    if (mag > 0) statOpts.push({ label: `Magic (${mag})`, dice: mag, ad: 0 });

    const optHtml = statOpts.map((o, i) =>
      `<option value="${i}" data-dice="${o.dice}" data-ad="${o.ad}">${o.label}</option>`
    ).join('');

    let config = null;

    const ResistDialog = class extends foundry.applications.api.DialogV2 {
      async _onRender(context, options) {
        await super._onRender(context, options);
        const el       = this.element;
        const statSel  = el.querySelector('#rd-stat');
        const dmgInput = el.querySelector('#rd-dmg');
        const diceInp  = el.querySelector('#rd-dice');
        const tnInp    = el.querySelector('#rd-tn');

        const recalc = () => {
          const sel  = statSel.selectedOptions[0];
          const ad   = parseInt(sel?.dataset.ad   ?? 0);
          const dice = parseInt(sel?.dataset.dice ?? 1);
          const pwr  = parseInt(dmgInput.value) || 0;
          diceInp.value = dice;
          if (pwr > 0) tnInp.value = Math.max(2, pwr - ad);
        };

        statSel.addEventListener('change', recalc);
        dmgInput.addEventListener('input', recalc);
      }
    };

    await new Promise(resolve => {
      new ResistDialog({
        window: { title: `${this.name} — Resist Damage` },
        content: `
          <div style="padding:8px 0">
            <div style="margin-bottom:10px">
              <label style="font-size:12px">Damage code (e.g. <em>9M</em>, <em>12S Stun</em>):
                <input type="text" id="rd-dmg" value="" placeholder="9M" style="width:80px;margin-left:8px"/>
              </label>
            </div>
            <div style="margin-bottom:10px">
              <label style="display:block;font-size:12px">Resist pool:
                <select id="rd-stat" style="width:100%;margin-top:4px">${optHtml}</select>
              </label>
            </div>
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:4px">
              <label style="font-size:12px">Dice:
                <input type="number" id="rd-dice" value="${statOpts[0].dice}" min="1" max="50"
                       style="width:55px;margin-left:4px"/>
              </label>
              <label style="font-size:12px">TN:
                <input type="number" id="rd-tn" value="4" min="2" max="30"
                       style="width:55px;margin-left:4px"/>
              </label>
              <label style="font-size:12px">
                <input type="checkbox" id="rd-stun"/> Stun track
              </label>
            </div>
          </div>
        `,
        buttons: [
          {
            label: shiftKey ? '✏ Enter Successes' : '🎲 Roll',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              const el2    = dialog.element;
              const code   = (el2.querySelector('#rd-dmg')?.value.trim() || '4M').toUpperCase();
              const parsed = game.sr3e.SR3EItem.parseDamageCode(code, this);
              config = {
                dice:   Math.max(1, parseInt(el2.querySelector('#rd-dice')?.value) || 1),
                tn:     Math.max(2, parseInt(el2.querySelector('#rd-tn')?.value)   || 4),
                isStun: el2.querySelector('#rd-stun')?.checked || (parsed?.isStun ?? false),
                power:  parsed?.power ?? (parseInt(code) || 4),
                level:  parsed?.level ?? 'M',
                code,
              };
              resolve();
            },
          },
          { label: 'Cancel', action: 'cancel', callback: () => resolve() },
        ],
      }).render(true);
    });

    if (!config) return;

    const trackLabel = config.isStun ? 'Stun' : 'Physical';
    await this.rollPool(config.dice, config.tn, `🛡 ${this.name} resists ${config.code} ${trackLabel}`, {
      isSoakRoll:  true,
      soakPayload: {
        actorId:     this.id,
        stagedPower: config.power,
        stagedLevel: config.level,
        isStun:      config.isStun,
        rawDamage:   config.code,
      },
      physicalDice: shiftKey,
    });
  }

  static async handleContestedRoll(btn, physicalDice = false) {
    const ctx         = JSON.parse(btn.dataset.payload);
    const usePhysical = physicalDice || (ctx.physicalDice ?? false);
    const card        = btn.closest('.sr-melee-card');

    btn.disabled    = true;
    btn.textContent = '⏳ Rolling…';

    const atkPool   = Math.max(1, parseInt(card.querySelector('.sr-contested-atk-pool')?.value)   || ctx.atkPool);
    const oppPool   = Math.max(1, parseInt(card.querySelector('.sr-contested-opp-pool')?.value)   || ctx.oppPool);
    const atkTN     = Math.max(2, parseInt(card.querySelector('.sr-contested-atk-tn')?.value)     || ctx.atkTN);
    const oppTN     = Math.max(2, parseInt(card.querySelector('.sr-contested-opp-tn')?.value)     || ctx.oppTN);
    const atkDamage = card.querySelector('.sr-contested-atk-damage')?.value.trim() || ctx.atkDamage;
    const oppDamage = card.querySelector('.sr-contested-opp-damage')?.value.trim() || ctx.oppDamage;

    const atkActor = game.actors.get(ctx.atkActorId);
    const oppActor = ctx.oppActorId ? game.actors.get(ctx.oppActorId) : null;
    if (!atkActor) return;

    let atkDice, oppDice;
    if (usePhysical) {
      const atkSuccesses = await SR3EActor._promptPhysicalSuccesses(atkPool, atkTN, `⚔ ${ctx.atkActorName}`);
      if (atkSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll'; return; }
      const oppSuccesses = await SR3EActor._promptPhysicalSuccesses(oppPool, oppTN, `⚔ ${ctx.oppActorName}`);
      if (oppSuccesses === null) { btn.disabled = false; btn.textContent = 'Roll'; return; }
      atkDice = SR3EActor._buildPhysicalDice(atkPool, atkSuccesses);
      oppDice = SR3EActor._buildPhysicalDice(oppPool, oppSuccesses);
    } else {
      atkDice = atkActor._rollWave(atkPool, atkTN, true);
      oppDice = atkActor._rollWave(oppPool, oppTN, true);
    }

    const updatedCtx = { ...ctx, atkPool, oppPool, atkTN, oppTN, atkDamage, oppDamage };

    const atkOnes   = atkDice.filter(d => d.isOne).length;
    const oppOnes   = oppDice.filter(d => d.isOne).length;
    const atkGlitch = atkOnes > Math.floor(atkPool / 2);
    const oppGlitch = oppOnes > Math.floor(oppPool / 2);

    await atkActor._postWaveCard({
      actorId: ctx.atkActorId, label: `⚔ ${ctx.atkActorName}`,
      tn: atkTN, pool: atkPool, wave: 0,
      dice: atkDice, ones: atkOnes, glitch: atkGlitch,
      physicalDice: usePhysical, physicalSuccesses: usePhysical ? atkDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeAtk: true, meleeCtx: updatedCtx,
    });

    const oppCardActorId = oppActor ? ctx.oppActorId : ctx.atkActorId;
    await atkActor._postWaveCard({
      actorId: oppCardActorId, label: `⚔ ${ctx.oppActorName}`,
      tn: oppTN, pool: oppPool, wave: 0,
      dice: oppDice, ones: oppOnes, glitch: oppGlitch,
      physicalDice: usePhysical, physicalSuccesses: usePhysical ? oppDice.filter(d => d.success).length : undefined,
      isWeaponRoll: false, isMeleeDef: true, meleeCtx: updatedCtx,
    });

    await SR3EActor._postContestedResult(updatedCtx, atkDice, oppDice);
  }

  static async _postContestedResult(ctx, atkDice, oppDice) {
    const atkSuccesses = atkDice.filter(d => d.success).length;
    const oppSuccesses = oppDice.filter(d => d.success).length;
    const net          = Math.abs(atkSuccesses - oppSuccesses);

    let resultHtml;

    if (atkSuccesses === oppSuccesses) {
      resultHtml = `
        <div class="sr-melee-result sr-melee-tie">
          🤝 Tie! ${atkSuccesses} vs ${oppSuccesses} — no effect.
        </div>`;
    } else {
      const winnerIsAtk  = atkSuccesses > oppSuccesses;
      const winnerName   = winnerIsAtk ? ctx.atkActorName : ctx.oppActorName;
      const loserName    = winnerIsAtk ? ctx.oppActorName : ctx.atkActorName;
      const winnerId     = winnerIsAtk ? ctx.atkActorId   : ctx.oppActorId;
      const loserId      = winnerIsAtk ? ctx.oppActorId   : ctx.atkActorId;
      const winnerDamage = winnerIsAtk ? ctx.atkDamage    : ctx.oppDamage;

      const winnerActor  = winnerId ? game.actors.get(winnerId) : null;
      const winnerDmgBase = SR3EItem.parseDamageCode(winnerDamage ?? '4L', winnerActor);

      let stagingHtml = '';
      let soakBtn     = '';

      if (winnerDmgBase) {
        const staged     = SR3EItem.stageDamage(winnerDmgBase, net);
        const trackLabel = staged.isStun ? 'Stun' : 'Physical';

        if (net === 0) {
          stagingHtml = `<div class="sr-staging-result">${winnerDamage} — tie in net, no stage up → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;
        } else {
          stagingHtml = `<div class="sr-staging-result">📊 ${winnerDamage} + ${net} net hit${net !== 1 ? 's' : ''} → <strong>${staged.power}${staged.level} ${trackLabel}</strong></div>`;
        }

        if (loserId) {
          const soakPayload = JSON.stringify({
            attackerActorId: winnerId,
            targetActorId:   loserId,
            isMelee:         false,
            stagedPower:     staged.power,
            stagedLevel:     staged.level,
            isStun:          staged.isStun,
            rawDamage:       winnerDamage,
          }).replace(/'/g, '&#39;');
          soakBtn = `
            <div class="sr-soak-action">
              <button class="sr-soak-btn" data-payload='${soakPayload}'>
                🛡 ${loserName}: Resist Damage
              </button>
            </div>`;
        }
      }

      resultHtml = `
        <div class="sr-melee-result sr-melee-win">
          ⚔ ${winnerName} wins! ${atkSuccesses} vs ${oppSuccesses} (net ${net})
        </div>
        ${stagingHtml}
        ${soakBtn}`;
    }

    await ChatMessage.create({
      speaker: { alias: 'Contested Result' },
      content: `
        <div class="sr-roll-card sr-melee-card">
          <div class="sr-roll-header">⚔ ${ctx.atkActorName} vs ${ctx.oppActorName} — Result</div>
          ${resultHtml}
        </div>`,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
    });
  }
}
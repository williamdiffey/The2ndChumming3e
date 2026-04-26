/**
 * SR3ECombat - Custom Combat with SR2/SR3 initiative modes
 */
export class SR3ECombat extends Combat {

  /**
   * Roll initiative for all combatants
   * @override
   */
  async rollInitiative(ids, options = {}) {
    const combatants = ids?.length ? ids.map(id => this.combatants.get(id)) : this.combatants.contents;

    // Clear Spell Defense from the previous round — Sorcery dice return, Spell Pool stays spent
    for (const c of combatants) {
      if (c.actor) await c.actor.clearSpellDefense();
    }

    for (const c of combatants) {
      if (!c.actor) continue;

      // Roll initiative using actor's method
      const score = await c.actor.rollInitiative();

      // Store base initiative and calculate passes
      await c.update({
        initiative: score,
        flags: {
          The2ndChumming3e: {
            baseInitiative: score,
            currentInitiative: score,
            passesRemaining: Math.floor(score / 10) + 1
          }
        }
      });
    }

    // VCR: mark any jumped-in rigger combatants as defeated so they don't act separately.
    for (const c of combatants) {
      if (c.actor?.type !== 'vehicle') continue;
      if (!(c.actor.system.vcrMode ?? false)) continue;
      const pilotName = c.actor.system.controlledBy?.trim();
      if (!pilotName) continue;
      const riggerCombatant = this.combatants.find(rc => rc.actor?.name === pilotName);
      if (riggerCombatant) {
        await riggerCombatant.update({
          flags: { The2ndChumming3e: { jumpedInto: c.actor.name, vcrTnMod: 8 } },
        });
      }
    }

    // Invalidate any stored SR2 queue — it will be rebuilt on next startCombat
    // or lazily on the first nextTurn call with the fresh scores.
    await this.update({ flags: { The2ndChumming3e: { sr2Queue: null, sr2QueueIndex: 0 } } });

    // Prompt Spell Defense declaration for Sorcery-capable actors
    await game.sr3e.SR3EActor.promptSpellDefenseDeclaration(combatants);

    return this;
  }

  /**
   * Start the combat encounter
   * @override
   */
  async startCombat() {
    await super.startCombat();
    
    const mode = game.settings.get('The2ndChumming3e', 'initiativeMode');
    if (mode === 'sr3') {
      await this._setupSR3Passes();
    } else {
      const queue = this._buildSR2Queue();
      await this.update({ flags: { The2ndChumming3e: { sr2Queue: queue, sr2QueueIndex: 0 } } });
    }
    
    return this;
  }

  /**
   * Set up SR3 pass structure
   * @private
   */
  async _setupSR3Passes() {
    const updates = this.combatants.map(c => {
      const baseInit = c.initiative || 0;
      const passes = Math.floor(baseInit / 10) + 1;
      return {
        _id: c.id,
        flags: {
          The2ndChumming3e: {
            baseInitiative: baseInit,
            currentInitiative: baseInit,
            passesRemaining: passes,
            passNumber: 1
          }
        }
      };
    });
    
    await this.updateEmbeddedDocuments('Combatant', updates);
  }

  /**
   * Advance to next turn/combatant
   * @override
   */
  async nextTurn() {
    const mode = game.settings.get('The2ndChumming3e', 'initiativeMode');
    
    if (mode === 'sr3') {
      return this._nextTurnSR3();
    } else {
      return this._nextTurnSR2();
    }
  }

  /**
   * SR3 Mode: Pass-based initiative.
   *
   * Each combat pass is a queue of everyone whose currentInitiative > 0,
   * sorted highest-first. The current combatant acts, then we move to the
   * next person in the same pass. When the last person in a pass has acted
   * we subtract 10 from everyone's currentInitiative and start a new pass
   * with whoever is still above 0. When nobody is left we start a new round.
   *
   * Example: init 21 → acts at 21, 11, 1. Init 4 → acts at 4 only (in the
   * first pass, before the init-21 person takes their second turn).
   * @private
   */
  async _nextTurnSR3() {
    console.log('=== _nextTurnSR3 called ===');

     // Check if EVERYONE is exhausted (all initiatives ≤ 0)
  const allExhausted = this.combatants.contents.every(c => 
    (c.flags?.The2ndChumming3e?.currentInitiative ?? 0) <= 0
  );
  
  if (allExhausted) {
    console.log('All combatants exhausted — ending combat');
    ui.notifications.info('Combat ended — all turns complete!');
    return this.endCombat();
  }

    // Build the current pass queue: everyone with currentInitiative > 0,
    // sorted highest first. This is the authoritative order for this pass.
    const passQueue = this.combatants.contents
      .filter(c => (c.flags?.The2ndChumming3e?.currentInitiative ?? 0) > 0)
      .sort((a, b) => (b.flags?.The2ndChumming3e?.currentInitiative || 0) - (a.flags?.The2ndChumming3e?.currentInitiative || 0));

    console.log('Pass queue:', passQueue.map(c => `${c.name} (${c.flags?.The2ndChumming3e?.currentInitiative})`));

    if (passQueue.length === 0) {
      console.log('Empty pass queue — new round');
      return this._newRoundSR3();
    }

    // Where are we in the current pass?
    const current = this.combatant;
    const posInPass = current ? passQueue.findIndex(c => c.id === current.id) : -1;

    console.log('Current:', current?.name, 'posInPass:', posInPass);

    // Is there someone still to act in this pass after the current combatant?
    // Guard against posInPass === -1: if the current combatant has already
    // dropped out of the queue (init hit 0) we must NOT treat passQueue[0]
    // as the next person — that would re-start the pass instead of ending it.
    const nextInPass = posInPass >= 0 ? (passQueue[posInPass + 1] ?? null) : null;

    if (nextInPass) {
      // Simply advance to the next person in the same pass.
      console.log('Next in pass:', nextInPass.name);
      const nextTurnIndex = this.turns.findIndex(c => c.id === nextInPass.id);
      await this.update({ turn: Math.max(0, nextTurnIndex) });
      if (ui.combat) ui.combat.render();
      return this;
    }

    // -------------------------------------------------------------------
    // End of pass: everyone in the queue has acted.
    // Subtract 10 from currentInitiative for all combatants and start the
    // next pass. Anyone dropping to ≤ 0 is simply excluded from the next
    // pass queue naturally (their currentInitiative will be ≤ 0).
    // -------------------------------------------------------------------
    console.log('End of pass — advancing all initiatives by -10');

    const passUpdates = this.combatants.map(c => {
      const flags = c.flags?.The2ndChumming3e || {};
      const newInit = (flags.currentInitiative || 0) - 10;
      return {
        _id: c.id,
        flags: {
          The2ndChumming3e: {
            ...flags,
            currentInitiative: newInit,       // allow negatives so we can detect exhaustion
            passesRemaining: Math.max(0, (flags.passesRemaining || 0) - 1),
            passNumber: (flags.passNumber || 1) + 1
          }
        }
      };
    });

    await this.updateEmbeddedDocuments('Combatant', passUpdates);

    // Reload to get fresh data after bulk update
    const updatedCombat = game.combats.get(this.id);

    // Build the next pass queue
    const nextPassQueue = updatedCombat.combatants.contents
      .filter(c => (c.flags?.The2ndChumming3e?.currentInitiative ?? 0) > 0)
      .sort((a, b) => (b.flags?.The2ndChumming3e?.currentInitiative || 0) - (a.flags?.The2ndChumming3e?.currentInitiative || 0));

    console.log('Next pass queue:', nextPassQueue.map(c => `${c.name} (${c.flags?.The2ndChumming3e?.currentInitiative})`));

    if (nextPassQueue.length === 0) {
      console.log('No one left after pass — new round');
      return updatedCombat._newRoundSR3();
    }

    // Point the tracker at the first person in the new pass
    const firstInNextPass = nextPassQueue[0];
    const firstTurnIndex = updatedCombat.turns.findIndex(c => c.id === firstInNextPass.id);
    await updatedCombat.update({ turn: Math.max(0, firstTurnIndex) });

    if (ui.combat) ui.combat.render();
    return this;
  }

  /**
   * End of a pass - reduce passes and current initiative
   * @private
   */
  async _endPassSR3() {
    const updates = this.combatants.map(c => {
      const flags = c.flags?.The2ndChumming3e || {};
      const passesRemaining = (flags.passesRemaining || 0) - 1;
      const currentInitiative = (flags.currentInitiative || 0) - 10;
      const passNumber = (flags.passNumber || 1) + 1;
      
      return {
        _id: c.id,
        flags: {
          The2ndChumming3e: {
            baseInitiative: flags.baseInitiative,
            currentInitiative: Math.max(0, currentInitiative),
            passesRemaining: Math.max(0, passesRemaining),
            passNumber
          }
        }
      };
    });
    
    await this.updateEmbeddedDocuments('Combatant', updates);
  }

  /**
   * New round - reset all passes (SR3 mode)
   * @private
   */
 /**
 * New round - SR3 mode
 * In SR3, after all passes are complete, the combat round ends.
 * To continue fighting, end this combat and start a new one (re-roll initiative).
 * @private
 */
async _newRoundSR3() {
  console.log('Combat round complete — ending combat');
  ui.notifications.info('Combat round complete. Re-roll initiative to continue fighting.');
  return this.endCombat();
}
  /**
   * Build and store the SR2 flat queue on the combat flags.
   *
   * Each combatant contributes one slot per initiative pass they qualify for:
   * score, score-10, score-20 … down to the last value > 0. All slots from
   * all combatants are merged and sorted descending. Ties at the same score
   * keep the combatant with the higher base initiative first; identical base
   * initiatives fall back to Foundry turn order.
   *
   * Stored as flags.The2ndChumming3e.sr2Queue — an array of { id, score } objects.
   * Also resets the queue pointer (sr2QueueIndex) to 0.
   *
   * Example: street sam (33), viz (11), rex (2) →
   *   [sam@33, sam@23, sam@13, viz@11, sam@3, rex@2, viz@1]
   * @private
   */
  _buildSR2Queue() {
    const slots = [];

    for (const c of this.combatants.contents) {
      const base = c.flags?.The2ndChumming3e?.baseInitiative ?? c.initiative ?? 0;
      if (base <= 0) continue;
      for (let score = base; score > 0; score -= 10) {
        slots.push({ id: c.id, score });
      }
    }

    // Sort descending by action score, then by base initiative, then by
    // Foundry turn order for any remaining ties.
    slots.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const baseA = this.combatants.get(a.id)?.flags?.The2ndChumming3e?.baseInitiative ?? 0;
      const baseB = this.combatants.get(b.id)?.flags?.The2ndChumming3e?.baseInitiative ?? 0;
      if (baseB !== baseA) return baseB - baseA;
      return this.turns.findIndex(t => t.id === a.id) - this.turns.findIndex(t => t.id === b.id);
    });

    console.log('SR2 queue built:', slots.map(s => {
      const name = this.combatants.get(s.id)?.name ?? s.id;
      return `${name}@${s.score}`;
    }));

    return slots;
  }

  /**
   * SR2 Mode: Flat interleaved initiative queue.
   *
   * All action slots for all combatants are pre-built into a single sorted
   * list and stored on the combat flags. Each call to nextTurn advances a
   * pointer through that list. The active combatant in the tracker is updated
   * to whoever owns the current slot. When the pointer exhausts the list,
   * combat ends.
   *
   * Example: street sam (33), viz (11), rex (2) →
   *   sam@33 → sam@23 → sam@13 → viz@11 → sam@3 → rex@2 → viz@1 → end
   * @private
   */
  async _nextTurnSR2() {
    console.log('=== _nextTurnSR2 called ===');

    // Retrieve or build the queue
    let queue = this.flags?.The2ndChumming3e?.sr2Queue ?? null;
    let index = this.flags?.The2ndChumming3e?.sr2QueueIndex ?? 0;

    if (!queue || queue.length === 0) {
      queue = this._buildSR2Queue();
      index = 0;
      if (queue.length === 0) {
        console.log('SR2 queue empty — ending combat');
        return this._newRoundSR2();
      }
      await this.update({ flags: { The2ndChumming3e: { sr2Queue: queue, sr2QueueIndex: 0 } } });
    }

    console.log(`SR2 queue index: ${index} / ${queue.length - 1}`);

    // Check if the queue is exhausted
    if (index >= queue.length) {
      console.log('SR2 queue exhausted — ending combat');
      return this._newRoundSR2();
    }

    // Point the tracker at the combatant for the current slot
    const slot = queue[index];
    const turnIndex = this.turns.findIndex(t => t.id === slot.id);
    const combatantName = this.combatants.get(slot.id)?.name ?? slot.id;

    console.log(`SR2 slot ${index}: ${combatantName}@${slot.score}`);

    await this.update({
      turn: Math.max(0, turnIndex),
      flags: { The2ndChumming3e: { sr2QueueIndex: index + 1 } }
    });

    if (ui.combat) ui.combat.render();
    return this;
  }

  /**
   * New round - SR2 mode.
   * Clears the stored queue so it will be rebuilt on the next roll.
   * @private
   */
  async _newRoundSR2() {
    console.log('SR2 combat round complete — ending combat');
    await this.update({ flags: { The2ndChumming3e: { sr2Queue: null, sr2QueueIndex: 0 } } });
    ui.notifications.info('Combat round complete. Re-roll initiative to continue fighting.');
    return this.endCombat();
  }

  /**
   * Override endCombat to offer a combat pool refresh before closing.
   * @override
   */
  async endCombat() {
    // Ask GM if combat pools should be refreshed
    let refresh = false;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Combat Ended' },
      content: `
        <p>Combat is over.</p>
        <p>Refresh all combat pools?</p>
      `,
      buttons: [
        {
          label: 'Yes — Refresh Pools',
          action: 'yes',
          default: true,
          callback: () => { refresh = true; }
        },
        {
          label: 'No',
          action: 'no',
        },
      ],
    });

    if (refresh) {
      const actors = this.combatants.contents
        .map(c => c.actor)
        .filter(Boolean);
      for (const actor of actors) {
        await actor.refreshCombatPool();
        await actor.refreshSpellPool();
        await actor.clearSpellDefense();
      }
      ui.notifications.info('Combat pools refreshed.');
    }

    return super.endCombat();
  }
}
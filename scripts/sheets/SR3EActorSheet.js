import { SR3E } from '../config.js';

/**
 * SR3EActorSheet — V2 Application framework (Foundry v13+).
 * Renders HTML directly from JS; no .hbs template files required.
 */
export class SR3EActorSheet extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'bio';

  /* ------------------------------------------------------------------ */
  /*  Static configuration                                                */
  /* ------------------------------------------------------------------ */

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor'],
    tag: 'form',
    position: { width: 780, height: 740 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      switchTab:      SR3EActorSheet._onSwitchTab,
      rollAttr:       SR3EActorSheet._onRollAttr,
      rollSkill:      SR3EActorSheet._onRollSkill,
      rollWeapon:     SR3EActorSheet._onRollWeapon,
      rollMelee:      SR3EActorSheet._onRollMelee,
      rollInitiative: SR3EActorSheet._onRollInitiative,
      itemCreate:     SR3EActorSheet._onItemCreate,
      itemEdit:       SR3EActorSheet._onItemEdit,
      itemDelete:     SR3EActorSheet._onItemDelete,
      woundBox:       SR3EActorSheet._onWoundBox,
      equipArmor:     SR3EActorSheet._onEquipArmor,
      equipMelee:     SR3EActorSheet._onEquipMelee,
        applyDamage: SR3EActorSheet._onApplyDamage,
        healDamage:  SR3EActorSheet._onHealDamage,
        rollSpell:      SR3EActorSheet._onRollSpell,
        dispelSpell:    SR3EActorSheet._onDispelSpell,
        summonSpirit:   SR3EActorSheet._onSummonSpirit,
        resetAllPools:     SR3EActorSheet._onResetAllPools,
        rollAstralCombat:  SR3EActorSheet._onRollAstralCombat,
        toggleFocus:       SR3EActorSheet._onToggleFocus,
        toggleFocusActive: SR3EActorSheet._onToggleFocusActive,
        rollAssensing:     SR3EActorSheet._onRollAssensing,
        rollContested:     SR3EActorSheet._onRollContested,
        rollResistDamage:  SR3EActorSheet._onRollResistDamage,
        activateVCR:       SR3EActorSheet._onActivateVCR,
        equipCyberdeck:    SR3EActorSheet._onEquipCyberdeck,
        setMatrixMode:     SR3EActorSheet._onSetMatrixMode,
        setAstralMode:     SR3EActorSheet._onSetAstralMode,
        ejectSlot:         SR3EActorSheet._onEjectSlot,
        toggleBurnSlot:    SR3EActorSheet._onToggleBurnSlot,
        linkVehicle:       SR3EActorSheet._onLinkVehicle,
        createLinkVehicle: SR3EActorSheet._onCreateLinkVehicle,
        unlinkVehicle:     SR3EActorSheet._onUnlinkVehicle,
        toggleVehicleMode: SR3EActorSheet._onToggleVehicleMode,
        openVehicle:       SR3EActorSheet._onOpenVehicle,
        toggleStored:      SR3EActorSheet._onToggleStored,
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Title                                                               */
  /* ------------------------------------------------------------------ */

  get title() { return `${this.actor.name} — ${this.actor.type}`; }

  /* ------------------------------------------------------------------ */
  /*  Rendering — V2 uses _renderHTML instead of _renderInner            */
  /* ------------------------------------------------------------------ */

  async _renderHTML(_context, _options) {
    const actor = this.actor;
    const sys   = actor.system;
    const html  = this._buildSheet(actor, sys);
    const div   = document.createElement('div');
    // Must be a flex column filling the window-content form so the height
    // chain reaches sheet-body and overflow-y:auto triggers correctly.
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = html;
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
    this._activateListeners(content);
  }

  /* ------------------------------------------------------------------ */
  /*  Listener attachment                                                 */
  /* ------------------------------------------------------------------ */

  _activateListeners(html) {
    html.querySelectorAll('[data-action="switchTab"]').forEach(el =>
      el.addEventListener('click', ev => {
        this._activeTab = ev.currentTarget.dataset.tab;
        this.render();
      })
    );

    if (!this.isEditable) return;

    html.querySelectorAll('input, select, textarea').forEach(el =>
      el.addEventListener('change', ev => this._onFieldChange(ev))
    );

    // Inline skill force inputs — saved directly to the item, not the actor form
    html.querySelectorAll('.skill-force-input').forEach(input => {
      input.addEventListener('change', async ev => {
        ev.stopPropagation();
        const itemId = ev.currentTarget.dataset.itemId;
        const item   = this.actor.items.get(itemId);
        if (item) await item.update({ 'system.force': parseInt(ev.currentTarget.value) || 0 });
      });
    });

    // Matrix tab: make program rows draggable
    html.querySelectorAll('[data-matrix-program-id]').forEach(el => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', ev => {
        ev.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'sr3e-program',
          itemId: el.dataset.matrixProgramId,
        }));
        ev.dataTransfer.effectAllowed = 'copy';
      });
    });

    // Matrix tab: slot rows as drop targets
    html.querySelectorAll('[data-slot-row]').forEach(slotRow => {
      slotRow.addEventListener('dragover', ev => {
        if (slotRow.dataset.slotBurned === 'true') return;
        ev.preventDefault();
        slotRow.style.outline = '2px dashed var(--sr-accent)';
      });
      slotRow.addEventListener('dragleave', () => {
        slotRow.style.outline = '';
      });
      slotRow.addEventListener('drop', async ev => {
        ev.preventDefault();
        slotRow.style.outline = '';
        if (slotRow.dataset.slotBurned === 'true') return;
        let data;
        try { data = JSON.parse(ev.dataTransfer.getData('text/plain')); } catch { return; }
        if (data.type !== 'sr3e-program') return;
        const program = this.actor.items.get(data.itemId);
        if (!program) return;
        const deckId  = slotRow.dataset.deckId;
        const slotNum = parseInt(slotRow.dataset.slot);
        const deck    = this.actor.items.get(deckId);
        if (!deck) return;
        const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
        const existing = slots.find(s => s.slot === slotNum);
        const utility = {
          name:          program.name,
          type:          program.system.type          ?? '',
          category:      program.system.category      ?? '',
          rating:        program.system.rating        ?? 0,
          currentRating: program.system.rating        ?? 0,
          multiplier:    program.system.multiplier    ?? 0,
          sizeMp:        program.system.sizeMp        ?? 0,
          degradable:    program.system.degradable    ?? false,
        };
        if (existing) {
          existing.utility = utility;
        } else {
          slots.push({ slot: slotNum, burned: false, utility });
          slots.sort((a, b) => a.slot - b.slot);
        }
        const memUsed = slots.reduce((sum, s) => sum + (s.utility?.sizeMp ?? 0), 0);
        await deck.update({
          'system.utilitySlotsArray':        slots,
          'system.attributes.memory.used':   memUsed,
        });
      });
    });

    // Magic tab: live tradition/type filtering
    const traditionSel = html.querySelector('#sr-magic-tradition');
    const typeSel      = html.querySelector('#sr-magic-type');
    const totemWrap    = html.querySelector('.sr-magic-totem-wrap');
    const elementWrap  = html.querySelector('.sr-magic-element-wrap');

    if (traditionSel) {
      const updateMagicUI = () => {
        const trad = traditionSel.value;
        const type = typeSel?.value ?? '';

        // Filter type options to those valid for the selected tradition
        if (typeSel) {
          typeSel.querySelectorAll('option').forEach(opt => {
            if (!opt.value) return;
            const entry = SR3E.magicTypes.find(t => t.name === opt.value);
            opt.style.display = (!trad || entry?.traditions.includes(trad)) ? '' : 'none';
          });
          // If the current selection is now hidden, clear it
          if (typeSel.value) {
            const entry = SR3E.magicTypes.find(t => t.name === typeSel.value);
            if (trad && !entry?.traditions.includes(trad)) typeSel.value = '';
          }
        }

        if (totemWrap)   totemWrap.style.display   = trad === 'Shamanic' ? 'flex' : 'none';
        if (elementWrap) elementWrap.style.display  = typeSel?.value === 'Elementalist' ? 'flex' : 'none';
      };

      traditionSel.addEventListener('change', updateMagicUI);
      if (typeSel) typeSel.addEventListener('change', updateMagicUI);
      updateMagicUI();
    }

    // html.querySelectorAll('[data-action="rollAttr"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollAttr.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollSkill"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollSkill.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollWeapon"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onRollWeapon.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="rollInitiative"]').forEach(el =>
    //   el.addEventListener('click', () => SR3EActorSheet._onRollInitiative.call(this))
    // );
    // html.querySelectorAll('[data-action="itemCreate"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemCreate.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="itemEdit"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemEdit.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="itemDelete"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onItemDelete.call(this, ev, el))
    // );
    // html.querySelectorAll('[data-action="woundBox"]').forEach(el =>
    //   el.addEventListener('click', ev => SR3EActorSheet._onWoundBox.call(this, ev, el))
    // );
  }

  /* ------------------------------------------------------------------ */
  /*  HTML builders                                                       */
  /* ------------------------------------------------------------------ */

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner">
        ${this._header(actor, sys)}
        ${this._tabs()}
        <div class="sheet-body">
          ${this._tabBio(sys)}
          ${this._tabAttributes(sys)}
          ${this._tabSkills(actor)}
          ${this._tabWeapons(actor)}
          ${this._tabArmor(actor, sys)}
          ${this._tabMagic(actor, sys)}
          ${this._tabGear(actor)}
          ${this._tabVehicles(actor, sys)}
          ${this._tabCyber(actor, sys)}
          ${this._tabMatrix(actor, sys)}
          ${this._tabStored(actor)}
        </div>
      </div>`;
  }

  _carryWeight(actor) {
    const CARRY_TYPES = new Set(['firearm', 'melee', 'projectile', 'thrown', 'armor', 'gear', 'ammunition', 'cyberdeck']);
    return actor.items
      .filter(i => CARRY_TYPES.has(i.type) && !i.getFlag('The2ndChumming3e', 'stored'))
      .reduce((sum, i) => sum + (i.system.weight ?? 0), 0);
  }

  _header(actor, sys) {
    const w = sys.wounds ?? {};

    const str     = sys.attributes?.strength?.value ?? 0;
    const carried = this._carryWeight(actor);
    let warningLine = '';
    if (str > 0 && carried >= str * 10) {
      warningLine = `<span style="display:block;font-size:10px;color:var(--sr-red);line-height:1.2">Incurring Damage</span>`;
    } else if (str > 0 && carried >= str * 5) {
      warningLine = `<span style="display:block;font-size:10px;color:var(--sr-amber);line-height:1.2">Encumbered</span>`;
    }
    const weightDisplay = `<span style="color:var(--sr-muted)">${carried.toFixed(1)} kg</span>${warningLine}`;

    return `
      <header class="sheet-header">
        <div class="portrait-wrap">
          <img class="profile-img" src="${actor.img}" title="${actor.name}" data-edit="img"/>
        </div>
        <div class="header-fields">
          <div class="header-top">
            <input class="actor-name" type="text" name="name" value="${actor.name}"/>

          </div>
          <div class="wound-tracks">
            ${this._woundTrack('stun', 'Stun', w.stun?.value ?? 0, 10)}
            ${this._woundTrack('physical', 'Physical', w.physical?.value ?? 0, 10)}
            <span class="wound-mod-display">
              Wound Mod: <strong>${sys.woundMod < 0 ? sys.woundMod : '—'}</strong>
            </span>
            <span class="wound-mod-display">
              Carry: <strong>${weightDisplay}</strong>
            </span>
          </div>
        </div>
      </header>`;
  }

  _inlineField(label, name, value, type = 'text', width = 80) {
    return `<label class="inline-field">${label}
      <input type="${type}" name="${name}" value="${value ?? ''}" style="width:${width}px"/>
    </label>`;
  }

 _woundTrack(track, label, value, max) {
  const boxes = Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const cls = n <= value ? 'wound-box filled' : 'wound-box';
    return `<div class="${cls}" data-action="woundBox" data-track="${track}" data-box="${n}"></div>`;
  }).join('');
  
  return `<div class="wound-track-container">
    <div class="wound-track">
      <span class="wound-track-label">${label}</span>
      <div class="wound-boxes">${boxes}</div>
    </div>
    <div class="damage-buttons">
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="1" title="Light (L)">L</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="3" title="Moderate (M)">M</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="6" title="Serious (S)">S</button>
      <button type="button" class="damage-btn" data-action="applyDamage" data-track="${track}" data-amount="10" title="Deadly (D)">D</button>
      <button type="button" class="damage-btn damage-btn-heal" data-action="healDamage" data-track="${track}" title="Heal 1 box">−</button>
    </div>
  </div>`;
}

  _tabs() {
    const tabs = [
      ['bio',         'Bio'],
      ['attributes',  'Attributes'],
      ['skills',      'Skills'],
      ['weapons',     'Weapons'],
      ['armor',       'Armor'],
      ['magic',       'Magic'],
      ['gear',        'Gear'],
      ['vehicles',    'Vehicles'],
      ['cyber',       'Cyber'],
      ['matrix',      'Matrix'],
      ['stored',      'Stored'],
    ];
    return `<nav class="sheet-tabs">
      ${tabs.map(([id, label]) =>
        `<a class="tab-btn ${this._activeTab === id ? 'active' : ''}"
            data-action="switchTab" data-tab="${id}">${label}</a>`
      ).join('')}
    </nav>`;
  }

  _tabAttributes(sys) {
  const attr    = sys.attributes ?? {};
  const d       = sys.derived    ?? {};
  const isAdept = (sys.magicType ?? '') === 'Adept';

  // Core attributes (2 columns)
  const coreAttrs = [
    ['body','Body'], ['quickness','Quickness'], ['strength','Strength'],
    ['charisma','Charisma'], ['intelligence','Intelligence'], ['willpower','Willpower']
  ];

  const attrBlocks = coreAttrs.map(([key, label]) => `
    <div class="attr-block">
      <span class="attr-label">${label}</span>
      <div class="attr-row">
        <input class="attr-input" type="number" name="system.attributes.${key}.base"
               value="${attr[key]?.base ?? 3}" min="1" max="30" title="Base"/>
        ${isAdept ? `<span class="attr-force-sep" title="Improved Ability / Increased ${label}">+</span>
        <input class="attr-input attr-force" type="number" name="system.attributes.${key}.force"
               value="${attr[key]?.force ?? 0}" min="0" max="10" title="Adept force"/>
        <span class="attr-force-total" title="Effective">(${(attr[key]?.base ?? 3) + (attr[key]?.force ?? 0)})</span>` : ''}
        <i class="fas fa-dice-d6 rollable" data-action="rollAttr" data-attr="${key}" title="Roll ${label}"></i>
      </div>
    </div>`).join('');

  return `<div class="tab ${this._activeTab === 'attributes' ? 'active' : ''}" data-tab="attributes" style="overflow-y:auto">
    <div class="attributes-grid">
      ${attrBlocks}
      
      <!-- Magic -->
      <div class="attr-block attr-special">
        <span class="attr-label">Magic</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.attributes.magic.base"
                 value="${attr.magic?.base ?? 0}" min="0" max="12" title="Base"/>
          ${isAdept ? `<span class="attr-force-sep" title="Adept magic force">+</span>
          <input class="attr-input attr-force" type="number" name="system.attributes.magic.force"
                 value="${attr.magic?.force ?? 0}" min="0" max="10" title="Adept force"/>` : ''}
          <span class="attr-mod">${attr.magic?.value ?? 0}</span>
        </div>
      </div>

      <!-- Reaction (derived: floor((QUI+INT)/2) + bonus) -->
      <div class="attr-block attr-special">
        <span class="attr-label" style="color:var(--sr-amber)">Reaction</span>
        <div class="attr-row">
          <span class="attr-derived" style="color:var(--sr-amber)">${attr.reaction?.value ?? 0}</span>
          ${isAdept ? `<span class="attr-force-sep" title="Reaction adept force">+</span>
          <input class="attr-input attr-force" type="number" name="system.attributes.reaction.force"
                 value="${attr.reaction?.force ?? 0}" min="0" max="10" title="Adept force on Reaction"/>` : ''}
        </div>
      </div>

      <!-- Essence -->
      <div class="attr-block attr-special">
        <span class="attr-label" style="color:var(--sr-amber)">Essence</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.attributes.essence.value"
                 value="${attr.essence?.value ?? 6}" min="0" max="6" step="0.1"
                 style="color:var(--sr-amber)"/>
        </div>
      </div>

      <!-- Initiative Dice Bonus -->
      <div class="attr-block attr-special">
        <span class="attr-label">Init Dice +</span>
        <div class="attr-row">
          <input class="attr-input" type="number" name="system.initiativeDiceBonus"
                 value="${sys.initiativeDiceBonus ?? 0}" min="0" max="10"/>
        </div>
      </div>
    </div>
    
    <!-- Derived Pools -->
    <div class="derived-section">
      <div class="derived-section-header">
        <h3 class="section-hdr">Derived Pools</h3>
        <button type="button" class="btn-sm" data-action="resetAllPools" title="Reset all pools to full">↺ Reset All Pools</button>
      </div>
      <div class="derived-grid">
        ${this._derivedBlock('Initiative', `${d.initiative ?? 0} + ${d.initiativeDice ?? 1}d6`,
          `<i class="fas fa-dice-d6 rollable" data-action="rollInitiative" title="Roll Initiative (Shift: physical dice)"></i>`)}
        ${this._poolBlock('Combat Pool',
          d.availableCombatPool ?? d.combatPool ?? 0,
          d.combatPool ?? 0,
          d.combatPoolBase ?? 0,
          'system.combatPoolSpent', 'system.combatPoolMod')}
        ${this._derivedBlock('Karma Pool',
          `<input type="number" name="system.karmaPool" value="${sys.karmaPool ?? 0}" class="pool-input" style="width:45px"/>`)}
        ${d.spellPool !== null && d.spellPool !== undefined
          ? this._poolBlock('Spell Pool',
              d.availableSpellPool ?? d.spellPool ?? 0,
              d.spellPool ?? 0,
              d.spellPoolBase ?? 0,
              'system.spellPoolSpent', 'system.spellPoolMod')
          : ''}
        ${d.astralPool !== null && d.astralPool !== undefined
          ? this._poolBlock('Astral Pool',
              d.availableAstralPool ?? d.astralPool ?? 0,
              d.astralPool ?? 0,
              d.astralPoolBase ?? 0,
              'system.astralPoolSpent', 'system.astralPoolMod')
          : ''}
        ${(sys.spellDefensePool ?? 0) > 0 ? this._derivedBlock('Spell Defense', `<span style="color:var(--sr-accent)">${sys.spellDefensePool} dice</span>`) : ''}
        ${this._poolBlock('Hacking Pool',
          d.hackingPool ?? 0,
          d.hackingPool ?? 0,
          d.hackingPoolBase ?? 0,
          null, 'system.hackingBonus')}
      </div>
    </div>
    <div style="margin-top:8px;padding:4px 0;border-top:1px solid var(--sr-border);display:flex;gap:6px;flex-wrap:wrap">
      <button type="button" class="btn-sm" data-action="rollContested"
              style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
        ⚔ Contested Roll
      </button>
      <button type="button" class="btn-sm" data-action="rollResistDamage"
              style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)"
              title="Shift-click to enter successes manually">
        🛡 Resist Damage
      </button>
    </div>
  </div>`;
}

  _derivedBlock(label, value, extra = '') {
    return `<div class="derived-block">
      <span class="derived-label">${label}</span>
      <span class="derived-value">${value}</span>
      ${extra}
    </div>`;
  }

  /**
   * Render an editable current/total pool block.
   * currentVal   — available dice right now
   * totalVal     — full pool size (base + mod)
   * baseVal      — derived base before mod (used to compute mod from typed total)
   * spentField   — system field name for "spent" counter, or null if no spent tracking
   * modField     — system field name for the pool mod / bonus
   */
  _poolBlock(label, currentVal, totalVal, baseVal, spentField, modField) {
    const currentInput = spentField
      ? `<input type="number" class="pool-current-input" style="width:38px"
               data-spent-field="${spentField}"
               data-pool-total="${totalVal}"
               value="${currentVal}" min="0"/>`
      : `<span class="pool-current-static">${currentVal}</span>`;

    const totalInput = `<input type="number" class="pool-total-input" style="width:38px"
             data-mod-field="${modField}"
             data-pool-base="${baseVal}"
             value="${totalVal}" min="0"/>`;

    return `<div class="derived-block">
      <span class="derived-label">${label}</span>
      <span class="derived-value pool-value-pair">
        ${currentInput}
        <span class="pool-sep"> / </span>
        ${totalInput}
      </span>
    </div>`;
  }

  _tabSkills(actor) {
    const allSkills = actor.items.filter(i => i.type === 'skill')
      .sort((a, b) => a.name.localeCompare(b.name));
    const skills       = allSkills.filter(s => (s.system.category ?? '') !== '' && (s.system.skillName ?? '') !== '' && (s.system.rating ?? 0) > 0);
    const uncatSkills  = allSkills.filter(s => (s.system.category ?? '') === '' || (s.system.skillName ?? '') === '' || (s.system.rating ?? 0) === 0);
    const isAdept      = (actor.system.magicType ?? '') === 'Adept';

    const _skillRow = s => {
      const rating    = s.system.rating ?? 0;
      const force     = s.system.force  ?? 0;
      const ratingDisplay = s.system.specialisation
        ? `${rating} <span style="color:var(--sr-accent)">(${rating + 2})</span>`
        : `${rating}`;
      const forceCell = isAdept ? `
        <span class="item-cell">
          <input type="number" class="skill-force-input" data-item-id="${s.id}"
                 value="${force}" min="0" max="10"
                 style="width:38px;text-align:center;background:var(--sr-surface);color:var(--sr-gold);border:1px solid var(--sr-border);border-radius:var(--r)"
                 title="Improved Ability (Adept force)"/>
        </span>` : '';
      return `
        <div class="item-row" data-item-id="${s.id}">
          <span class="item-name skill-name" data-action="rollSkill" data-item-id="${s.id}"
                title="Roll ${s.name}">${s.name}</span>
          <span class="item-cell">${s.system.linkedAttribute ?? '—'}</span>
          <span class="item-cell">${ratingDisplay}</span>
          ${forceCell}
          <span class="item-cell">${s.system.specialisation || '—'}</span>
          ${this._itemControls(s.id, true, 'rollSkill')}
        </div>`;
    };

    const header    = `<div class="list-header"><span>Skill</span><span>Attr</span><span>Rtg</span>${isAdept ? '<span>Force</span>' : ''}<span>Spec</span><span></span></div>`;
    const rows      = skills.length ? skills.map(_skillRow).join('') : '<p class="empty-list">No skills. Add some below.</p>';
    const uncatRows = uncatSkills.map(_skillRow).join('');

    return `<div class="tab ${this._activeTab === 'skills' ? 'active' : ''}" data-tab="skills" style="overflow-y:auto">
      ${header}
      ${rows}
      ${uncatSkills.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Incomplete (set category, skill name, and rating)</h3>
        ${header}
        ${uncatRows}
      ` : ''}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="skill">+ Add Skill</button>
    </div>`;
  }

  _tabWeapons(actor) {
  const _stored = i => !!i.getFlag('The2ndChumming3e', 'stored');
  const firearms    = actor.items.filter(i => i.type === 'firearm'    && !_stored(i));
  const melees      = actor.items.filter(i => i.type === 'melee'      && !_stored(i));
  const projectiles = actor.items.filter(i => i.type === 'projectile' && !_stored(i));
  const thrown      = actor.items.filter(i => i.type === 'thrown'     && !_stored(i));

  const BOW_CATS    = new Set(['Bow', 'LCB', 'MCB', 'HCB', 'SL']);
  const THROWN_CATS = new Set(['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other']);

  const ARMED_CATS   = new Set(['EDG', 'CLB', 'POL', 'WHP']);
  const UNARMED_CATS = new Set(['CYB', 'UNA']);

  const armedMelee        = melees.filter(w => ARMED_CATS.has(w.system.category ?? ''));
  const unarmedCyber      = melees.filter(w => UNARMED_CATS.has(w.system.category ?? ''));
  const uncategorisedMelee = melees.filter(w => {
    const cat = w.system.category ?? '';
    return !ARMED_CATS.has(cat) && !UNARMED_CATS.has(cat);
  });

  const categorisedFirearms   = firearms.filter(w => (w.system.category ?? '') !== '');
  const uncategorisedFirearms = firearms.filter(w => (w.system.category ?? '') === '');

  const fRows = categorisedFirearms.length ? categorisedFirearms.map(w => `
    <div class="item-row" data-item-id="${w.id}">
      <span class="item-name">${w.name}</span>
      <span class="item-cell">${w.system.damage || '—'}</span>
      <span class="item-cell">${w.system.mode || '—'}</span>
      <span class="item-cell">${w.system.concealability ?? '—'}</span>
      <span class="item-cell">${w.system.weight ?? 0}</span>
      <span class="item-cell">${w.system.ammunition || '—'}</span>
      ${this._itemControls(w.id, true, 'rollWeapon', false)}
    </div>`).join('') : '<p class="empty-list">No firearms.</p>';

  const equippedMeleeId = actor.system.equippedMelee ?? '';
  const isAwakened      = (actor.system.attributes?.magic?.base ?? 0) > 0;

  const armedRows = armedMelee.length ? armedMelee.map(w => {
    const isEquipped  = equippedMeleeId === w.id;
    const isFocus     = w.system.isFocus     ?? false;
    const focusActive = w.system.focusActive ?? false;
    const focusTag    = isFocus ? ` <span style="color:var(--sr-accent);font-size:10px">[Focus${focusActive ? ' ✦' : ''}]</span>` : '';
    return `
    <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${w.id}">
      <span class="item-name">${w.name}${isEquipped ? ' <span class="equipped-badge">✦ Equipped</span>' : ''}${focusTag}</span>
      <span class="item-cell">${w.system.damage || '—'}</span>
      <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
      <span class="item-cell">${w.system.concealability ?? '—'}</span>
      <span class="item-cell">${w.system.weight ?? 0}</span>
      ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
    </div>`;
  }).join('') : '<p class="empty-list">No armed melee weapons.</p>';

  const unarmedRows = unarmedCyber.length ? unarmedCyber.map(w => {
    const isEquipped  = equippedMeleeId === w.id;
    const isFocus     = w.system.isFocus     ?? false;
    const focusActive = w.system.focusActive ?? false;
    const focusTag    = isFocus ? ` <span style="color:var(--sr-accent);font-size:10px">[Focus${focusActive ? ' ✦' : ''}]</span>` : '';
    return `
    <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${w.id}">
      <span class="item-name">${w.name}${isEquipped ? ' <span class="equipped-badge">✦ Equipped</span>' : ''}${focusTag}</span>
      <span class="item-cell">${w.system.damage || '—'}</span>
      <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
      <span class="item-cell">${w.system.concealability ?? '—'}</span>
      <span class="item-cell">${w.system.weight ?? 0}</span>
      ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
    </div>`;
  }).join('') : '<p class="empty-list">No unarmed/cyber weapons.</p>';

  const _uncatSection = (rows, header) => `
    <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">${header}</h3>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Reach/Mode</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
    ${rows}`;

  const _projRow = w => `
    <div class="item-row" data-item-id="${w.id}">
      <span class="item-name">${w.name}</span>
      <span class="item-cell">${w.system.damage || '—'}</span>
      <span class="item-cell">${w.system.strMin || '—'}</span>
      <span class="item-cell">${w.system.concealability ?? '—'}</span>
      <span class="item-cell">${w.system.weight ?? 0}</span>
      ${this._itemControls(w.id, true, 'rollWeapon', false)}
    </div>`;

  const bows          = projectiles.filter(i => BOW_CATS.has(i.system.category ?? ''));
  const legacyThrown  = projectiles.filter(i => THROWN_CATS.has(i.system.category ?? ''));
  const uncatProj     = projectiles.filter(i => {
    const cat = i.system.category ?? '';
    return !BOW_CATS.has(cat) && !THROWN_CATS.has(cat) && cat !== '';
  });
  const allThrown = [...thrown, ...legacyThrown];

  const bowRows    = bows.length    ? bows.map(_projRow).join('')    : '<p class="empty-list">No bows or crossbows.</p>';
  const thrownRows = allThrown.length ? allThrown.map(_projRow).join('') : '<p class="empty-list">No thrown weapons.</p>';

  return `<div class="tab ${this._activeTab === 'weapons' ? 'active' : ''}" data-tab="weapons" style="overflow-y:auto">
    <h3 class="section-hdr">Melee — Armed (Edged/Clubs/Polearms/Whips)</h3>
    <div class="skill-note"><i class="fas fa-fist-raised"></i> Uses Armed Combat skills (Strength)</div>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Reach</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
    ${armedRows}
    <button type="button" class="btn-add" data-action="itemCreate" data-type="melee">+ Add Armed Melee</button>

    <h3 class="section-hdr" style="margin-top:1rem">Melee — Unarmed &amp; Cyber Implants</h3>
    <div class="skill-note"><i class="fas fa-hand-rock"></i> Uses Unarmed Combat skill (Strength)</div>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Reach</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
    ${unarmedRows}
    <button type="button" class="btn-add" data-action="itemCreate" data-type="melee">+ Add Unarmed/Cyber</button>

    ${uncategorisedMelee.length ? _uncatSection(
        uncategorisedMelee.map(w => {
          const isEquipped  = equippedMeleeId === w.id;
          const isFocus     = w.system.isFocus     ?? false;
          const focusActive = w.system.focusActive ?? false;
          return `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">Reach ${w.system.reach ?? 0}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.weight ?? 0}</span>
            ${this._meleeControls(w.id, isEquipped, isAwakened, isFocus, focusActive, false)}
          </div>`;
        }).join(''),
        'Uncategorised Melee (set category in item sheet)'
      ) : ''}

    <h3 class="section-hdr" style="margin-top:1rem">Firearms</h3>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Mode</span><span>Conceal</span><span>Weight (kg)</span><span>Ammo</span><span></span></div>
    ${fRows}
    ${uncategorisedFirearms.length ? _uncatSection(
        uncategorisedFirearms.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.weight ?? 0}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true, 'rollWeapon', false)}
          </div>`).join(''),
        'Uncategorised Firearms (set category in item sheet)'
      ) : ''}
    <button type="button" class="btn-add" data-action="itemCreate" data-type="firearm">+ Add Firearm</button>

    <h3 class="section-hdr" style="margin-top:1rem">Projectiles (Bows &amp; Crossbows)</h3>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Str Min</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
    ${bowRows}
    ${uncatProj.length ? `
      <h3 class="section-hdr" style="margin-top:0.5rem;color:var(--sr-amber)">Uncategorised Projectiles</h3>
      ${uncatProj.map(_projRow).join('')}
    ` : ''}
    <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Bow / Crossbow</button>

    <h3 class="section-hdr" style="margin-top:1rem">Thrown Weapons</h3>
    <div class="list-header"><span>Name</span><span>Damage</span><span>Str Min</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
    ${thrownRows}
    <button type="button" class="btn-add" data-action="itemCreate" data-type="thrown">+ Add Thrown Weapon</button>
  </div>`;
}

  _tabArmor(actor, sys) {
    const armors = actor.items.filter(i => i.type === 'armor' && !i.getFlag('The2ndChumming3e', 'stored'));

    const equippedArmor = sys.equippedArmor ? actor.items.get(sys.equippedArmor) : null;
    if (sys.equippedArmor && !equippedArmor) {
      sys.equippedArmor = "";
      actor.update({ "system.equippedArmor": "" });
    }

    const activeArmorDisplay = equippedArmor ? `
      <div class="active-armor-section">
        <div class="active-armor-header">
          <i class="fas fa-shield-alt"></i> Currently Equipped
        </div>
        <div class="active-armor-card">
          <span class="active-armor-name">${equippedArmor.name}</span>
          <div class="active-armor-stats">
            <span class="armor-badge ballistic">B: ${equippedArmor.system.ballistic ?? 0}</span>
            <span class="armor-badge impact">I: ${equippedArmor.system.impact ?? 0}</span>
          </div>
        </div>
      </div>
    ` : `
      <div class="active-armor-section" style="opacity: 0.7;">
        <div class="active-armor-header">
          <i class="fas fa-shield"></i> No Armor Equipped
        </div>
        <div class="active-armor-card">
          <span class="active-armor-name">Unarmored</span>
          <div class="active-armor-stats">
            <span class="armor-badge ballistic">B: 0</span>
            <span class="armor-badge impact">I: 0</span>
          </div>
        </div>
      </div>
    `;

    const aRows = armors.length ? armors.map(a => {
      const isEquipped = (sys.equippedArmor === a.id);
      return `
        <div class="item-row ${isEquipped ? 'equipped' : ''}" data-item-id="${a.id}">
          <span class="item-name">${a.name}</span>
          <span class="item-cell col-narrow">${a.system.ballistic ?? 0}B / ${a.system.impact ?? 0}I</span>
          <span class="item-cell">${a.system.concealability ?? '—'}</span>
          <span class="item-cell">${a.system.weight ?? 0}</span>
          <div class="item-controls">
            <i class="fas fa-home" data-action="toggleStored" data-item-id="${a.id}"
               style="color:var(--sr-dim)" title="Put in storage"></i>
            ${isEquipped ?
              `<i class="fas fa-shield-alt" style="color: var(--sr-accent);" title="Unequip" data-action="equipArmor" data-item-id="${a.id}"></i>` :
              `<i class="fas fa-shield" title="Equip" data-action="equipArmor" data-item-id="${a.id}"></i>`
            }
            <i class="fas fa-edit" data-action="itemEdit" data-item-id="${a.id}" title="Edit"></i>
            <i class="fas fa-trash" data-action="itemDelete" data-item-id="${a.id}" title="Delete"></i>
          </div>
        </div>
      `;
    }).join('') : '<p class="empty-list">No armor. Add some below.</p>';

    return `<div class="tab ${this._activeTab === 'armor' ? 'active' : ''}" data-tab="armor" style="overflow-y:auto">
      ${activeArmorDisplay}
      <div class="list-header"><span>Name</span><span class="col-narrow">B / I</span><span>Conceal</span><span>Weight (kg)</span><span></span></div>
      ${aRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="armor">+ Add Armor</button>
    </div>`;
  }

  _tabProjectiles(actor) {
    const projectiles = actor.items.filter(i => i.type === 'projectile');

    const BOW_CATS    = new Set(['Bow', 'LCB', 'MCB', 'HCB', 'SL']);
    const THROWN_CATS = new Set(['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other']);

    const bows   = projectiles.filter(i => BOW_CATS.has(i.system.category ?? ''));
    const thrown = projectiles.filter(i => THROWN_CATS.has(i.system.category ?? ''));
    const uncategorised = projectiles.filter(i => {
      const cat = i.system.category ?? '';
      return !BOW_CATS.has(cat) && !THROWN_CATS.has(cat);
    });

    const _row = w => `
      <div class="item-row" data-item-id="${w.id}">
        <span class="item-name">${w.name}</span>
        <span class="item-cell">${w.system.damage || '—'}</span>
        <span class="item-cell">${w.system.strMin || '—'}</span>
        <span class="item-cell">${w.system.concealability ?? '—'}</span>
        ${this._itemControls(w.id, true)}
      </div>`;

    const bowRows          = bows.length          ? bows.map(_row).join('')          : '<p class="empty-list">No bows or crossbows.</p>';
    const thrownRows       = thrown.length         ? thrown.map(_row).join('')        : '<p class="empty-list">No thrown weapons.</p>';
    const uncategorisedRows = uncategorised.length ? uncategorised.map(_row).join('') : '';

    return `<div class="tab ${this._activeTab === 'projectiles' ? 'active' : ''}" data-tab="projectiles">
      <h3 class="section-hdr">Bows & Crossbows (Projectile Weapons)</h3>
      <div class="list-header"><span>Name</span><span>Damage</span><span>Str Min</span><span>Conceal</span><span></span></div>
      ${bowRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Bow / Crossbow</button>

      <h3 class="section-hdr" style="margin-top:1rem">Thrown Weapons (Throwing Weapons)</h3>
      <div class="list-header"><span>Name</span><span>Damage</span><span>Str Min</span><span>Conceal</span><span></span></div>
      ${thrownRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="projectile">+ Add Thrown Weapon</button>

      ${uncategorised.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Uncategorised (set category in item sheet)</h3>
        <div class="list-header"><span>Name</span><span>Damage</span><span>Str Min</span><span>Conceal</span><span></span></div>
        ${uncategorisedRows}
      ` : ''}
    </div>`;
  }

  _tabAmmo(actor) {
    const ammo = actor.items.filter(i => i.type === 'ammunition');
    const ammoRows = ammo.length ? ammo.map(a => `
      <div class="item-row" data-item-id="${a.id}">
        <span class="item-name">${a.name}</span>
        <span class="item-cell">${a.system.damage || '—'}</span>
        <span class="item-cell">${a.system.availability || '—'}</span>
        ${this._itemControls(a.id, false)}
      </div>`).join('') : '<p class="empty-list">No ammunition.</p>';

    return `<div class="tab ${this._activeTab === 'ammo' ? 'active' : ''}" data-tab="ammo">
      <h3 class="section-hdr">Ammunition</h3>
      <div class="list-header"><span>Name</span><span>Damage Mod</span><span>Availability</span><span></span></div>
      ${ammoRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="ammunition">+ Add Ammunition</button>
    </div>`;
  }

  _tabCyber(actor, sys) {
    const activeVCRId = sys.activeVCRItemId ?? '';
    const cyberware   = actor.items.filter(i => i.type === 'cyberware' && !i.getFlag('The2ndChumming3e', 'stored'))
      .sort((a, b) => a.name.localeCompare(b.name));
    const bioware     = actor.items.filter(i => i.type === 'bioware'   && !i.getFlag('The2ndChumming3e', 'stored'))
      .sort((a, b) => a.name.localeCompare(b.name));

    const cwRows = cyberware.length ? cyberware.map(c => {
      const isVCRActive = c.id === activeVCRId;
      const rating      = c.system.rating ?? 0;
      return `
        <div class="item-row" data-item-id="${c.id}">
          <span class="item-name">${c.name}</span>
          <span class="item-cell">${c.system.grade ?? '—'}</span>
          <span class="item-cell">${c.system.essenceCost ?? 0}</span>
          <span class="item-cell">${rating}</span>
          <span class="item-cell">
            <button type="button" class="sr-vcr-btn${isVCRActive ? ' sr-vcr-active' : ''}"
                    data-action="activateVCR" data-item-id="${c.id}"
                    title="${isVCRActive ? 'VCR active — click to deactivate' : 'Activate as VCR'}">
              VCR${isVCRActive ? ' ✓' : ''}
            </button>
          </span>
          ${this._itemControls(c.id, false, 'rollWeapon', false)}
        </div>`;
    }).join('') : '<p class="empty-list">No cyberware.</p>';

    const bwRows = bioware.length ? bioware.map(b => `
      <div class="item-row" data-item-id="${b.id}">
        <span class="item-name">${b.name}</span>
        <span class="item-cell">${b.system.grade ?? '—'}</span>
        <span class="item-cell">${b.system.bioIndex ?? 0}</span>
        <span class="item-cell">${b.system.rating ?? 0}</span>
        ${this._itemControls(b.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No bioware.</p>';

    const vcrRating  = sys.derived?.vcrRating  ?? 0;
    const totalBio   = sys.derived?.totalBioIndex   ?? 0;
    const bioCap     = sys.derived?.bioIndexCapacity ?? 0;
    const bioOver    = sys.derived?.bioIndexOver     ?? false;
    const magicSupp  = sys.derived?.magicSuppressed  ?? false;
    const effMagic   = sys.derived?.effectiveMagic   ?? 0;
    const magicBase  = actor.system.attributes?.magic?.base ?? 0;

    const vcrBanner = vcrRating > 0 ? `
      <div class="sr-vcr-banner">
        ⚡ VCR Rating ${vcrRating} active — rigging TN reduced by ${vcrRating * 2}
      </div>` : '';

    const bioAlert = bioOver ? `
      <div class="sr-alert sr-alert--danger" style="margin-top:6px">
        ⚠ Bio Index ${totalBio} exceeds capacity ${bioCap} — character is taking damage
      </div>` : '';

    const magicAlert = magicSupp ? `
      <div class="sr-alert sr-alert--warn" style="margin-top:4px">
        ⚠ Magic suppressed by bioware — effective Magic ${Math.floor(effMagic)} (base ${magicBase})
      </div>` : '';

    const bioSummary = bioware.length ? `
      <div style="display:flex;align-items:center;gap:8px;margin:6px 0 2px;font-size:11px;color:var(--sr-muted)">
        <span>Bio Index:</span>
        <span style="color:${bioOver ? 'var(--sr-red)' : 'var(--sr-text)'};font-weight:600">${totalBio}</span>
        <span>/</span>
        <span>${bioCap}</span>
      </div>
      ${bioAlert}
      ${magicAlert}` : '';

    return `<div class="tab ${this._activeTab === 'cyber' ? 'active' : ''}" data-tab="cyber" style="overflow-y:auto">
      ${vcrBanner}
      <h3 class="section-hdr">Cyberware</h3>
      <div class="list-header"><span>Name</span><span>Grade</span><span>Essence</span><span>Rating</span><span>VCR</span><span></span></div>
      ${cwRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="cyberware">+ Cyberware</button>
      <h3 class="section-hdr" style="margin-top:1rem">Bioware</h3>
      <div class="list-header"><span>Name</span><span>Grade</span><span>Bio Index</span><span>Rating</span><span></span></div>
      ${bwRows}
      ${bioSummary}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="bioware">+ Bioware</button>
    </div>`;
  }

  _tabMatrix(actor, sys) {
    const modes = SR3E.matrixUserModes ?? [
      { name: 'Terminal',                abbreviation: 'TRM',     initiative: 'default', description: 'Classic computer terminal or device interface.' },
      { name: 'Augmented Reality',       abbreviation: 'AR',      initiative: 'default', description: 'Holographic overlay on real world.' },
      { name: 'Virtual Reality Cold Sim',abbreviation: 'VR-Cold', initiative: 'default', description: 'Full immersion via standard datajack or trodes.' },
      { name: 'Virtual Reality Hot Sim', abbreviation: 'VR-Hot',  initiative: 'matrix',  description: 'Full immersion with heightened reflexes.' },
    ];

    const currentMode    = sys.matrixUserMode ?? '';
    const equippedDeckId = sys.equippedCyberdeck ?? '';
    const deck           = equippedDeckId ? actor.items.get(equippedDeckId) : null;
    const decks          = actor.items.filter(i => i.type === 'cyberdeck' && !i.getFlag('The2ndChumming3e', 'stored')).sort((a, b) => a.name.localeCompare(b.name));
    const programs       = actor.items.filter(i => i.type === 'program'   && !i.getFlag('The2ndChumming3e', 'stored')).sort((a, b) => a.name.localeCompare(b.name));

    const vcrActive = (sys.linkedVehicles ?? []).some(v => v.mode === 'vcr');
    const vrActive  = currentMode === 'VR-Cold' || currentMode === 'VR-Hot';

    // --- User mode buttons ---
    const modeButtons = modes.map(m => {
      const active = currentMode === m.abbreviation;
      return '<button type="button"' +
        ' class="sr-veh-mode-btn' + (active ? ' sr-veh-vcr-active' : '') + '"' +
        ' data-action="setMatrixMode" data-mode="' + m.abbreviation + '"' +
        ' title="' + m.description + '">' + m.abbreviation + '</button>';
    }).join('');

    // --- Cyberdeck list rows ---
    const deckRows = decks.map(d => {
      const isEquipped = d.id === equippedDeckId;
      const da = d.system.attributes ?? {};
      const equippedBadge = isEquipped ? ' <span style="color:var(--sr-accent);font-size:10px">● equipped</span>' : '';
      const btnStyle = isEquipped ? ' style="color:var(--sr-accent)"' : '';
      return `<div class="item-row" data-item-id="${d.id}">
        <span class="item-name">${d.name}${equippedBadge}</span>
        <span class="item-cell">MPCP ${da.mpcp?.base ?? 0}</span>
        <span class="item-cell">FW ${da.firewall?.base ?? 0}</span>
        <span class="item-cell">Resp ${da.response?.base ?? 0}</span>
        <div class="item-controls">
          <i class="fas fa-home" data-action="toggleStored" data-item-id="${d.id}"
             style="color:var(--sr-dim)" title="Put in storage"></i>
          <button type="button" class="btn-xs" data-action="equipCyberdeck" data-item-id="${d.id}"
                  title="${isEquipped ? 'Unequip' : 'Equip'}"${btnStyle}>${isEquipped ? '✓ Eq.' : 'Equip'}</button>
          <i class="fas fa-edit" data-action="itemEdit" data-item-id="${d.id}" title="Edit"></i>
          <i class="fas fa-trash" data-action="itemDelete" data-item-id="${d.id}" title="Delete"></i>
        </div>
      </div>`;
    }).join('');

    // --- Equipped deck stats + utility slots ---
    let deckStats = '';
    let utilitySlotSection = '';
    if (deck) {
      const da  = deck.system.attributes   ?? {};
      const ds  = deck.system.derivedStats  ?? {};
      const mcm = deck.system.damage?.matrixConditionMonitor ?? { boxes: 10, current: 0 };
      const mcmBoxes = Array.from({ length: mcm.boxes ?? 10 }, (_, i) => {
        const filled = (i + 1) <= (mcm.current ?? 0);
        return `<div class="${filled ? 'wound-box filled' : 'wound-box'}" style="width:14px;height:14px"></div>`;
      }).join('');

      const modeData    = modes.find(m => m.abbreviation === currentMode);
      const response    = da.response?.base ?? 0;
      const reactionVal = actor.system.derived?.initiative ?? actor.system.attributes?.reaction?.value ?? 0;
      const matrixBase  = reactionVal + (response * 2);
      const matrixDice  = 1 + response;
      const initDisplay = modeData?.initiative === 'matrix'
        ? `<span style="color:var(--sr-accent)">${matrixBase} + ${matrixDice}d6 (Matrix)</span>`
        : `${actor.system.derived?.initiative ?? 0} + ${actor.system.derived?.initiativeDice ?? 1}d6`;

      deckStats = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0 10px">
          <div class="derived-block"><span class="derived-label">MPCP</span><span class="derived-value">${da.mpcp?.base ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Firewall</span><span class="derived-value">${da.firewall?.base ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Response</span><span class="derived-value">${response}</span></div>
          <div class="derived-block"><span class="derived-label">Memory</span><span class="derived-value">${da.memory?.used ?? 0}/${da.memory?.total ?? 0} Mp</span></div>
          <div class="derived-block"><span class="derived-label">Slots</span><span class="derived-value">${da.utilitySlots?.available ?? 0}/${da.utilitySlots?.total ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">DTR</span><span class="derived-value">${da.dataTransferRate?.value ?? 0} Mp/CT</span></div>
          <div class="derived-block"><span class="derived-label">Flux</span><span class="derived-value">${da.fluxRating?.value ?? 1}${da.fluxRating?.wireless ? ' ✦' : ''}</span></div>
          <div class="derived-block"><span class="derived-label">Hack Pool +</span><span class="derived-value">${ds.hackingPoolBonus ?? 0}</span></div>
          <div class="derived-block"><span class="derived-label">Matrix Init</span><span class="derived-value">${initDisplay}</span></div>
        </div>
        <div style="margin-bottom:10px">
          <span class="derived-label" style="display:block;margin-bottom:4px">Matrix CM</span>
          <div style="display:flex;gap:3px">${mcmBoxes}</div>
        </div>`;

      // Utility slots — generated from total slot count, merged with stored array
      const totalSlots   = da.utilitySlots?.total ?? 0;
      const memTotal     = da.memory?.total ?? 0;
      const memUsed      = da.memory?.used  ?? 0;
      const memOver      = memUsed > memTotal && memTotal > 0;
      const memBarPct    = memTotal > 0 ? Math.min(100, Math.round(memUsed / memTotal * 100)) : 0;
      const memColor     = memOver ? 'var(--sr-red)' : 'var(--sr-accent)';
      const memTextColor = memOver ? 'var(--sr-red)' : 'var(--sr-green)';
      const storedSlots  = deck.system.utilitySlotsArray ?? [];

      const slotRows = Array.from({ length: totalSlots }, (_, i) => {
        const slotNum = i + 1;
        const entry   = storedSlots.find(s => s.slot === slotNum);
        const burned  = entry?.burned ?? false;
        const u       = entry?.utility ?? null;
        const maxRtg  = u?.rating ?? 0;
        const curRtg  = u?.currentRating ?? maxRtg;
        const degraded = u && curRtg < maxRtg;
        const ratingDisplay = degraded
          ? `<span style="color:var(--sr-amber)">${curRtg}/${maxRtg}</span>`
          : (maxRtg || '');
        const burnBtnStyle = burned ? 'background:var(--sr-red-bg);color:var(--sr-red)' : '';
        const rowOpacity   = burned ? 'opacity:0.45;' : '';
        const utilCell = u && !burned
          ? `<span class="item-name" style="flex:2">${u.name}</span>
             <span class="item-cell">${u.type || '—'}</span>
             <span class="item-cell">${ratingDisplay || '—'}</span>
             <span class="item-cell">${u.sizeMp ?? 0} Mp</span>
             <span class="item-cell" style="font-size:10px;color:var(--sr-amber)">${u.degradable ? '⚠ Deg.' : ''}</span>
             <div class="item-controls">
               <button type="button" class="btn-xs" data-action="ejectSlot"
                       data-deck-id="${deck.id}" data-slot="${slotNum}"
                       style="color:var(--sr-red)" title="Eject program">✕</button>
             </div>`
          : `<span class="item-name" style="flex:2;color:var(--sr-dim);font-style:italic">
               ${burned ? '— burned —' : 'Drop program here…'}
             </span>
             <span class="item-cell"></span><span class="item-cell"></span>
             <span class="item-cell"></span><span class="item-cell"></span>
             <div class="item-controls"></div>`;
        return `<div class="item-row" style="${rowOpacity}cursor:${burned||!u?'default':'inherit'}"
                    data-slot-row data-slot="${slotNum}" data-deck-id="${deck.id}"
                    data-slot-burned="${burned}">
          <span class="item-cell" style="min-width:22px;color:var(--sr-muted)">${slotNum}</span>
          <button type="button" class="btn-xs" data-action="toggleBurnSlot"
                  data-deck-id="${deck.id}" data-slot="${slotNum}"
                  style="${burnBtnStyle}" title="${burned ? 'Unburn slot' : 'Mark slot as burned'}">
            ${burned ? '🔥' : '○'}
          </button>
          ${utilCell}
        </div>`;
      }).join('');

      const memBar = totalSlots > 0 ? `
        <div style="margin:4px 0 8px;padding:5px 8px;background:var(--sr-surface);border-radius:4px;font-size:12px">
          Memory: <strong style="color:${memTextColor}">${memUsed} / ${memTotal} Mp</strong>
          ${memOver ? ' <span style="color:var(--sr-red)">⚠ Over capacity</span>' : ''}
          <div style="height:4px;background:var(--sr-border);border-radius:2px;margin-top:4px">
            <div style="height:4px;border-radius:2px;width:${memBarPct}%;background:${memColor}"></div>
          </div>
        </div>` : '';

      utilitySlotSection = totalSlots > 0 ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Utility Slots — ${deck.name} (${totalSlots} slots)</h3>
        ${memBar}
        <div class="list-header"><span>#</span><span>Burn</span><span>Program</span><span>Type</span><span>Rtg</span><span>Size</span><span></span><span></span></div>
        ${slotRows}` : `
        <h3 class="section-hdr" style="margin-top:0.8rem">Utility Slots — ${deck.name}</h3>
        <p class="empty-list">Set Utility Slots Total on the cyberdeck to enable slots.</p>`;
    }

    // --- Programs list (draggable into utility slots) ---
    const progRows = programs.length ? programs.map(p => `
      <div class="item-row" data-item-id="${p.id}" data-matrix-program-id="${p.id}"
           style="cursor:grab" title="Drag to install in a utility slot">
        <span class="item-name">${p.name}</span>
        <span class="item-cell">${p.system.type || '—'}</span>
        <span class="item-cell">${p.system.category || '—'}</span>
        <span class="item-cell">${p.system.multiplier ?? 0}×</span>
        <span class="item-cell">${p.system.degradable ? '⚠ Deg.' : ''}</span>
        ${this._itemControls(p.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No programs.</p>';

    const conflictBanner = '';
    const modeDesc = currentMode
      ? `<div style="font-size:11px;color:var(--sr-muted);margin-bottom:10px">${modes.find(m => m.abbreviation === currentMode)?.description ?? ''}</div>`
      : '';
    const deckListHtml = decks.length
      ? `<div class="list-header"><span>Name</span><span>MPCP</span><span>FW</span><span>Resp</span><span></span></div>${deckRows}`
      : '<p class="empty-list">No cyberdecks.</p>';

    return `<div class="tab ${this._activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix" style="overflow-y:auto">
      ${conflictBanner}
      <h3 class="section-hdr">User Mode</h3>
      <div class="sr-veh-modes" style="flex-wrap:wrap;gap:6px;margin-bottom:6px">${modeButtons}</div>
      ${modeDesc}
      <h3 class="section-hdr" style="margin-top:0.8rem">Cyberdecks</h3>
      ${deckListHtml}
      ${deck ? deckStats : ''}
      ${utilitySlotSection}
      <h3 class="section-hdr" style="margin-top:1rem">Programs</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Category</span><span>Mult</span><span>Deg.</span><span></span></div>
      ${progRows}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn-add" data-action="itemCreate" data-type="cyberdeck">+ Add Cyberdeck</button>
        <button type="button" class="btn-add" data-action="itemCreate" data-type="program">+ Add Program</button>
      </div>
    </div>`;
  }
  _tabGear(actor) {
    const gear = actor.items.filter(i => i.type === 'gear'        && !i.getFlag('The2ndChumming3e', 'stored'));
    const ammo = actor.items.filter(i => i.type === 'ammunition'  && !i.getFlag('The2ndChumming3e', 'stored'));

    const gRows = gear.length ? gear.map(g => `
      <div class="item-row" data-item-id="${g.id}">
        <span class="item-name">${g.name}</span>
        <span class="item-cell">×${g.system.quantity ?? 1}</span>
        <span class="item-cell">${g.system.cost ?? 0}¥</span>
        <span class="item-cell">${g.system.weight ?? 0}</span>
        ${this._itemControls(g.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No gear.</p>';

    const aRows = ammo.length ? ammo.map(a => `
      <div class="item-row" data-item-id="${a.id}">
        <span class="item-name">${a.name}</span>
        <span class="item-cell">${a.system.damage || '—'}</span>
        <span class="item-cell">${a.system.availability || '—'}</span>
        <span class="item-cell">${a.system.weight ?? 0}</span>
        ${this._itemControls(a.id, false, 'rollWeapon', false)}
      </div>`).join('') : '<p class="empty-list">No ammunition.</p>';

    return `<div class="tab ${this._activeTab === 'gear' ? 'active' : ''}" data-tab="gear" style="overflow-y:auto">
      <h3 class="section-hdr">Gear</h3>
      <div class="list-header"><span>Name</span><span>Qty</span><span>Cost</span><span>Weight (kg)</span><span></span></div>
      ${gRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="gear">+ Add Gear</button>
      <h3 class="section-hdr" style="margin-top:1rem">Ammunition</h3>
      <div class="list-header"><span>Name</span><span>Damage Mod</span><span>Availability</span><span>Weight (kg)</span><span></span></div>
      ${aRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="ammunition">+ Add Ammunition</button>
    </div>`;
  }

  _tabMagic(actor, sys) {
    const isAwakened = (sys.attributes?.magic?.base ?? 0) > 0;
    const spells     = actor.items.filter(i => i.type === 'spell');

    if (!isAwakened) return `
      <div class="tab ${this._activeTab === 'magic' ? 'active' : ''}" data-tab="magic">
        <p class="empty-list">Character is not Awakened (Magic attribute is 0).</p>
      </div>`;

    const d          = sys.derived ?? {};
    const mpAvail    = d.availableSpellPool ?? d.spellPool ?? 0;
    const mpTotal    = d.spellPool ?? 0;

    // Magic identity
    const tradition   = sys.magicTradition ?? '';
    const magicType   = sys.magicType      ?? '';
    const magicTotem  = sys.magicTotem     ?? '';
    const magicElement = sys.magicElement  ?? '';

    const typeEntry  = SR3E.magicTypes.find(t => t.name === magicType);
    // No type set → no restriction; otherwise derive from astral field
    const astralCap  = magicType ? (typeEntry?.astral ?? '') : 'projection';
    const canProject = astralCap === 'projection';
    const canPerceive = astralCap === 'projection' || astralCap === 'perception';

    const typeOptions = SR3E.magicTypes
      .filter(t => !tradition || t.traditions.includes(tradition))
      .map(t => `<option value="${t.name}" ${magicType === t.name ? 'selected' : ''}>${t.name}</option>`)
      .join('');

    const totemOptions = `
      <optgroup label="Totems">
        ${SR3E.magicTotems.map(t => `<option value="${t}" ${magicTotem === t ? 'selected' : ''}>${t}</option>`).join('')}
      </optgroup>
      <optgroup label="Loa">
        ${SR3E.magicLoa.map(l => `<option value="${l}" ${magicTotem === l ? 'selected' : ''}>${l}</option>`).join('')}
      </optgroup>`;

    const elementOptions = SR3E.magicElements
      .map(e => `<option value="${e}" ${magicElement === e ? 'selected' : ''}>${e}</option>`)
      .join('');

    const magicIdentityBlock = `
      <div style="margin-bottom:12px;padding:8px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r)">
        <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Magic Identity</div>
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px">Tradition
            <select name="system.magicTradition" id="sr-magic-tradition" style="font-size:12px">
              <option value="">—</option>
              <option value="Shamanic" ${tradition === 'Shamanic' ? 'selected' : ''}>Shamanic</option>
              <option value="Hermetic" ${tradition === 'Hermetic' ? 'selected' : ''}>Hermetic</option>
              <option value="Somatic"  ${tradition === 'Somatic'  ? 'selected' : ''}>Somatic</option>
            </select>
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px">Type
            <select name="system.magicType" id="sr-magic-type" style="font-size:12px">
              <option value="">—</option>
              ${typeOptions}
            </select>
          </label>
          <div class="sr-magic-totem-wrap" style="display:${tradition === 'Shamanic' ? 'flex' : 'none'};align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px">Totem / Loa
              <select name="system.magicTotem" id="sr-magic-totem" style="font-size:12px">
                <option value="">—</option>
                ${totemOptions}
              </select>
            </label>
          </div>
          <div class="sr-magic-element-wrap" style="display:${magicType === 'Elementalist' ? 'flex' : 'none'};align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px">Element
              <select name="system.magicElement" id="sr-magic-element" style="font-size:12px">
                <option value="">—</option>
                ${elementOptions}
              </select>
            </label>
          </div>
        </div>
      </div>`;

    const astralMode = sys.astralMode ?? '';
    const astralModes = [
      { label: 'Physical Plane', value: 'physical', title: 'Active on the physical plane only.',              show: true        },
      { label: 'Dual Natured',   value: 'dual',     title: 'Perceives both planes simultaneously.',          show: canPerceive },
      { label: 'Astral Plane',   value: 'astral',   title: 'Astrally projected — physical body is vulnerable.', show: canProject },
    ];
    const astralModeButtons = astralModes
      .filter(m => m.show)
      .map(m =>
        `<button type="button" class="btn-add${astralMode === m.value ? ' sr-astral-active' : ''}"
          data-action="setAstralMode" data-mode="${m.value}" title="${m.title}"
          style="width:auto;margin:0">${m.label}</button>`
      ).join('');

    const isConjurer = magicType === 'Conjurer';
    const isSorcerer = magicType === 'Sorcerer';
    const isAdept    = magicType === 'Adept';

    const _spellRow = s => `
      <div class="item-row" data-item-id="${s.id}">
        <span class="item-name">${s.name}</span>
        <span class="item-cell">${s.system.category || '—'}</span>
        <span class="item-cell">${s.system.type || '—'}</span>
        <span class="item-cell">${s.system.range || '—'}</span>
        <span class="item-cell">${s.system.damage || '—'}</span>
        <span class="item-cell">${s.system.drain || '—'}</span>
        <span class="item-cell">
          <button type="button" class="btn-xs" data-action="rollSpell" data-item-id="${s.id}">Cast</button>
        </span>
        ${this._itemControls(s.id, false)}
      </div>`;

    const completeSpells = spells.filter(s => (s.system.damage ?? '') !== '' && (s.system.drain ?? '') !== '');
    const incompleteSpells = spells.filter(s => (s.system.damage ?? '') === '' || (s.system.drain ?? '') === '');

    const sRows = completeSpells.length ? completeSpells.map(_spellRow).join('') : '<p class="empty-list">No spells.</p>';
    const incompleteSpellRows = incompleteSpells.map(_spellRow).join('');

    const summonings  = actor.items.filter(i => i.type === 'summoning');
    const summonRows  = summonings.length ? summonings.map(s => `
      <div class="item-row" data-item-id="${s.id}">
        <span class="item-name">${s.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${s.system.spiritType?.replace(/_/g, ' ') || '—'}</span>
        <span class="item-cell">
          <button type="button" class="btn-xs" data-action="summonSpirit" data-item-id="${s.id}">Summon</button>
        </span>
        ${this._itemControls(s.id, false)}
      </div>`).join('') : '<p class="empty-list">No conjuring entries.</p>';

    return `<div class="tab ${this._activeTab === 'magic' ? 'active' : ''}" data-tab="magic" style="overflow-y:auto">
      ${magicIdentityBlock}
      <div style="margin-bottom:10px">
        <div style="font-size:11px;color:var(--sr-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em">Astral</div>
        <div style="display:flex;gap:4px;align-items:center">
          ${astralModeButtons}
          <div style="margin-left:auto;display:flex;gap:4px">
            <button type="button" class="btn-add sr-btn-danger" data-action="rollAstralCombat"
                    style="width:auto;margin:0">Astral Combat</button>
            <button type="button" class="btn-add" data-action="rollAssensing"
                    style="width:auto;margin:0;border-style:solid;border-color:var(--sr-accent);color:var(--sr-accent)">Assensing</button>
          </div>
        </div>
      </div>
      ${isAdept ? (() => {
        const powers  = actor.items.filter(i => i.type === 'adeptpower')
          .sort((a, b) => a.name.localeCompare(b.name));
        const ppUsed  = Math.round(powers.reduce((sum, p) => {
          const cost  = p.system.powerCost ?? 0;
          const lvl   = p.system.hasLevels ? (p.system.level ?? 1) : 1;
          return sum + cost * lvl;
        }, 0) * 100) / 100;
        const ppTotal = actor.system.attributes?.magic?.value ?? 0;
        const ppOver  = ppUsed > ppTotal;
        const pwRows  = powers.length ? powers.map(p => {
          const lvl      = p.system.hasLevels ? (p.system.level ?? 1) : '—';
          const cost     = p.system.powerCost ?? 0;
          const totalCost = p.system.hasLevels ? Math.round(cost * (p.system.level ?? 1) * 100) / 100 : cost;
          return `
          <div class="item-row" data-item-id="${p.id}">
            <span class="item-name">${p.name}</span>
            <span class="item-cell">${cost}</span>
            <span class="item-cell">${lvl}</span>
            <span class="item-cell">${totalCost}</span>
            ${this._itemControls(p.id, false)}
          </div>`;
        }).join('') : '<p class="empty-list">No adept powers.</p>';
        return `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
          <h3 class="section-hdr" style="margin:0">Adept Powers</h3>
          <span style="font-size:12px;color:${ppOver ? 'var(--sr-red)' : 'var(--sr-muted)'}">
            Power Points: <strong>${ppUsed} / ${ppTotal}</strong>
          </span>
        </div>
        ${ppOver ? `<div class="sr-alert sr-alert--danger" style="margin-bottom:6px">⚠ Power points exceed Magic rating</div>` : ''}
        <div class="list-header">
          <span>Power</span><span>Cost/Lvl</span><span>Level</span><span>Total</span><span></span>
        </div>
        ${pwRows}
        <button type="button" class="btn-add" data-action="itemCreate" data-type="adeptpower">+ Add Power</button>`;
      })() : `
      ${!isConjurer ? `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px">
        <h3 class="section-hdr" style="margin:0">Sorcery</h3>
        <span style="font-size:12px;color:var(--sr-muted)">
          Spell Pool: <strong>${mpAvail} / ${mpTotal}</strong>
        </span>
      </div>
      <div class="list-header">
        <span>Spell</span><span>Category</span><span>Type</span><span>Range</span>
        <span>Dmg</span><span>Drain</span><span>Cast</span><span></span>
      </div>
      ${sRows}
      ${incompleteSpells.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Incomplete (missing damage code or drain formula)</h3>
        <div class="list-header">
          <span>Spell</span><span>Category</span><span>Type</span><span>Range</span>
          <span>Dmg</span><span>Drain</span><span>Cast</span><span></span>
        </div>
        ${incompleteSpellRows}
      ` : ''}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="spell">+ Add Spell</button>
      <button type="button" class="btn-add" data-action="dispelSpell" style="margin-top:4px">✦ Dispel Spell</button>
      ` : ''}
      ${!isSorcerer ? `
      <h3 class="section-hdr" style="margin-top:1.2rem">Conjuring</h3>
      <div class="list-header">
        <span>Name</span><span>Spirit Type</span><span>Summon</span><span></span>
      </div>
      ${summonRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="summoning">+ Add Conjuring</button>
      ` : ''}
      `}
      ${this._magicNotesCard(magicType, magicTotem, magicElement)}
    </div>`;
  }

  _magicNotesCard(magicType, totem, element) {
    let entry = null;
    let label = '';

    if (totem) {
      entry = SR3E.magicLoaData[totem] ?? SR3E.magicTotemData[totem] ?? null;
      label = totem;
    } else if (magicType === 'Elementalist' && element) {
      entry = SR3E.magicElementData[element] ?? null;
      label = `${element} Elementalist`;
    }

    if (!entry) return '';

    return `
      <div style="margin-top:1.2rem;padding:10px 12px;background:var(--sr-surface);border:1px solid var(--sr-border);border-radius:var(--r);font-size:12px">
        <div style="font-size:11px;color:var(--sr-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">${label}</div>
        <div style="color:var(--sr-dim);margin-bottom:4px"><span style="color:var(--sr-muted)">Environment: </span>${entry.environment}</div>
        <div style="color:var(--sr-green);margin-bottom:4px"><span style="color:var(--sr-muted)">Advantages: </span>${entry.advantages}</div>
        <div style="color:var(--sr-red)"><span style="color:var(--sr-muted)">Disadvantages: </span>${entry.disadvantages}</div>
      </div>`;
  }

  _tabVehicles(actor, sys) {
    const linked = sys.linkedVehicles ?? [];

    const statKeys = [
      ['handling', 'Hand'],
      ['speed',    'Spd'],
      ['body',     'Body'],
      ['armor',    'Arm'],
      ['pilot',    'Pilot'],
      ['sensor',   'Sens'],
    ];

    const rows = linked.map(({ actorId, mode }) => {
      const vActor = game.actors?.get(actorId);
      const name   = vActor?.name ?? `[Missing: ${actorId.slice(0,6)}]`;
      const attr   = vActor?.system?.attributes ?? {};

      const statsHtml = statKeys.map(([key, label]) => `
        <span class="sr-veh-stat">
          <span class="sr-veh-stat-label">${label}</span>
          <span class="sr-veh-stat-val">${attr[key]?.base ?? 0}</span>
        </span>`).join('');

      const vcrActive = mode === 'vcr';
      const rcdActive = mode === 'rcd';

      return `
        <div class="sr-veh-row">
          <button type="button" class="sr-veh-name-btn" data-action="openVehicle" data-actor-id="${actorId}"
                  title="Open vehicle sheet">${name}</button>
          <div class="sr-veh-stats">${statsHtml}</div>
          <div class="sr-veh-modes">
            <button type="button" class="sr-veh-mode-btn${vcrActive ? ' sr-veh-vcr-active' : ''}"
                    data-action="toggleVehicleMode" data-actor-id="${actorId}" data-mode="vcr">VCR</button>
            <button type="button" class="sr-veh-mode-btn${rcdActive ? ' sr-veh-rcd-active' : ''}"
                    data-action="toggleVehicleMode" data-actor-id="${actorId}" data-mode="rcd">RCD</button>
          </div>
          <button type="button" class="sr-veh-unlink" data-action="unlinkVehicle"
                  data-actor-id="${actorId}" title="Unlink vehicle">✕</button>
        </div>`;
    }).join('');

    return `<div class="tab ${this._activeTab === 'vehicles' ? 'active' : ''}" data-tab="vehicles" style="overflow-y:auto">
      ${linked.length === 0
        ? '<p class="empty-list">No linked vehicles.</p>'
        : `<div class="sr-veh-header">
            <span>Vehicle</span><span>Stats</span><span>Mode</span><span></span>
           </div>${rows}`}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button type="button" class="btn-add" data-action="linkVehicle">+ Link Existing</button>
        <button type="button" class="btn-add" data-action="createLinkVehicle">+ Create &amp; Link</button>
      </div>
    </div>`;
  }

  _tabStored(actor) {
    const WEAPON_TYPES = new Set(['firearm', 'melee', 'projectile', 'thrown']);
    const CYBER_TYPES  = new Set(['cyberware', 'bioware', 'cyberdeck', 'program']);

    const stored  = actor.items.filter(i => i.getFlag('The2ndChumming3e', 'stored'));
    const weapons = stored.filter(i => WEAPON_TYPES.has(i.type));
    const armors  = stored.filter(i => i.type === 'armor');
    const gear    = stored.filter(i => i.type === 'gear' || i.type === 'ammunition');
    const cyber   = stored.filter(i => CYBER_TYPES.has(i.type));

    const _storeControls = id => `<div class="item-controls">
      <i class="fas fa-home" data-action="toggleStored" data-item-id="${id}"
         style="color:var(--sr-gold)" title="Remove from storage"></i>
      <i class="fas fa-edit" data-action="itemEdit"   data-item-id="${id}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${id}" title="Delete"></i>
    </div>`;

    const wRows = weapons.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell">${i.system.damage || '—'}</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const aRows = armors.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">armor</span>
        <span class="item-cell">${i.system.ballistic ?? 0}B / ${i.system.impact ?? 0}I</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const gRows = gear.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell"></span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const cRows = cyber.map(i => `
      <div class="item-row" data-item-id="${i.id}">
        <span class="item-name">${i.name}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${i.type}</span>
        <span class="item-cell">${i.system.rating ? `Rtg ${i.system.rating}` : '—'}</span>
        ${_storeControls(i.id)}
      </div>`).join('');

    const sections = [
      weapons.length ? `
        <h3 class="section-hdr">Weapons</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span>Damage</span><span></span></div>
        ${wRows}` : '',
      armors.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Armor</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span>Protection</span><span></span></div>
        ${aRows}` : '',
      gear.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Gear &amp; Ammunition</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span></span><span></span></div>
        ${gRows}` : '',
      cyber.length ? `
        <h3 class="section-hdr" style="margin-top:0.8rem">Cyber &amp; Tech</h3>
        <div class="list-header"><span>Name</span><span>Type</span><span>Rating</span><span></span></div>
        ${cRows}` : '',
    ].filter(Boolean).join('');

    return `<div class="tab ${this._activeTab === 'stored' ? 'active' : ''}" data-tab="stored" style="overflow-y:auto">
      ${stored.length === 0
        ? `<p class="empty-list">Nothing in storage. Click the <i class="fas fa-home"></i> icon on any item to store it.</p>`
        : sections}
    </div>`;
  }

  _tabBio(sys) {
    return `<div class="tab ${this._activeTab === 'bio' ? 'active' : ''}" data-tab="bio" style="overflow-y:auto">
      <h3 class="section-hdr">Personal Information</h3>
      <div class="bio-fields">
        ${this._inlineField('Species', 'system.metatype', sys.metatype, 'text', 100)}
        ${this._inlineField('Age', 'system.age', sys.age, 'text', 60)}
        ${this._inlineField('Gender', 'system.gender', sys.gender, 'text', 70)}
        ${this._inlineField('Height', 'system.height', sys.height, 'text', 80)}
        ${this._inlineField('Weight', 'system.weight', sys.weight, 'text', 80)}
        ${this._inlineField('Ethnicity', 'system.ethnicity', sys.ethnicity, 'text', 120)}
      </div>
      
      <h3 class="section-hdr" style="margin-top:1rem">Resources</h3>
      <div class="bio-fields">
        ${this._inlineField('Nuyen (¥)', 'system.nuyen', sys.nuyen, 'number', 100)}
        ${this._inlineField('Karma', 'system.karma', sys.karma, 'number', 80)}
      </div>
      
      <h3 class="section-hdr" style="margin-top:1rem">Reputation</h3>
      <div class="rep-grid">
        ${this._inlineField('Street Cred', 'system.streetCred', sys.streetCred, 'number', 55)}
        ${this._inlineField('Notoriety', 'system.notoriety', sys.notoriety, 'number', 55)}
        ${this._inlineField('Reputation', 'system.reputation', sys.reputation, 'number', 55)}
        ${this._inlineField('Total Karma', 'system.totalKarma', sys.totalKarma, 'number', 55)}
      </div>
      
      <h3 class="section-hdr" style="margin-top:1rem">Notes</h3>
      <label class="bio-label">Background</label>
      <textarea name="system.biography" class="bio-text">${sys.biography ?? ''}</textarea>
      <label class="bio-label">Notes</label>
      <textarea name="system.notes" class="bio-text">${sys.notes ?? ''}</textarea>
    </div>`;
  }

  _itemControls(itemId, hasRoll, rollAction = 'rollWeapon', stored = null) {
    const storeIcon = stored !== null ? `<i class="fas fa-home" data-action="toggleStored" data-item-id="${itemId}"
      style="color:${stored ? 'var(--sr-gold)' : 'var(--sr-dim)'}"
      title="${stored ? 'Remove from storage' : 'Put in storage'}"></i>` : '';
    return `<div class="item-controls">
      ${storeIcon}
      ${hasRoll ? `<i class="fas fa-dice-d6 rollable" data-action="${rollAction}" data-item-id="${itemId}" title="Roll"></i>` : ''}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  _meleeControls(itemId, isEquipped, isAwakened = false, isFocus = false, focusActive = false, stored = null) {
    const storeIcon = stored !== null ? `<i class="fas fa-home" data-action="toggleStored" data-item-id="${itemId}"
      style="color:${stored ? 'var(--sr-gold)' : 'var(--sr-dim)'}"
      title="${stored ? 'Remove from storage' : 'Put in storage'}"></i>` : '';
    const equipIcon = isEquipped
      ? `<i class="fas fa-hand-rock" style="color:var(--sr-accent)" data-action="equipMelee" data-item-id="${itemId}" title="Unequip"></i>`
      : `<i class="fas fa-hand-rock" data-action="equipMelee" data-item-id="${itemId}" title="Equip as active melee"></i>`;
    const focusBtns = isAwakened ? `
      <button type="button" class="btn-xs" data-action="toggleFocus" data-item-id="${itemId}"
              title="Is this a Weapon Focus?"
              style="${isFocus ? 'background:var(--sr-accent);color:#fff' : ''}">Focus?</button>
      ${isFocus ? `<button type="button" class="btn-xs" data-action="toggleFocusActive" data-item-id="${itemId}"
              title="Is this Focus currently active/bonded?"
              style="${focusActive ? 'background:var(--sr-green);color:#fff' : ''}">Active?</button>` : ''}
    ` : '';
    return `<div class="item-controls">
      ${storeIcon}
      ${focusBtns}
      <i class="fas fa-dice-d6 rollable" data-action="rollMelee" data-item-id="${itemId}" title="Melee attack"></i>
      ${equipIcon}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Instance event handlers                                             */
  /* ------------------------------------------------------------------ */

  async _onFieldChange(ev) {
    const el = ev.currentTarget;

    // Pool current input: value = available, writes spent = total - available
    if (el.classList.contains('pool-current-input')) {
      const spentField = el.dataset.spentField;
      const total      = parseInt(el.dataset.poolTotal) || 0;
      const newAvail   = Math.max(0, parseInt(el.value) || 0);
      const spent      = Math.max(0, total - newAvail);
      if (spentField) await this.actor.update({ [spentField]: spent });
      return;
    }

    // Pool total input: value = desired total, writes mod = total - base
    if (el.classList.contains('pool-total-input')) {
      const modField  = el.dataset.modField;
      const base      = parseInt(el.dataset.poolBase) || 0;
      const newTotal  = Math.max(0, parseInt(el.value) || 0);
      const mod       = newTotal - base;
      if (modField) await this.actor.update({ [modField]: mod });
      return;
    }

    const name  = el.name;
    const value = el.type === 'checkbox' ? el.checked
                : el.type === 'number'   ? (parseFloat(el.value) || 0)
                : el.value;
    if (!name) return;
    await this.actor.update({ [name]: value });
  }

  /* ------------------------------------------------------------------ */
  /*  Static action handlers                                              */
  /* ------------------------------------------------------------------ */

  static async _onSwitchTab(ev, target) {
    this._activeTab = target.dataset.tab;
    this.render();
  }

  static async _onRollAttr(ev, target) {
    const physicalDice = ev.shiftKey ?? false;
    const attr  = (target ?? ev.currentTarget).dataset.attr;
    const actor = this.actor;

    if (!actor.system)            actor.system = {};
    if (!actor.system.attributes) actor.system.attributes = {};

    actor.prepareDerivedData();

    let val = 0;
    try {
      if (attr === 'reaction') {
        const reaction = actor.system.attributes?.reaction ?? {};
        val = reaction.value;
        if (!val) {
          const quick = actor.system.attributes?.quickness?.base ?? 3;
          const intel = actor.system.attributes?.intelligence?.base ?? 3;
          val = Math.floor((quick + intel) / 2) + (reaction.bonus ?? 0);
        }
      } else {
        const attrData = actor.system.attributes?.[attr];
        if (attrData) {
          val = attrData.value ?? attrData.base ?? 3;
        } else {
          const defaults = {
            body: 3, quickness: 3, strength: 3, charisma: 3,
            intelligence: 3, willpower: 3, essence: 6, magic: 0
          };
          val = defaults[attr] || 3;
          actor.system.attributes[attr] = { base: val, value: val };
        }
      }
    } catch (e) {
      console.error(`SR3E | Error getting attribute ${attr}:`, e);
      val = 3;
    }

    if (!val || val < 1 || isNaN(val)) {
      console.warn(`SR3E | Attribute ${attr} has invalid value, using default`);
      val = 3;
    }

    const rollOptions = await SR3EActorSheet._promptRollOptions(actor, { physicalDice });
    if (rollOptions) {
      const label = attr.charAt(0).toUpperCase() + attr.slice(1);
      await actor.rollPool(val, rollOptions.tn, label, rollOptions);
    }
  }

  static async _onRollSkill(ev, target) {
    const itemId      = (target ?? ev.currentTarget).dataset.itemId;
    const item        = this.actor.items.get(itemId);
    if (!item) return;
    const physicalDice = ev.shiftKey ?? false;
    const s            = item.system;
    const woundMod     = this.actor.system.woundMod ?? 0;
    const isAdept      = (this.actor.system.magicType ?? '') === 'Adept';
    const forceBonus   = isAdept ? (s.force ?? 0) : 0;
    const basePool     = s.rating
      ? Math.max(1, (s.rating ?? 0) + forceBonus + woundMod)
      : Math.max(1, (s.attributeValue ?? 3) - 2 + woundMod);
    const specNote     = s.specialisation ? ` (+2 with ${s.specialisation})` : '';
    const forceNote    = forceBonus > 0 ? ` [+${forceBonus} Improved Ability]` : '';
    const rollOptions  = await SR3EActorSheet._promptRollOptions(this.actor, { defaultPool: basePool, poolNote: specNote + forceNote, physicalDice });
    if (rollOptions) await item.rollSkill(rollOptions.tn, { ...rollOptions, pool: rollOptions.pool });
  }

  static async _onRollWeapon(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollWeapon({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollInitiative(ev) {
    await this.actor.rollInitiative({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onItemCreate(ev, target) {
    const type = (target ?? ev.currentTarget).dataset.type;
    const item = await Item.create({ name: `New ${type}`, type }, { parent: this.actor });
    item?.sheet?.render(true);
  }

  static _onItemEdit(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  }

  static async _onItemDelete(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Delete ${item.name}?` },
      content: `<p>Delete <strong>${item.name}</strong>? This cannot be undone.</p>`
    });
    
    if (confirmed) {
      if (this.actor.system.equippedArmor === itemId) {
        await this.actor.update({ "system.equippedArmor": "" });
      }
      if (this.actor.system.equippedMelee === itemId) {
        await this.actor.update({ "system.equippedMelee": "" });
      }
      await item.delete();
    }
  }

  static async _onWoundBox(ev, target) {
    const el    = target ?? ev.currentTarget;
    const { track, box } = el.dataset;
    const cur    = this.actor.system.wounds?.[track]?.value ?? 0;
    const newVal = cur === parseInt(box) ? parseInt(box) - 1 : parseInt(box);
    await this.actor.update({ [`system.wounds.${track}.value`]: newVal });
  }

  static async _onRollMelee(ev, target) {
    const itemId = (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollMelee({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollSpell(ev, target) {
    const itemId = (target ?? ev.currentTarget).closest('[data-item-id]')?.dataset.itemId
                ?? (target ?? ev.currentTarget).dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.rollSpell({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onDispelSpell(_ev, _target) {
    await this.actor.rollDispel();
  }

  static async _onSummonSpirit(ev, target) {
    const itemId = (target ?? ev.currentTarget).closest('[data-item-id]')?.dataset.itemId
                ?? (target ?? ev.currentTarget).dataset.itemId;
    const item = this.actor.items.get(itemId);
    const defaultType = item?.system?.spiritType ?? 'earth_elemental';
    const { SR3ESpiritSummoning } = await import('../documents/SR3ESpiritSummoning.js');
    await SR3ESpiritSummoning.openSummonDialog(this.actor, defaultType);
  }

  static async _onResetAllPools(_ev, _target) {
    await this.actor.update({
      'system.combatPoolSpent': 0,
      'system.spellPoolSpent':  0,
      'system.astralPoolSpent': 0,
    });
  }

  static async _onRollAstralCombat(ev, _target) {
    await this.actor.rollAstralCombat({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollAssensing(ev, _target) {
    const actor       = this.actor;
    const physicalDice = ev.shiftKey ?? false;
    const intVal      = actor.system.attributes?.intelligence?.value ?? 1;
    const rollOptions = await SR3EActorSheet._promptRollOptions(actor, {
      defaultPool: intVal,
      poolNote: 'Intelligence',
      physicalDice,
    });
    if (!rollOptions) return;
    await actor.rollPool(rollOptions.pool ?? intVal, rollOptions.tn, 'Assensing', {
      ...rollOptions,
      isAssensingRoll: true,
    });
  }

  static async _onToggleFocus(_ev, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    const current = item.system.isFocus ?? false;
    await item.update({ 'system.isFocus': !current, 'system.focusActive': false });
  }

  static async _onToggleFocusActive(_ev, target) {
    const itemId = target.dataset.itemId;
    const item   = this.actor.items.get(itemId);
    if (!item) return;
    await item.update({ 'system.focusActive': !(item.system.focusActive ?? false) });
  }

  static async _onToggleStored(_ev, target) {
    const actor  = this.actor;
    const itemId = target.dataset.itemId;
    const item   = actor.items.get(itemId);
    if (!item) return;

    const storing     = !item.getFlag('The2ndChumming3e', 'stored');
    const itemUpdates = { 'flags.The2ndChumming3e.stored': storing };
    const actorUpdates = {};

    if (storing) {
      const sys = actor.system;
      if (sys.equippedArmor     === itemId) actorUpdates['system.equippedArmor']     = '';
      if (sys.equippedMelee     === itemId) actorUpdates['system.equippedMelee']     = '';
      if (sys.activeVCRItemId   === itemId) actorUpdates['system.activeVCRItemId']   = '';
      if (sys.equippedCyberdeck === itemId) actorUpdates['system.equippedCyberdeck'] = '';
      if (item.system.focusActive) itemUpdates['system.focusActive'] = false;
    }

    const promises = [item.update(itemUpdates)];
    if (Object.keys(actorUpdates).length) promises.push(actor.update(actorUpdates));
    await Promise.all(promises);
  }

  static async _onEquipMelee(ev, target) {
    const actor  = this.actor;
    const itemId = target.dataset.itemId;
    const current = actor.system.equippedMelee;
    await actor.update({ 'system.equippedMelee': current === itemId ? '' : itemId });
  }

  static async _onEquipArmor(ev, target) {
    const actor = this.actor;
    const itemId = target.dataset.itemId;
    const currentEquipped = actor.system.equippedArmor;
    const newEquipped = (currentEquipped === itemId) ? "" : itemId;
    await actor.update({ "system.equippedArmor": newEquipped });
  }

  static async _onApplyDamage(ev, target) {
  const track = target.dataset.track;
  const amount = parseInt(target.dataset.amount);
  const current = this.actor.system.wounds?.[track]?.value ?? 0;
  const max = this.actor.system.wounds?.[track]?.max ?? 10;
  const newVal = Math.min(max, current + amount);
  await this.actor.update({ [`system.wounds.${track}.value`]: newVal });
}

static async _onHealDamage(ev, target) {
  const track = target.dataset.track;
  const current = this.actor.system.wounds?.[track]?.value ?? 0;
  const newVal = Math.max(0, current - 1);
  await this.actor.update({ [`system.wounds.${track}.value`]: newVal });
}

  /* ------------------------------------------------------------------ */
  /*  Cyber tab handlers                                                 */
  /* ------------------------------------------------------------------ */

  static async _onActivateVCR(_ev, target) {
    const itemId  = target.dataset.itemId;
    const current = this.actor.system.activeVCRItemId ?? '';
    const newVCR  = current === itemId ? '' : itemId;
    await this.actor.update({ 'system.activeVCRItemId': newVCR });
  }

  static async _onEquipCyberdeck(ev, target) {
    const actor = this.actor;
    let itemId = target.dataset.itemId;

    // If sentinel, read the select element in the tab
    if (itemId === '__select__') {
      const select = target.closest('.tab')?.querySelector('#sr-deck-select');
      itemId = select?.value ?? '';
    }
    const current = actor.system.equippedCyberdeck ?? '';
    await actor.update({ 'system.equippedCyberdeck': current === itemId ? '' : itemId });
  }

  static async _onSetMatrixMode(_ev, target) {
    const actor   = this.actor;
    const mode    = target.dataset.mode;
    const current = actor.system.matrixUserMode ?? '';
    const newMode = current === mode ? '' : mode;

    const updates = { 'system.matrixUserMode': newMode };

    // Activating VR — auto-deactivate any vehicle VCR
    if (newMode === 'VR-Cold' || newMode === 'VR-Hot') {
      const vehicles = (actor.system.linkedVehicles ?? []).map(v => ({ ...v }));
      if (vehicles.some(v => v.mode === 'vcr')) {
        vehicles.forEach(v => { if (v.mode === 'vcr') v.mode = ''; });
        updates['system.linkedVehicles'] = vehicles;
      }
    }

    await actor.update(updates);
  }

  static async _onSetAstralMode(_ev, target) {
    const actor   = this.actor;
    const mode    = target.dataset.mode;
    const current = actor.system.astralMode ?? '';
    await actor.update({ 'system.astralMode': current === mode ? '' : mode });
  }

  static async _onEjectSlot(_ev, target) {
    const actor  = this.actor;
    const deckId = target.dataset.deckId;
    const slot   = parseInt(target.dataset.slot);
    const deck   = actor.items.get(deckId);
    if (!deck) return;

    const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
    const idx   = slots.findIndex(s => s.slot === slot);
    if (idx !== -1) {
      slots[idx] = { slot, burned: slots[idx].burned ?? false };
    }
    const memUsed = slots.reduce((sum, s) => sum + (s.utility?.sizeMp ?? 0), 0);
    await deck.update({ 'system.utilitySlotsArray': slots, 'system.attributes.memory.used': memUsed });
  }

  static async _onToggleBurnSlot(_ev, target) {
    const actor  = this.actor;
    const deckId = target.dataset.deckId;
    const slot   = parseInt(target.dataset.slot);
    const deck   = actor.items.get(deckId);
    if (!deck) return;

    const slots = foundry.utils.deepClone(deck.system.utilitySlotsArray ?? []);
    const idx   = slots.findIndex(s => s.slot === slot);
    if (idx !== -1) {
      slots[idx].burned = !slots[idx].burned;
    } else {
      slots.push({ slot, burned: true });
    }
    await deck.update({ 'system.utilitySlotsArray': slots });
  }

  /* ------------------------------------------------------------------ */
  /*  Vehicle tab handlers                                               */
  /* ------------------------------------------------------------------ */

  static async _onOpenVehicle(_ev, target) {
    const actor = game.actors.get(target.dataset.actorId);
    actor?.sheet.render(true);
  }

  static async _onLinkVehicle(_ev, _target) {
    const linked    = new Set((this.actor.system.linkedVehicles ?? []).map(v => v.actorId));
    const available = game.actors.contents.filter(a => a.type === 'vehicle' && !linked.has(a.id));

    if (available.length === 0) {
      ui.notifications.warn('No unlinked vehicle actors found in this world.');
      return;
    }

    const opts = available.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    let selectedId = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Link Vehicle' },
      content: `
        <label style="display:block;padding:8px 0">Vehicle:
          <select id="veh-select" style="width:100%;margin-top:4px">${opts}</select>
        </label>`,
      buttons: [
        { label: 'Link', action: 'link', default: true,
          callback: (_e, _b, d) => { selectedId = d.element.querySelector('#veh-select')?.value; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!selectedId) return;
    const vehicles = [...(this.actor.system.linkedVehicles ?? []), { actorId: selectedId, mode: '' }];
    await this.actor.update({ 'system.linkedVehicles': vehicles });
    const vActor = game.actors.get(selectedId);
    if (vActor) await vActor.update({ 'system.controlledBy': this.actor.name });
  }

  static async _onCreateLinkVehicle(_ev, _target) {
    let name = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Create & Link Vehicle' },
      content: `
        <label style="display:block;padding:8px 0">Vehicle name:
          <input id="veh-name" type="text" value="New Vehicle"
                 style="width:100%;margin-top:4px"/>
        </label>`,
      buttons: [
        { label: 'Create', action: 'create', default: true,
          callback: (_e, _b, d) => { name = d.element.querySelector('#veh-name')?.value.trim() || 'New Vehicle'; } },
        { label: 'Cancel', action: 'cancel' },
      ],
    });
    if (!name) return;
    const newActor = await Actor.implementation.create({ name, type: 'vehicle' });
    const vehicles = [...(this.actor.system.linkedVehicles ?? []), { actorId: newActor.id, mode: '' }];
    await this.actor.update({ 'system.linkedVehicles': vehicles });
    await newActor.update({ 'system.controlledBy': this.actor.name });
    newActor.sheet.render(true);
  }

  static async _onUnlinkVehicle(_ev, target) {
    const actorId  = target.dataset.actorId;
    const vehicles = (this.actor.system.linkedVehicles ?? []).filter(v => v.actorId !== actorId);
    await this.actor.update({ 'system.linkedVehicles': vehicles });
    const vActor = game.actors.get(actorId);
    if (vActor && vActor.system.controlledBy === this.actor.name) {
      await vActor.update({ 'system.controlledBy': '' });
    }
  }

  static async _onToggleVehicleMode(_ev, target) {
    const actorId  = target.dataset.actorId;
    const mode     = target.dataset.mode;           // 'vcr' or 'rcd'
    const vehicles = (this.actor.system.linkedVehicles ?? []).map(v => ({ ...v }));
    const entry    = vehicles.find(v => v.actorId === actorId);
    if (!entry) return;

    const newMode = entry.mode === mode ? '' : mode; // toggle off if already selected

    if (newMode === 'vcr') {
      // Only one vehicle may have VCR active
      vehicles.forEach(v => { if (v.actorId !== actorId) v.mode = v.mode === 'vcr' ? '' : v.mode; });
    }
    entry.mode = newMode;

    const updates = { 'system.linkedVehicles': vehicles };

    // Activating vehicle VCR — auto-deactivate any VR matrix mode
    if (newMode === 'vcr') {
      const matrixMode = this.actor.system.matrixUserMode ?? '';
      if (matrixMode === 'VR-Cold' || matrixMode === 'VR-Hot') {
        updates['system.matrixUserMode'] = '';
      }
    }

    await this.actor.update(updates);
  }

  static async _onRollContested(ev, _target) {
    await game.sr3e.SR3EActor.openContestedDialog(this.actor, ev.shiftKey);
  }

  static async _onRollResistDamage(ev, _target) {
    await this.actor.resistDamagePrompt(ev.shiftKey);
  }

  /* ------------------------------------------------------------------ */
  /*  Shared roll-options dialog                                          */
  /* ------------------------------------------------------------------ */

  static async _promptRollOptions(actor, { defaultPool = null, poolNote = '', physicalDice = false } = {}) {
    const karmaPool = actor?.system.karmaPool ?? 0;

    return new Promise(resolve => {
      new foundry.applications.api.DialogV2({
        window: { title: 'Roll Options' },
        content: `
          <div style="padding:8px 0">
            ${defaultPool !== null ? `
              <div style="margin-bottom:10px">
                <label>Dice Pool:
                  <input type="number" id="sr-pool" value="${defaultPool}" min="1" max="30" style="width:60px;margin-left:8px"/>
                  ${poolNote ? `<span style="font-size:11px;color:var(--sr-muted);margin-left:6px">${poolNote}</span>` : ''}
                </label>
              </div>
            ` : ''}
            <div style="margin-bottom:10px">
              <label>Target Number (TN):
                <input type="number" id="sr-tn" value="4" min="2" max="30" style="width:60px;margin-left:8px"/>
              </label>
            </div>
            ${karmaPool > 0 ? `
              <div style="margin-bottom:10px">
                <label>
                  <input type="checkbox" id="sr-karma" /> Use Karma Pool (${karmaPool} available)
                </label>
              </div>
            ` : ''}
            ${physicalDice ? `<div style="color:var(--sr-amber);font-size:11px;margin-top:4px">📋 Physical dice mode — successes entered after TN</div>` : `
            <div style="color:var(--sr-muted);font-size:11px;margin-top:8px">
              Shift-click to use physical dice instead
            </div>`}
          </div>
        `,
        buttons: [
          {
            label:  'Roll',
            action: 'roll',
            default: true,
            callback: (_e, _b, dialog) => {
              const html     = dialog.element;
              const tn       = parseInt(html.querySelector('#sr-tn')?.value) || 4;
              const useKarma = html.querySelector('#sr-karma')?.checked ?? false;
              const poolEl   = html.querySelector('#sr-pool');
              resolve({
                tn:           Math.max(2, tn),
                useKarma,
                karmaReroll:  useKarma,
                pool:         poolEl ? Math.max(1, parseInt(poolEl.value) || 1) : null,
                physicalDice,
              });
            }
          },
          {
            label:  'Cancel',
            action: 'cancel',
            callback: () => resolve(null)
          }
        ]
      }).render(true);
    });
  }
}
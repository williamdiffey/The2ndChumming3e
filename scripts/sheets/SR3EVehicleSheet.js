export class SR3EVehicleSheet extends foundry.applications.sheets.ActorSheetV2 {

  _activeTab = 'stats';

  static DEFAULT_OPTIONS = {
    classes: ['sr3e', 'sheet', 'actor', 'vehicle'],
    tag: 'form',
    position: { width: 680, height: 680 },
    resizable: true,
    window: { resizable: true },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      switchTab:      SR3EVehicleSheet._onSwitchTab,
      damageBox:      SR3EVehicleSheet._onDamageBox,
      applyDamage:    SR3EVehicleSheet._onApplyDamage,
      healDamage:     SR3EVehicleSheet._onHealDamage,
      itemCreate:     SR3EVehicleSheet._onItemCreate,
      itemEdit:       SR3EVehicleSheet._onItemEdit,
      itemDelete:     SR3EVehicleSheet._onItemDelete,
      rollContested:  SR3EVehicleSheet._onRollContested,
      drivingTest:    SR3EVehicleSheet._onDrivingTest,
      openPilot:      SR3EVehicleSheet._onOpenPilot,
      rollWeapon:     SR3EVehicleSheet._onRollWeapon,
      rollMelee:      SR3EVehicleSheet._onRollMelee,
      setVcrMode:     SR3EVehicleSheet._onSetVcrMode,
      setRcdMode:     SR3EVehicleSheet._onSetRcdMode,
      setAutoMode:    SR3EVehicleSheet._onSetAutoMode,
    }
  };

  get title() { return `${this.actor.name} — Vehicle`; }

  async _renderHTML(_context, _options) {
    const actor = this.actor;
    const sys   = actor.system;
    const html  = this._buildSheet(actor, sys);
    const div   = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;';
    div.innerHTML = html;
    return div;
  }

  _replaceHTML(result, content, _options) {
    content.replaceChildren(result);
  }

  /* ------------------------------------------------------------------ */
  /*  Sheet builder                                                       */
  /* ------------------------------------------------------------------ */

  _buildSheet(actor, sys) {
    return `
      <div class="sr3e-inner">
        ${this._header(actor, sys)}
        ${this._tabs()}
        <div class="sheet-body">
          ${this._tabStats(sys)}
          ${this._tabWeapons(actor)}
          ${this._tabMods(actor)}
          ${this._tabNotes(sys)}
        </div>
      </div>`;
  }

  _header(actor, sys) {
    const attr   = sys.attributes ?? {};
    const body   = attr.body?.base ?? 4;
    const dmgMax = body * 2;
    const dmgDis = body;
    const dmgVal = sys.damage?.value ?? 0;

    const VEHICLE_TYPES = [
      ['car', 'Car'], ['bike', 'Motorcycle'], ['truck', 'Truck'], ['van', 'Van'],
      ['drone', 'Drone'], ['boat', 'Boat'], ['hovercraft', 'Hovercraft'],
      ['aircraft', 'Aircraft'], ['other', 'Other'],
    ];
    const typeOpts = VEHICLE_TYPES.map(([v, l]) =>
      `<option value="${v}" ${sys.vehicleType === v ? 'selected' : ''}>${l}</option>`
    ).join('');

    const boxes = Array.from({ length: dmgMax }, (_, i) => {
      const n   = i + 1;
      let   cls = n <= dmgVal ? 'wound-box filled' : 'wound-box';
      if (n === dmgDis) cls += ' veh-disabled-marker';
      return `<div class="${cls}" data-action="damageBox" data-box="${n}"></div>`;
    }).join('');

    const statusBadge = dmgVal >= dmgMax
      ? `<span class="veh-status-badge veh-status-destroyed">⚠ DESTROYED</span>`
      : dmgVal >= dmgDis
        ? `<span class="veh-status-badge veh-status-disabled">⚠ DISABLED</span>`
        : '';

    return `
      <header class="sheet-header">
        <div class="portrait-wrap">
          <img class="profile-img" src="${actor.img}" title="${actor.name}" data-edit="img"/>
        </div>
        <div class="header-fields">
          <div class="header-top">
            <input class="actor-name" type="text" name="name" value="${actor.name}" style="flex:1"/>
            <label class="inline-field" style="margin-left:10px;">Type
              <select name="system.vehicleType" style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border);border-radius:var(--r);padding:2px 6px;">
                ${typeOpts}
              </select>
            </label>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--sr-muted);margin-top:4px;">
            <span>Pilot:</span>
            <input type="text" name="system.controlledBy"
              value="${sys.controlledBy || ''}"
              placeholder="No pilot"
              style="flex:1;background:var(--sr-card);border:1px solid var(--sr-border);border-radius:var(--r);color:var(--sr-text);padding:2px 6px;font-size:12px;"/>
            ${sys.controlledBy?.trim()
              ? `<a data-action="openPilot" title="Open ${sys.controlledBy}'s sheet"
                    style="color:var(--sr-accent);cursor:pointer;font-size:13px;line-height:1;">
                   <i class="fa fa-external-link"></i>
                 </a>`
              : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:4px;">
            <span style="color:var(--sr-muted);">Mode:</span>
            ${(() => {
              const hasPilot = sys.controlledBy?.trim();
              const isVcr  = hasPilot && sys.vcrMode;
              const isRcd  = hasPilot && !sys.vcrMode;
              const isAuto = !hasPilot;
              const btn = (action, label, active, color) =>
                `<button type="button" data-action="${action}"
                   style="padding:2px 10px;font-size:11px;font-weight:bold;border-radius:var(--r);cursor:pointer;
                          border:1px solid ${active ? color : 'var(--sr-border)'};
                          background:${active ? `color-mix(in srgb,${color} 15%,transparent)` : 'transparent'};
                          color:${active ? color : 'var(--sr-muted)'};">${label}</button>`;
              return btn('setVcrMode', 'VCR',  isVcr,  'var(--sr-accent)')
                   + btn('setRcdMode', 'RCD',  isRcd,  'var(--sr-green)')
                   + btn('setAutoMode','Auto', isAuto, 'var(--sr-gold)');
            })()}
          </div>
          <div class="wound-tracks">
            <div class="wound-track-container">
              <div class="wound-track">
                <span class="wound-track-label">Damage</span>
                <div class="wound-boxes">${boxes}</div>
                ${statusBadge}
              </div>
              <div class="damage-buttons">
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="1"  title="Light (L)">L</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="3"  title="Moderate (M)">M</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="6"  title="Serious (S)">S</button>
                <button type="button" class="damage-btn" data-action="applyDamage" data-amount="10" title="Deadly (D)">D</button>
                <button type="button" class="damage-btn damage-btn-heal" data-action="healDamage"   title="Repair 1 box">−</button>
              </div>
            </div>
          </div>
        </div>
      </header>`;
  }

  _tabs() {
    const tabs = [['stats', 'Stats'], ['weapons', 'Weapons'], ['mods', 'Mods'], ['notes', 'Notes']];
    return `<nav class="sheet-tabs">
      ${tabs.map(([id, label]) =>
        `<a class="tab-btn ${this._activeTab === id ? 'active' : ''}"
            data-action="switchTab" data-tab="${id}">${label}</a>`
      ).join('')}
    </nav>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Stats                                                          */
  /* ------------------------------------------------------------------ */

  _tabStats(sys) {
    const attr = sys.attributes ?? {};

    const _stat = (key, label) => {
      const a = attr[key] ?? {};
      return `
        <div class="attr-block">
          <span class="attr-label">${label}</span>
          <div class="attr-row">
            <input class="attr-input" type="number" name="system.attributes.${key}.base" value="${a.base ?? 0}"/>
          </div>
        </div>`;
    };

    return `<div class="tab ${this._activeTab === 'stats' ? 'active' : ''}" data-tab="stats" style="overflow-y:auto">
      <div class="attributes-grid veh-stat-grid">
        ${_stat('handling', 'Handling')}
        ${_stat('speed',    'Speed')}
        ${_stat('accel',    'Accel')}
        ${_stat('body',     'Body')}
        ${_stat('armor',    'Armor')}
        ${_stat('sig',      'Sig')}
        ${_stat('autonav',  'Autonav')}
        ${_stat('pilot',    'Pilot')}
        ${_stat('sensor',   'Sensor')}
        ${_stat('cargo',    'Cargo')}
        ${_stat('load',     'Load')}
        <div class="attr-block">
          <span class="attr-label">Seating</span>
          <div class="attr-row">
            <input class="attr-input" type="number" name="system.seating" value="${sys.seating ?? 4}"/>
          </div>
        </div>
      </div>
      <div class="veh-info-grid">
        <label class="veh-info-field veh-info-full">Entry Points
          <input type="text" name="system.entryPoints" value="${sys.entryPoints ?? ''}"/>
        </label>
        <label class="veh-info-field">Cost (¥)
          <input type="number" name="system.cost" value="${sys.cost ?? 0}"/>
        </label>
        <label class="veh-info-field">Street Index
          <input type="number" name="system.streetIndex" value="${sys.streetIndex ?? 0}"/>
        </label>
        <label class="veh-info-field">Availability
          <input type="text" name="system.availability" value="${sys.availability ?? ''}"/>
        </label>
      </div>
      <div style="margin-top:8px;padding:4px 0;border-top:1px solid var(--sr-border);display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" class="btn-sm" data-action="rollContested"
                style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
          ⚔ Contested Roll
        </button>
        ${sys.controlledBy?.trim()
          ? `<button type="button" class="btn-sm" data-action="drivingTest"
                     style="background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border)">
               🚗 Driving Test
             </button>`
          : `<button type="button" class="btn-sm" disabled
                     style="background:var(--sr-surface);color:var(--sr-muted);border:1px solid var(--sr-border);opacity:0.5;cursor:not-allowed;">
               No Driver
             </button>`
        }
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Weapons                                                        */
  /* ------------------------------------------------------------------ */

  _tabWeapons(actor) {
    const firearms      = actor.items.filter(i => i.type === 'firearm');
    const vehWeapons    = actor.items.filter(i => i.type === 'vehicleweapon')
      .sort((a, b) => a.name.localeCompare(b.name));

    const catFirearms   = firearms.filter(w => (w.system.category ?? '') !== '');
    const uncatFirearms = firearms.filter(w => (w.system.category ?? '') === '');

    const fRows = catFirearms.length
      ? catFirearms.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true)}
          </div>`).join('')
      : '<p class="empty-list">No firearms.</p>';

    const vwRows = vehWeapons.length
      ? vehWeapons.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.weaponType || '—'}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, false)}
          </div>`).join('')
      : '<p class="empty-list">No vehicle weapons.</p>';

    return `<div class="tab ${this._activeTab === 'weapons' ? 'active' : ''}" data-tab="weapons" style="overflow-y:auto">
      <h3 class="section-hdr">Firearms</h3>
      <div class="list-header"><span>Name</span><span>Damage</span><span>Mode</span><span>Conceal</span><span>Ammo</span><span></span></div>
      ${fRows}
      ${uncatFirearms.length ? `
        <h3 class="section-hdr" style="margin-top:1rem;color:var(--sr-amber)">Uncategorised Firearms</h3>
        <div class="list-header"><span>Name</span><span>Damage</span><span>Mode</span><span>Conceal</span><span>Ammo</span><span></span></div>
        ${uncatFirearms.map(w => `
          <div class="item-row" data-item-id="${w.id}">
            <span class="item-name">${w.name}</span>
            <span class="item-cell">${w.system.damage || '—'}</span>
            <span class="item-cell">${w.system.mode || '—'}</span>
            <span class="item-cell">${w.system.concealability ?? '—'}</span>
            <span class="item-cell">${w.system.ammunition || '—'}</span>
            ${this._itemControls(w.id, true)}
          </div>`).join('')}
      ` : ''}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="firearm">+ Add Firearm</button>

      <h3 class="section-hdr" style="margin-top:1.2rem">Vehicle Weapons</h3>
      <div class="list-header"><span>Name</span><span>Type</span><span>Damage</span><span>Mode</span><span>Ammo</span><span></span></div>
      ${vwRows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="vehicleweapon">+ Add Vehicle Weapon</button>
    </div>`;
  }

  _itemControls(itemId, hasRoll) {
    return `<div class="item-controls">
      ${hasRoll ? `<i class="fas fa-dice-d6 rollable" data-action="rollWeapon" data-item-id="${itemId}" title="Roll"></i>` : ''}
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  _meleeControls(itemId) {
    return `<div class="item-controls">
      <i class="fas fa-dice-d6 rollable" data-action="rollMelee" data-item-id="${itemId}" title="Melee attack"></i>
      <i class="fas fa-edit" data-action="itemEdit" data-item-id="${itemId}" title="Edit"></i>
      <i class="fas fa-trash" data-action="itemDelete" data-item-id="${itemId}" title="Delete"></i>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Mods                                                           */
  /* ------------------------------------------------------------------ */

  _tabMods(actor) {
    const mods = actor.items.filter(i => i.type === 'vehiclemod')
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = mods.length ? mods.map(m => `
      <div class="item-row" data-item-id="${m.id}">
        <span class="item-name">${m.name}</span>
        <span class="item-cell">${m.system.cfCost || '—'}</span>
        <span class="item-cell">${m.system.installEquipment || '—'}</span>
        <span class="item-cell" style="color:var(--sr-muted);font-size:11px">${m.system.installTime || '—'}</span>
        <span class="item-cell">${m.system.cost ? m.system.cost.toLocaleString() + '¥' : '—'}</span>
        <span class="item-cell">
          <a class="item-control" data-action="itemEdit" data-item-id="${m.id}" title="Edit">✎</a>
          <a class="item-control" data-action="itemDelete" data-item-id="${m.id}" title="Delete">✕</a>
        </span>
      </div>`).join('') : '<p class="empty-list">No mods installed.</p>';

    return `<div class="tab ${this._activeTab === 'mods' ? 'active' : ''}" data-tab="mods" style="overflow-y:auto">
      <div class="list-header">
        <span>Mod</span><span>CF</span><span>Equipment</span><span>Install Time</span><span>Cost</span><span></span>
      </div>
      ${rows}
      <button type="button" class="btn-add" data-action="itemCreate" data-type="vehiclemod">+ Add Mod</button>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Tab: Notes                                                          */
  /* ------------------------------------------------------------------ */

  _tabNotes(sys) {
    return `<div class="tab ${this._activeTab === 'notes' ? 'active' : ''}" data-tab="notes">
      <textarea name="system.notes"
        style="width:100%;height:300px;background:var(--sr-surface);color:var(--sr-text);border:1px solid var(--sr-border);border-radius:var(--r);padding:8px;resize:vertical;box-sizing:border-box;"
      >${sys.notes ?? ''}</textarea>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  Actions                                                             */
  /* ------------------------------------------------------------------ */

  static _onSwitchTab(ev, target) {
    this._activeTab = target.dataset.tab;
    this.render();
  }

  static async _onDamageBox(ev, target) {
    const box    = parseInt(target.dataset.box);
    const cur    = this.actor.system.damage?.value ?? 0;
    const newVal = cur === box ? box - 1 : box;
    await this.actor.update({ 'system.damage.value': newVal });
  }

  static async _onApplyDamage(ev, target) {
    const amount  = parseInt(target.dataset.amount);
    const current = this.actor.system.damage?.value ?? 0;
    const max     = (this.actor.system.attributes?.body?.base ?? 4) * 2;
    await this.actor.update({ 'system.damage.value': Math.min(max, current + amount) });
  }

  static async _onHealDamage(_ev, _target) {
    const current = this.actor.system.damage?.value ?? 0;
    await this.actor.update({ 'system.damage.value': Math.max(0, current - 1) });
  }

  static async _onItemCreate(_ev, target) {
    const type = target.dataset.type ?? 'firearm';
    await this.actor.createEmbeddedDocuments('Item', [{ name: `New ${type}`, type }]);
    this.render();
  }

  static async _onItemEdit(_ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    item?.sheet.render(true);
  }

  static async _onRollContested(_ev, _target) {
    await game.sr3e.SR3EActor.openContestedDialog(this.actor);
  }

  static async _onOpenPilot(_ev, _target) {
    const name  = this.actor.system.controlledBy?.trim();
    const pilot = name && game.actors.find(a => a.name === name);
    if (pilot) pilot.sheet.render(true);
    else if (name) ui.notifications.warn(`Actor "${name}" not found.`);
  }

  static async _onDrivingTest(_ev, _target) {
    const actor      = this.actor;
    const sys        = actor.system;
    const driverName = sys.controlledBy?.trim();
    if (!driverName) return;

    const driver = game.actors.find(a => a.name === driverName);
    if (!driver) {
      ui.notifications.warn(`Driver "${driverName}" not found in actor list.`);
      return;
    }

    // Map vehicle type → skill name keywords
    const TYPE_KEYWORDS = {
      car:        ['car', 'automobile'],
      van:        ['car', 'automobile', 'van'],
      bike:       ['motorcycle', 'bike', 'cycle'],
      truck:      ['truck'],
      drone:      ['rpv', 'remotely piloted', 'drone'],
      boat:       ['boat', 'watercraft'],
      hovercraft: ['hovercraft'],
      aircraft:   ['aircraft', 'rotorcraft', 'fixed-wing', 'vectored'],
      other:      [],
    };

    const vType    = sys.vehicleType ?? 'car';
    const keywords = TYPE_KEYWORDS[vType] ?? [];
    const skills   = driver.items.filter(i => i.type === 'skill');

    let matchedSkill     = null;
    let useSpecialisation = false;

    for (const skill of skills) {
      const sName = (skill.system.skillName || skill.name || '').toLowerCase();
      if (keywords.some(kw => sName.includes(kw))) {
        matchedSkill = skill;
        const spec = (skill.system.specialisation || '').toLowerCase();
        if (spec && actor.name.toLowerCase().includes(spec)) useSpecialisation = true;
        break;
      }
    }

    let skillDice, poolLabel;
    if (matchedSkill) {
      const rating    = matchedSkill.system.rating ?? 1;
      const specBonus = useSpecialisation ? 2 : 0;
      skillDice = rating + specBonus;
      const specNote = useSpecialisation ? ` + spec (${matchedSkill.system.specialisation})` : '';
      poolLabel = `${matchedSkill.system.skillName || matchedSkill.name} ${rating}${specNote}`;
    } else {
      const reaction = driver.system.attributes?.reaction?.value
                    ?? driver.system.attributes?.reaction?.base ?? 3;
      skillDice = reaction;
      poolLabel = `Reaction ${reaction} (no vehicle skill)`;
    }

    // Vehicle stats
    const autonav  = sys.attributes?.autonav?.base ?? 0;
    const handling = sys.attributes?.handling?.base ?? 4;
    const basePool = skillDice + autonav;

    // Check for VCR cyberware
    const vcrItem   = driver.items.find(i =>
      i.type === 'cyberware' &&
      (i.name.toLowerCase().includes('vcr') || i.name.toLowerCase().includes('vehicle control rig'))
    );
    const vcrRating = vcrItem ? (vcrItem.system.rating ?? 1) : 0;

    const datajackRow = !vcrRating ? `
      <label class="drv-field">Non-Rigger w/ Datajack
        <select id="drv-datajack">
          <option value="0">No (0)</option>
          <option value="-1">Yes (−1 TN)</option>
        </select>
      </label>` : '';

    const riggerRow = vcrRating ? `
      <label class="drv-field drv-full">Rigger — VCR Rating ${vcrRating}
        <select id="drv-rigger">
          <option value="0">Not using VCR (0)</option>
          <option value="${-vcrRating * 2}">Using VCR (−${vcrRating * 2} TN)</option>
        </select>
      </label>` : '';

    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: `Driving Test — ${actor.name}` },
      content: `
        <style>
          .drv-info { background:#1c2030; border-radius:4px; padding:8px; margin-bottom:10px; font-size:12px; }
          .drv-info-row { display:flex; justify-content:space-between; margin:2px 0; color:#7880a0; }
          .drv-info-row span:last-child { color:#dde1f0; font-weight:bold; }
          .drv-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; font-size:12px; }
          .drv-full { grid-column:1/-1; }
          label.drv-field { display:flex; flex-direction:column; gap:3px; color:#7880a0; }
          label.drv-field select, label.drv-field input[type=number] {
            background:#1c2030; color:#dde1f0; border:1px solid #3a9fd6;
            border-radius:3px; padding:2px 5px; width:100%; box-sizing:border-box;
          }
          .drv-preview { margin-top:10px; padding:6px 10px; background:#1c2030;
            border-radius:4px; display:flex; gap:20px; font-size:12px; color:#7880a0; }
          .drv-preview strong { color:#dde1f0; }
        </style>
        <div class="drv-info">
          <div class="drv-info-row"><span>Driver</span><span>${driver.name}</span></div>
          <div class="drv-info-row"><span>Skill</span><span>${poolLabel}</span></div>
          <div class="drv-info-row"><span>Autonav</span><span>${autonav}</span></div>
          <div class="drv-info-row"><span>Handling (base TN)</span><span>${handling}</span></div>
          ${vcrRating ? `<div class="drv-info-row"><span>VCR</span><span>Rating ${vcrRating}</span></div>` : ''}
        </div>
        <div class="drv-grid">
          <label class="drv-field">Unfamiliar Vehicle
            <select id="drv-unfamiliar">
              <option value="0">No (0)</option>
              <option value="1">Yes (+1 TN)</option>
            </select>
          </label>
          <label class="drv-field">Stress Level
            <select id="drv-stress">
              <option value="-1">Relaxed (−1 TN)</option>
              <option value="0" selected>Normal (0)</option>
              <option value="1">Stressed (+1 TN)</option>
              <option value="2">Tense (+2 TN)</option>
              <option value="3">High (+3 TN)</option>
              <option value="4">Very High (+4 TN)</option>
              <option value="5">Extreme (+5 TN)</option>
            </select>
          </label>
          <label class="drv-field">Vehicle Size
            <select id="drv-size">
              <option value="0">Normal (0)</option>
              <option value="2">Large (+2 TN)</option>
              <option value="3">Very Large (+3 TN)</option>
            </select>
          </label>
          <label class="drv-field">Weather
            <select id="drv-weather">
              <option value="0">Normal (0)</option>
              <option value="2">Bad (+2 TN)</option>
              <option value="4">Terrible (+4 TN)</option>
            </select>
          </label>
          <label class="drv-field">Terrain
            <select id="drv-terrain">
              <option value="-1">Open (−1 TN)</option>
              <option value="0" selected>Normal (0)</option>
              <option value="1">Restricted (+1 TN)</option>
              <option value="3">Tight (+3 TN)</option>
            </select>
          </label>
          <label class="drv-field">Action During Combat
            <select id="drv-combat">
              <option value="0">No (0)</option>
              <option value="2">Yes (+2 TN)</option>
            </select>
          </label>
          ${datajackRow}
          ${riggerRow}
          <label class="drv-field">Control Pool Dice
            <input id="drv-control" type="number" value="0" min="0" max="30"/>
          </label>
          <label class="drv-field">Base TN
            <input id="drv-tn" type="number" value="${handling}" min="2" max="30"/>
          </label>
          <label class="drv-field drv-full">Total Pool Dice
            <input id="drv-pool" type="number" value="${basePool}" min="1" max="30"/>
          </label>
        </div>
        <div class="drv-preview">
          <span>Final TN: <strong id="drv-tn-out">${handling}</strong></span>
          <span>Pool: <strong id="drv-pool-out">${basePool}</strong></span>
        </div>
      `,
      render: (_ev, dialog) => {
        const el = dialog.element;
        const update = () => {
          const baseTN     = parseInt(el.querySelector('#drv-tn')?.value      ?? handling);
          const basePoolEl = parseInt(el.querySelector('#drv-pool')?.value    ?? basePool);
          const selIds     = ['#drv-unfamiliar','#drv-stress','#drv-size',
                              '#drv-weather','#drv-terrain','#drv-combat',
                              '#drv-datajack','#drv-rigger'];
          const mods = selIds.reduce((sum, id) => {
            const node = el.querySelector(id);
            return sum + (node ? parseInt(node.value ?? 0) : 0);
          }, 0);
          const tnOut   = el.querySelector('#drv-tn-out');
          const poolOut = el.querySelector('#drv-pool-out');
          if (tnOut)   tnOut.textContent   = Math.max(2, baseTN + mods);
          if (poolOut) poolOut.textContent = basePoolEl;
        };

        // Auto-update total pool when control pool dice changes
        const controlInp = el.querySelector('#drv-control');
        const poolInp    = el.querySelector('#drv-pool');
        const syncPool   = () => {
          const ctrl = parseInt(controlInp?.value ?? 0);
          if (poolInp) poolInp.value = basePool + ctrl;
          update();
        };
        controlInp?.addEventListener('input',  syncPool);
        controlInp?.addEventListener('change', syncPool);

        el.querySelectorAll('select, input').forEach(n => {
          n.addEventListener('change', update);
          n.addEventListener('input',  update);
        });
      },
      buttons: [
        {
          label: 'Roll',
          action: 'roll',
          default: true,
          callback: (_e, _b, dialog) => {
            const el     = dialog.element;
            const getInt = id => parseInt(el.querySelector(id)?.value ?? 0);
            const baseTN   = getInt('#drv-tn');
            const totalPool = getInt('#drv-pool');
            const selIds   = ['#drv-unfamiliar','#drv-stress','#drv-size',
                              '#drv-weather','#drv-terrain','#drv-combat',
                              '#drv-datajack','#drv-rigger'];
            const mods = selIds.reduce((sum, id) => {
              const node = el.querySelector(id);
              return sum + (node ? parseInt(node.value ?? 0) : 0);
            }, 0);
            result = { pool: totalPool, tn: Math.max(2, baseTN + mods) };
          },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await driver.rollPool(result.pool, result.tn, `Driving Test — ${actor.name}`);
  }

  static async _onItemDelete(_ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Delete ${item.name}?` },
      content: `<p>Delete <strong>${item.name}</strong>? This cannot be undone.</p>`,
    });
    if (confirmed) await item.delete();
  }

  static async _onRollWeapon(ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.rollWeapon({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onRollMelee(ev, target) {
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    await item.rollMelee({ physicalDice: ev.shiftKey ?? false });
  }

  static async _onSetVcrMode(_ev, _target) {
    await this.actor.update({ 'system.vcrMode': true });
  }

  static async _onSetRcdMode(_ev, _target) {
    await this.actor.update({ 'system.vcrMode': false });
  }

  static async _onSetAutoMode(_ev, _target) {
    await this.actor.update({ 'system.vcrMode': false, 'system.controlledBy': '' });
  }
}

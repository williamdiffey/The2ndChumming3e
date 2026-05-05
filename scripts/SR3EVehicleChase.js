const VEHICLE_TYPES = [
  { key: 'car',          label: 'Car',                        score:   0 },
  { key: 'sports_car',   label: 'Sports Car',                 score:   3 },
  { key: 'limousine',    label: 'Limousine / Light Truck / Van', score:-3 },
  { key: 'motorcycle',   label: 'Motorcycle / Motorbike',     score:   5 },
  { key: 'heavy_truck',  label: 'Heavy Truck',                score:  -5 },
  { key: 'lav',          label: 'LAV',                        score:  10 },
  { key: 'hovercraft',   label: 'Hovercraft',                 score:   2 },
  { key: 'helicopter',   label: 'Helicopter',                 score:   5 },
  { key: 'lta',          label: 'LTA',                        score: -10 },
  { key: 'large_airplane',label:'Large Airplane',             score:  -5 },
  { key: 'hsct',         label: 'HSCT / Suborbital',          score: -15 },
  { key: 'fighter_jet',  label: 'Fighter Jet',                score:  20 },
];

const TERRAIN_TYPES = [
  { key: 'open',       label: 'Open',       score:   0 },
  { key: 'normal',     label: 'Normal',     score:  -2 },
  { key: 'restricted', label: 'Restricted', score:  -4 },
  { key: 'tight',      label: 'Tight',      score: -10 },
];

// Map vehicle actor vehicleType → default chase type key
const ACTOR_TYPE_DEFAULT = {
  car:        'car',
  bike:       'motorcycle',
  truck:      'heavy_truck',
  van:        'limousine',
  drone:      'car',
  boat:       'car',
  hovercraft: 'hovercraft',
  aircraft:   'helicopter',
  other:      'car',
};

// Map chase vehicle type key → skill name keywords for driver pool lookup
const SKILL_KEYWORDS = {
  car:          ['car', 'automobile'],
  sports_car:   ['car', 'automobile'],
  limousine:    ['car', 'automobile', 'van'],
  motorcycle:   ['motorcycle', 'bike', 'cycle'],
  heavy_truck:  ['truck'],
  lav:          ['walker', 'lav', 'tracks'],
  hovercraft:   ['hovercraft'],
  helicopter:   ['rotor', 'helicopter'],
  lta:          ['lta', 'airship'],
  large_airplane:['fixed-wing', 'aircraft'],
  hsct:         ['suborbital', 'semiballistic'],
  fighter_jet:  ['fixed-wing', 'aircraft', 'vectored'],
};

export class SR3EVehicleChase extends foundry.applications.api.ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id:      'sr3e-vehicle-chase',
    classes: ['sr3e', 'vehicle-chase'],
    tag:     'div',
    window:  { title: 'Vehicle Chase', resizable: true },
    position:{ width: 900, height: 660 },
    resizable: true,
  };

  static instance = null;

  static open() {
    if (!SR3EVehicleChase.instance || SR3EVehicleChase.instance.rendered === false) {
      SR3EVehicleChase.instance = new SR3EVehicleChase();
    }
    SR3EVehicleChase.instance.render(true);
    return SR3EVehicleChase.instance;
  }

  /* ------------------------------------------------------------------ */
  /*  State                                                               */
  /* ------------------------------------------------------------------ */

  _turn         = 1;
  _terrain      = 'normal';
  _participants = [];
  /*
    participant = {
      id:                string,
      vehicleActorId:    string,
      driverActorId:     string,
      passengerActorIds: string[],
      chaseVehicleType:  string,   // key into VEHICLE_TYPES (fixed for chase)
      speed:             number,
      distance:          number,   // 0 = front, negative = behind
      controlAlloc:      number,
      driverPoints:      number|null,
      initiatives:       { [actorId]: number },
    }
  */

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                           */
  /* ------------------------------------------------------------------ */

  async _renderHTML(_ctx, _opts) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;';
    div.innerHTML = this._build();
    return div;
  }

  _replaceHTML(result, content, _opts) {
    content.replaceChildren(result);
  }

  _onRender(_ctx, _opts) {
    const el = this.element;

    el.querySelector('#chase-terrain')?.addEventListener('change', ev => {
      this._terrain = ev.target.value;
      this._refreshAllScores();
    });

    el.querySelector('#chase-add-vehicle')?.addEventListener('click', () => this._addParticipant());
    el.querySelector('#chase-roll-all-driver')?.addEventListener('click', () => this._rollAllDriverPoints());
    el.querySelector('#chase-roll-all-init')?.addEventListener('click',   () => this._rollAllInitiative());
    el.querySelector('#chase-next-turn')?.addEventListener('click',        () => this._nextTurn());
    el.querySelector('#chase-end')?.addEventListener('click',              () => this._endChase());
    el.querySelector('#chase-action-accel')?.addEventListener('click',    () => this._actionAccelBrake());
    el.querySelector('#chase-action-position')?.addEventListener('click', () => this._actionPositioning());
    el.querySelector('#chase-action-ram')?.addEventListener('click',      () => this._actionRamming());
    el.querySelector('#chase-action-crash')?.addEventListener('click',    () => this._actionCrash());
    el.querySelector('#chase-action-hiding')?.addEventListener('click',     () => this._actionHiding());
    el.querySelector('#chase-action-relocate')?.addEventListener('click',  () => this._actionRelocating());

    for (const p of this._participants) {
      this._wireParticipant(p);
    }
  }

  _wireParticipant(p) {
    const el  = this.element;
    const pid = p.id;

    // Vehicle actor select → auto-set chase type, full re-render (structure may change)
    el.querySelector(`#p-${pid}-vehicle`)?.addEventListener('change', ev => {
      p.vehicleActorId = ev.target.value;
      const vActor = game.actors.get(p.vehicleActorId);
      if (vActor) p.chaseVehicleType = ACTOR_TYPE_DEFAULT[vActor.system.vehicleType] ?? 'car';
      p.driverPoints = null;
      this.render();
    });

    // Chase vehicle type (score only) → in-place score update
    el.querySelector(`#p-${pid}-vtype`)?.addEventListener('change', ev => {
      p.chaseVehicleType = ev.target.value;
      this._refreshScores(p);
    });

    // Speed → in-place score update
    el.querySelector(`#p-${pid}-speed`)?.addEventListener('input', ev => {
      p.speed = (parseFloat(ev.target.value) || 0) / 1.2; // store as km/ct
      this._refreshScores(p);
    });

    // Distance → just store
    el.querySelector(`#p-${pid}-distance`)?.addEventListener('input', ev => {
      p.distance = parseInt(ev.target.value) || 0;
    });

    // Driver select → auto-detect VCR, full re-render
    el.querySelector(`#p-${pid}-driver`)?.addEventListener('change', ev => {
      p.driverActorId = ev.target.value;
      const detected  = this._detectVcr(p.driverActorId);
      p.vcrRating     = detected;
      p.vcrActive     = detected > 0;
      p.controlAlloc  = this._controlPool(p);
      p.driverPoints  = null;
      this.render();
    });

    // VCR rating → update stored value, refresh control pool label in-place
    el.querySelector(`#p-${pid}-vcr-rating`)?.addEventListener('input', ev => {
      p.vcrRating = parseInt(ev.target.value) || 0;
      const newMax = this._controlPool(p);
      const lbl = el.querySelector(`#p-${pid}-ctrl-lbl`);
      const inp = el.querySelector(`#p-${pid}-control`);
      if (lbl) lbl.textContent = `Control Pool (max ${newMax})`;
      if (inp) inp.max = newMax;
    });

    // VCR active toggle → refresh control pool max
    el.querySelector(`#p-${pid}-vcr-active`)?.addEventListener('change', ev => {
      p.vcrActive = ev.target.checked;
      const newMax = this._controlPool(p);
      const lbl = el.querySelector(`#p-${pid}-ctrl-lbl`);
      const inp = el.querySelector(`#p-${pid}-control`);
      if (lbl) lbl.textContent = `Control Pool (max ${newMax})`;
      if (inp) inp.max = newMax;
    });

    // Control allocation → just store (used when roll button is clicked)
    el.querySelector(`#p-${pid}-control`)?.addEventListener('input', ev => {
      p.controlAlloc = parseInt(ev.target.value) || 0;
    });

    // Roll driver points
    el.querySelector(`#p-${pid}-roll-driver`)?.addEventListener('click', () => this._rollDriverPoints(pid));

    // Roll initiative for this vehicle
    el.querySelector(`#p-${pid}-roll-init`)?.addEventListener('click', () => this._rollInitiative(pid));

    // Add passenger via select change
    el.querySelector(`#p-${pid}-add-passenger`)?.addEventListener('change', ev => {
      const aid = ev.target.value;
      if (!aid) return;
      if (!p.passengerActorIds.includes(aid)) p.passengerActorIds.push(aid);
      this.render();
    });

    // Remove individual passenger
    el.querySelectorAll(`[data-remove-passenger][data-pid="${pid}"]`).forEach(btn => {
      btn.addEventListener('click', ev => {
        const aid = ev.currentTarget.dataset.actorId;
        p.passengerActorIds = p.passengerActorIds.filter(id => id !== aid);
        this.render();
      });
    });

    // Remove whole vehicle
    el.querySelector(`#p-${pid}-remove`)?.addEventListener('click', () => {
      this._participants = this._participants.filter(x => x.id !== pid);
      this.render();
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Score helpers — in-place DOM update to avoid focus loss            */
  /* ------------------------------------------------------------------ */

  _scores(p) {
    const terrainScore = TERRAIN_TYPES.find(t => t.key === this._terrain)?.score ?? 0;
    const vehicleScore = VEHICLE_TYPES.find(v => v.key === p.chaseVehicleType)?.score ?? 0;
    const speedScore   = Math.floor(p.speed / 10);
    const maneuver     = typeof p.driverPoints === 'number'
      ? vehicleScore + terrainScore + speedScore + p.driverPoints
      : null;
    return { terrainScore, vehicleScore, speedScore, maneuver };
  }

  _refreshScores(p) {
    const el = this.element;
    const { terrainScore, vehicleScore, speedScore, maneuver } = this._scores(p);
    const fmt = n => (n >= 0 ? '+' : '') + n;
    el.querySelector(`#p-${p.id}-sv`)?.replaceChildren(document.createTextNode(fmt(vehicleScore)));
    el.querySelector(`#p-${p.id}-st`)?.replaceChildren(document.createTextNode(fmt(terrainScore)));
    el.querySelector(`#p-${p.id}-ss`)?.replaceChildren(document.createTextNode(fmt(speedScore)));
    el.querySelector(`#p-${p.id}-sm`)?.replaceChildren(document.createTextNode(maneuver ?? '?'));
  }

  _refreshAllScores() {
    for (const p of this._participants) this._refreshScores(p);
  }

  /* ------------------------------------------------------------------ */
  /*  HTML builders                                                       */
  /* ------------------------------------------------------------------ */

  _build() {
    const terrainOpts = TERRAIN_TYPES.map(t =>
      `<option value="${t.key}" ${this._terrain === t.key ? 'selected' : ''}>${t.label} (${t.score <= 0 ? t.score : '+' + t.score})</option>`
    ).join('');

    return `
      <div class="chase-inner">
        <div class="chase-header">
          <span class="chase-turn-badge">Turn ${this._turn}</span>
          <label class="chase-terrain-label">Terrain
            <select id="chase-terrain">${terrainOpts}</select>
          </label>
          <div style="flex:1"></div>
          <button id="chase-roll-all-driver" type="button" class="btn-sm">Roll All Driver Points</button>
          <button id="chase-roll-all-init"   type="button" class="btn-sm">Roll All Initiative</button>
        </div>
        <div class="chase-participants">
          ${this._participants.map(p => this._buildParticipant(p)).join('')}
          <button id="chase-add-vehicle" type="button" class="btn-add" style="margin-top:8px;">+ Add Vehicle</button>
        </div>
        <div class="chase-actions">
          <span class="chase-actions-label">Actions:</span>
          <button id="chase-action-accel"    type="button" class="btn-sm">Accel / Brake</button>
          <button id="chase-action-position" type="button" class="btn-sm">Positioning</button>
          <button id="chase-action-ram"      type="button" class="btn-sm">Ramming</button>
          <button id="chase-action-crash"    type="button" class="btn-sm">Crash</button>
          <button id="chase-action-hiding"    type="button" class="btn-sm">Hiding</button>
          <button id="chase-action-relocate" type="button" class="btn-sm">Relocating</button>
        </div>
        <div class="chase-footer">
          <button id="chase-next-turn" type="button" class="btn-add">Next Turn →</button>
          <button id="chase-end"       type="button" class="btn-sm chase-end-btn">End Chase</button>
        </div>
      </div>`;
  }

  _buildParticipant(p) {
    const pid = p.id;
    const { terrainScore, vehicleScore, speedScore, maneuver } = this._scores(p);
    const fmt        = n => (n >= 0 ? '+' : '') + n;
    const dp         = p.driverPoints ?? '—';
    const dmgInfo    = this._vehicleDamageInfo(p.vehicleActorId);
    const dmgDisplay = dmgInfo.condition === 'none' ? '—'
      : `${dmgInfo.label} (+${dmgInfo.tnMod} TN, −${dmgInfo.initPenalty} Init)`;

    const vehicles   = game.actors.filter(a => a.type === 'vehicle');
    const characters = game.actors.filter(a => ['character', 'npc'].includes(a.type));
    const controlPool = this._controlPool(p);

    const vehicleOpts = [
      `<option value="">— Select Vehicle —</option>`,
      ...vehicles.map(a => `<option value="${a.id}" ${p.vehicleActorId === a.id ? 'selected' : ''}>${a.name}</option>`),
    ].join('');

    const driverOpts = [
      `<option value="">— None —</option>`,
      ...characters.map(a => `<option value="${a.id}" ${p.driverActorId === a.id ? 'selected' : ''}>${a.name}</option>`),
    ].join('');

    const vtypeOpts = VEHICLE_TYPES.map(vt =>
      `<option value="${vt.key}" ${p.chaseVehicleType === vt.key ? 'selected' : ''}>${vt.label} (${fmt(vt.score)})</option>`
    ).join('');

    const passengerTags = p.passengerActorIds.map(aid => {
      const a = game.actors.get(aid);
      return `<span class="chase-passenger-tag">
        ${a?.name ?? '?'}
        <a data-remove-passenger data-pid="${pid}" data-actor-id="${aid}">✕</a>
      </span>`;
    }).join('');

    const availPassengers = characters.filter(a =>
      a.id !== p.driverActorId && !p.passengerActorIds.includes(a.id)
    );
    const passengerAddOpts = [
      `<option value="">+ Add Passenger</option>`,
      ...availPassengers.map(a => `<option value="${a.id}">${a.name}</option>`),
    ].join('');

    const allActorIds = [p.driverActorId, ...p.passengerActorIds].filter(Boolean);
    const initRows = allActorIds.map(aid => {
      const a    = game.actors.get(aid);
      const init = p.initiatives[aid];
      const role = aid === p.driverActorId ? 'Driver' : 'Passenger';
      return `<div class="chase-init-row">
        <span>${a?.name ?? '?'} <small class="chase-role">(${role})</small></span>
        <strong>${init ?? '—'}</strong>
      </div>`;
    }).join('');

    return `
      <div class="chase-participant">
        <div class="chase-p-header">
          <select id="p-${pid}-vehicle" class="chase-vehicle-select">${vehicleOpts}</select>
          <button id="p-${pid}-remove" type="button" class="btn-sm chase-remove-btn">Remove</button>
        </div>
        <div class="chase-p-body">

          <div class="chase-p-left">
            <label class="chase-field">Chase Type (fixed)
              <select id="p-${pid}-vtype">${vtypeOpts}</select>
            </label>
            <div class="chase-field-pair">
              <label class="chase-field">Speed (km/h)
                <input id="p-${pid}-speed" type="number" value="${Math.round(p.speed * 1.2)}" min="0"/>
              </label>
              <label class="chase-field">Distance (m)
                <input id="p-${pid}-distance" type="number" value="${p.distance}"/>
              </label>
            </div>
            <div class="chase-scores">
              <div class="chase-score-row">
                <span>Vehicle</span><strong id="p-${pid}-sv">${fmt(vehicleScore)}</strong>
              </div>
              <div class="chase-score-row">
                <span>Terrain</span><strong id="p-${pid}-st">${fmt(terrainScore)}</strong>
              </div>
              <div class="chase-score-row">
                <span>Speed</span><strong id="p-${pid}-ss">${fmt(speedScore)}</strong>
              </div>
              <div class="chase-score-row">
                <span>Driver Pts</span><strong>${dp}</strong>
              </div>
              <div class="chase-score-row chase-maneuver-row">
                <span>Maneuver</span><strong id="p-${pid}-sm">${maneuver ?? '?'}</strong>
              </div>
              ${dmgInfo.condition !== 'none' ? `
              <div class="chase-score-row" style="color:${dmgInfo.isDisabled || dmgInfo.isDestroyed ? '#c94040' : '#d49030'};">
                <span>Damage</span><strong>${dmgDisplay}</strong>
              </div>` : ''}
            </div>
          </div>

          <div class="chase-p-right">
            <label class="chase-field">Driver
              <select id="p-${pid}-driver">${driverOpts}</select>
            </label>
            ${p.driverActorId ? `
              <div class="chase-field-pair">
                <label class="chase-field">VCR Rating
                  <input id="p-${pid}-vcr-rating" type="number" value="${p.vcrRating}" min="0" max="6"/>
                </label>
                <label class="chase-field chase-vcr-active">
                  <input type="checkbox" id="p-${pid}-vcr-active" ${p.vcrActive ? 'checked' : ''}/>
                  VCR Active
                </label>
              </div>
              <div class="chase-field-pair">
                <label class="chase-field">
                  <span id="p-${pid}-ctrl-lbl">Control Pool (max ${controlPool})</span>
                  <input id="p-${pid}-control" type="number"
                    value="${Math.min(p.controlAlloc, controlPool)}" min="0" max="${controlPool}"/>
                </label>
                <button id="p-${pid}-roll-driver" type="button" class="btn-sm" style="align-self:flex-end;">
                  Roll Driver
                </button>
              </div>
            ` : `<div class="chase-no-driver">No driver assigned</div>`}

            <div class="chase-initiative">
              <div class="chase-init-header">Initiative</div>
              ${initRows || '<div class="chase-no-driver">No actors</div>'}
              ${allActorIds.length ? `
                <button id="p-${pid}-roll-init" type="button" class="btn-sm" style="margin-top:4px;">
                  Roll Initiative
                </button>` : ''}
            </div>

            <div class="chase-passengers">
              ${passengerTags}
              <select id="p-${pid}-add-passenger" class="chase-add-passenger">${passengerAddOpts}</select>
            </div>
          </div>

        </div>
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /*  State mutations                                                     */
  /* ------------------------------------------------------------------ */

  _addParticipant() {
    this._participants.push({
      id:               foundry.utils.randomID(),
      vehicleActorId:   '',
      driverActorId:    '',
      passengerActorIds:[],
      chaseVehicleType: 'car',
      speed:            0,
      distance:         0,
      controlAlloc:     0,
      vcrRating:        0,
      vcrActive:        false,
      driverPoints:     null,
      initiatives:      {},
    });
    this.render();
  }

  _controlPool(p) {
    const actor = game.actors.get(p.driverActorId);
    if (!actor) return 0;
    const reaction = actor.system.attributes?.reaction?.value
                  ?? actor.system.attributes?.reaction?.base ?? 0;
    return reaction + (p.vcrActive ? (p.vcrRating ?? 0) : 0);
  }

  _detectVcr(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) return 0;
    const vcr = actor.items.find(i =>
      i.type === 'cyberware' &&
      (i.name.toLowerCase().includes('vcr') || i.name.toLowerCase().includes('vehicle control rig'))
    );
    return vcr ? (vcr.system.rating ?? 1) : 0;
  }

  _vehicleDamageInfo(vehicleActorId) {
    const none = { condition: 'none', label: 'None', tnMod: 0, initPenalty: 0, speedMod: 1.0, isDisabled: false, isDestroyed: false };
    const vehicle = game.actors.get(vehicleActorId);
    if (!vehicle) return none;
    const sys    = vehicle.system;
    const body   = sys.attributes?.body?.base ?? 4;
    const dmgVal = sys.damage?.value ?? 0;
    if (dmgVal >= body * 2) return { condition: 'destroyed', label: '⚠ DESTROYED', tnMod: 3, initPenalty: 3, speedMod: 0.5, isDisabled: true,  isDestroyed: true  };
    if (dmgVal >= body)     return { condition: 'disabled',  label: '⚠ DISABLED',  tnMod: 3, initPenalty: 3, speedMod: 0.5, isDisabled: true,  isDestroyed: false };
    if (dmgVal >= 6)        return { condition: 'serious',   label: 'Serious',      tnMod: 3, initPenalty: 3, speedMod: 0.5, isDisabled: false, isDestroyed: false };
    if (dmgVal >= 3)        return { condition: 'moderate',  label: 'Moderate',     tnMod: 2, initPenalty: 2, speedMod: 0.75, isDisabled: false, isDestroyed: false };
    if (dmgVal >= 1)        return { condition: 'light',     label: 'Light',        tnMod: 1, initPenalty: 1, speedMod: 1.0, isDisabled: false, isDestroyed: false };
    return none;
  }

  /* ------------------------------------------------------------------ */
  /*  Open test roll                                                      */
  /* ------------------------------------------------------------------ */

  static _openTestRoll(pool) {
    const dice = Array.from({ length: Math.max(1, pool) }, () => {
      const faces = [];
      let total = 0, roll;
      do {
        roll = Math.ceil(Math.random() * 6);
        faces.push(roll);
        total += roll;
      } while (roll === 6);
      return { faces, total };
    });
    const highest = Math.max(...dice.map(d => d.total));
    return { dice, highest };
  }

  _driverSkillPool(p) {
    const driver  = game.actors.get(p.driverActorId);
    const vehicle = game.actors.get(p.vehicleActorId);
    if (!driver) return { pool: 0, label: 'No driver' };

    const keywords = SKILL_KEYWORDS[p.chaseVehicleType] ?? [];
    const skills   = driver.items.filter(i => i.type === 'skill');

    for (const skill of skills) {
      const sName = (skill.system.skillName || skill.name || '').toLowerCase();
      if (keywords.some(kw => sName.includes(kw))) {
        const rating    = skill.system.rating ?? 1;
        const spec      = (skill.system.specialisation || '').toLowerCase();
        const specBonus = (spec && vehicle && vehicle.name.toLowerCase().includes(spec)) ? 2 : 0;
        return {
          pool:  rating + specBonus,
          label: `${skill.system.skillName || skill.name} ${rating}${specBonus ? ' +spec' : ''}`,
        };
      }
    }

    const reaction = driver.system.attributes?.reaction?.value
                  ?? driver.system.attributes?.reaction?.base ?? 1;
    return { pool: reaction, label: `Reaction ${reaction} (no vehicle skill)` };
  }

  async _rollDriverPoints(pid) {
    const p = this._participants.find(x => x.id === pid);
    if (!p?.driverActorId) return;

    const driver  = game.actors.get(p.driverActorId);
    const vehicle = game.actors.get(p.vehicleActorId);
    const { pool: skillPool, label: skillLabel } = this._driverSkillPool(p);

    // Read current control allocation directly from the DOM (player may have edited it)
    const controlAlloc = parseInt(
      this.element.querySelector(`#p-${pid}-control`)?.value ?? p.controlAlloc
    ) || 0;
    const totalPool = skillPool + controlAlloc;

    if (totalPool < 1) {
      ui.notifications.warn(`${driver?.name ?? 'Driver'}: pool is 0.`);
      return;
    }

    const { dice, highest } = SR3EVehicleChase._openTestRoll(totalPool);
    p.driverPoints   = highest;
    p.controlAlloc   = controlAlloc;

    const diceHtml = dice.map(d => {
      const exploded  = d.faces.length > 1;
      const isBest    = d.total === highest;
      const facesStr  = d.faces.join('+');
      return `<span class="chase-die${isBest ? ' chase-die-best' : ''}${exploded ? ' chase-die-exploded' : ''}"
                    title="${facesStr}">${d.total}</span>`;
    }).join('');

    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:#3a9fd6">Open Test — Driver Points</div>
          <div style="font-size:12px;color:#7880a0;margin:2px 0">
            ${driver?.name ?? '?'} — ${vehicle?.name ?? 'Unknown Vehicle'}
          </div>
          <div style="font-size:11px;color:#7880a0;margin-bottom:6px;">
            ${skillLabel} + ${controlAlloc} control = ${totalPool} dice
          </div>
          <div class="chase-dice-row">${diceHtml}</div>
          <div class="sr-roll-result" style="margin-top:8px;">
            Driver Points: <strong style="color:#3a9fd6;font-size:16px;">${highest}</strong>
          </div>
        </div>`,
      speaker: ChatMessage.getSpeaker({ actor: driver }),
    });

    this._refreshScores(p);
    // Update the driver points display in-place
    const dpEls = this.element.querySelectorAll(`[id^="p-${pid}-"] .chase-score-row strong`);
    this.render(); // full re-render to update driver points row
  }

  async _rollInitiative(pid) {
    const p = this._participants.find(x => x.id === pid);
    if (!p) return;

    // Drivers first, then passengers
    const ordered    = [p.driverActorId, ...p.passengerActorIds].filter(Boolean);
    const damageInfo = this._vehicleDamageInfo(p.vehicleActorId);
    const lines      = [];

    for (const aid of ordered) {
      const actor = game.actors.get(aid);
      if (!actor) continue;
      const isDriver   = aid === p.driverActorId;
      const dmgPenalty = isDriver ? damageInfo.initPenalty : 0;

      // VCR bonus applies to the driver only when VCR is active
      const vcrLevel = (isDriver && p.vcrActive) ? (p.vcrRating ?? 0) : 0;
      const base = (actor.system.derived?.initiative ?? 0) + vcrLevel;
      const dice = (actor.system.derived?.initiativeDice ?? 1) + vcrLevel;

      const rolls  = Array.from({ length: dice }, () => Math.ceil(Math.random() * 6));
      const total  = base + rolls.reduce((s, r) => s + r, 0) - dmgPenalty;
      p.initiatives[aid] = total;
      const role = isDriver ? 'Driver' : 'Passenger';
      const vcrNote = vcrLevel
        ? `<small style="color:var(--sr-accent)"> VCR Lv${vcrLevel}: +${vcrLevel} REA, +${vcrLevel}d6</small>`
        : '';
      lines.push(`
        <div class="chase-init-row">
          <span>${actor.name} <small class="chase-role">(${role})</small>${vcrNote}</span>
          <strong>${total}</strong>
        </div>`);
    }

    const vehicle = game.actors.get(p.vehicleActorId);
    await ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:#3a9fd6">
            Initiative — ${vehicle?.name ?? 'Vehicle'}
          </div>
          ${lines.join('')}
        </div>`,
    });

    this.render();
  }

  async _rollAllDriverPoints() {
    for (const p of this._participants) {
      if (p.driverActorId) await this._rollDriverPoints(p.id);
    }
  }

  async _rollAllInitiative() {
    for (const p of this._participants) {
      if ([p.driverActorId, ...p.passengerActorIds].some(Boolean)) {
        await this._rollInitiative(p.id);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Turn management                                                     */
  /* ------------------------------------------------------------------ */

  _nextTurn() {
    this._turn++;
    for (const p of this._participants) {
      p.driverPoints = null;
      p.initiatives  = {};
      p.controlAlloc = this._controlPool(p);
    }
    ChatMessage.create({
      content: `
        <div class="sr-roll-card">
          <div class="sr-roll-header" style="color:#c8a040">🚗 Vehicle Chase — Turn ${this._turn}</div>
          <div style="font-size:12px;color:#7880a0;margin-top:4px;">
            Control pools refreshed. Speeds carried over from Turn ${this._turn - 1}.
          </div>
        </div>`,
    });
    this.render();
  }

  async _endChase() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window:  { title: 'End Vehicle Chase?' },
      content: '<p>End the vehicle chase and close this window?</p>',
    });
    if (!confirmed) return;
    SR3EVehicleChase.instance = null;
    this.close();
  }

  /* ------------------------------------------------------------------ */
  /*  Shared action-dialog helpers                                        */
  /* ------------------------------------------------------------------ */

  _getParticipantInfo(pid) {
    const p = this._participants.find(x => x.id === pid);
    if (!p) return null;
    const driver  = game.actors.get(p.driverActorId);
    const vehicle = game.actors.get(p.vehicleActorId);
    const { pool: skillPool, label: skillLabel } = this._driverSkillPool(p);
    const vcrRating  = p.vcrActive ? (p.vcrRating ?? 0) : 0;
    const handling   = vehicle?.system.attributes?.handling?.base ?? 4;
    const autonav    = vehicle?.system.attributes?.autonav?.base  ?? 0;
    const speedAttr  = vehicle?.system.attributes?.speed?.base    ?? 0;
    const damageInfo = this._vehicleDamageInfo(p.vehicleActorId);
    const maxSpeedKmct = +(speedAttr * damageInfo.speedMod).toFixed(2); // km/ct
    const exceedsSpeed = p.speed > maxSpeedKmct;
    const { maneuver } = this._scores(p);
    return { p, driver, vehicle, skillPool, skillLabel, vcrRating, handling, autonav, speedAttr, maxSpeedKmct, exceedsSpeed, maneuver, damageInfo };
  }

  _maneuverMod(myManeuver, oppManeuver) {
    if (myManeuver === null || oppManeuver === null) return 0;
    const diff = myManeuver - oppManeuver;
    if (diff > 10)   return -4;
    if (diff > 0)    return -2;
    if (diff === 0)  return  0;
    if (diff >= -10) return  2;
    return 4;
  }

  // Format damage condition for action dialog info rows
  _dmgInfoText(dmg) {
    if (!dmg || dmg.condition === 'none') return 'None';
    return `${dmg.label} (+${dmg.tnMod} TN, −${dmg.initPenalty} Init)`;
  }

  // Warn if disabled or destroyed; returns true if action should still proceed
  _warnDamage(info) {
    if (!info) return;
    if (info.damageInfo?.isDestroyed) ui.notifications.warn(`${info.vehicle?.name ?? 'Vehicle'} is DESTROYED.`);
    else if (info.damageInfo?.isDisabled) ui.notifications.warn(`${info.vehicle?.name ?? 'Vehicle'} is DISABLED.`);
  }

  // Build participant selector HTML (participants that have a driver)
  _actorSelectHtml(selectedPid) {
    const opts = this._participants
      .filter(p => p.driverActorId)
      .map(p => {
        const v = game.actors.get(p.vehicleActorId);
        const d = game.actors.get(p.driverActorId);
        const label = `${v?.name ?? '?'} (${d?.name ?? '?'})`;
        return `<option value="${p.id}" ${p.id === selectedPid ? 'selected' : ''}>${label}</option>`;
      }).join('');
    return `<option value="">— Select —</option>${opts}`;
  }

  // Maneuver comparison dropdown (opponents = all OTHER participants)
  _opponentSelectHtml(actingPid) {
    const opts = this._participants
      .filter(p => p.id !== actingPid)
      .map(p => {
        const v  = game.actors.get(p.vehicleActorId);
        const mn = p.driverPoints !== null ? ` [Mnvr: ${this._scores(p).maneuver ?? '?'}]` : ' [not rolled]';
        return `<option value="${p.id}">${v?.name ?? '?'}${mn}</option>`;
      }).join('');
    return `<option value="">— None —</option>${opts}`;
  }

  // Wire live TN preview for an action dialog
  _wireActionPreview(el, getModFn) {
    const update = () => {
      const baseTN = parseInt(el.querySelector('#act-tn')?.value   ?? 4);
      const pool   = parseInt(el.querySelector('#act-pool')?.value ?? 0);
      const mod    = getModFn(el);
      const tnOut  = el.querySelector('#act-tn-out');
      const plOut  = el.querySelector('#act-pool-out');
      if (tnOut) tnOut.textContent = Math.max(2, baseTN + mod);
      if (plOut) plOut.textContent = pool;
    };
    el.querySelectorAll('select, input').forEach(n => {
      n.addEventListener('change', update);
      n.addEventListener('input',  update);
    });
    return update;
  }

  // Collect result from action dialog and kick off roll
  async _fireActionRoll(el, title, note = null) {
    const pid    = el.querySelector('#act-participant')?.value;
    const info   = pid ? this._getParticipantInfo(pid) : null;
    if (!info?.driver) return;
    const pool   = parseInt(el.querySelector('#act-pool')?.value ?? 0);
    const baseTN = parseInt(el.querySelector('#act-tn')?.value   ?? 4);
    const mod    = parseInt(el.querySelector('#act-mod-total')?.value ?? 0);
    const tn     = Math.max(2, baseTN + mod);
    const opts   = note ? { footerNote: note } : {};
    await info.driver.rollPool(pool, tn, `${title} — ${info.vehicle?.name ?? info.driver.name}`, opts);
  }

  /* ------------------------------------------------------------------ */
  /*  1. Accelerate / Brake                                               */
  /* ------------------------------------------------------------------ */

  async _actionAccelBrake() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;

    const buildInfo = (pid) => {
      const i = this._getParticipantInfo(pid);
      if (!i) return '';
      return `
        <div class="act-info" id="act-info-box">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${i.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${i.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Skill</span><span id="act-is">${i.skillLabel}</span></div>
          <div class="act-info-row"><span>Handling (base TN)</span><span id="act-ih">${i.handling}</span></div>
          <div class="act-info-row"><span>Autonav</span><span id="act-ia">${i.autonav}</span></div>
          <div class="act-info-row"><span>VCR</span><span id="act-ivcr">${i.vcrRating || 'None'}</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-idmg">${this._dmgInfoText(i.damageInfo)}</span></div>
        </div>`;
    };

    const terrainOpts = [
      ['open','-1','Open (−1)'], ['normal','0','Normal (0)'],
      ['restricted','1','Restricted (+1)'], ['tight','3','Tight (+3)'],
    ].map(([k, v, l]) => `<option value="${v}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    const info0 = this._getParticipantInfo(defaultPid);
    this._warnDamage(info0);
    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Accelerate / Brake' },
      content: `
        <label class="act-field act-full" style="margin-bottom:8px;">Acting Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        ${buildInfo(defaultPid)}
        <div class="act-grid">
          <label class="act-field act-full">Maneuver vs Opponent
            <select id="act-opponent">${this._opponentSelectHtml(defaultPid)}</select>
          </label>
          <label class="act-field act-full">Fleeing from Multiple Vehicles
            <select id="act-flee">
              <option value="0">None (0)</option>
              <option value="1">2 vehicles (+1 TN)</option>
              <option value="2">3+ vehicles (+2 TN)</option>
            </select>
          </label>
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <div class="act-check-row${info0?.autonav ? '' : ' act-disabled'}" id="act-autonav-row">
            <input type="checkbox" id="act-autonav"/>
            <label for="act-autonav" id="act-autonav-lbl">Autonav active (+${info0?.autonav ?? 0} TN)</label>
          </div>
          <div class="act-check-row${info0?.vcrRating ? '' : ' act-disabled'}" id="act-vcr-row">
            <input type="checkbox" id="act-vcr" ${info0?.vcrRating ? '' : 'disabled'}/>
            <label for="act-vcr" id="act-vcr-lbl">VCR active (−${(info0?.vcrRating ?? 0) * 2} TN)</label>
          </div>
          <label class="act-field">Control Pool Dice
            <input id="act-pool" type="number" value="${info0?.skillPool ?? 0}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN
            <input id="act-tn" type="number" value="${info0?.handling ?? 4}" min="2" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${info0?.handling ?? 4}</strong></span>
          <span>Pool: <strong id="act-pool-out">${info0?.skillPool ?? 0}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const getMod = (el) => {
          const pid     = el.querySelector('#act-participant')?.value;
          const oppPid  = el.querySelector('#act-opponent')?.value;
          const info    = pid ? this._getParticipantInfo(pid) : null;
          const oppInfo = oppPid ? this._getParticipantInfo(oppPid) : null;
          const mnvMod  = this._maneuverMod(info?.maneuver ?? null, oppInfo?.maneuver ?? null);
          const flee    = parseInt(el.querySelector('#act-flee')?.value ?? 0);
          const terrain = parseInt(el.querySelector('#act-terrain')?.value ?? 0);
          const autonav = el.querySelector('#act-autonav')?.checked ? (info?.autonav ?? 0) : 0;
          const vcr     = el.querySelector('#act-vcr')?.checked ? -((info?.vcrRating ?? 0) * 2) : 0;
          const dmg     = info?.damageInfo?.tnMod ?? 0;
          const total   = mnvMod + flee + terrain + autonav + vcr + dmg;
          const hidden  = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        const refreshParticipant = () => {
          const pid  = el.querySelector('#act-participant')?.value;
          const info = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-is')?.replaceChildren(document.createTextNode(info.skillLabel));
          el.querySelector('#act-ih')?.replaceChildren(document.createTextNode(info.handling));
          el.querySelector('#act-ia')?.replaceChildren(document.createTextNode(info.autonav));
          el.querySelector('#act-ivcr')?.replaceChildren(document.createTextNode(info.vcrRating || 'None'));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const tnInp  = el.querySelector('#act-tn');
          const plInp  = el.querySelector('#act-pool');
          if (tnInp) tnInp.value = info.handling;
          if (plInp) plInp.value = info.skillPool;
          // Refresh opponent dropdown
          const oppSel = el.querySelector('#act-opponent');
          if (oppSel) oppSel.innerHTML = this._opponentSelectHtml(pid);
          // Autonav row
          const aRow = el.querySelector('#act-autonav-row');
          const aLbl = el.querySelector('#act-autonav-lbl');
          if (aRow) aRow.classList.toggle('act-disabled', !info.autonav);
          if (aLbl) aLbl.textContent = `Autonav active (+${info.autonav} TN)`;
          // VCR row
          const vRow  = el.querySelector('#act-vcr-row');
          const vLbl  = el.querySelector('#act-vcr-lbl');
          const vChk  = el.querySelector('#act-vcr');
          if (vRow) vRow.classList.toggle('act-disabled', !info.vcrRating);
          if (vLbl) vLbl.textContent = `VCR active (−${info.vcrRating * 2} TN)`;
          if (vChk) { vChk.disabled = !info.vcrRating; if (!info.vcrRating) vChk.checked = false; }
          update();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await this._fireActionRoll(result, 'Accelerate/Brake');
  }

  /* ------------------------------------------------------------------ */
  /*  2. Positioning                                                      */
  /* ------------------------------------------------------------------ */

  async _actionPositioning() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;
    const info0 = this._getParticipantInfo(defaultPid);
    this._warnDamage(info0);

    const terrainOpts = [
      ['open','-1','Open (−1)'], ['normal','0','Normal (0)'],
      ['restricted','1','Restricted (+1)'], ['tight','3','Tight (+3)'],
    ].map(([k, v, l]) => `<option value="${v}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    const exceedChecked = info0?.exceedsSpeed ? 'checked' : '';
    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Positioning' },
      content: `
        <label class="act-field act-full" style="margin-bottom:8px;">Acting Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${info0?.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${info0?.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Skill</span><span id="act-is">${info0?.skillLabel ?? ''}</span></div>
          <div class="act-info-row"><span>Handling (base TN)</span><span id="act-ih">${info0?.handling ?? 4}</span></div>
          <div class="act-info-row"><span>Max Speed</span>
            <span id="act-imx">${Math.round((info0?.maxSpeedKmct ?? 0) * 1.2)} km/h (${info0?.speedAttr ?? 0} km/ct)</span></div>
          <div class="act-info-row"><span>Current Speed</span><span id="act-ics">${Math.round((info0?.p.speed ?? 0) * 1.2)} km/h</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-idmg">${this._dmgInfoText(info0?.damageInfo)}</span></div>
        </div>
        <div class="act-grid">
          <div class="act-check-row act-full" id="act-exceed-row">
            <input type="checkbox" id="act-exceed" ${exceedChecked}/>
            <label for="act-exceed" id="act-exceed-lbl">Exceeds speed rating (+1 TN) — km/h ÷ 1.2 &gt; <span id="act-maxspd">${info0?.speedAttr ?? 0}</span> km/ct</label>
          </div>
          <div class="act-check-row${info0?.autonav ? '' : ' act-disabled'}" id="act-autonav-row">
            <input type="checkbox" id="act-autonav"/>
            <label for="act-autonav" id="act-autonav-lbl">Autonav active (+${info0?.autonav ?? 0} TN)</label>
          </div>
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <div class="act-check-row${info0?.vcrRating ? '' : ' act-disabled'}" id="act-vcr-row">
            <input type="checkbox" id="act-vcr" ${info0?.vcrRating ? '' : 'disabled'}/>
            <label for="act-vcr" id="act-vcr-lbl">VCR active (−${(info0?.vcrRating ?? 0) * 2} TN)</label>
          </div>
          <label class="act-field">Control Pool Dice
            <input id="act-pool" type="number" value="${info0?.skillPool ?? 0}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN
            <input id="act-tn" type="number" value="${info0?.handling ?? 4}" min="2" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${info0?.handling ?? 4}</strong></span>
          <span>Pool: <strong id="act-pool-out">${info0?.skillPool ?? 0}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const getMod = (el) => {
          const pid     = el.querySelector('#act-participant')?.value;
          const info    = pid ? this._getParticipantInfo(pid) : null;
          const exceed  = el.querySelector('#act-exceed')?.checked ? 1 : 0;
          const autonav = el.querySelector('#act-autonav')?.checked ? (info?.autonav ?? 0) : 0;
          const terrain = parseInt(el.querySelector('#act-terrain')?.value ?? 0);
          const vcr     = el.querySelector('#act-vcr')?.checked ? -((info?.vcrRating ?? 0) * 2) : 0;
          const dmg     = info?.damageInfo?.tnMod ?? 0;
          const total   = exceed + autonav + terrain + vcr + dmg;
          const hidden  = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        const refreshParticipant = () => {
          const pid  = el.querySelector('#act-participant')?.value;
          const info = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-is')?.replaceChildren(document.createTextNode(info.skillLabel));
          el.querySelector('#act-ih')?.replaceChildren(document.createTextNode(info.handling));
          el.querySelector('#act-imx')?.replaceChildren(document.createTextNode(`${Math.round(info.maxSpeedKmct * 1.2)} km/h (${info.speedAttr} km/ct)`));
          el.querySelector('#act-ics')?.replaceChildren(document.createTextNode(`${Math.round(info.p.speed * 1.2)} km/h`));
          el.querySelector('#act-maxspd')?.replaceChildren(document.createTextNode(info.speedAttr));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const tnInp  = el.querySelector('#act-tn');
          const plInp  = el.querySelector('#act-pool');
          if (tnInp) tnInp.value = info.handling;
          if (plInp) plInp.value = info.skillPool;
          const exChk  = el.querySelector('#act-exceed');
          if (exChk) exChk.checked = info.exceedsSpeed;
          const aRow   = el.querySelector('#act-autonav-row');
          const aLbl   = el.querySelector('#act-autonav-lbl');
          if (aRow) aRow.classList.toggle('act-disabled', !info.autonav);
          if (aLbl) aLbl.textContent = `Autonav active (+${info.autonav} TN)`;
          const vRow  = el.querySelector('#act-vcr-row');
          const vLbl  = el.querySelector('#act-vcr-lbl');
          const vChk  = el.querySelector('#act-vcr');
          if (vRow) vRow.classList.toggle('act-disabled', !info.vcrRating);
          if (vLbl) vLbl.textContent = `VCR active (−${info.vcrRating * 2} TN)`;
          if (vChk) { vChk.disabled = !info.vcrRating; if (!info.vcrRating) vChk.checked = false; }
          update();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await this._fireActionRoll(result, 'Positioning',
      'You can add {successes} to your driver score for the next round.');
  }

  /* ------------------------------------------------------------------ */
  /*  3. Ramming                                                          */
  /* ------------------------------------------------------------------ */

  async _actionRamming() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;
    const info0 = this._getParticipantInfo(defaultPid);
    this._warnDamage(info0);

    const terrainOpts = [
      ['open','-1','Open (−1)'], ['normal','0','Normal (0)'],
      ['restricted','1','Restricted (+1)'], ['tight','2','Tight (+2)'],
    ].map(([k, v, l]) => `<option value="${v}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    const exceedChecked = info0?.exceedsSpeed ? 'checked' : '';

    const atkBody0 = game.actors.get(info0?.p?.vehicleActorId)?.system?.attributes?.body?.base ?? 4;
    const atkSoak0 = atkBody0 + this._controlPool(info0?.p ?? {});

    const buildDefInfo = (oppPid) => {
      const oi = oppPid ? this._getParticipantInfo(oppPid) : null;
      if (!oi) return `<div class="act-info" id="act-def-info"><div class="act-info-row"><span>Opponent</span><span>— select above —</span></div></div>`;
      const defBody = game.actors.get(oi.p.vehicleActorId)?.system?.attributes?.body?.base ?? 4;
      const defSoak = defBody + this._controlPool(oi.p);
      return `
        <div class="act-info" id="act-def-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-div">${oi.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-did">${oi.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Current Speed</span><span id="act-dspd">${Math.round(oi.p.speed * 1.2)} km/h</span></div>
          <div class="act-info-row"><span>Max Speed</span><span id="act-dmx">${Math.round(oi.maxSpeedKmct * 1.2)} km/h (${oi.speedAttr} km/ct)</span></div>
          <div class="act-info-row"><span>Handling</span><span id="act-dh">${oi.handling}</span></div>
          <div class="act-info-row"><span>Body</span><span id="act-db">${defBody}</span></div>
          <div class="act-info-row"><span>VCR Rating / Active</span><span id="act-dvcr">${oi.vcrRating || 'None'}${oi.p.vcrActive ? ' ✓' : ''}</span></div>
          <div class="act-info-row"><span>Control Pool</span><span id="act-dcp">${this._controlPool(oi.p)}</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-ddmg">${this._dmgInfoText(oi.damageInfo)}</span></div>
          <label class="act-info-row" style="cursor:default;">
            <span>Defender Soak Pool</span>
            <input id="act-def-soak" type="number" value="${defSoak}" min="0" max="30" style="width:4em;text-align:right;"/>
          </label>
        </div>`;
    };

    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Ramming' },
      content: `
        <div class="act-section-label">ATTACKER</div>
        <label class="act-field act-full" style="margin-bottom:8px;">Acting Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${info0?.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${info0?.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Skill</span><span id="act-is">${info0?.skillLabel ?? ''}</span></div>
          <div class="act-info-row"><span>Handling (base TN)</span><span id="act-ih">${info0?.handling ?? 4}</span></div>
          <div class="act-info-row"><span>Autonav</span><span id="act-ia">${info0?.autonav ?? 0}</span></div>
          <div class="act-info-row"><span>VCR Rating</span><span id="act-ivcr">${info0?.vcrRating || 'None'}</span></div>
          <div class="act-info-row"><span>Current Speed</span><span id="act-ics">${Math.round((info0?.p.speed ?? 0) * 1.2)} km/h</span></div>
          <div class="act-info-row"><span>Max Speed</span>
            <span id="act-imx">${Math.round((info0?.maxSpeedKmct ?? 0) * 1.2)} km/h (${info0?.speedAttr ?? 0} km/ct)</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-idmg">${this._dmgInfoText(info0?.damageInfo)}</span></div>
          <label class="act-info-row" style="cursor:default;">
            <span>Attacker Soak Pool</span>
            <input id="act-atk-soak" type="number" value="${atkSoak0}" min="0" max="30" style="width:4em;text-align:right;"/>
          </label>
        </div>
        <div class="act-grid">
          <div class="act-check-row act-full" id="act-exceed-row">
            <input type="checkbox" id="act-exceed" ${exceedChecked}/>
            <label for="act-exceed" id="act-exceed-lbl">Attacker exceeds speed rating (+1 TN) — current km/h ÷ 1.2 &gt; <span id="act-maxspd">${info0?.speedAttr ?? 0}</span> km/ct</label>
          </div>
          <div class="act-check-row${info0?.autonav ? '' : ' act-disabled'}" id="act-autonav-row">
            <input type="checkbox" id="act-autonav"/>
            <label for="act-autonav" id="act-autonav-lbl">Attacker autonav active (+${(info0?.autonav ?? 0) + 2} TN)</label>
          </div>
          <div class="act-check-row${info0?.vcrRating ? '' : ' act-disabled'}" id="act-vcr-row">
            <input type="checkbox" id="act-vcr" ${info0?.vcrRating ? '' : 'disabled'}/>
            <label for="act-vcr" id="act-vcr-lbl">Attacker VCR active (−${(info0?.vcrRating ?? 0) * 2} TN)</label>
          </div>
        </div>
        <div class="act-section-label" style="margin-top:8px;">DEFENDER</div>
        <label class="act-field act-full" style="margin-bottom:6px;">Opponent Vehicle
          <select id="act-opponent">${this._opponentSelectHtml(defaultPid)}</select>
        </label>
        <div id="act-def-info-wrap">${buildDefInfo(withDrivers.find(p => p.id !== defaultPid)?.id ?? null)}</div>
        <div class="act-section-label" style="margin-top:8px;">ROLL</div>
        <div class="act-grid">
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <label class="act-field">Control Pool Dice (roll)
            <input id="act-pool" type="number" value="${info0?.skillPool ?? 0}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN (opponent Handling)
            <input id="act-tn" type="number" value="${info0?.handling ?? 4}" min="2" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${info0?.handling ?? 4}</strong></span>
          <span>Pool: <strong id="act-pool-out">${info0?.skillPool ?? 0}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const getMod = (el) => {
          const pid     = el.querySelector('#act-participant')?.value;
          const oppPid  = el.querySelector('#act-opponent')?.value;
          const info    = pid    ? this._getParticipantInfo(pid)    : null;
          const oppInfo = oppPid ? this._getParticipantInfo(oppPid) : null;
          const mnvMod  = this._maneuverMod(info?.maneuver ?? null, oppInfo?.maneuver ?? null);
          const exceed  = el.querySelector('#act-exceed')?.checked ? 1 : 0;
          const autonav = el.querySelector('#act-autonav')?.checked ? ((info?.autonav ?? 0) + 2) : 0;
          const terrain = parseInt(el.querySelector('#act-terrain')?.value ?? 0);
          const vcr     = el.querySelector('#act-vcr')?.checked ? -((info?.vcrRating ?? 0) * 2) : 0;
          const dmg     = info?.damageInfo?.tnMod ?? 0;
          const total   = mnvMod + exceed + autonav + terrain + vcr + dmg;
          const hidden  = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        const refreshDefender = () => {
          const oppPid = el.querySelector('#act-opponent')?.value;
          const wrap   = el.querySelector('#act-def-info-wrap');
          if (wrap) wrap.innerHTML = buildDefInfo(oppPid || null);
          update();
        };

        const refreshParticipant = () => {
          const pid  = el.querySelector('#act-participant')?.value;
          const info = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-is')?.replaceChildren(document.createTextNode(info.skillLabel));
          el.querySelector('#act-ih')?.replaceChildren(document.createTextNode(info.handling));
          el.querySelector('#act-ia')?.replaceChildren(document.createTextNode(info.autonav));
          el.querySelector('#act-ivcr')?.replaceChildren(document.createTextNode(info.vcrRating || 'None'));
          el.querySelector('#act-ics')?.replaceChildren(document.createTextNode(`${Math.round(info.p.speed * 1.2)} km/h`));
          el.querySelector('#act-imx')?.replaceChildren(document.createTextNode(`${Math.round(info.maxSpeedKmct * 1.2)} km/h (${info.speedAttr} km/ct)`));
          el.querySelector('#act-maxspd')?.replaceChildren(document.createTextNode(info.speedAttr));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const atkVehicle = game.actors.get(info.p.vehicleActorId);
          const atkBody    = atkVehicle?.system?.attributes?.body?.base ?? 4;
          const atkSoakInp = el.querySelector('#act-atk-soak');
          if (atkSoakInp) atkSoakInp.value = atkBody + this._controlPool(info.p);
          const tnInp = el.querySelector('#act-tn');
          const plInp = el.querySelector('#act-pool');
          if (tnInp) tnInp.value = info.handling;
          if (plInp) plInp.value = info.skillPool;
          const exChk = el.querySelector('#act-exceed');
          if (exChk) exChk.checked = info.exceedsSpeed;
          const excLbl = el.querySelector('#act-exceed-lbl');
          if (excLbl) excLbl.innerHTML = `Attacker exceeds speed rating (+1 TN) — current km/h ÷ 1.2 &gt; <span id="act-maxspd">${info.speedAttr}</span> km/ct`;
          const oppSel = el.querySelector('#act-opponent');
          if (oppSel) oppSel.innerHTML = this._opponentSelectHtml(pid);
          const aRow = el.querySelector('#act-autonav-row');
          const aLbl = el.querySelector('#act-autonav-lbl');
          if (aRow) aRow.classList.toggle('act-disabled', !info.autonav);
          if (aLbl) aLbl.textContent = `Attacker autonav active (+${info.autonav + 2} TN)`;
          const vRow = el.querySelector('#act-vcr-row');
          const vLbl = el.querySelector('#act-vcr-lbl');
          const vChk = el.querySelector('#act-vcr');
          if (vRow) vRow.classList.toggle('act-disabled', !info.vcrRating);
          if (vLbl) vLbl.textContent = `Attacker VCR active (−${info.vcrRating * 2} TN)`;
          if (vChk) { vChk.disabled = !info.vcrRating; if (!info.vcrRating) vChk.checked = false; }
          refreshDefender();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        el.querySelector('#act-opponent')?.addEventListener('change', refreshDefender);
        // Initial defender panel
        refreshDefender();
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;

    const atkPid  = result.querySelector('#act-participant')?.value;
    const defPid  = result.querySelector('#act-opponent')?.value;
    const atkInfo = atkPid ? this._getParticipantInfo(atkPid) : null;
    const defInfo = defPid ? this._getParticipantInfo(defPid) : null;
    if (!atkInfo?.driver) return;

    const atkP = atkInfo.p;
    const defP = defInfo?.p ?? null;
    const atkVehicle = game.actors.get(atkP.vehicleActorId);
    const defVehicle = defP ? game.actors.get(defP.vehicleActorId) : null;

    const atkSoakPool = parseInt(result.querySelector('#act-atk-soak')?.value ?? 0);
    const defSoakPool = parseInt(result.querySelector('#act-def-soak')?.value ?? 0);

    const rammingContext = {
      attackerVehicleActorId:   atkP.vehicleActorId,
      defenderVehicleActorId:   defP?.vehicleActorId ?? null,
      attackerDriverActorId:    atkP.driverActorId,
      defenderDriverActorId:    defP?.driverActorId ?? null,
      attackerVehicleName:      atkVehicle?.name ?? atkInfo.driver.name,
      defenderVehicleName:      defVehicle?.name ?? 'Defender Vehicle',
      attackerSpeed:            atkP.speed ?? 0,
      defenderSpeed:            defP?.speed ?? 0,
      attackerSoakPool:         atkSoakPool,
      defenderSoakPool:         defSoakPool,
      attackerPassengerActorIds: atkP.passengerActorIds ?? [],
      defenderPassengerActorIds: defP?.passengerActorIds ?? [],
      attackerPid: atkP.id,
      defenderPid: defP?.id ?? null,
    };

    const pool   = parseInt(result.querySelector('#act-pool')?.value ?? 0);
    const baseTN = parseInt(result.querySelector('#act-tn')?.value ?? 4);
    const mod    = parseInt(result.querySelector('#act-mod-total')?.value ?? 0);
    const tn     = Math.max(2, baseTN + mod);

    await atkInfo.driver.rollPool(pool, tn, `Ramming — ${rammingContext.attackerVehicleName}`, {
      isRammingRoll: true,
      rammingContext,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  4. Crash                                                            */
  /* ------------------------------------------------------------------ */

  async _actionCrash() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;
    const info0 = this._getParticipantInfo(defaultPid);
    this._warnDamage(info0);

    const terrainOpts = [
      ['open','-1','Open (−1)'], ['normal','0','Normal (0)'],
      ['restricted','2','Restricted (+2)'], ['tight','3','Tight (+3)'],
    ].map(([k, v, l]) => `<option value="${v}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    const _speedMod = (speedKmct, reaction) => {
      if (speedKmct < reaction * 20) return 0;
      if (speedKmct < reaction * 30) return 1;
      if (speedKmct < reaction * 40) return 2;
      return 4;
    };

    const driverReaction0 = info0?.driver?.system?.attributes?.reaction?.value
                         ?? info0?.driver?.system?.attributes?.reaction?.base ?? 0;
    const speedMod0 = _speedMod(info0?.p.speed ?? 0, driverReaction0);

    const buildSpeedModLabel = (speedKmct, reaction) => {
      const mod = _speedMod(speedKmct, reaction);
      const kmh = Math.round(speedKmct * 1.2);
      return `Speed: ${kmh} km/h → +${mod} TN`;
    };

    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Crash Test' },
      content: `
        <label class="act-field act-full" style="margin-bottom:8px;">Acting Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info" id="act-info-box">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${info0?.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${info0?.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Skill</span><span id="act-is">${info0?.skillLabel ?? ''}</span></div>
          <div class="act-info-row"><span>Handling (base TN)</span><span id="act-ih">${info0?.handling ?? 4}</span></div>
          <div class="act-info-row"><span>Current Speed</span><span id="act-ics">${Math.round((info0?.p.speed ?? 0) * 1.2)} km/h</span></div>
          <div class="act-info-row"><span>Vehicle Damage</span><span id="act-idmg">${this._dmgInfoText(info0?.damageInfo)}</span></div>
          <div class="act-info-row" style="color:#d49030;"><span>Speed Modifier</span><span id="act-ispmod">${buildSpeedModLabel(info0?.p.speed ?? 0, driverReaction0)}</span></div>
        </div>
        <div class="act-grid">
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <label class="act-field">Control Pool Dice
            <input id="act-pool" type="number" value="${info0?.skillPool ?? 0}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN (Handling)
            <input id="act-tn" type="number" value="${info0?.handling ?? 4}" min="2" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${info0?.handling ?? 4}</strong></span>
          <span>Pool: <strong id="act-pool-out">${info0?.skillPool ?? 0}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const getMod = (el) => {
          const pid      = el.querySelector('#act-participant')?.value;
          const info     = pid ? this._getParticipantInfo(pid) : null;
          const terrain  = parseInt(el.querySelector('#act-terrain')?.value ?? 0);
          const dmg      = info?.damageInfo?.tnMod ?? 0;
          const reaction = info?.driver?.system?.attributes?.reaction?.value
                        ?? info?.driver?.system?.attributes?.reaction?.base ?? 0;
          const spMod    = _speedMod(info?.p.speed ?? 0, reaction);
          const total    = terrain + dmg + spMod;
          const hidden   = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        const refreshParticipant = () => {
          const pid  = el.querySelector('#act-participant')?.value;
          const info = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-is')?.replaceChildren(document.createTextNode(info.skillLabel));
          el.querySelector('#act-ih')?.replaceChildren(document.createTextNode(info.handling));
          el.querySelector('#act-ics')?.replaceChildren(document.createTextNode(`${Math.round(info.p.speed * 1.2)} km/h`));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const reaction = info.driver?.system?.attributes?.reaction?.value
                        ?? info.driver?.system?.attributes?.reaction?.base ?? 0;
          el.querySelector('#act-ispmod')?.replaceChildren(document.createTextNode(buildSpeedModLabel(info.p.speed, reaction)));
          const tnInp = el.querySelector('#act-tn');
          const plInp = el.querySelector('#act-pool');
          if (tnInp) tnInp.value = info.handling;
          if (plInp) plInp.value = info.skillPool;
          update();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;

    const pid    = result.querySelector('#act-participant')?.value;
    const info   = pid ? this._getParticipantInfo(pid) : null;
    if (!info?.driver) return;

    const vehicle     = game.actors.get(info.p.vehicleActorId);
    const vehicleBody = vehicle?.system?.attributes?.body?.base ?? 4;

    const crashContext = {
      vehicleActorId:    info.p.vehicleActorId,
      vehicleName:       vehicle?.name ?? info.driver.name,
      driverActorId:     info.p.driverActorId,
      speedKmct:         info.p.speed,
      vehicleBody,
      passengerActorIds: info.p.passengerActorIds ?? [],
    };

    const pool   = parseInt(result.querySelector('#act-pool')?.value ?? 0);
    const baseTN = parseInt(result.querySelector('#act-tn')?.value ?? 4);
    const mod    = parseInt(result.querySelector('#act-mod-total')?.value ?? 0);
    const tn     = Math.max(2, baseTN + mod);

    await info.driver.rollPool(pool, tn, `Crash Test — ${crashContext.vehicleName}`, {
      isCrashRoll: true,
      crashContext,
    });
  }

  /* ------------------------------------------------------------------ */
  /*  5. Hiding                                                           */
  /* ------------------------------------------------------------------ */

  async _actionHiding() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;
    const info0 = this._getParticipantInfo(defaultPid);
    this._warnDamage(info0);

    // Hiding terrain modifiers differ from other actions
    const terrainMods = { open: 1, normal: 2, restricted: 0, tight: -2 };
    const terrainOpts = [
      ['open',      'Open (+1)'],
      ['normal',    'Normal (+2)'],
      ['restricted','Restricted (0)'],
      ['tight',     'Tight (−2)'],
    ].map(([k, l]) => `<option value="${k}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    const exceedChecked = info0?.exceedsSpeed ? 'checked' : '';
    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Hiding' },
      content: `
        <label class="act-field act-full" style="margin-bottom:8px;">Acting Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${info0?.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${info0?.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Skill</span><span id="act-is">${info0?.skillLabel ?? ''}</span></div>
          <div class="act-info-row"><span>Handling (base TN)</span><span id="act-ih">${info0?.handling ?? 4}</span></div>
          <div class="act-info-row"><span>Autonav</span><span id="act-ia">${info0?.autonav ?? 0}</span></div>
          <div class="act-info-row"><span>VCR</span><span id="act-ivcr">${info0?.vcrRating || 'None'}</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-idmg">${this._dmgInfoText(info0?.damageInfo)}</span></div>
        </div>
        <div class="act-grid">
          <label class="act-field act-full">Hiding from (maneuver comparison)
            <select id="act-opponent">${this._opponentSelectHtml(defaultPid)}</select>
          </label>
          <label class="act-field act-full">Vehicles pursuing
            <input id="act-pursuers" type="number" value="1" min="1" max="20"
              style="background:#1c2030;color:#dde1f0;border:1px solid #3a9fd6;border-radius:3px;padding:2px 5px;width:100%;box-sizing:border-box;"/>
            <small style="color:#7880a0;font-size:10px;">+1 TN per vehicle over 1</small>
          </label>
          <div class="act-check-row act-full" id="act-exceed-row">
            <input type="checkbox" id="act-exceed" ${exceedChecked}/>
            <label for="act-exceed" id="act-exceed-lbl">Exceeds speed rating (+1 TN) — km/h ÷ 1.2 &gt; <span id="act-maxspd">${info0?.speedAttr ?? 0}</span> km/ct</label>
          </div>
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <div class="act-check-row${info0?.autonav ? '' : ' act-disabled'}" id="act-autonav-row">
            <input type="checkbox" id="act-autonav"/>
            <label for="act-autonav" id="act-autonav-lbl">Autonav active (+${info0?.autonav ?? 0} TN)</label>
          </div>
          <div class="act-check-row${info0?.vcrRating ? '' : ' act-disabled'}" id="act-vcr-row">
            <input type="checkbox" id="act-vcr" ${info0?.vcrRating ? '' : 'disabled'}/>
            <label for="act-vcr" id="act-vcr-lbl">VCR active (−${(info0?.vcrRating ?? 0) * 2} TN)</label>
          </div>
          <label class="act-field">Pool Dice
            <input id="act-pool" type="number" value="${info0?.skillPool ?? 0}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN
            <input id="act-tn" type="number" value="${info0?.handling ?? 4}" min="2" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${info0?.handling ?? 4}</strong></span>
          <span>Pool: <strong id="act-pool-out">${info0?.skillPool ?? 0}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const hidingManeuverMod = (myMnvr, oppMnvr) => {
          if (myMnvr === null || oppMnvr === null) return 0;
          const diff = myMnvr - oppMnvr;
          if (diff > 10)   return -4;
          if (diff > 0)    return -2;
          if (diff === 0)  return  0;
          if (diff >= -10) return  3;
          return 6;
        };

        const getMod = (el) => {
          const pid      = el.querySelector('#act-participant')?.value;
          const oppPid   = el.querySelector('#act-opponent')?.value;
          const info     = pid    ? this._getParticipantInfo(pid)    : null;
          const oppInfo  = oppPid ? this._getParticipantInfo(oppPid) : null;
          const mnvMod   = hidingManeuverMod(info?.maneuver ?? null, oppInfo?.maneuver ?? null);
          const pursuers = Math.max(0, (parseInt(el.querySelector('#act-pursuers')?.value) || 1) - 1);
          const exceed   = el.querySelector('#act-exceed')?.checked ? 1 : 0;
          const terrain  = terrainMods[el.querySelector('#act-terrain')?.value] ?? 0;
          const autonav  = el.querySelector('#act-autonav')?.checked ? (info?.autonav ?? 0) : 0;
          const vcr      = el.querySelector('#act-vcr')?.checked ? -((info?.vcrRating ?? 0) * 2) : 0;
          const dmg      = info?.damageInfo?.tnMod ?? 0;
          const total    = mnvMod + pursuers + exceed + terrain + autonav + vcr + dmg;
          const hidden   = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        const refreshParticipant = () => {
          const pid  = el.querySelector('#act-participant')?.value;
          const info = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-is')?.replaceChildren(document.createTextNode(info.skillLabel));
          el.querySelector('#act-ih')?.replaceChildren(document.createTextNode(info.handling));
          el.querySelector('#act-ia')?.replaceChildren(document.createTextNode(info.autonav));
          el.querySelector('#act-ivcr')?.replaceChildren(document.createTextNode(info.vcrRating || 'None'));
          el.querySelector('#act-maxspd')?.replaceChildren(document.createTextNode(info.speedAttr));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const tnInp = el.querySelector('#act-tn');
          const plInp = el.querySelector('#act-pool');
          if (tnInp) tnInp.value = info.handling;
          if (plInp) plInp.value = info.skillPool;
          const exChk = el.querySelector('#act-exceed');
          if (exChk) exChk.checked = info.exceedsSpeed;
          const oppSel = el.querySelector('#act-opponent');
          if (oppSel) oppSel.innerHTML = this._opponentSelectHtml(pid);
          const aRow = el.querySelector('#act-autonav-row');
          const aLbl = el.querySelector('#act-autonav-lbl');
          if (aRow) aRow.classList.toggle('act-disabled', !info.autonav);
          if (aLbl) aLbl.textContent = `Autonav active (+${info.autonav} TN)`;
          const vRow = el.querySelector('#act-vcr-row');
          const vLbl = el.querySelector('#act-vcr-lbl');
          const vChk = el.querySelector('#act-vcr');
          if (vRow) vRow.classList.toggle('act-disabled', !info.vcrRating);
          if (vLbl) vLbl.textContent = `VCR active (−${info.vcrRating * 2} TN)`;
          if (vChk) { vChk.disabled = !info.vcrRating; if (!info.vcrRating) vChk.checked = false; }
          update();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        el.querySelector('#act-opponent')?.addEventListener('change', () => update());
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await this._fireActionRoll(result, 'Hiding');
  }

  /* ------------------------------------------------------------------ */
  /*  5. Relocating                                                       */
  /* ------------------------------------------------------------------ */

  async _actionRelocating() {
    const withDrivers = this._participants.filter(p => p.driverActorId);
    if (!withDrivers.length) { ui.notifications.warn('No vehicles with drivers.'); return; }
    const defaultPid = withDrivers[0].id;
    const info0      = this._getParticipantInfo(defaultPid);

    // Sensor rating of the acting vehicle
    const sensorOf = (pid) => {
      const p = this._participants.find(x => x.id === pid);
      const v = game.actors.get(p?.vehicleActorId);
      return v?.system.attributes?.sensor?.base ?? 0;
    };

    // Signature rating of an opponent participant's vehicle
    const sigOf = (pid) => {
      const p = this._participants.find(x => x.id === pid);
      const v = game.actors.get(p?.vehicleActorId);
      return v?.system.attributes?.sig?.base ?? 4;
    };

    // Relocating terrain modifiers
    const terrainMods = { open: -3, normal: -1, restricted: 0, tight: 3 };
    const terrainOpts = [
      ['open',       'Open (−3)'],
      ['normal',     'Normal (−1)'],
      ['restricted', 'Restricted (0)'],
      ['tight',      'Tight (+3)'],
    ].map(([k, l]) => `<option value="${k}" ${this._terrain === k ? 'selected' : ''}>${l}</option>`).join('');

    this._warnDamage(info0);
    const defaultOppPid  = this._participants.find(p => p.id !== defaultPid)?.id ?? '';
    const initSensor     = sensorOf(defaultPid);
    const initSig        = sigOf(defaultOppPid);
    const exceedChecked  = info0?.exceedsSpeed ? 'checked' : '';
    let result = null;

    await foundry.applications.api.DialogV2.wait({
      window: { title: 'Relocating' },
      content: `
        <label class="act-field act-full" style="margin-bottom:8px;">Searching Vehicle
          <select id="act-participant">${this._actorSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-iv">${info0?.vehicle?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Driver</span><span id="act-id">${info0?.driver?.name ?? '?'}</span></div>
          <div class="act-info-row"><span>Sensor Rating</span><span id="act-isr">${initSensor}</span></div>
          <div class="act-info-row"><span>Autonav</span><span id="act-ia">${info0?.autonav ?? 0}</span></div>
          <div class="act-info-row"><span>Damage</span><span id="act-idmg">${this._dmgInfoText(info0?.damageInfo)}</span></div>
        </div>
        <label class="act-field act-full" style="margin-bottom:8px;">Target (hidden vehicle)
          <select id="act-opponent">${this._opponentSelectHtml(defaultPid)}</select>
        </label>
        <div class="act-info" id="act-opp-info">
          <div class="act-info-row"><span>Vehicle</span><span id="act-ov">${
            (() => { const p = this._participants.find(x => x.id === defaultOppPid); return game.actors.get(p?.vehicleActorId)?.name ?? '—'; })()
          }</span></div>
          <div class="act-info-row"><span>Signature (base TN)</span>
            <span><input id="act-sig" type="number" value="${initSig}" min="1" max="20"
              style="width:50px;background:#1c2030;color:#dde1f0;border:1px solid #3a9fd6;border-radius:3px;padding:2px 4px;"/></span>
          </div>
        </div>
        <div class="act-grid">
          <label class="act-field act-full">Opponent's hiding successes
            <input id="act-hiding-succ" type="number" value="0" min="0" max="30"
              style="background:#1c2030;color:#dde1f0;border:1px solid #3a9fd6;border-radius:3px;padding:2px 5px;width:100%;box-sizing:border-box;"/>
            <small style="color:#7880a0;font-size:10px;">+1 TN per success</small>
          </label>
          <div class="act-check-row act-full" id="act-exceed-row">
            <input type="checkbox" id="act-exceed" ${exceedChecked}/>
            <label for="act-exceed" id="act-exceed-lbl">Exceeds speed rating (+4 TN) — km/h ÷ 1.2 &gt; <span id="act-maxspd">${info0?.speedAttr ?? 0}</span> km/ct</label>
          </div>
          <label class="act-field act-full">Terrain
            <select id="act-terrain">${terrainOpts}</select>
          </label>
          <div class="act-check-row${info0?.autonav ? '' : ' act-disabled'}" id="act-autonav-row">
            <input type="checkbox" id="act-autonav"/>
            <label for="act-autonav" id="act-autonav-lbl">Autonav active (−${info0?.autonav ?? 0} TN)</label>
          </div>
          <label class="act-field">Pool (Sensor Rating)
            <input id="act-pool" type="number" value="${initSensor}" min="0" max="30"/>
          </label>
          <label class="act-field">Base TN (Sig Rating)
            <input id="act-tn" type="number" value="${initSig}" min="1" max="30"/>
          </label>
        </div>
        <input type="hidden" id="act-mod-total" value="0"/>
        <div class="act-preview">
          <span>Final TN: <strong id="act-tn-out">${initSig}</strong></span>
          <span>Pool: <strong id="act-pool-out">${initSensor}</strong></span>
        </div>`,

      render: (_ev, dialog) => {
        const el = dialog.element;

        const getMod = (el) => {
          const pid     = el.querySelector('#act-participant')?.value;
          const oppPid  = el.querySelector('#act-opponent')?.value;
          const info    = pid    ? this._getParticipantInfo(pid)    : null;
          const oppInfo = oppPid ? this._getParticipantInfo(oppPid) : null;
          const mnvMod  = this._maneuverMod(info?.maneuver ?? null, oppInfo?.maneuver ?? null);
          const hiding  = parseInt(el.querySelector('#act-hiding-succ')?.value) || 0;
          const exceed  = el.querySelector('#act-exceed')?.checked ? 4 : 0;
          const terrain = terrainMods[el.querySelector('#act-terrain')?.value] ?? 0;
          const autonav = el.querySelector('#act-autonav')?.checked ? -((info?.autonav ?? 0)) : 0;
          const dmg     = info?.damageInfo?.tnMod ?? 0;
          const total   = mnvMod + hiding + exceed + terrain + autonav + dmg;
          const hidden  = el.querySelector('#act-mod-total');
          if (hidden) hidden.value = total;
          return total;
        };

        // Keep #act-tn in sync with the editable sig input in the opponent info box
        const syncSigInputs = () => {
          const sigVal = el.querySelector('#act-sig')?.value;
          const tnInp  = el.querySelector('#act-tn');
          if (tnInp && sigVal !== undefined) tnInp.value = sigVal;
        };
        el.querySelector('#act-sig')?.addEventListener('input', () => { syncSigInputs(); update(); });
        el.querySelector('#act-tn')?.addEventListener('input',  () => {
          const tnVal = el.querySelector('#act-tn')?.value;
          const sigInp = el.querySelector('#act-sig');
          if (sigInp && tnVal !== undefined) sigInp.value = tnVal;
        });

        const refreshOpponent = () => {
          const oppPid = el.querySelector('#act-opponent')?.value;
          const oppP   = this._participants.find(x => x.id === oppPid);
          const oppV   = game.actors.get(oppP?.vehicleActorId);
          const sig    = oppV?.system.attributes?.sig?.base ?? 4;
          el.querySelector('#act-ov')?.replaceChildren(document.createTextNode(oppV?.name ?? '—'));
          const sigInp = el.querySelector('#act-sig');
          const tnInp  = el.querySelector('#act-tn');
          if (sigInp) sigInp.value = sig;
          if (tnInp)  tnInp.value  = sig;
          update();
        };

        const refreshParticipant = () => {
          const pid    = el.querySelector('#act-participant')?.value;
          const info   = pid ? this._getParticipantInfo(pid) : null;
          if (!info) return;
          const sensor = info.vehicle?.system.attributes?.sensor?.base ?? 0;
          this._warnDamage(info);
          el.querySelector('#act-iv')?.replaceChildren(document.createTextNode(info.vehicle?.name ?? '?'));
          el.querySelector('#act-id')?.replaceChildren(document.createTextNode(info.driver?.name  ?? '?'));
          el.querySelector('#act-isr')?.replaceChildren(document.createTextNode(sensor));
          el.querySelector('#act-ia')?.replaceChildren(document.createTextNode(info.autonav));
          el.querySelector('#act-maxspd')?.replaceChildren(document.createTextNode(info.speedAttr));
          el.querySelector('#act-idmg')?.replaceChildren(document.createTextNode(this._dmgInfoText(info.damageInfo)));
          const plInp = el.querySelector('#act-pool');
          if (plInp) plInp.value = sensor;
          const exChk = el.querySelector('#act-exceed');
          if (exChk) exChk.checked = info.exceedsSpeed;
          const oppSel = el.querySelector('#act-opponent');
          if (oppSel) { oppSel.innerHTML = this._opponentSelectHtml(pid); refreshOpponent(); }
          const aRow = el.querySelector('#act-autonav-row');
          const aLbl = el.querySelector('#act-autonav-lbl');
          if (aRow) aRow.classList.toggle('act-disabled', !info.autonav);
          if (aLbl) aLbl.textContent = `Autonav active (−${info.autonav} TN)`;
          const vRow = el.querySelector('#act-vcr-row');
          if (vRow) vRow.classList.toggle('act-disabled', true); // no VCR for sensor roll
          update();
        };

        const update = this._wireActionPreview(el, getMod);
        el.querySelector('#act-participant')?.addEventListener('change', refreshParticipant);
        el.querySelector('#act-opponent')?.addEventListener('change', refreshOpponent);
        update();
      },

      buttons: [
        {
          label: 'Roll', action: 'roll', default: true,
          callback: (_e, _b, dialog) => { result = dialog.element; },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
    });

    if (!result) return;
    await this._fireActionRoll(result, 'Relocating');
  }
}

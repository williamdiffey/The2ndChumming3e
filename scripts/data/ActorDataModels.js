const {
  StringField, NumberField, BooleanField,
  SchemaField, ArrayField, HTMLField, ObjectField,
} = foundry.data.fields;

/** Basic persisted attribute: base, value, mod */
function _attr(base = 3) {
  return new SchemaField({
    base:  new NumberField({ required: true, integer: true, initial: base, min: 0, nullable: false }),
    value: new NumberField({ required: true, integer: true, initial: base, min: 0, nullable: false }),
    mod:   new NumberField({ required: true, integer: true, initial: 0, nullable: false }),
  });
}

/** Vehicle attribute: base + value only (no mod) */
function _vAttr(base = 0) {
  return new SchemaField({
    value: new NumberField({ integer: true, initial: base, min: 0 }),
    base:  new NumberField({ integer: true, initial: base, min: 0 }),
  });
}

/** Shared pool fields used by both character and npc */
function _pools() {
  return {
    combatPoolSpent:         new NumberField({ integer: true, initial: 0, min: 0 }),
    combatPoolMod:           new NumberField({ integer: true, initial: 0 }),
    spellPoolSpent:          new NumberField({ integer: true, initial: 0, min: 0 }),
    spellPoolMod:            new NumberField({ integer: true, initial: 0 }),
    astralPoolSpent:         new NumberField({ integer: true, initial: 0, min: 0 }),
    astralPoolMod:           new NumberField({ integer: true, initial: 0 }),
    spellDefensePool:        new NumberField({ integer: true, initial: 0, min: 0 }),
    spellDefenseSorceryDice: new NumberField({ integer: true, initial: 0, min: 0 }),
  };
}

/** Shared wound track */
function _wounds() {
  return new SchemaField({
    stun: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
      max:   new NumberField({ integer: true, initial: 10 }),
    }),
    physical: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
      max:   new NumberField({ integer: true, initial: 10 }),
    }),
    overflow: new SchemaField({
      value: new NumberField({ integer: true, initial: 0, min: 0 }),
    }),
  });
}

// ── Character ─────────────────────────────────────────────────────────────────

export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      biography:               new HTMLField({ initial: '', required: false }),
      notes:                   new HTMLField({ initial: '', required: false }),
      metatype:                new StringField({ initial: 'human' }),
      gender:                  new StringField({ initial: '' }),
      age:                     new StringField({ initial: '' }),
      height:                  new StringField({ initial: '' }),
      weight:                  new StringField({ initial: '' }),
      ethnicity:               new StringField({ initial: '' }),
      reputation:              new NumberField({ integer: true, initial: 0, min: 0 }),
      notoriety:               new NumberField({ integer: true, initial: 0, min: 0 }),
      streetCred:              new NumberField({ integer: true, initial: 0, min: 0 }),
      nuyen:                   new NumberField({ integer: true, initial: 0, min: 0 }),
      karma:                   new NumberField({ integer: true, initial: 0 }),
      totalKarma:              new NumberField({ integer: true, initial: 0 }),
      karmaPool:               new NumberField({ integer: true, initial: 0, min: 0 }),
      hackingBonus:            new NumberField({ integer: true, initial: 0 }),
      initiativeDiceBonus:     new NumberField({ integer: true, initial: 0, min: 0 }),
      equippedArmor:           new StringField({ initial: '' }),
      equippedMelee:           new StringField({ initial: '' }),
      activeVCRItemId:         new StringField({ initial: '' }),
      equippedCyberdeck:       new StringField({ initial: '' }),
      matrixUserMode:          new StringField({ initial: '' }),
      astralMode:              new StringField({ initial: '' }),
      magicTradition:          new StringField({ initial: '' }),
      magicType:               new StringField({ initial: '' }),
      magicTotem:              new StringField({ initial: '' }),
      magicElement:            new StringField({ initial: '' }),
      ..._pools(),
      attributes: new SchemaField({
        body:         _attr(3),
        quickness:    _attr(3),
        strength:     _attr(3),
        charisma:     _attr(3),
        intelligence: _attr(3),
        willpower:    _attr(3),
        essence: new SchemaField({
          value: new NumberField({ initial: 6, nullable: false }),
          base:  new NumberField({ initial: 6, nullable: false }),
        }),
        magic: new SchemaField({
          value: new NumberField({ integer: true, initial: 0, min: 0 }),
          base:  new NumberField({ integer: true, initial: 0, min: 0 }),
          mod:   new NumberField({ integer: true, initial: 0 }),
        }),
        reaction: new SchemaField({
          value:         new NumberField({ integer: true, initial: 3, min: 0 }),
          base:          new NumberField({ integer: true, initial: 3, min: 0 }),
          reactionBonus: new NumberField({ integer: true, initial: 0 }),
          diceBonus:     new NumberField({ integer: true, initial: 0 }),
          override:      new BooleanField({ initial: false }),
        }),
      }),
      wounds:         _wounds(),
      linkedVehicles: new ArrayField(new ObjectField()),
    };
  }
}

// ── NPC ───────────────────────────────────────────────────────────────────────

export class NpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      metatype:         new StringField({ initial: 'human' }),
      nuyen:            new NumberField({ integer: true, initial: 0, min: 0 }),
      notes:            new HTMLField({ initial: '', required: false }),
      equippedMelee:    new StringField({ initial: '' }),
      activeVCRItemId:  new StringField({ initial: '' }),
      equippedCyberdeck: new StringField({ initial: '' }),
      matrixUserMode:   new StringField({ initial: '' }),
      astralMode:       new StringField({ initial: '' }),
      magicTradition:   new StringField({ initial: '' }),
      magicType:        new StringField({ initial: '' }),
      magicTotem:       new StringField({ initial: '' }),
      magicElement:     new StringField({ initial: '' }),
      ..._pools(),
      attributes: new SchemaField({
        body:         _attr(3),
        quickness:    _attr(3),
        strength:     _attr(3),
        charisma:     _attr(3),
        intelligence: _attr(3),
        willpower:    _attr(3),
        essence: new SchemaField({
          value: new NumberField({ initial: 6 }),
          base:  new NumberField({ initial: 6 }),
        }),
        magic: new SchemaField({
          value: new NumberField({ integer: true, initial: 0, min: 0 }),
          base:  new NumberField({ integer: true, initial: 0, min: 0 }),
        }),
        reaction: new SchemaField({
          value: new NumberField({ integer: true, initial: 3, min: 0 }),
          base:  new NumberField({ integer: true, initial: 3, min: 0 }),
          bonus: new NumberField({ integer: true, initial: 0 }),
        }),
      }),
      wounds:         _wounds(),
      linkedVehicles: new ArrayField(new ObjectField()),
    };
  }
}

// ── Vehicle ───────────────────────────────────────────────────────────────────

export class VehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      vehicleType:  new StringField({ initial: 'car' }),
      controlledBy: new StringField({ initial: '' }),
      vcrMode:      new BooleanField({ initial: false }),
      seating:      new NumberField({ integer: true, initial: 4, min: 0 }),
      entryPoints:  new StringField({ initial: '' }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:  new NumberField({ initial: 0, min: 0 }),
      availability: new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
      damage: new SchemaField({
        value: new NumberField({ integer: true, initial: 0, min: 0 }),
      }),
      attributes: new SchemaField({
        handling: _vAttr(3),
        speed:    _vAttr(0),
        accel:    _vAttr(0),
        body:     _vAttr(4),
        armor:    _vAttr(0),
        sig:      _vAttr(3),
        autonav:  _vAttr(0),
        pilot:    _vAttr(3),
        sensor:   _vAttr(3),
        cargo:    _vAttr(0),
        load:     _vAttr(0),
      }),
    };
  }
}

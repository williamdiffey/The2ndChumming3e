const {
  StringField, NumberField, BooleanField,
  SchemaField, ArrayField, HTMLField, ObjectField,
} = foundry.data.fields;

// ── Weapons ───────────────────────────────────────────────────────────────────

export class MeleeData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.reach == null || typeof source.reach !== 'number') {
      source.reach = parseInt(source.reach) || 0;
    }
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      reach:          new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      notes:          new HTMLField({ initial: '', required: false }),
      isFocus:        new BooleanField({ initial: false }),
      focusActive:    new BooleanField({ initial: false }),
    };
  }
}

export class ProjectileData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      strMin:         new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
      isAoE:          new BooleanField({ initial: false }),
    };
  }
}

export class ThrownData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      strMin:         new NumberField({ integer: true, initial: 0, min: 0 }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      legal:          new BooleanField({ initial: true }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
      isAoE:          new BooleanField({ initial: false }),
    };
  }
}

export class FirearmData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      category:       new StringField({ initial: '' }),
      concealability: new StringField({ initial: '' }),
      ammunition:     new StringField({ initial: '' }),
      mode:           new StringField({ initial: '' }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      accessories:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
      isAoE:          new BooleanField({ initial: false }),
    };
  }
}

export class AmmunitionData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      concealability: new StringField({ initial: '' }),
      damage:         new StringField({ initial: '' }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Armor ─────────────────────────────────────────────────────────────────────

export class ArmorData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      concealability: new StringField({ initial: '' }),
      ballistic:      new NumberField({ integer: true, initial: 0, min: 0 }),
      impact:         new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:         new NumberField({ initial: 0, min: 0 }),
      availability:   new StringField({ initial: '' }),
      cost:           new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:    new StringField({ initial: '' }),
      bookPage:       new StringField({ initial: '' }),
      notes:          new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Gear / Skills / Qualities ─────────────────────────────────────────────────

export class GearData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    if (source.weight != null && typeof source.weight !== 'number') {
      source.weight = parseFloat(source.weight) || 0;
    }
    return super.migrateData(source);
  }

  static defineSchema() {
    return {
      quantity:    new NumberField({ integer: true, initial: 1, min: 0 }),
      cost:        new NumberField({ integer: true, initial: 0, min: 0 }),
      weight:      new NumberField({ initial: 0, min: 0 }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class SkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rating:          new NumberField({ integer: true, initial: 1, min: 0 }),
      force:           new NumberField({ integer: true, initial: 0, min: 0 }),
      category:        new StringField({ initial: '' }),
      skillName:       new StringField({ initial: '' }),
      linkedAttribute: new StringField({ initial: 'quickness' }),
      specialisation:  new StringField({ initial: '' }),
      description:     new HTMLField({ initial: '', required: false }),
    };
  }
}

export class QualityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      qualityType:  new StringField({ initial: 'positive' }),
      karmaCost:    new NumberField({ integer: true, initial: 0 }),
      description:  new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Cyberware / Bioware ───────────────────────────────────────────────────────

export class CyberwareData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      essenceCost:       new NumberField({ initial: 0.5, min: 0 }),
      grade:             new StringField({ initial: 'Standard' }),
      rating:            new NumberField({ integer: true, initial: 0, min: 0 }),
      cost:              new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:      new StringField({ initial: '' }),
      streetIndex:       new NumberField({ initial: 0, min: 0 }),
      legalCode:         new StringField({ initial: '' }),
      mods:              new StringField({ initial: '' }),
      capacity:          new NumberField({ initial: 0, min: 0 }),
      cyberwareCategory: new StringField({ initial: '' }),
      isReplacement:     new BooleanField({ initial: false }),
      bookPage:          new StringField({ initial: '' }),
      description:       new HTMLField({ initial: '', required: false }),
    };
  }
}

export class BiowareData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      bioIndex:         new NumberField({ initial: 0.25, min: 0 }),
      grade:            new StringField({ initial: 'Standard' }),
      rating:           new NumberField({ integer: true, initial: 0, min: 0 }),
      cost:             new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:     new StringField({ initial: '' }),
      streetIndex:      new NumberField({ initial: 0, min: 0 }),
      mods:             new StringField({ initial: '' }),
      biowareCategory:  new StringField({ initial: '' }),
      bookPage:         new StringField({ initial: '' }),
      description:      new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Magic ─────────────────────────────────────────────────────────────────────

export class SpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category:    new StringField({ initial: 'Combat' }),
      type:        new StringField({ initial: 'Physical' }),
      range:       new StringField({ initial: 'LOS' }),
      damage:      new StringField({ initial: '' }),
      duration:    new StringField({ initial: 'Instant' }),
      drain:       new StringField({ initial: '' }),
      target:      new StringField({ initial: '' }),
      bookPage:    new StringField({ initial: '' }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class VehicleWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      weaponType:   new StringField({ initial: '' }),
      mode:         new StringField({ initial: '' }),
      damage:       new StringField({ initial: '' }),
      ammunition:   new StringField({ initial: '' }),
      weight:       new NumberField({ initial: 0, min: 0 }),
      cost:         new NumberField({ integer: true, initial: 0, min: 0 }),
      availability: new StringField({ initial: '' }),
      streetIndex:  new StringField({ initial: '' }),
      bookPage:     new StringField({ initial: '' }),
      notes:        new HTMLField({ initial: '', required: false }),
    };
  }
}

export class VehicleModData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      cost:             new NumberField({ integer: true, initial: 0, min: 0 }),
      availability:     new StringField({ initial: '' }),
      streetIndex:      new StringField({ initial: '' }),
      installEquipment: new StringField({ initial: '' }),
      installTime:      new StringField({ initial: '' }),
      cfCost:           new StringField({ initial: '0' }),
      load:             new StringField({ initial: '' }),
      bookPage:         new StringField({ initial: '' }),
      description:      new HTMLField({ initial: '', required: false }),
    };
  }
}

export class AdeptPowerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      powerCost:   new NumberField({ initial: 0.5, min: 0 }),
      hasLevels:   new BooleanField({ initial: false }),
      level:       new NumberField({ integer: true, initial: 1, min: 1 }),
      mods:        new StringField({ initial: '' }),
      bookPage:    new StringField({ initial: '' }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class SummoningData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      spiritType: new StringField({ initial: 'earth_elemental' }),
      notes:      new HTMLField({ initial: '', required: false }),
    };
  }
}

// ── Matrix ────────────────────────────────────────────────────────────────────

export class ComplexFormData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      rating:      new NumberField({ integer: true, initial: 1, min: 0 }),
      duration:    new StringField({ initial: '' }),
      fade:        new StringField({ initial: '' }),
      description: new HTMLField({ initial: '', required: false }),
    };
  }
}

export class ProgramData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      name:             new StringField({ initial: '' }),
      type:             new StringField({ initial: '' }),
      category:         new StringField({ initial: '' }),
      rating:           new NumberField({ integer: true, initial: 0, min: 0 }),
      sizeMp:           new NumberField({ integer: true, initial: 0, min: 0 }),
      multiplier:       new NumberField({ integer: true, initial: 0 }),
      degradable:       new BooleanField({ initial: false }),
      description:      new HTMLField({ initial: '', required: false }),
      associatedPrompt: new StringField({ initial: '' }),
      effect:           new HTMLField({ initial: '', required: false }),
    };
  }
}

export class CyberdeckData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      manufacturer:  new StringField({ initial: '' }),
      era:           new StringField({ initial: '' }),
      cost:          new NumberField({ integer: true, initial: 0, min: 0 }),
      streetIndex:   new NumberField({ initial: 0, min: 0 }),
      availability:  new StringField({ initial: '' }),
      legalityCode:  new StringField({ initial: '4P-S' }),
      weight:        new NumberField({ initial: 0, min: 0 }),
      notes:         new HTMLField({ initial: '', required: false }),
      damage: new SchemaField({
        matrixConditionMonitor: new SchemaField({
          boxes:          new NumberField({ integer: true, initial: 10, min: 1 }),
          current:        new NumberField({ integer: true, initial: 0, min: 0 }),
          woundPenalties: new ArrayField(new NumberField({ integer: true }), { initial: [0, 1, 2, 3, 4, 5] }),
        }),
        burnedSlots: new ArrayField(new ObjectField()),
      }),
      attributes: new SchemaField({
        mpcp: new SchemaField({
          value:      new NumberField({ integer: true, initial: 0 }),
          base:       new NumberField({ integer: true, initial: 0 }),
          multiplier: new NumberField({ integer: true, initial: 8 }),
          costPerMp:  new NumberField({ integer: true, initial: 300 }),
        }),
        firewall: new SchemaField({
          value:      new NumberField({ integer: true, initial: 0 }),
          base:       new NumberField({ integer: true, initial: 0 }),
          multiplier: new NumberField({ integer: true, initial: 8 }),
          costPerMp:  new NumberField({ integer: true, initial: 200 }),
        }),
        response: new SchemaField({
          value:          new NumberField({ integer: true, initial: 0 }),
          base:           new NumberField({ integer: true, initial: 0 }),
          maxLevel:       new NumberField({ integer: true, initial: 0 }),
          initiativeDice: new NumberField({ integer: true, initial: 0 }),
          reactionBonus:  new NumberField({ integer: true, initial: 0 }),
        }),
        memory: new SchemaField({
          total: new NumberField({ integer: true, initial: 0 }),
          used:  new NumberField({ integer: true, initial: 0 }),
          unit:  new StringField({ initial: 'Mp' }),
        }),
        utilitySlots: new SchemaField({
          total:     new NumberField({ integer: true, initial: 0 }),
          available: new NumberField({ integer: true, initial: 0 }),
        }),
        dataTransferRate: new SchemaField({
          value: new NumberField({ integer: true, initial: 0 }),
          unit:  new StringField({ initial: 'Mp per Combat Turn' }),
        }),
        fluxRating: new SchemaField({
          value:    new NumberField({ integer: true, initial: 1 }),
          wireless: new BooleanField({ initial: false }),
        }),
      }),
      derivedStats: new SchemaField({
        matrixInitiative: new SchemaField({
          base:             new NumberField({ integer: true, initial: 0 }),
          dice:             new StringField({ initial: '0d6' }),
          userModeRequired: new StringField({ initial: 'VR-Hot' }),
        }),
        hackingPoolBonus:  new NumberField({ integer: true, initial: 0 }),
        personaStorage:    new NumberField({ integer: true, initial: 0 }),
        iconPhysicalStats: new SchemaField({
          strength:  new NumberField({ integer: true, initial: 0 }),
          quickness: new NumberField({ integer: true, initial: 0 }),
        }),
      }),
      modules:           new ArrayField(new ObjectField()),
      utilitySlotsArray: new ArrayField(new ObjectField()),
      storedUtilities:   new ArrayField(new ObjectField()),
    };
  }
}

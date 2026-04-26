/**
 * Convert SR3 melee JSON to Foundry VTT compendium format
 * Usage: node convert-melee.js
 */

const fs = require('fs');

// Valid melee category codes
const VALID_CODES = [
  'EDG', 'CLB', 'POL', 'WHP',  // Armed melee
  'CYB', 'UNA'                 // Unarmed/cyber
];

// Mapping from codes to skills
const CATEGORY_SKILL_MAP = {
  'EDG': { skill: 'Edged Weapons', attribute: 'strength' },
  'CLB': { skill: 'Clubs', attribute: 'strength' },
  'POL': { skill: 'Pole Arms/Staff', attribute: 'strength' },
  'WHP': { skill: 'Whips/Flails', attribute: 'strength' },
  'CYB': { skill: 'Unarmed Combat', attribute: 'strength' },
  'UNA': { skill: 'Unarmed Combat', attribute: 'strength' }
};

/**
 * Extract weapon code from name
 */
function extractCategory(name) {
  const match = name.match(/\(([^)]+)\)/);
  if (!match) return null;
  
  const code = match[1];
  
  // Check if it's a known code (case-insensitive)
  const upperCode = code.toUpperCase();
  const matchedCode = VALID_CODES.find(c => c.toUpperCase() === upperCode);
  return matchedCode || null;
}

/**
 * Clean weapon name by removing category code
 */
function cleanWeaponName(name) {
  let cleaned = name;
  while (cleaned.match(/\s*\([^)]+\)\s*$/)) {
    cleaned = cleaned.replace(/\s*\([^)]+\)\s*$/, '').trim();
  }
  return cleaned;
}

/**
 * Parse cost (remove ¥ and commas)
 */
function parseCost(costStr) {
  if (!costStr) return 0;
  return parseInt(String(costStr).replace(/[¥,]/g, '')) || 0;
}

/**
 * Convert a single weapon from raw JSON to Foundry format
 */
function convertWeapon(raw, index) {
  const name = raw.Name;
  const code = extractCategory(name);
  
  let mapping;
  let category;
  
  if (code && CATEGORY_SKILL_MAP[code]) {
    mapping = CATEGORY_SKILL_MAP[code];
    category = code;
  } else {
    mapping = { skill: 'Armed Combat', attribute: 'strength' };
    category = 'other';
  }
  
  const cleanName = cleanWeaponName(name);
  
  return {
    _id: `sr3e-melee-${String(index).padStart(4, '0')}`,
    name: cleanName,
    type: 'melee',
    system: {
      category: category,
      skill: mapping.skill,
      attribute: mapping.attribute,
      concealability: String(raw.Concealability || ''),
      reach: String(raw.Reach || '0'),
      damage: String(raw.Damage || ''),
      weight: String(raw.Weight || ''),
      availability: String(raw.Availability || ''),
      cost: parseCost(raw.Cost),
      streetIndex: String(raw['Street Index'] || raw.StreetIndex || '1'),
      legal: true,
      bookPage: String(raw.BookPage || ''),
      notes: ''
    }
  };
}

/**
 * Main conversion function
 */
function convertMelee() {
  console.log('Reading melee.json...\n');
  
  const rawData = fs.readFileSync('./melee.json', 'utf8');
  const melee = JSON.parse(rawData);
  
  console.log(`Found ${melee.length} weapons to process...`);
  
  const converted = [];
  const unknown = [];
  
  melee.forEach((weapon, index) => {
    const name = weapon.Name;
    const code = extractCategory(name);
    
    if (!code) {
      unknown.push({ name, reason: 'No category code in name' });
    } else if (!CATEGORY_SKILL_MAP[code]) {
      unknown.push({ name, reason: `Unknown code: "${code}"` });
    }
    
    const result = convertWeapon(weapon, index);
    converted.push(result);
  });
  
  // Write converted weapons
  fs.writeFileSync(
    './sr3e-melee-compendium.json',
    JSON.stringify(converted, null, 2),
    'utf8'
  );
  
  // Write unknown weapons report
  if (unknown.length > 0) {
    fs.writeFileSync(
      './unknown-melee.json',
      JSON.stringify(unknown, null, 2),
      'utf8'
    );
  }
  
  console.log(`✅ Conversion complete!`);
  console.log(`📁 Output: sr3e-melee-compendium.json`);
  console.log(`🔪 Weapons converted: ${converted.length}`);
  console.log(`⚠️  Unknown codes: ${unknown.length}`);
  
  // Stats by category
  const categories = {};
  const skills = {};
  
  converted.forEach(w => {
    const cat = w.system.category || 'other';
    categories[cat] = (categories[cat] || 0) + 1;
    
    const skill = w.system.skill || 'unknown';
    skills[skill] = (skills[skill] || 0) + 1;
  });
  
  console.log('\n📊 Weapons by category:');
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  
  console.log('\n🎯 Weapons by skill:');
  Object.entries(skills).sort((a, b) => b[1] - a[1]).forEach(([skill, count]) => {
    console.log(`   ${skill}: ${count}`);
  });
  
  if (unknown.length > 0) {
    console.log(`\n📋 Unknown weapons written to: unknown-melee.json`);
  }
}

convertMelee();
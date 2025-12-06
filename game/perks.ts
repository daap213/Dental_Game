
import { Perk, Player, Language } from '../types';
import { TEXT } from '../utils/locales';

// We store IDs and Logic here, but Text is retrieved from LOCALES using ID mapping
const PERK_DEFINITIONS: Omit<Perk, 'name' | 'description'>[] = [
    { id: 'enamel_shield', icon: 'shield', rarity: 'common', color: '#22d3ee', weight: 100 },
    { id: 'vitality_root', icon: 'heart', rarity: 'common', color: '#ef4444', weight: 100 },
    { id: 'extra_filling', icon: 'plus', rarity: 'common', color: '#10b981', weight: 80 },
    { id: 'fluoride_rush', icon: 'zap', rarity: 'rare', color: '#a3e635', weight: 50 },
    { id: 'aerodynamic_floss', icon: 'wind', rarity: 'rare', color: '#fbbf24', weight: 50 },
    { id: 'bristle_rage', icon: 'sword', rarity: 'rare', color: '#f472b6', weight: 40 },
    { id: 'thick_enamel', icon: 'shield', rarity: 'legendary', color: '#6366f1', weight: 20 },
    { id: 'extra_dash', icon: 'wind', rarity: 'legendary', color: '#f59e0b', weight: 15 },
    { id: 'temp_immunity', icon: 'zap', rarity: 'rare', color: '#e879f9', weight: 30 },
    { id: 'extra_life', icon: 'heart', rarity: 'legendary', color: '#fcd34d', weight: 5 }
];

export const getRandomPerks = (count: number = 3, lang: Language): Perk[] => {
    // Weighted Random Selection
    const selected: Perk[] = [];
    const pool = [...PERK_DEFINITIONS];
    
    for(let i=0; i<count; i++) {
        if (pool.length === 0) break;
        
        const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
        let r = Math.random() * totalWeight;
        
        let chosenDef = pool[0];
        for (const def of pool) {
            r -= def.weight;
            if (r <= 0) {
                chosenDef = def;
                break;
            }
        }
        
        // Hydrate with localized text
        const txt = TEXT[lang].perk_names[chosenDef.id as keyof typeof TEXT['en']['perk_names']];
        selected.push({
            ...chosenDef,
            name: txt.name,
            description: txt.desc
        });

        // Remove chosen to avoid duplicates in same hand
        const idx = pool.findIndex(p => p.id === chosenDef.id);
        if (idx > -1) pool.splice(idx, 1);
    }
    
    return selected;
};

export const applyPerk = (player: Player, perkId: string) => {
    switch (perkId) {
        case 'enamel_shield':
            player.maxShield += 25;
            player.shield = player.maxShield; // Fill shield on pickup
            break;
        case 'vitality_root':
            player.maxHp += 20;
            player.hp = Math.min(player.hp + 30, player.maxHp);
            break;
        case 'aerodynamic_floss':
            player.stats.dashCooldownMultiplier *= 0.85;
            break;
        case 'fluoride_rush':
            player.stats.speedMultiplier *= 1.1;
            break;
        case 'bristle_rage':
            player.stats.damageMultiplier *= 1.15;
            break;
        case 'extra_filling':
            player.hp = player.maxHp;
            player.shield = player.maxShield;
            break;
        case 'extra_dash':
            player.stats.maxDashes += 1;
            player.consecutiveDashes += 1; // Give one immediately
            break;
        case 'thick_enamel':
            player.stats.damageReduction += 0.15;
            // Cap at 60% reduction to prevent invincibility
            if (player.stats.damageReduction > 0.6) player.stats.damageReduction = 0.6;
            break;
        case 'temp_immunity':
            player.invincibleTimer = 3.0;
            break;
        case 'extra_life':
            player.lives += 1;
            player.hp = player.maxHp; // Also heal up a bit
            break;
    }
};

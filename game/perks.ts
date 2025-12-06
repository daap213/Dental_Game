
import { Perk, Player } from '../types';

export const PERKS: Perk[] = [
    {
        id: 'enamel_shield',
        name: 'Enamel Shield',
        description: 'Grants +25 Max Shield (Toothpaste Barrier).',
        icon: 'shield',
        rarity: 'common',
        color: '#22d3ee', // Cyan
        weight: 100
    },
    {
        id: 'vitality_root',
        name: 'Vitality Root',
        description: 'Increases Max HP by +20 and heals you.',
        icon: 'heart',
        rarity: 'common',
        color: '#ef4444', // Red
        weight: 100
    },
    {
        id: 'extra_filling',
        name: 'Extra Filling',
        description: 'Fully restores Health and Shield.',
        icon: 'plus',
        rarity: 'common',
        color: '#10b981', // Emerald
        weight: 80
    },
    {
        id: 'fluoride_rush',
        name: 'Fluoride Rush',
        description: 'Increases Movement Speed by 10%.',
        icon: 'zap',
        rarity: 'rare',
        color: '#a3e635', // Lime
        weight: 50
    },
    {
        id: 'aerodynamic_floss',
        name: 'Aerodynamic Floss',
        description: 'Reduces Dash Cooldown by 15%.',
        icon: 'wind',
        rarity: 'rare',
        color: '#fbbf24', // Amber
        weight: 50
    },
    {
        id: 'bristle_rage',
        name: 'Bristle Rage',
        description: 'Increases Damage dealt by 15%.',
        icon: 'sword',
        rarity: 'rare',
        color: '#f472b6', // Pink
        weight: 40
    },
    {
        id: 'thick_enamel',
        name: 'Thick Enamel',
        description: 'Take 15% less damage from all sources.',
        icon: 'shield',
        rarity: 'legendary',
        color: '#6366f1', // Indigo
        weight: 20
    },
    {
        id: 'extra_dash',
        name: 'Dual Motion',
        description: 'Gain +1 Max Consecutive Dash.',
        icon: 'wind',
        rarity: 'legendary',
        color: '#f59e0b', // Orange
        weight: 15
    },
    {
        id: 'temp_immunity',
        name: 'Fluoride Bath',
        description: 'Become invincible for 3 seconds now.',
        icon: 'zap',
        rarity: 'rare',
        color: '#e879f9', // Purple
        weight: 30
    },
    {
        id: 'extra_life',
        name: 'Crown Implant',
        description: '+1 Extra Life. Revive on death.',
        icon: 'heart',
        rarity: 'legendary',
        color: '#fcd34d', // Gold
        weight: 5
    }
];

export const getRandomPerks = (count: number = 3): Perk[] => {
    // Weighted Random Selection
    const selected: Perk[] = [];
    const pool = [...PERKS];
    
    for(let i=0; i<count; i++) {
        if (pool.length === 0) break;
        
        const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
        let r = Math.random() * totalWeight;
        
        let chosenPerk = pool[0];
        for (const perk of pool) {
            r -= perk.weight;
            if (r <= 0) {
                chosenPerk = perk;
                break;
            }
        }
        
        selected.push(chosenPerk);
        // Remove chosen to avoid duplicates in same hand
        const idx = pool.findIndex(p => p.id === chosenPerk.id);
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

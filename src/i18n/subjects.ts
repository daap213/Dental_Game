import type { Enemy, Language, WeaponType } from '../types';
import type { PreviewGroupId } from '../game/render/preview';
import { TEXT } from './index';

/**
 * Puente entre los datos del juego y sus textos.
 *
 * Las claves de traducción no coinciden con los identificadores de los datos
 * —`plaque_monster` es `plaque` en los textos, `candy_bomber` es `bomber`—, así que
 * hace falta un mapa explícito. Está aquí y no dentro de la ficha para que un test
 * pueda comprobar que **todo** sujeto del juego tiene texto: si alguien añade un
 * enemigo y no lo traduce, falla el test en lugar de aparecer sin nombre en la ficha.
 */

/** Enemigos comunes: los ocho que no son jefes. */
export type CommonEnemy = Exclude<Enemy['subType'], 'boss'>;

export const ENEMY_TEXT_KEY: Record<CommonEnemy, keyof (typeof TEXT)['en']['enemy_names']> = {
  bacteria: 'bacteria',
  plaque_monster: 'plaque',
  candy_bomber: 'bomber',
  tartar_turret: 'turret',
  sugar_rusher: 'rusher',
  sugar_fiend: 'fiend',
  acid_spitter: 'spitter',
  gingivitis_grunt: 'grunt',
};

export const enemyText = (lang: Language, subType: CommonEnemy) => {
  const key = ENEMY_TEXT_KEY[subType];
  return { name: TEXT[lang].enemy_names[key], desc: TEXT[lang].enemy_desc[key] };
};

/** Clave de texto de cada jefe. La trae su propia ficha de datos (`nameKey`). */
export const bossText = (lang: Language, nameKey: keyof (typeof TEXT)['en']['bosses']) => ({
  name: TEXT[lang].bosses[nameKey],
  desc: TEXT[lang].boss_desc[nameKey],
});

export const weaponText = (lang: Language, weapon: WeaponType) => TEXT[lang].weapons[weapon];

/** Título de cada grupo de la galería. */
export const groupTitle = (lang: Language, group: PreviewGroupId): string => {
  const t = TEXT[lang].database;
  const titles: Record<PreviewGroupId, string> = {
    characters: t.group_characters,
    enemies: t.group_enemies,
    bosses: t.group_bosses,
    weapons: t.group_weapons,
    items: t.group_items,
    terrain: t.group_terrain,
    stages: t.group_stages,
    effects: t.group_effects,
    materials: t.group_materials,
    scenes: t.group_scenes,
  };
  return titles[group];
};

/** Nombre legible de cada sujeto de la galería, cuando lo tiene. */
export const previewLabel = (lang: Language, group: PreviewGroupId, key: string): string => {
  if (group === 'enemies') return enemyText(lang, key as CommonEnemy).name;
  if (group === 'weapons' || group === 'items') {
    if (key === 'health') return TEXT[lang].hud.vitals;
    return weaponText(lang, key as WeaponType).name;
  }
  if (group === 'characters') {
    return TEXT[lang].characters[key as keyof (typeof TEXT)['en']['characters']];
  }
  if (group === 'bosses') {
    const map: Record<string, keyof (typeof TEXT)['en']['bosses']> = {
      king: 'king',
      phantom: 'phantom',
      tank: 'tank',
      general: 'general',
      deity: 'deity',
      wisdom_warden: 'wisdom',
    };
    const nameKey = map[key];
    return nameKey ? TEXT[lang].bosses[nameKey] : key;
  }
  // Terreno, fases, efectos y materiales se identifican por su clave: son nombres
  // técnicos y traducirlos no aporta nada.
  return key;
};

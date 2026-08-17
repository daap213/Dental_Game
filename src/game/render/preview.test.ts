import { describe, it, expect } from 'vitest';
import { previewGroups, previewGroup, previewItem, WEAPON_TYPES } from './preview';
import { ENEMY_SPAWN_TABLE, STAGE_BOSSES, HIDDEN_BOSS } from '../data/enemies';
import { STAGE_PALETTES } from '../data/stages';
import { CHARACTER_PROFILES } from '../data/characters';
import { RAMPS } from '../data/palette';
import { TEXT } from '../../i18n';
import { ENEMY_TEXT_KEY, enemyText, bossText, weaponText, previewLabel } from '../../i18n/subjects';
import type { CommonEnemy } from '../../i18n/subjects';
import type { Language } from '../../types';

const LANGS: Language[] = ['en', 'es'];

const keysOf = (group: Parameters<typeof previewGroup>[0]) =>
  previewGroup(group).items.map((item) => item.key);

/**
 * Estos tests son la red que evita que la ficha de información vuelva a mentir.
 *
 * La pantalla ya se desincronizó tres veces del juego cuando era una lista escrita
 * a mano: anunciaba un máximo de nivel que no era, una progresión de bajas que no
 * era, y le faltaba el jefe oculto. Ahora todo sale de los datos, y esto comprueba
 * que **cada sujeto del juego aparece exactamente una vez y tiene texto**. Si
 * alguien añade un enemigo y se olvida de traducirlo, falla aquí en lugar de
 * aparecer sin nombre delante del jugador.
 */
describe('catálogo de vistas previas', () => {
  it('cubre exactamente los enemigos de la tabla de aparición', () => {
    expect(keysOf('enemies').sort()).toEqual(ENEMY_SPAWN_TABLE.map((e) => e.subType).sort());
  });

  it('cubre los jefes de las cinco fases más el oculto', () => {
    expect(keysOf('bosses').sort()).toEqual(
      [...STAGE_BOSSES.map((b) => b.variant), HIDDEN_BOSS.variant].sort()
    );
  });

  it('cubre las seis armas, y cada una tiene su objeto', () => {
    expect(keysOf('weapons').sort()).toEqual([...WEAPON_TYPES].sort());
    for (const weapon of WEAPON_TYPES) expect(keysOf('items')).toContain(weapon);
    // Y el botiquín, que no es un arma.
    expect(keysOf('items')).toContain('health');
  });

  it('cubre las cuatro clases, las cinco fases y todos los materiales', () => {
    expect(keysOf('characters').sort()).toEqual(Object.keys(CHARACTER_PROFILES).sort());
    expect(keysOf('stages').sort()).toEqual(STAGE_PALETTES.map((p) => p.id).sort());
    expect(keysOf('materials').sort()).toEqual(Object.keys(RAMPS).sort());
  });

  it('los identificadores no se repiten en todo el catálogo', () => {
    const ids = previewGroups().flatMap((group) => group.items.map((item) => item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ninguna vista previa tiene tamaño inválido', () => {
    for (const group of previewGroups()) {
      expect(group.items.length, `${group.id} está vacío`).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(item.w, item.id).toBeGreaterThan(0);
        expect(item.h, item.id).toBeGreaterThan(0);
        expect(typeof item.draw).toBe('function');
      }
    }
  });

  it('se puede pedir una vista previa por id', () => {
    expect(previewItem('enemy:bacteria')?.key).toBe('bacteria');
    expect(previewItem('boss:wisdom_warden')?.key).toBe('wisdom_warden');
    expect(previewItem('no:existe')).toBeUndefined();
  });

  it('el catálogo se construye una sola vez', () => {
    expect(previewGroups()).toBe(previewGroups());
  });

  it('los enemigos y los jefes se miden como su hitbox', () => {
    for (const entry of ENEMY_SPAWN_TABLE) {
      const item = previewItem(`enemy:${entry.subType}`);
      expect(item?.w, entry.subType).toBe(entry.w);
      expect(item?.h, entry.subType).toBe(entry.h);
    }
    for (const boss of [...STAGE_BOSSES, HIDDEN_BOSS]) {
      const item = previewItem(`boss:${boss.variant}`);
      expect(item?.w, boss.variant).toBe(boss.w);
      expect(item?.h, boss.variant).toBe(boss.h);
    }
  });
});

describe('textos de todo lo que se muestra', () => {
  it('cada enemigo de la tabla tiene clave de texto, nombre y descripción', () => {
    for (const entry of ENEMY_SPAWN_TABLE) {
      const subType = entry.subType as CommonEnemy;
      expect(ENEMY_TEXT_KEY[subType], `falta clave de ${subType}`).toBeDefined();
      for (const lang of LANGS) {
        const text = enemyText(lang, subType);
        expect(text.name?.trim(), `${subType} en ${lang}`).toBeTruthy();
        expect(text.desc?.trim(), `${subType} en ${lang}`).toBeTruthy();
      }
    }
  });

  it('cada jefe tiene nombre y descripción en los dos idiomas', () => {
    for (const boss of [...STAGE_BOSSES, HIDDEN_BOSS]) {
      for (const lang of LANGS) {
        const text = bossText(lang, boss.nameKey);
        expect(text.name?.trim(), `${boss.variant} en ${lang}`).toBeTruthy();
        expect(text.desc?.trim(), `${boss.variant} en ${lang}`).toBeTruthy();
      }
    }
  });

  it('cada arma tiene nombre y descripción en los dos idiomas', () => {
    for (const weapon of WEAPON_TYPES) {
      for (const lang of LANGS) {
        const text = weaponText(lang, weapon);
        expect(text.name?.trim(), `${weapon} en ${lang}`).toBeTruthy();
        expect(text.desc?.trim(), `${weapon} en ${lang}`).toBeTruthy();
      }
    }
  });

  it('cada mejora del juego tiene texto: las diez, no las que se escribieron a mano', () => {
    for (const lang of LANGS) {
      const perks = TEXT[lang].perk_names;
      expect(Object.keys(perks)).toHaveLength(10);
      for (const [id, text] of Object.entries(perks)) {
        expect(text.name?.trim(), `${id} en ${lang}`).toBeTruthy();
        expect(text.desc?.trim(), `${id} en ${lang}`).toBeTruthy();
      }
    }
  });

  it('toda vista previa tiene una etiqueta legible en los dos idiomas', () => {
    for (const lang of LANGS) {
      for (const group of previewGroups()) {
        for (const item of group.items) {
          const label = previewLabel(lang, group.id, item.key);
          expect(label?.trim(), `${item.id} en ${lang}`).toBeTruthy();
        }
      }
    }
  });

  it('los títulos de grupo existen en los dos idiomas', () => {
    for (const lang of LANGS) {
      const t = TEXT[lang].database;
      for (const key of [
        'gallery_title',
        'group_characters',
        'group_enemies',
        'group_bosses',
        'group_weapons',
        'group_items',
        'group_terrain',
        'group_stages',
        'group_effects',
        'group_materials',
        'group_scenes',
      ] as const) {
        expect(t[key]?.trim(), `${key} en ${lang}`).toBeTruthy();
      }
    }
  });
});

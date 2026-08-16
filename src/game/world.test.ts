import { describe, it, expect } from 'vitest';
import { createWorld, syncHud, snapshotHud, hudChanged, type World } from './world';
import { applyPerk } from './perks';
import type { RunConfig } from './player';

const CONFIG: RunConfig = { loadout: 'all', difficulty: 'normal', character: 'molar' };
const nuevo = () => createWorld(CONFIG);

/**
 * Reproduce el puente motor -> UI tal y como lo hace el bucle: se guarda una
 * instantánea, y en cada frame se sincroniza y se compara para decidir si hay que
 * avisar a React.
 */
const publisher = (world: World) => {
  let published = snapshotHud(world);
  let publicaciones = 0;

  return {
    frame() {
      syncHud(world);
      if (hudChanged(world.hud, published)) {
        published = snapshotHud(world);
        publicaciones++;
      }
      return published;
    },
    get publicaciones() {
      return publicaciones;
    },
  };
};

describe('snapshotHud', () => {
  it('devuelve una copia, no el mismo objeto', () => {
    const world = nuevo();
    const snap = snapshotHud(world);
    expect(snap).not.toBe(world.hud);
    expect(snap).toEqual(world.hud);
  });

  it('la copia no se mueve cuando el mundo sigue cambiando', () => {
    const world = nuevo();
    const snap = snapshotHud(world);
    world.player.hp -= 40;
    syncHud(world);
    expect(snap.hp).toBe(world.player.maxHp);
    expect(world.hud.hp).toBe(world.player.maxHp - 40);
  });

  it('guardar la referencia en vez de la copia no detecta nada — el fallo original', () => {
    // Documenta por qué esto tiene que ser una copia: el bucle guardaba
    // `world.hud` tal cual, así que hudChanged comparaba el objeto consigo mismo,
    // siempre daba falso y el HUD se quedaba congelado toda la partida.
    const world = nuevo();
    const alias = world.hud;

    world.player.hp -= 40;
    syncHud(world);

    expect(hudChanged(world.hud, alias)).toBe(false);
    expect(hudChanged(world.hud, snapshotHud(nuevo()))).toBe(true);
  });
});

describe('publicación del HUD frame a frame', () => {
  it('recibir daño se publica', () => {
    const world = nuevo();
    const pub = publisher(world);

    expect(pub.frame().hp).toBe(world.player.maxHp);

    world.player.hp -= 25;
    const tras = pub.frame();

    expect(tras.hp).toBe(world.player.maxHp - 25);
    expect(pub.publicaciones).toBe(1);
  });

  it('un frame sin cambios no publica', () => {
    const world = nuevo();
    const pub = publisher(world);
    for (let i = 0; i < 60; i++) pub.frame();
    expect(pub.publicaciones).toBe(0);
  });

  it('publica cada cambio de vida, uno por uno', () => {
    const world = nuevo();
    const pub = publisher(world);

    for (let i = 0; i < 4; i++) {
      world.player.hp -= 10;
      pub.frame();
      pub.frame(); // el segundo frame no debe volver a publicar
    }

    expect(pub.publicaciones).toBe(4);
    expect(world.hud.hp).toBe(world.player.maxHp - 40);
  });

  it('todo lo que el HUD dibuja llega a la instantánea', () => {
    const world = nuevo();
    const pub = publisher(world);
    const p = world.player;

    p.score += 500;
    p.weapon = 'laser';
    p.weaponLevel = 3;
    p.lives = 2;
    p.slowTimer = 0.5;
    applyPerk(p, 'enamel_shield');
    applyPerk(p, 'bristle_rage');
    applyPerk(p, 'thick_enamel');
    applyPerk(p, 'extra_dash');
    applyPerk(p, 'fluoride_rush');
    applyPerk(p, 'aerodynamic_floss');

    const snap = pub.frame();

    expect(snap).toMatchObject({
      score: 500,
      weapon: 'laser',
      weaponLevel: 3,
      lives: 2,
      slowed: true,
      maxShield: 25,
      shield: 25,
      maxDashes: 2,
    });
    // Los perks se acumulan sobre el perfil de la clase: el molar parte de
    // SPD x0,92 y DEF +5%, así que estos valores son clase × perk.
    expect(snap.damageMultiplier).toBeCloseTo(1.0 * 1.15);
    expect(snap.speedMultiplier).toBeCloseTo(0.92 * 1.1);
    expect(snap.damageReduction).toBeCloseTo(0.05 + 0.15);
    expect(snap.dashCooldownMultiplier).toBeCloseTo(1.0 * 0.85);
  });

  it('el escudo se publica redondeado, para no re-renderizar en cada gota', () => {
    const world = nuevo();
    applyPerk(world.player, 'enamel_shield');
    world.player.shield = 10.4;
    syncHud(world);
    expect(world.hud.shield).toBe(11);
  });

  it('cambiar de arma se publica aunque no cambie nada más', () => {
    // Recoger un arma distinta no da puntos: antes el HUD seguía mostrando la
    // anterior hasta la siguiente baja.
    const world = nuevo();
    const pub = publisher(world);
    pub.frame();

    world.player.weapon = 'toothbrush';
    expect(pub.frame().weapon).toBe('toothbrush');
    expect(pub.publicaciones).toBe(1);
  });

  it('la vida del jefe la escribe la IA y sobrevive al sincronizado', () => {
    const world = nuevo();
    const pub = publisher(world);

    world.hud.bossName = 'Tartar Tank';
    world.hud.bossMaxHp = 3500;
    world.hud.bossHp = 3500;
    const snap = pub.frame();

    expect(snap).toMatchObject({ bossName: 'Tartar Tank', bossHp: 3500, bossMaxHp: 3500 });
  });
});

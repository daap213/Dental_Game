import { describe, it, expect } from 'vitest';
import {
  BLOATER_SPAWN,
  SHELL_ARMOUR,
  applyEnemyDamage,
  collidesWithPlatforms,
  cullEnemies,
  spawnDeathSpawn,
  updateEnemyAI,
} from './enemies';
import { ENEMY_CULL_MARGIN, contactDamageFor, isBurrowed } from './data/enemies';
import { CANVAS_WIDTH } from './data/physics';
import type { AudioManager } from './audio';
import type { World } from './world';
import type { Enemy, Player } from '../types';

const enemy = (x: number, overrides: Partial<Enemy> = {}): Enemy => ({
  id: Math.random().toString(),
  x,
  y: 100,
  w: 32,
  h: 32,
  vx: 0,
  vy: 0,
  hp: 20,
  maxHp: 20,
  type: 'enemy',
  subType: 'bacteria',
  color: '#0f0',
  facing: -1,
  isGrounded: false,
  aiTimer: 0,
  attackTimer: 0,
  frameTimer: 0,
  state: 0,
  bossState: 0, animTimer: 0, hitTimer: 0, actionTimer: 0,
  ...overrides,
});

/**
 * La coraza del sarro es el único enemigo que obliga a colocarse, así que su regla
 * es de juego y no de dibujo: si dejara de funcionar, el enemigo seguiría
 * apareciendo y peleándose igual, solo que sin su motivo de existir.
 */
describe('coraza del calculus_shell', () => {
  const shell = (facing: 1 | -1) =>
    enemy(100, { subType: 'calculus_shell', facing, hp: 100, maxHp: 100, w: 40 });

  it('frena el disparo que llega por el lado al que mira', () => {
    const e = shell(-1);
    // Mira a la izquierda; el disparo viene de la izquierda.
    const dealt = applyEnemyDamage(e, 40, e.x - 20);
    expect(dealt).toBeCloseTo(40 * SHELL_ARMOUR);
    expect(e.hp).toBeCloseTo(100 - 40 * SHELL_ARMOUR);
  });

  it('deja pasar el disparo que llega por detrás', () => {
    const e = shell(-1);
    const dealt = applyEnemyDamage(e, 40, e.x + e.w + 20);
    expect(dealt).toBe(40);
    expect(e.hp).toBe(60);
  });

  it('el lado protegido cambia con la orientación', () => {
    const derecha = shell(1);
    expect(applyEnemyDamage(derecha, 40, derecha.x + derecha.w + 20)).toBeCloseTo(
      40 * SHELL_ARMOUR
    );
    expect(applyEnemyDamage(shell(1), 40, 0)).toBe(40);
  });

  it('a los demás enemigos no les protege nada', () => {
    for (const subType of ['bacteria', 'gingivitis_grunt', 'abscess_bloater'] as const) {
      const e = enemy(100, { subType, hp: 100, maxHp: 100 });
      expect(applyEnemyDamage(e, 40, 0), subType).toBe(40);
    }
  });
});

describe('el absceso se abre al morir', () => {
  it('suelta tres bacterias, separadas y con su vida de la fase', () => {
    const enemies: Enemy[] = [];
    const bloater = enemy(300, { subType: 'abscess_bloater', w: 52, h: 44 });
    spawnDeathSpawn(bloater, enemies, 3);

    expect(enemies).toHaveLength(BLOATER_SPAWN);
    // Separadas: si salieran en el mismo punto se verían como una sola.
    const xs = enemies.map((e) => e.x);
    expect(new Set(xs).size).toBe(BLOATER_SPAWN);
    for (const cria of enemies) {
      expect(cria.subType).toBe('bacteria');
      expect(cria.hp).toBeGreaterThan(0);
      expect(cria.hp).toBe(cria.maxHp);
      // Salen despedidas hacia arriba, para que no se apilen sobre el cadáver.
      expect(cria.vy).toBeLessThan(0);
    }
  });

  it('la vida de las crías sube con la fase', () => {
    const uno: Enemy[] = [];
    const cinco: Enemy[] = [];
    spawnDeathSpawn(enemy(0, { subType: 'abscess_bloater' }), uno, 1);
    spawnDeathSpawn(enemy(0, { subType: 'abscess_bloater' }), cinco, 5);
    expect(cinco[0].hp).toBeGreaterThan(uno[0].hp);
  });

  it('ningún otro enemigo deja nada al morir', () => {
    for (const subType of ['bacteria', 'plaque_monster', 'calculus_shell'] as const) {
      const enemies: Enemy[] = [];
      spawnDeathSpawn(enemy(0, { subType }), enemies, 3);
      expect(enemies, subType).toHaveLength(0);
    }
  });

  it('los ids de las crías no chocan entre sí', () => {
    // Comparten el id del padre como prefijo; si además coincidieran entre ellas,
    // un proyectil perforante solo podría dañar a una.
    const enemies: Enemy[] = [];
    spawnDeathSpawn(enemy(0, { id: 'padre', subType: 'abscess_bloater' }), enemies, 1);
    expect(new Set(enemies.map((e) => e.id)).size).toBe(BLOATER_SPAWN);
  });
});

/**
 * Las dos máquinas de estados nuevas.
 *
 * Son las únicas dos IA con estados de verdad entre los enemigos comunes, y si una
 * transición se rompiera el enemigo seguiría apareciendo y moviéndose: se quedaría
 * pegado al techo para siempre, o enterrado sin volver a salir. Nada fallaría, solo
 * dejaría de jugar.
 */
describe('máquinas de estados de los enemigos nuevos', () => {
  const player = { x: 300, y: 300, w: 32, h: 48 } as Player;
  const world = { projectiles: [] } as unknown as World;
  const audio = { playBossAttack: () => {} } as unknown as AudioManager;

  const step = (e: Enemy, times = 1) => {
    for (let i = 0; i < times; i++) {
      updateEnemyAI(e, player, world, audio);
      e.x += e.vx;
      e.y += e.vy;
      e.aiTimer += 1 / 60;
    }
  };

  describe('biofilm_crawler', () => {
    const crawler = (x: number) =>
      enemy(x, { subType: 'biofilm_crawler', w: 36, h: 20, y: 116, bossState: 0 });

    it('se mantiene en el techo mientras acecha', () => {
      const e = crawler(600);
      step(e, 20);
      expect(e.bossState).toBe(0);
      expect(e.y).toBe(116);
      // Y se acerca al jugador, que está a su izquierda.
      expect(e.vx).toBeLessThan(0);
    });

    it('se suelta al quedar sobre el jugador', () => {
      const e = crawler(600);
      step(e, 400);
      expect(e.bossState).toBeGreaterThan(0);
    });

    it('al caer coge gravedad, y al tocar suelo se arrastra', () => {
      const e = crawler(300);
      step(e, 2);
      expect(e.bossState).toBe(1);
      step(e, 5);
      expect(e.vy).toBeGreaterThan(0);

      e.isGrounded = true;
      step(e);
      expect(e.bossState).toBe(2);
      // Arrastrándose ya persigue en horizontal.
      step(e);
      expect(Math.abs(e.vx)).toBeGreaterThan(0);
    });
  });

  describe('enamel_borer', () => {
    const borer = (x: number) =>
      enemy(x, { subType: 'enamel_borer', w: 30, h: 26, y: 380, bossState: 0 });

    it('se entierra y recuerda desde dónde lo hizo', () => {
      const e = borer(700);
      step(e);
      expect(e.burrowY).toBe(380);
      step(e, 40);
      expect(e.bossState).toBe(1);
      expect(isBurrowed(e)).toBe(true);
      // Bajo tierra no choca con el suelo: es lo que lo hace una emboscada.
      expect(collidesWithPlatforms(e, false)).toBe(false);
    });

    it('bajo tierra persigue más rápido de lo que anda', () => {
      const e = borer(700);
      step(e, 40);
      const buried = Math.abs(e.vx);
      e.bossState = 2;
      e.isGrounded = true;
      step(e);
      expect(buried).toBeGreaterThan(Math.abs(e.vx));
    });

    it('emerge de un salto al llegar junto al jugador', () => {
      const e = borer(700);
      step(e, 400);
      expect(e.bossState).toBe(2);
      expect(collidesWithPlatforms(e, false)).toBe(true);
    });

    it('vuelve a enterrarse tras un rato fuera, y olvida la cota anterior', () => {
      const e = borer(320);
      e.bossState = 2;
      e.isGrounded = true;
      e.burrowY = 380;
      e.aiTimer = 5;
      step(e);
      expect(e.bossState).toBe(0);
      expect(e.burrowY).toBeUndefined();
    });
  });
});

describe('cullEnemies', () => {
  it('descarta a los que quedaron muy por detrás de la cámara', () => {
    const cameraX = 5000;
    const enemies = [
      enemy(cameraX - ENEMY_CULL_MARGIN - 100), // fuera
      enemy(cameraX - 100), // dentro
      enemy(cameraX + CANVAS_WIDTH), // por delante
    ];

    const quedan = cullEnemies(enemies, cameraX);
    expect(quedan).toHaveLength(2);
    expect(quedan.every((e) => e.x + e.w > cameraX - ENEMY_CULL_MARGIN)).toBe(true);
  });

  it('nunca descarta a un jefe, esté donde esté', () => {
    const cameraX = 8000;
    const enemies = [
      enemy(0, { subType: 'boss', bossVariant: 'king' }),
      enemy(0, { subType: 'boss', bossVariant: 'wisdom_warden' }),
      enemy(0),
    ];

    const quedan = cullEnemies(enemies, cameraX);
    expect(quedan).toHaveLength(2);
    expect(quedan.every((e) => e.subType === 'boss')).toBe(true);
  });

  it('al principio del nivel no descarta a nadie', () => {
    const enemies = [enemy(0), enemy(100), enemy(800)];
    expect(cullEnemies(enemies, 0)).toHaveLength(3);
  });

  it('mantiene el orden y no muta el array original', () => {
    const enemies = [enemy(1000), enemy(2000), enemy(3000)];
    const copia = [...enemies];
    const quedan = cullEnemies(enemies, 0);
    expect(enemies).toEqual(copia);
    expect(quedan.map((e) => e.x)).toEqual([1000, 2000, 3000]);
  });
});

describe('contactDamageFor', () => {
  it('cada tipo de enemigo pega lo suyo, no un 20 para todos', () => {
    const bacteria = contactDamageFor(enemy(0, { subType: 'bacteria' }));
    const placa = contactDamageFor(enemy(0, { subType: 'plaque_monster' }));
    expect(bacteria).toBeGreaterThan(0);
    expect(placa).toBeGreaterThan(bacteria);
  });

  it('los jefes usan el valor de su ficha', () => {
    const rey = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: 'king' }));
    const deidad = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: 'deity' }));
    expect(deidad).toBeGreaterThan(rey);
  });

  it('un jefe sin variante conocida no devuelve NaN', () => {
    const dmg = contactDamageFor(enemy(0, { subType: 'boss', bossVariant: undefined }));
    expect(dmg).toBeGreaterThan(0);
  });
});

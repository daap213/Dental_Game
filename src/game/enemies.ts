
import { Enemy, LevelState, Language, Player } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, ATTACK_POSE } from './data/physics';
import { COLORS } from './data/palette';
import { AudioManager } from './audio';
import { spawnProjectile } from './weapons';
import { TEXT } from '../i18n';
import {
    getStageBoss,
    HIDDEN_BOSS,
    HIDDEN_BOSS_TRIGGERS,
    pickEnemySpawn,
    enemyHpForStage,
    ENEMY_CULL_MARGIN,
    ENEMY_SPAWN_TABLE,
    isBurrowed,
} from './data/enemies';
import type { World } from './world';

export const spawnHiddenBoss = (world: World, audio: AudioManager, lang: Language) => {
    const boss = HIDDEN_BOSS;
    world.hud.bossName = TEXT[lang].bosses[boss.nameKey];
    world.hud.bossMaxHp = boss.maxHp;
    world.hud.bossHp = boss.maxHp;
    audio.playBossIntro(boss.variant);

    world.enemies.push({
        id: 'hidden_boss',
        x: world.player.x + HIDDEN_BOSS_TRIGGERS.spawnOffsetX,
        y: CANVAS_HEIGHT - 250,
        w: boss.w, h: boss.h, vx: 0, vy: 0, hp: boss.maxHp, maxHp: boss.maxHp,
        type: 'enemy', subType: 'boss', bossVariant: boss.variant, phase: 1,
        color: boss.color, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0, animTimer: 0, hitTimer: 0, actionTimer: 0
    });
};

export const spawnBoss = (world: World, audio: AudioManager, lang: Language) => {
    const boss = getStageBoss(world.level.stage);

    world.hud.bossName = TEXT[lang].bosses[boss.nameKey];
    audio.playBossIntro(boss.variant);

    world.enemies.push({
        id: 'boss',
        x: world.level.levelWidth - 800 + 500,
        y: CANVAS_HEIGHT - 250,
        w: boss.w, h: boss.h, vx: 0, vy: 0, hp: boss.maxHp, maxHp: boss.maxHp,
        type: 'enemy', subType: 'boss', bossVariant: boss.variant, phase: 1,
        color: boss.color, facing: -1, isGrounded: true, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0, animTimer: 0, hitTimer: 0, actionTimer: 0
    });
    world.hud.bossMaxHp = boss.maxHp;
    world.hud.bossHp = boss.maxHp;
};

export const spawnEnemy = (level: LevelState, cameraX: number, enemies: Enemy[]) => {
    if (level.bossSpawned) return;

    const x = cameraX + CANVAS_WIDTH + 50;
    const y = Math.random() > 0.5 ? CANVAS_HEIGHT - 120 : CANVAS_HEIGHT - 240;
    const entry = pickEnemySpawn(Math.random());
    const hp = enemyHpForStage(entry, level.stage);

    enemies.push({
      id: Math.random().toString(),
      x, y, w: entry.w, h: entry.h, vx: 0, vy: 0, hp, maxHp: hp, type: 'enemy', subType: entry.subType,
      color: entry.color, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0, animTimer: 0, hitTimer: 0, actionTimer: 0
    });
};


// --- Constantes de los enemigos nuevos -------------------------------------

/** Altura a la que se pega la biopelícula: justo bajo la arcada superior. */
const CEILING_Y = 116;
/** A qué distancia horizontal del jugador se suelta del techo. */
const CRAWLER_DROP_X = 40;

/** Lo que tarda la barrena en enterrarse, en píxeles por paso. */
const BORER_DIG_SPEED = 7;
/** Cuánto se hunde por debajo de donde se enterró. */
const BORER_DEPTH = 90;
/** A qué distancia del jugador sale a la superficie. */
const BORER_SURFACE_X = 60;
/** Con qué impulso sale. */
const BORER_LUNGE = -16;
/** Cuánto aguanta fuera antes de volver a esconderse, en segundos. */
const BORER_SURFACE_TIME = 3;

/**
 * ¿Choca este enemigo con las plataformas en este eje?
 *
 * La condición estaba escrita como una cadena de `!==` en medio del bucle, y con
 * la barrena hacía falta una regla que además **depende de su estado**: bajo tierra
 * tiene que atravesar el suelo, que es justo lo que la convierte en una emboscada.
 * Vive aquí para que el bucle no tenga que saber de estados de IA.
 */
export const collidesWithPlatforms = (enemy: Enemy, horizontal: boolean): boolean => {
    if (enemy.subType === 'candy_bomber') return false;
    if (horizontal && (enemy.subType === 'acid_spitter' || enemy.subType === 'boss')) return false;
    return !isBurrowed(enemy);
};

/** Fracción del daño que atraviesa la coraza del sarro. */
export const SHELL_ARMOUR = 0.15;

/**
 * Aplica daño a un enemigo y devuelve cuánto ha entrado de verdad.
 *
 * Existe por el `calculus_shell`, cuya coraza **solo protege por delante**: hay que
 * rodearlo. La regla vive aquí y no en el bucle de colisiones para no hacer crecer
 * `GameCanvas`, que está en la lista de sustituir y no de arreglar.
 */
export const applyEnemyDamage = (enemy: Enemy, amount: number, fromX: number): number => {
    const center = enemy.x + enemy.w / 2;
    const side = fromX < center ? -1 : 1;
    const blocked = enemy.subType === 'calculus_shell' && side === enemy.facing;
    const dealt = blocked ? amount * SHELL_ARMOUR : amount;
    enemy.hp -= dealt;
    return dealt;
};

/** Cuántas bacterias suelta el absceso al reventar. */
export const BLOATER_SPAWN = 3;

/**
 * Lo que un enemigo deja al morir.
 *
 * De momento solo el `abscess_bloater`, que se abre en bacterias: matarlo de lejos
 * no resuelve el problema, lo reparte. Las crías salen ya separadas y con impulso
 * hacia fuera, para que no se solapen en un montón sobre el cadáver.
 */
export const spawnDeathSpawn = (enemy: Enemy, enemies: Enemy[], stage: number) => {
    if (enemy.subType !== 'abscess_bloater') return;

    const entry = ENEMY_SPAWN_TABLE.find(e => e.subType === 'bacteria');
    if (!entry) return;
    const hp = enemyHpForStage(entry, stage);

    for (let i = 0; i < BLOATER_SPAWN; i++) {
        const spread = (i - (BLOATER_SPAWN - 1) / 2) * (entry.w + 4);
        enemies.push({
            id: `${enemy.id}:spawn:${i}`,
            x: enemy.x + enemy.w / 2 - entry.w / 2 + spread,
            y: enemy.y + enemy.h - entry.h,
            w: entry.w, h: entry.h,
            vx: spread * 0.06, vy: -5,
            hp, maxHp: hp,
            type: 'enemy', subType: entry.subType,
            color: entry.color, facing: spread > 0 ? 1 : -1, isGrounded: false,
            aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0,
            animTimer: 0, hitTimer: 0, actionTimer: 0
        });
    }
};

/**
 * Descarta los enemigos que han quedado muy por detrás de la cámara.
 *
 * Sin esto solo se eliminaban al morir: los que se quedaban atrás congelaban su
 * IA (`updateEnemyAI` no se llama a más de una pantalla de distancia) pero
 * seguían en el array, dibujándose y comprobándose contra cada proyectil, así
 * que el coste del bucle crecía durante toda la partida. Los jefes nunca se
 * descartan.
 */
export const cullEnemies = (enemies: Enemy[], cameraX: number): Enemy[] =>
    enemies.filter(e => e.subType === 'boss' || e.x + e.w > cameraX - ENEMY_CULL_MARGIN);

export const updateEnemyAI = (enemy: Enemy, p: Player, s: World, audio: AudioManager) => {
     switch(enemy.subType) {
        case 'bacteria': enemy.vx = enemy.x > p.x ? -3 : 3; if(enemy.isGrounded && Math.random()<0.01) enemy.vy = -8; enemy.vy += GRAVITY; break;
        case 'plaque_monster': enemy.vx = enemy.x > p.x ? -2 : 2; enemy.vy += GRAVITY; break;
        case 'candy_bomber': enemy.vy = Math.sin(Date.now()/200); enemy.vx = -4; 
            if(enemy.attackTimer > 2 && Math.abs(enemy.x-p.x)<50) { spawnProjectile(s.projectiles, enemy.x, enemy.y+20, 0, 1, 'enemy', 'normal'); enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; } break;
        case 'tartar_spire': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer > 3 && Math.abs(p.x-enemy.x)<400) { 
                const angle = Math.atan2(p.y-enemy.y, p.x-enemy.x);
                s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:8,h:8,vx:Math.cos(angle)*5,vy:Math.sin(angle)*5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:10,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileEnemy,facing:1,isGrounded:false,frameTimer:0,state:0});
                enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; 
            } break;
        case 'sugar_rusher': enemy.vx = enemy.x > p.x ? -8 : 8; if(enemy.isGrounded && Math.random()<0.05) enemy.vy = -12; enemy.vy += GRAVITY; break;
        case 'sugar_fiend': enemy.vx = Math.abs(p.x-enemy.x)<150 ? (enemy.x>p.x?5:-5) : (enemy.x>p.x?-4:4); enemy.vy += GRAVITY;
            if(enemy.attackTimer>1) { s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-5,w:24,h:10,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'sludge',damage:0,owner:'enemy',lifeTime:4,hitIds:[],color:COLORS.projectileSludge,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; } break;
        case 'acid_spitter': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer>2.5 && Math.abs(p.x-enemy.x)<500) { const dx=p.x-enemy.x; const dy=p.y-enemy.y-100; s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:12,h:12,vx:dx*0.02,vy:dy*0.02-5,hp:1,maxHp:1,type:'projectile',projectileType:'acid',damage:15,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileAcid,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; } break;
        // Biopelícula: recorre el techo hasta quedar sobre el jugador y se
        // desprende. Al tocar suelo ya no vuelve a subir: se arrastra.
        //
        // `bossState` 0 = pegada al techo, 1 = cayendo, 2 = arrastrándose.
        case 'biofilm_crawler':
            if (enemy.bossState === 0) {
                enemy.vy = 0;
                enemy.y = CEILING_Y;
                // Se acerca despacio en horizontal: es un acecho, no una persecución.
                enemy.vx = Math.abs(p.x - enemy.x) < 6 ? 0 : (enemy.x > p.x ? -2 : 2);
                enemy.facing = enemy.vx >= 0 ? 1 : -1;
                if (Math.abs((p.x + p.w / 2) - (enemy.x + enemy.w / 2)) < CRAWLER_DROP_X) {
                    enemy.bossState = 1;
                    enemy.actionTimer = ATTACK_POSE;
                }
            } else if (enemy.bossState === 1) {
                enemy.vx = 0;
                enemy.vy += GRAVITY;
                if (enemy.isGrounded) enemy.bossState = 2;
            } else {
                enemy.vx = enemy.x > p.x ? -2 : 2;
                enemy.vy += GRAVITY;
            }
            break;

        // Coraza de sarro: avanza despacio, siempre de cara. Su defensa está en
        // `applyEnemyDamage`; aquí lo único que importa es que mire al jugador,
        // porque eso es lo que decide qué lado está protegido.
        case 'calculus_shell':
            enemy.vx = enemy.x > p.x ? -1.4 : 1.4;
            enemy.facing = enemy.vx > 0 ? 1 : -1;
            enemy.vy += GRAVITY;
            break;

        // Absceso: lentísimo y pesado. Lo suyo pasa al morir (`spawnDeathSpawn`).
        case 'abscess_bloater':
            enemy.vx = enemy.x > p.x ? -0.9 : 0.9;
            enemy.facing = enemy.vx > 0 ? 1 : -1;
            enemy.vy += GRAVITY;
            break;

        // Barrena: se entierra, viaja bajo el suelo y emerge junto al jugador.
        //
        // `bossState` 0 = enterrándose, 1 = bajo tierra, 2 = fuera y embistiendo.
        // Bajo tierra no colisiona con nada porque está por debajo del suelo, así
        // que no hace falta tocar la física.
        case 'enamel_borer':
            if (enemy.bossState === 0) {
                // Se recuerda la cota a la que se enterró: es donde se dibuja el
                // montículo que lo delata mientras viaja por debajo.
                if (enemy.burrowY === undefined) enemy.burrowY = enemy.y;
                enemy.vx = 0;
                enemy.vy = BORER_DIG_SPEED;
                if (enemy.y > enemy.burrowY + BORER_DEPTH) { enemy.bossState = 1; enemy.aiTimer = 0; }
            } else if (enemy.bossState === 1) {
                enemy.vy = 0;
                // Persigue en horizontal bajo el suelo, más rápido de lo que anda.
                enemy.vx = enemy.x > p.x ? -6 : 6;
                enemy.facing = enemy.vx > 0 ? 1 : -1;
                if (Math.abs(p.x - enemy.x) < BORER_SURFACE_X && enemy.aiTimer > 0.6) {
                    enemy.bossState = 2;
                    enemy.vy = BORER_LUNGE;
                    enemy.actionTimer = ATTACK_POSE;
                    // Aviso sonoro: emerger sin ruido sería una emboscada injusta.
                    audio.playBossAttack('slam');
                }
            } else {
                enemy.vx = enemy.x > p.x ? -3 : 3;
                enemy.vy += GRAVITY;
                // Vuelve a esconderse tras un rato en la superficie.
                if (enemy.isGrounded && enemy.aiTimer > BORER_SURFACE_TIME) {
                    enemy.bossState = 0;
                    enemy.aiTimer = 0;
                    // Se olvida la cota anterior: la próxima vez se entierra desde
                    // donde esté, que puede ser una plataforma distinta.
                    enemy.burrowY = undefined;
                }
            }
            break;

        case 'gingivitis_grunt': enemy.vy += GRAVITY;
            if(enemy.bossState === 1) { enemy.vx = enemy.facing * 12; if(enemy.aiTimer > 1) { enemy.bossState=0; enemy.aiTimer=0; } }
            else { enemy.vx = enemy.x > p.x ? -2 : 2; enemy.facing = enemy.vx > 0 ? 1 : -1; if(Math.abs((p.y+p.h)-(enemy.y+enemy.h))<30 && Math.abs(p.x-enemy.x)<300 && enemy.aiTimer>2) { enemy.bossState=1; enemy.aiTimer=0; enemy.actionTimer=ATTACK_POSE; } } break;
        case 'boss':
             // Entero y sin negativos: el daño con multiplicadores es fraccionario
             // y el golpe mortal llegaba a pintar un porcentaje negativo.
             s.hud.bossHp = Math.max(0, Math.ceil(enemy.hp));
             if (enemy.bossVariant === 'deity' && enemy.hp < enemy.maxHp/2 && enemy.phase===1) { enemy.phase=2; enemy.color='#7f1d1d'; s.shake=30; }
             
             if(enemy.bossVariant==='wisdom_warden') {
                 // HIDDEN BOSS AI
                 enemy.vy = Math.sin(Date.now()/500) * 0.5; // Float
                 
                 if (enemy.bossState === 0) { // Idle/Chase
                     const targetX = p.x + (Math.sin(Date.now()/1000) * 200);
                     enemy.vx = (targetX - enemy.x) * 0.05;
                     
                     if (enemy.aiTimer > 2.5) {
                         const r = Math.random();
                         enemy.bossState = r > 0.6 ? 1 : 2; // 1: Teleport, 2: Judgment
                         enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossState === 1) { // Teleport
                     if (enemy.aiTimer > 0.5) {
                         // Teleport near player
                         const offset = Math.random() > 0.5 ? -250 : 250;
                         enemy.x = p.x + offset;
                         enemy.y = p.y - 100;
                         // Clamp
                         if (enemy.y < 50) enemy.y = 50;
                         if (enemy.x < 0) enemy.x = 0;
                         if (enemy.x > s.level.levelWidth - 100) enemy.x = s.level.levelWidth - 100;
                         
                         audio.playBossAttack('charge');
                         enemy.bossState = 0;
                         enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossState === 2) { // Judgment Orbs (Homing)
                     enemy.vx = 0;
                     if (enemy.attackTimer > 0.2) {
                         audio.playBossAttack('shoot');
                         const dx = p.x - enemy.x;
                         const dy = p.y - enemy.y;
                         const dist = Math.sqrt(dx*dx + dy*dy);
                         
                         s.projectiles.push({
                             id: Math.random().toString(),
                             x: enemy.x + enemy.w/2,
                             y: enemy.y + enemy.h/2,
                             w: 16, h: 16,
                             vx: (dx/dist) * 6 + (Math.random()-0.5)*2,
                             vy: (dy/dist) * 6 + (Math.random()-0.5)*2,
                             hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet', // Use standard bullet but high damage curves it in main loop
                             damage: 25, // Triggers curve logic in GameCanvas
                             owner: 'enemy', lifeTime: 4, hitIds: [], 
                             color: '#facc15', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                         });
                         enemy.attackTimer = 0; enemy.actionTimer = ATTACK_POSE;
                     }
                     if (enemy.aiTimer > 2) {
                         enemy.bossState = 0;
                         enemy.aiTimer = 0;
                     }
                 }
             } else if(enemy.bossVariant==='phantom') {
                 if(enemy.bossState===5) { enemy.vx=0; enemy.vy=0; if(enemy.aiTimer>2) { enemy.x=p.x>400?p.x-200:p.x+200; enemy.y=p.y-100; enemy.bossState=0; enemy.aiTimer=0; } return; }
                 enemy.vy = Math.sin(Date.now()/300)*2;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.03; if(enemy.aiTimer>1.5) { enemy.bossState=Math.random()>0.7?5:1; enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { enemy.vx=0; if(enemy.aiTimer>0.5) { enemy.bossState=2; audio.playBossAttack('charge'); enemy.vx=(p.x<enemy.x)?-20:20; enemy.aiTimer=0; } }
                 else if(enemy.bossState===2) { enemy.vy=(p.y-enemy.y)*0.1; if(enemy.aiTimer>0.8) { enemy.bossState=3; enemy.aiTimer=0; enemy.vx=0; } }
                 else if(enemy.bossState===3 && enemy.aiTimer>0.3) {
                    audio.playBossAttack('shoot');
                    /**
                     * Ráfaga en abanico **hacia el jugador**.
                     *
                     * Apuntaba con `p.facing` —el `facing` del **jugador**, no la dirección
                     * hacia él—, así que mirando hacia otro lado el fantasma disparaba al lado
                     * contrario. Y el índice del bucle no se usaba, con lo que las cinco balas
                     * salían superpuestas: cinco proyectiles para el trabajo de uno.
                     */
                    const toward = Math.sign(p.x - enemy.x) || 1;
                    for(let i=-2;i<=2;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2, enemy.y+enemy.h/2, toward*3, i, 'enemy', 'normal');
                    enemy.bossState=0; enemy.aiTimer=0;
                 }
             } else if (enemy.bossVariant==='calculus') {
                 // IMPROVED TANK AI (Level 3)
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)>0?3:-3; enemy.vy+=GRAVITY; if(enemy.aiTimer>2.5) { enemy.bossState=Math.random()>0.5?1:(Math.random()>0.5?2:3); enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { // Mortar (Enhanced: 3 shells)
                    enemy.vx=0; enemy.vy+=GRAVITY; 
                    if(enemy.aiTimer>0.8) { 
                        audio.playBossAttack('mortar'); 
                        for(let i=-1; i<=1; i++) {
                            // Spread shots to cover area
                            s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:16,h:16,vx:(p.x-enemy.x)*0.015 + (i*4),vy:-14,hp:1,maxHp:1,type:'projectile',projectileType:'mortar',damage:25,owner:'enemy',lifeTime:4,hitIds:[],color:'#78716c',facing:1,isGrounded:false,frameTimer:0,state:0}); 
                        }
                        enemy.bossState=0; enemy.aiTimer=0; 
                    } 
                 }
                 else if(enemy.bossState===2) { // Slam
                    enemy.vx=0; enemy.vy+=GRAVITY; if(enemy.aiTimer>0.8) { audio.playBossAttack('slam'); [-1,1].forEach(d=>s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-10,w:40,h:40,vx:d*12,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'wave',damage:20,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileWave,facing:1,isGrounded:false,frameTimer:0,state:0})); enemy.bossState=0; enemy.aiTimer=0; } 
                 }
                 else if(enemy.bossState===3) { // Rapid Fire Move
                     enemy.vx = (p.x - enemy.x) > 0 ? 5 : -5; enemy.vy += GRAVITY;
                     if (Math.floor(Date.now() / 200) % 2 === 0 && enemy.attackTimer > 0.2) {
                         spawnProjectile(s.projectiles, enemy.x + (enemy.vx>0?enemy.w:0), enemy.y + 40, enemy.vx > 0 ? 1 : -1, 0, 'enemy', 'normal');
                         enemy.attackTimer = 0; enemy.actionTimer = ATTACK_POSE;
                     }
                     if (enemy.aiTimer > 3) { enemy.bossState = 0; enemy.aiTimer = 0; }
                 }
             } else if (enemy.bossVariant==='general') {
                 // IMPROVED GENERAL AI (Level 4)
                 enemy.vy = Math.sin(Date.now()/600)*0.5; if(enemy.y>100) enemy.y-=1;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.03; if(enemy.aiTimer>1.5) { const r=Math.random(); enemy.bossState=r<0.3?1:(r<0.5?2:(r<0.7?5:(r<0.85?6:7))); enemy.aiTimer=0; } }
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { // Summon
                    audio.playBossAttack('summon'); 
                    for(let i=0;i<4;i++) s.enemies.push({id:Math.random().toString(),x:enemy.x+enemy.w/2+(i*30-45),y:enemy.y+enemy.h,w:20,h:20,vx:(Math.random()-0.5)*12,vy:-8,hp:15,maxHp:15,type:'enemy',subType:'bacteria',color:COLORS.enemyBacteria,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0,animTimer:0,hitTimer:0,actionTimer:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===2 && enemy.aiTimer>0.5) { // Giant Laser
                    audio.playBossAttack('laser'); s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h,w:30,h:400,vx:(p.x-enemy.x)*0.03,vy:15,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:30,owner:'enemy',lifeTime:1,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===5 && enemy.aiTimer>0.5) { // Homing Bullet
                    audio.playBossAttack('summon'); s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y,w:24,h:24,vx:0,vy:5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:25,owner:'enemy',lifeTime:5,hitIds:[],color:'#a855f7',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; 
                 }
                 else if(enemy.bossState===6 && enemy.aiTimer>1.0) { // Grid Laser
                     audio.playBossAttack('laser');
                     s.projectiles.push({id:Math.random().toString(),x:p.x,y:0,w:20,h:CANVAS_HEIGHT,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:20,owner:'enemy',lifeTime:0.5,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                     s.projectiles.push({id:Math.random().toString(),x:0,y:p.y+10,w:s.level.levelWidth,h:20,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:20,owner:'enemy',lifeTime:0.5,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                     enemy.bossState=0; enemy.aiTimer=0;
                 }
                 else if(enemy.bossState===7 && enemy.aiTimer>0.5) { // Rain Fire (New Attack)
                     audio.playBossAttack('summon');
                     for(let i=0; i<10; i++) {
                         const rx = Math.random() * CANVAS_WIDTH;
                         s.projectiles.push({id:Math.random().toString(),x:s.camera.x + rx,y:0,w:10,h:30,vx:0,vy:10,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:15,owner:'enemy',lifeTime:2,hitIds:[],color:'#f97316',facing:1,isGrounded:false,frameTimer:0,state:0});
                     }
                     enemy.bossState=0; enemy.aiTimer=0;
                 }
             } else if (enemy.bossVariant==='deity') {
                 // IMPROVED DEITY AI (Level 5)
                 if(enemy.phase===1 && enemy.bossState===0) {
                     enemy.vx=(CANVAS_WIDTH/2+s.camera.x-enemy.x-enemy.w/2)*0.05; enemy.vy=Math.sin(Date.now()/400); 
                     if(enemy.attackTimer>0.2) { 
                         // Spiral Attack
                         audio.playBossAttack('shoot'); 
                         const ang = Date.now()/200; 
                         for(let i=0;i<3;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2,enemy.y+enemy.h/2, Math.cos(ang+i*2), Math.sin(ang+i*2), 'enemy', 'normal'); 
                         enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; 
                     } 
                 }
                 else { 
                     // Phase 2: Berserk Logic
                     if(enemy.bossState===0) { // Hover & Shoot Nova
                         enemy.vx=(p.x-enemy.x)*0.08; enemy.vy=(p.y-enemy.y)*0.08; 
                         if (Math.random() < 0.05 && enemy.attackTimer > 0.5) {
                             audio.playBossAttack('shoot');
                             // Nova Burst
                             for(let i=0; i<8; i++) {
                                 const ang = (Math.PI*2 * i) / 8;
                                 s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:15,h:15,vx:Math.cos(ang)*8,vy:Math.sin(ang)*8,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:20,owner:'enemy',lifeTime:3,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0});
                             }
                             enemy.attackTimer = 0; enemy.actionTimer = ATTACK_POSE;
                         }
                         if(enemy.aiTimer>3) { enemy.bossState=Math.random()>0.5?1:2; enemy.aiTimer=0; } 
                     } 
                     else if(enemy.bossState===1) { // Slam
                         enemy.vy=25; enemy.vx=0; 
                     }
                     else if(enemy.bossState===2) { // Void Pulse (Spiral Dense)
                         enemy.vx = 0; enemy.vy = 0;
                         if (enemy.attackTimer > 0.1) {
                             audio.playBossAttack('laser');
                             const offset = enemy.aiTimer * 10;
                             for(let i=0; i<4; i++) {
                                 const ang = offset + (Math.PI*2*i)/4;
                                 s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:12,h:12,vx:Math.cos(ang)*10,vy:Math.sin(ang)*10,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:15,owner:'enemy',lifeTime:3,hitIds:[],color:'#7f1d1d',facing:1,isGrounded:false,frameTimer:0,state:0});
                             }
                             enemy.attackTimer = 0; enemy.actionTimer = ATTACK_POSE;
                         }
                         if (enemy.aiTimer > 2.0) { enemy.bossState = 0; enemy.aiTimer = 0; }
                     }
                 }
             } else { // King
                 if(enemy.bossState===0) { enemy.vy=Math.sin(Date.now()/500)*0.5; enemy.vx=(p.x-enemy.x)*0.02; if(enemy.aiTimer>2) { enemy.aiTimer=0; const r=Math.random(); enemy.bossState=r<0.3?4:(r<0.6?2:1); } }
                 else if(enemy.bossState===4 && enemy.attackTimer>0.5) {
                    audio.playBossAttack('shoot');
                    /**
                     * Abanico de cinco **hacia el jugador**.
                     *
                     * Pedía `(-9, i*3)`: siempre a la izquierda, estuviera el jugador donde
                     * estuviera, y con el `dx` sin normalizar salían a 81 px por paso —diez
                     * frames para cruzar la pantalla, o sea inesquivable e invisible—. Y el
                     * `i*3` se descartaba, así que las cinco iban una encima de otra.
                     */
                    const toward = Math.sign(p.x - enemy.x) || -1;
                    for(let i=-2;i<=2;i++) spawnProjectile(s.projectiles, enemy.x, enemy.y, toward*3, i, 'enemy', 'normal');
                    enemy.attackTimer=0; enemy.actionTimer=ATTACK_POSE; enemy.bossState=0; enemy.aiTimer=0;
                 }
                 else if(enemy.bossState===2) { enemy.vy=-8; if(enemy.y<50) { enemy.bossState=3; enemy.vx=(p.x-enemy.x)*0.1; } }
                 else if(enemy.bossState===3) enemy.vy+=2;
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { audio.playBossAttack('summon'); s.enemies.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+20,w:20,h:20,vx:-5,vy:-5,hp:10,maxHp:10,type:'enemy',subType:'sugar_rusher',color:COLORS.enemyRusher,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0,animTimer:0,hitTimer:0,actionTimer:0}); enemy.bossState=0; enemy.aiTimer=0; }
             }
             break;
     }
};

import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Player, Enemy, Projectile, Platform, Particle, PowerUp, Rect, WeaponType, LevelState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY, PLAYER_SIZE } from '../constants';
import { generateBriefing, generateGameOverMessage } from '../services/geminiService';
import { Rocket, Heart, Zap, Waves, Crosshair, Skull } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (score: number, message: string) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameState, setGameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [stage, setStage] = useState(1);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(0);
  const [briefing, setBriefing] = useState<string>("Loading Mission...");
  const [isMobile, setIsMobile] = useState(false);

  // Mutable Game State
  const entities = useRef<{
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    particles: Particle[];
    powerups: PowerUp[];
    platforms: Platform[];
    bgProps: Rect[]; // For background parallax/decor
    camera: { x: number; y: number };
    level: LevelState;
    waveTimer: number;
    shake: number;
  }>({
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    particles: [],
    powerups: [],
    platforms: [],
    bgProps: [],
    camera: { x: 0, y: 0 },
    level: { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 4000 },
    waveTimer: 0,
    shake: 0
  });

  const inputs = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    jumpPressed: false,
    shootPressed: false
  });

  function createPlayer(): Player {
    return {
      id: 'player',
      x: 100,
      y: 200,
      w: PLAYER_SIZE,
      h: PLAYER_SIZE,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      type: 'player',
      color: COLORS.player,
      facing: 1,
      isGrounded: false,
      invincibleTimer: 0,
      weapon: 'normal',
      ammo: -1,
      score: 0,
      frameTimer: 0,
      state: 0
    };
  }

  // --- Initialization & Loop ---

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (gameState === GameState.MENU) {
       generateBriefing().then(setBriefing);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resetGame();

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      update(dt);
      draw(ctx);

      if (entities.current.player.hp <= 0) {
        handleGameOver();
      } else {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const resetGame = () => {
    entities.current.player = createPlayer();
    entities.current.enemies = [];
    entities.current.projectiles = [];
    entities.current.particles = [];
    entities.current.powerups = [];
    entities.current.level = { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 3000 };
    entities.current.platforms = generateLevel(entities.current.level.levelWidth);
    entities.current.bgProps = generateBgProps(entities.current.level.levelWidth);
    entities.current.camera = { x: 0, y: 0 };
    entities.current.waveTimer = 0;
    entities.current.shake = 0;
    setScore(0);
    setHp(100);
    setStage(1);
    setBossHp(0);
  };

  const nextLevel = () => {
      const s = entities.current;
      s.level.stage++;
      s.level.bossSpawned = false;
      s.level.distanceTraveled = 0;
      s.level.levelWidth += 1000; // Longer levels
      s.player.x = 100;
      s.player.y = 200;
      s.player.hp = Math.min(s.player.hp + 50, 100); // Heal
      setHp(s.player.hp);
      
      s.enemies = [];
      s.projectiles = [];
      s.powerups = [];
      s.platforms = generateLevel(s.level.levelWidth);
      s.bgProps = generateBgProps(s.level.levelWidth);
      s.camera.x = 0;
      setStage(s.level.stage);
      setBossHp(0);
      
      // Brief invincibility
      s.player.invincibleTimer = 3.0;
  };

  // --- Input Handling ---

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft': inputs.current.left = true; break;
        case 'KeyD':
        case 'ArrowRight': inputs.current.right = true; break;
        case 'KeyW':
        case 'ArrowUp': 
        case 'Space':
            inputs.current.up = true; 
            inputs.current.jumpPressed = true;
            break;
        case 'KeyS':
        case 'ArrowDown': inputs.current.down = true; break;
        case 'KeyF':
        case 'KeyK': 
            inputs.current.shoot = true; 
            inputs.current.shootPressed = true;
            break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft': inputs.current.left = false; break;
        case 'KeyD':
        case 'ArrowRight': inputs.current.right = false; break;
        case 'KeyW':
        case 'ArrowUp': 
        case 'Space':
            inputs.current.up = false; 
            inputs.current.jumpPressed = false;
            break;
        case 'KeyS':
        case 'ArrowDown': inputs.current.down = false; break;
        case 'KeyF':
        case 'KeyK': 
            inputs.current.shoot = false; 
            inputs.current.shootPressed = false;
            break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);


  // --- Game Logic ---

  const handleGameOver = async () => {
    setGameState(GameState.GAME_OVER);
    const player = entities.current.player;
    const msg = await generateGameOverMessage(player.score, "Tooth Decay");
    onGameOver(player.score, msg);
  };

  const generateLevel = (width: number): Platform[] => {
    const platforms: Platform[] = [];
    
    // Continuous Floor with gaps
    let x = 0;
    while(x < width) {
        const gap = Math.random() > 0.8 ? 100 : 0;
        const w = 400 + Math.random() * 400;
        if (gap > 0 && x + gap + w < width) {
            // Add a gap
            x += gap;
        }
        platforms.push({ x: x, y: CANVAS_HEIGHT - 40, w: w, h: 40, type: 'platform', isGround: true });
        x += w;
    }
    
    // Floating Platforms
    for (let i = 300; i < width - 500; i += 200 + Math.random() * 150) {
        if (Math.random() > 0.3) {
            const y = CANVAS_HEIGHT - 120 - Math.random() * 100;
            platforms.push({ x: i, y, w: 80 + Math.random() * 60, h: 20, type: 'platform', isGround: false });
        }
    }
    
    // Boss Arena floor at end
    platforms.push({ x: width - 800, y: CANVAS_HEIGHT - 40, w: 800, h: 40, type: 'platform', isGround: true });
    
    return platforms;
  };

  const generateBgProps = (width: number): Rect[] => {
      const props: Rect[] = [];
      for(let x=0; x<width; x+= 400) {
          props.push({
              x: x + Math.random() * 200,
              y: 50 + Math.random() * 200,
              w: 50 + Math.random() * 100,
              h: 100 + Math.random() * 100
          });
      }
      return props;
  };

  const spawnBoss = (x: number) => {
      const maxHp = 500 + (entities.current.level.stage * 200);
      entities.current.enemies.push({
          id: 'boss',
          x: x + 400,
          y: CANVAS_HEIGHT - 250,
          w: 120, h: 160,
          vx: 0, vy: 0,
          hp: maxHp, maxHp: maxHp,
          type: 'enemy',
          subType: 'boss',
          color: COLORS.enemyBoss,
          facing: -1,
          isGrounded: true,
          aiTimer: 0,
          attackTimer: 0,
          frameTimer: 0,
          state: 0
      });
      setBossMaxHp(maxHp);
      setBossHp(maxHp);
  };

  const spawnEnemy = (cameraX: number) => {
    // Stop spawning if boss is alive
    if (entities.current.level.bossSpawned) return;

    // Spawn ahead
    const x = cameraX + CANVAS_WIDTH + 50;
    const y = Math.random() > 0.5 ? CANVAS_HEIGHT - 80 : CANVAS_HEIGHT - 200;
    
    const rand = Math.random();
    let subType: Enemy['subType'] = 'bacteria';
    let w = 32, h = 32, hp = 10 + (entities.current.level.stage * 2), color = COLORS.enemyBacteria;
    
    // Spawn table based on difficulty
    if (rand > 0.9) {
        subType = 'plaque_monster';
        w = 48; h = 48; hp = 50 + (entities.current.level.stage * 5); color = COLORS.enemyPlaque;
    } else if (rand > 0.75) {
        subType = 'tartar_turret';
        w = 32; h = 40; hp = 25; color = COLORS.enemyTurret;
    } else if (rand > 0.6) {
        subType = 'candy_bomber';
        w = 24; h = 24; hp = 15; color = COLORS.enemyCandy;
    } else if (rand > 0.45) {
        subType = 'sugar_rusher';
        w = 20; h = 20; hp = 10; color = COLORS.enemyRusher;
    }

    entities.current.enemies.push({
      id: Math.random().toString(),
      x, y, w, h,
      vx: 0,
      vy: 0,
      hp, maxHp: hp,
      type: 'enemy',
      subType,
      color,
      facing: -1,
      isGrounded: false,
      aiTimer: 0,
      attackTimer: 0,
      frameTimer: 0,
      state: 0
    });
  };

  const update = (dt: number) => {
    const s = entities.current;
    const p = s.player;

    // --- Player Physics ---
    if (inputs.current.left) { p.vx -= PLAYER_SPEED * 0.2; p.facing = -1; }
    if (inputs.current.right) { p.vx += PLAYER_SPEED * 0.2; p.facing = 1; }
    
    // Friction
    if (!inputs.current.left && !inputs.current.right) p.vx *= FRICTION;
    
    // Clamp Speed
    p.vx = Math.max(Math.min(p.vx, PLAYER_SPEED), -PLAYER_SPEED);
    
    // Gravity
    p.vy += GRAVITY;
    p.vy = Math.min(p.vy, TERMINAL_VELOCITY);

    // Jump
    if (inputs.current.up && p.isGrounded) {
       p.vy = PLAYER_JUMP;
       p.isGrounded = false;
       spawnParticle(p.x + p.w/2, p.y + p.h, '#fff', 5);
    }

    // Move X
    p.x += p.vx;
    checkPlatformCollisions(p, s.platforms, true);

    // Move Y
    p.y += p.vy;
    p.isGrounded = false; 
    checkPlatformCollisions(p, s.platforms, false);

    // Level Bounds
    if (p.x < 0) p.x = 0;
    
    // Boss wall
    if (s.level.bossSpawned) {
        const arenaLeft = s.level.levelWidth - 800;
        if (p.x < arenaLeft) p.x = arenaLeft;
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    } else {
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    }

    if (p.y > CANVAS_HEIGHT + 100) p.hp = 0;

    // --- Shooting ---
    if (inputs.current.shootPressed) {
       if (p.frameTimer <= 0) {
           spawnProjectile(p.x + (p.facing === 1 ? p.w : 0), p.y + p.h/2 - 5, p.facing, 'player', p.weapon);
           
           // Fire rate based on weapon
           let cooldown = 10;
           if (p.weapon === 'spread') cooldown = 20;
           if (p.weapon === 'laser') cooldown = 6;
           if (p.weapon === 'mouthwash') cooldown = 30;
           if (p.weapon === 'floss') cooldown = 15;
           
           p.frameTimer = cooldown;
           
           // Auto-fire only for some weapons, others require click
           if (p.weapon !== 'laser') inputs.current.shootPressed = false; 
       }
    }
    if (p.frameTimer > 0) p.frameTimer--;
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

    // --- Camera ---
    if (!s.level.bossSpawned) {
        let targetCamX = p.x - CANVAS_WIDTH * 0.3;
        targetCamX = Math.max(0, Math.min(targetCamX, s.level.levelWidth - CANVAS_WIDTH));
        s.camera.x += (targetCamX - s.camera.x) * 0.1;
    }

    // Screen Shake
    if (s.shake > 0) {
        s.camera.x += (Math.random() - 0.5) * s.shake;
        s.camera.y += (Math.random() - 0.5) * s.shake;
        s.shake *= 0.9;
        if (s.shake < 0.5) s.shake = 0;
    } else {
        s.camera.y = 0;
    }

    // --- Spawning Logic ---
    // Boss Trigger
    if (!s.level.bossSpawned && p.x > s.level.levelWidth - 600) {
        s.level.bossSpawned = true;
        spawnBoss(s.level.levelWidth - 800);
    }

    // Enemy Spawning (only if no boss)
    s.waveTimer += dt;
    if (!s.level.bossSpawned && s.waveTimer > Math.max(0.5, 2.0 - (score / 10000) - (s.level.stage * 0.1))) {
        spawnEnemy(s.camera.x);
        s.waveTimer = 0;
    }

    // --- Entity Updates ---
    
    // Projectiles
    s.projectiles.forEach(proj => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.lifeTime -= dt;
        
        if (proj.projectileType === 'wave') {
            proj.y += Math.sin(Date.now() / 50) * 5;
        }
        if (proj.projectileType === 'floss') {
            // Floss sticks to player
            if (proj.owner === 'player') {
                proj.x = p.x + (p.facing === 1 ? p.w : -proj.w);
                proj.y = p.y + p.h/2 - proj.h/2;
            }
        }
    });
    s.projectiles = s.projectiles.filter(p => p.lifeTime > 0);

    // Enemies
    s.enemies.forEach(enemy => {
        enemy.aiTimer += dt;
        enemy.attackTimer += dt;

        const dist = Math.abs(p.x - enemy.x);
        const isActive = dist < CANVAS_WIDTH + 100 || enemy.subType === 'boss';

        if (isActive) {
            switch(enemy.subType) {
                case 'bacteria':
                    enemy.vx = enemy.x > p.x ? -2 : 2;
                    if (enemy.isGrounded && Math.random() < 0.01) enemy.vy = -8;
                    enemy.vy += GRAVITY;
                    break;
                case 'plaque_monster':
                    enemy.vx = enemy.x > p.x ? -1 : 1;
                    enemy.vy += GRAVITY;
                    break;
                case 'candy_bomber':
                    enemy.vy = Math.sin(Date.now() / 200) * 1; 
                    enemy.vx = -3;
                    // Drops bomb
                    if (enemy.attackTimer > 2.0 && Math.abs(enemy.x - p.x) < 50) {
                        spawnProjectile(enemy.x, enemy.y + 20, 0, 'enemy', 'normal');
                        enemy.attackTimer = 0;
                    }
                    break;
                case 'tartar_turret':
                    enemy.vx = 0;
                    enemy.vy += GRAVITY;
                    // Shoots aimed shot
                    if (enemy.attackTimer > 3.0 && dist < 400) {
                        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
                        s.projectiles.push({
                            id: Math.random().toString(),
                            x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                            w: 8, h: 8,
                            vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
                            hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                            damage: 10, owner: 'enemy', lifeTime: 3,
                            color: COLORS.projectileEnemy, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                        });
                        enemy.attackTimer = 0;
                    }
                    break;
                case 'sugar_rusher':
                    // Fast runs then jumps
                    enemy.vx = enemy.x > p.x ? -6 : 6;
                    if (enemy.isGrounded && Math.random() < 0.05) enemy.vy = -12;
                    enemy.vy += GRAVITY;
                    break;
                case 'boss':
                    // Boss Logic
                    setBossHp(enemy.hp);
                    // Floating slight movement
                    enemy.vy = Math.sin(Date.now() / 500) * 0.5;
                    
                    // Phases
                    if (enemy.attackTimer > 2.0) {
                        const phase = enemy.hp < enemy.maxHp * 0.5 ? 2 : 1;
                        if (phase === 1) {
                            // Spread shot
                            for(let i=-1; i<=1; i++) {
                                s.projectiles.push({
                                    id: Math.random().toString(),
                                    x: enemy.x, y: enemy.y + enemy.h/2,
                                    w: 12, h: 12,
                                    vx: -8, vy: i * 3,
                                    hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                    damage: 15, owner: 'enemy', lifeTime: 4,
                                    color: COLORS.enemyCandy, facing: -1, isGrounded: false, frameTimer: 0, state: 0
                                });
                            }
                        } else {
                            // Spawn minions
                            const minion = {
                                id: Math.random().toString(),
                                x: enemy.x - 50, y: enemy.y + 100,
                                w: 20, h: 20, vx: -5, vy: -5,
                                hp: 10, maxHp: 10, type: 'enemy', subType: 'sugar_rusher' as const,
                                color: COLORS.enemyRusher, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0
                            };
                            s.enemies.push(minion);
                        }
                        enemy.attackTimer = 0;
                    }
                    break;
            }

            // Apply movement
            enemy.x += enemy.vx;
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'boss') {
                checkPlatformCollisions(enemy, s.platforms, true);
            }
            
            enemy.y += enemy.vy;
            enemy.isGrounded = false;
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'boss') {
                checkPlatformCollisions(enemy, s.platforms, false);
            }
        }
    });

    // --- Collisions ---

    // Projectile vs Enemy
    s.projectiles.forEach(proj => {
        if (proj.owner === 'player') {
            s.enemies.forEach(enemy => {
                if (checkRectCollide(proj, enemy)) {
                    enemy.hp -= proj.damage;
                    if (proj.projectileType !== 'laser' && proj.projectileType !== 'floss') {
                        proj.lifeTime = 0; 
                    }
                    spawnParticle(proj.x, proj.y, '#fff', 3);
                    
                    if (enemy.hp <= 0 && !enemy.dead) {
                        enemy.dead = true;
                        p.score += (enemy.subType === 'boss' ? 5000 : 100);
                        setScore(p.score);
                        s.shake = 5;
                        spawnPowerUp(enemy.x, enemy.y);
                        for(let i=0; i<8; i++) spawnParticle(enemy.x + enemy.w/2, enemy.y + enemy.h/2, enemy.color, 10);
                        
                        if (enemy.subType === 'boss') {
                            setTimeout(nextLevel, 2000); // Level complete
                        }
                    }
                }
            });
        }
    });
    
    // Cleanup dead enemies
    s.enemies = s.enemies.filter(e => !e.dead);

    // Enemy/Enemy Projectile vs Player
    let playerHit = false;
    s.enemies.forEach(enemy => {
        if (checkRectCollide(p, enemy)) {
            playerHit = true;
        }
    });
    s.projectiles.forEach(proj => {
        if (proj.owner === 'enemy' && checkRectCollide(p, proj)) {
            playerHit = true;
            proj.lifeTime = 0;
        }
    });

    if (playerHit && p.invincibleTimer <= 0) {
        p.hp -= 20;
        setHp(p.hp);
        p.invincibleTimer = 2.0;
        p.vy = -6;
        p.vx = -5 * p.facing;
        s.shake = 10;
    }

    // Powerups
    s.powerups.forEach(pu => {
        if (checkRectCollide(p, pu)) {
            if (pu.subType === 'health') {
                p.hp = Math.min(p.hp + 30, 100);
                setHp(p.hp);
            } else if (pu.subType === 'spread') {
                p.weapon = 'spread';
            } else if (pu.subType === 'laser') {
                p.weapon = 'laser';
            } else if (pu.subType === 'mouthwash') {
                p.weapon = 'mouthwash';
            }
            pu.dead = true;
        }
    });
    s.powerups = s.powerups.filter(pu => !pu.dead);

    // Particles
    s.particles.forEach(part => {
        part.x += part.vx;
        part.y += part.vy;
        part.lifeTime -= dt;
        part.alpha = part.lifeTime;
    });
    s.particles = s.particles.filter(p => p.lifeTime > 0);
  };

  const spawnProjectile = (x: number, y: number, dir: number, owner: 'player' | 'enemy', type: WeaponType | 'normal') => {
      const base: Partial<Projectile> = {
          id: Math.random().toString(),
          owner,
          facing: dir as 1|-1,
          isGrounded: false,
          frameTimer: 0,
          state: 0,
          type: 'projectile'
      };

      if (owner === 'enemy') {
          entities.current.projectiles.push({
              ...base,
              x, y, w: 10, h: 10, vx: dir * 6, vy: 0,
              hp: 1, maxHp: 1, damage: 10, lifeTime: 2, projectileType: 'bullet', color: COLORS.projectileEnemy
          } as Projectile);
          return;
      }

      // Player Weapons
      if (type === 'spread') {
          for(let i=-1; i<=1; i++) {
            entities.current.projectiles.push({
                ...base,
                x, y, w: 8, h: 8, vx: dir * 10, vy: i * 2,
                hp: 1, maxHp: 1, damage: 20, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
            } as Projectile);
          }
      } else if (type === 'laser') {
            entities.current.projectiles.push({
                ...base,
                x, y, w: 30, h: 4, vx: dir * 20, vy: 0,
                hp: 1, maxHp: 1, damage: 15, lifeTime: 0.8, projectileType: 'laser', color: COLORS.projectileLaser
            } as Projectile);
      } else if (type === 'mouthwash') {
            entities.current.projectiles.push({
                ...base,
                x, y, w: 12, h: 12, vx: dir * 8, vy: 0,
                hp: 1, maxHp: 1, damage: 40, lifeTime: 2.0, projectileType: 'wave', color: COLORS.projectileWave
            } as Projectile);
      } else if (type === 'floss') {
             // Melee hitbox
            entities.current.projectiles.push({
                ...base,
                x, y, w: 50, h: 40, vx: 0, vy: 0,
                hp: 1, maxHp: 1, damage: 60, lifeTime: 0.1, projectileType: 'floss', color: '#fff'
            } as Projectile);
      } else {
        // Normal
        entities.current.projectiles.push({
            ...base,
            x, y, w: 10, h: 6, vx: dir * 12, vy: 0,
            hp: 1, maxHp: 1, damage: 15, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
        } as Projectile);
      }
  };

  const spawnParticle = (x: number, y: number, color: string, count: number) => {
      for(let i=0; i<count; i++) {
          entities.current.particles.push({
              id: Math.random().toString(),
              x, y, w: 4, h: 4,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 10,
              hp: 0, maxHp: 0,
              type: 'particle',
              lifeTime: 0.5 + Math.random() * 0.5,
              alpha: 1,
              color: color,
              facing: 1,
              isGrounded: false,
              frameTimer: 0,
              state: 0
          });
      }
  };

  const spawnPowerUp = (x: number, y: number) => {
      if (Math.random() > 0.5) return;
      const typeRoll = Math.random();
      let subType: PowerUp['subType'] = 'health';
      let color = '#ef4444';
      
      if (typeRoll > 0.8) { subType = 'spread'; color = COLORS.projectilePlayer; }
      else if (typeRoll > 0.6) { subType = 'laser'; color = COLORS.projectileLaser; }
      else if (typeRoll > 0.4) { subType = 'mouthwash'; color = COLORS.projectileWave; }

      entities.current.powerups.push({
          id: Math.random().toString(),
          x, y, w: 20, h: 20,
          vx: 0, vy: 0,
          hp: 0, maxHp: 0,
          type: 'powerup',
          subType,
          color,
          facing: 1,
          isGrounded: false,
          frameTimer: 0,
          state: 0
      });
  };

  const checkPlatformCollisions = (entity: Entity, platforms: Platform[], horizontal: boolean) => {
     for (const plat of platforms) {
         if (checkRectCollide(entity, plat)) {
             if (horizontal) {
                 if (entity.vx > 0) entity.x = plat.x - entity.w;
                 else if (entity.vx < 0) entity.x = plat.x + plat.w;
                 entity.vx = 0;
             } else {
                 if (entity.vy > 0) { // Falling
                     entity.y = plat.y - entity.h;
                     entity.isGrounded = true;
                     entity.vy = 0;
                 } else if (entity.vy < 0) { // Hitting head
                     entity.y = plat.y + plat.h;
                     entity.vy = 0;
                 }
             }
         }
     }
  };

  const checkRectCollide = (r1: Rect, r2: Rect) => {
      return r1.x < r2.x + r2.w &&
             r1.x + r1.w > r2.x &&
             r1.y < r2.y + r2.h &&
             r1.y + r1.h > r2.y;
  };

  // --- Rendering ---

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.fillStyle = COLORS.bgTop;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Gums/Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, COLORS.bgTop);
    grad.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-entities.current.camera.x, -entities.current.camera.y);

    // Background Props (Parallax)
    ctx.fillStyle = COLORS.bgProp;
    entities.current.bgProps.forEach(prop => {
        // Simple parallax
        const px = prop.x - (entities.current.camera.x * 0.2); 
        ctx.beginPath();
        ctx.arc(prop.x, prop.y, prop.w, 0, Math.PI * 2);
        ctx.fill();
    });

    // Platforms (Teeth/Gums)
    entities.current.platforms.forEach(p => {
        ctx.fillStyle = p.isGround ? COLORS.ground : COLORS.platform;
        
        if (p.isGround) {
             // Round the tops of the gums
             ctx.beginPath();
             ctx.roundRect(p.x, p.y, p.w, p.h, [10, 10, 0, 0]);
             ctx.fill();
        } else {
             // Floating Teeth
             ctx.beginPath();
             ctx.moveTo(p.x, p.y);
             ctx.lineTo(p.x + p.w, p.y);
             ctx.lineTo(p.x + p.w - 5, p.y + p.h);
             ctx.lineTo(p.x + 5, p.y + p.h);
             ctx.fill();
        }
    });

    // Powerups
    entities.current.powerups.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        // Bouncing motion
        const yOff = Math.sin(Date.now() / 200) * 3;
        ctx.arc(pu.x + pu.w/2, pu.y + pu.h/2 + yOff, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        let icon = '+';
        if (pu.subType === 'spread') icon = 'S';
        if (pu.subType === 'laser') icon = 'L';
        if (pu.subType === 'mouthwash') icon = 'W';
        ctx.fillText(icon, pu.x + 6, pu.y + 14 + yOff);
    });

    // Enemies
    entities.current.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        
        if (e.subType === 'bacteria') {
            // Blobby shape
            ctx.beginPath();
            ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2, 0, Math.PI*2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(e.x + 8, e.y + 12, 4, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 24, e.y + 12, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(e.x + 8, e.y + 12, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + 24, e.y + 12, 2, 0, Math.PI*2); ctx.fill();
        } else if (e.subType === 'plaque_monster') {
            // Spiky block
            ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#b45309';
            // Spikes
            for(let i=0; i<e.w; i+=10) {
                ctx.beginPath();
                ctx.moveTo(e.x + i, e.y);
                ctx.lineTo(e.x + i + 5, e.y - 5);
                ctx.lineTo(e.x + i + 10, e.y);
                ctx.fill();
            }
        } else if (e.subType === 'tartar_turret') {
            // Base
            ctx.fillRect(e.x, e.y + 20, e.w, 20);
            // Cannon
            ctx.fillStyle = '#5b21b6';
            ctx.beginPath();
            ctx.arc(e.x + e.w/2, e.y + 15, 15, 0, Math.PI, true);
            ctx.fill();
        } else if (e.subType === 'boss') {
            // Massive Molar
            ctx.fillStyle = e.color;
            // Main body
            ctx.beginPath();
            ctx.roundRect(e.x, e.y, e.w, e.h - 40, 20);
            ctx.fill();
            // Roots
            ctx.beginPath();
            ctx.moveTo(e.x + 20, e.y + e.h - 40);
            ctx.lineTo(e.x + 40, e.y + e.h);
            ctx.lineTo(e.x + 60, e.y + e.h - 20);
            ctx.lineTo(e.x + 80, e.y + e.h);
            ctx.lineTo(e.x + 100, e.y + e.h - 40);
            ctx.fill();
            
            // Evil Face
            ctx.fillStyle = '#000'; // Mouth
            ctx.beginPath();
            ctx.ellipse(e.x + e.w/2, e.y + 100, 30, 20, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#ef4444'; // Eyes
            ctx.beginPath(); ctx.arc(e.x + 40, e.y + 60, 10, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(e.x + e.w - 40, e.y + 60, 10, 0, Math.PI*2); ctx.fill();

        } else {
            // Generic/Candy
            ctx.fillRect(e.x, e.y, e.w, e.h);
        }
    });

    // Player (Tooth)
    const p = entities.current.player;
    if (p.invincibleTimer <= 0 || Math.floor(Date.now() / 50) % 2 === 0) {
        ctx.fillStyle = p.color;
        // Tooth Body
        ctx.beginPath();
        // Top curves
        ctx.moveTo(p.x, p.y + 10);
        ctx.quadraticCurveTo(p.x + p.w/4, p.y, p.x + p.w/2, p.y + 5);
        ctx.quadraticCurveTo(p.x + 3*p.w/4, p.y, p.x + p.w, p.y + 10);
        // Sides
        ctx.lineTo(p.x + p.w, p.y + p.h - 10);
        // Roots
        ctx.lineTo(p.x + p.w - 5, p.y + p.h);
        ctx.lineTo(p.x + p.w/2 + 5, p.y + p.h - 10);
        ctx.lineTo(p.x + p.w/2 - 5, p.y + p.h - 10);
        ctx.lineTo(p.x + 5, p.y + p.h);
        ctx.lineTo(p.x, p.y + p.h - 10);
        ctx.closePath();
        ctx.fill();
        
        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(p.facing === 1 ? p.x + 18 : p.x + 6, p.y + 12, 4, 4); // Eye
        ctx.fillRect(p.facing === 1 ? p.x + 26 : p.x + 14, p.y + 12, 4, 4); // Eye
        
        // Rambo Headband
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p.x, p.y + 8, p.w, 4);
        // Bandana knot flowing back
        if (p.facing === 1) ctx.fillRect(p.x - 8, p.y + 8, 8, 4);
        else ctx.fillRect(p.x + p.w, p.y + 8, 8, 4);

        // Weapon
        ctx.fillStyle = '#4b5563';
        const gunX = p.facing === 1 ? p.x + 20 : p.x - 10;
        ctx.fillRect(gunX, p.y + 20, 22, 6);
        // Weapon Tip Color
        let tipColor = '#9ca3af';
        if (p.weapon === 'laser') tipColor = COLORS.projectileLaser;
        if (p.weapon === 'mouthwash') tipColor = COLORS.projectileWave;
        ctx.fillStyle = tipColor;
        ctx.fillRect(p.facing === 1 ? gunX + 20 : gunX, p.y + 19, 4, 8);
    }

    // Projectiles
    entities.current.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        if (proj.projectileType === 'floss') {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(proj.w/2, proj.h/2, 20, 0, Math.PI*2); // Spin effect
            ctx.stroke();
            ctx.restore();
        } else if (proj.projectileType === 'laser') {
            ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
            // Glow
            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
            ctx.shadowBlur = 0;
        } else {
             ctx.beginPath();
             ctx.arc(proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2, 0, Math.PI * 2);
             ctx.fill();
        }
    });

    // Particles
    entities.current.particles.forEach(part => {
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.w, part.h);
        ctx.globalAlpha = 1.0;
    });

    ctx.restore();
  };

  // --- Mobile Controls Helpers ---
  const handleTouch = (action: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      switch(action) {
          case 'left': inputs.current.left = pressed; break;
          case 'right': inputs.current.right = pressed; break;
          case 'jump': 
            inputs.current.up = pressed;
            if (pressed) inputs.current.jumpPressed = true;
            break;
          case 'shoot': 
            inputs.current.shoot = pressed;
            if (pressed) inputs.current.shootPressed = true;
            break;
      }
  };

  if (gameState === GameState.MENU) {
      return (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-900 text-white p-8">
              <h1 className="text-4xl md:text-6xl font-bold mb-4 text-pink-400 text-center uppercase tracking-widest shadow-lg" style={{textShadow: '4px 4px 0px #be185d'}}>
                  Super Molar
              </h1>
              <h2 className="text-xl md:text-2xl mb-8 text-blue-300">Plaque Attack</h2>
              
              <div className="max-w-md bg-slate-800 p-6 rounded-lg border-2 border-slate-600 mb-8">
                  <h3 className="text-yellow-400 text-sm mb-2">MISSION BRIEFING (GenAI):</h3>
                  <p className="font-mono text-sm leading-relaxed typing-effect min-h-[60px]">
                      {briefing}
                  </p>
              </div>

              <button 
                onClick={() => setGameState(GameState.PLAYING)}
                className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-xl shadow-[0_4px_0_rgb(153,27,27)] active:shadow-none active:translate-y-1 transition-all"
              >
                  START OPERATION
              </button>

              <div className="mt-8 text-xs text-slate-500 flex flex-col items-center gap-2">
                  <p>CONTROLS</p>
                  <div className="flex gap-4">
                      <span className="bg-slate-700 px-2 py-1 rounded">WASD / ARROWS : Move</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">SPACE : Jump</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">F / K : Shoot</span>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full max-w-[800px] max-h-[450px] bg-black shadow-2xl border-4 border-slate-700"
      />
      
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 max-w-[800px] mx-auto flex justify-between items-start pointer-events-none px-4">
          <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700">
                      <Heart className="text-red-500 w-5 h-5 fill-red-500" />
                      <div className="w-32 h-4 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 transition-all duration-200" style={{ width: `${hp}%` }} />
                      </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-yellow-400 font-mono text-sm">
                       <span className="text-xs text-slate-400">STAGE</span>
                       <span className="text-xl font-bold">{stage}</span>
                  </div>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-yellow-400 font-mono">
                  <span>SCORE:</span>
                  <span>{score.toString().padStart(6, '0')}</span>
              </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-blue-300">
              {entities.current.player.weapon === 'normal' && <Rocket className="w-4 h-4" />}
              {entities.current.player.weapon === 'spread' && <Crosshair className="w-4 h-4" />}
              {entities.current.player.weapon === 'laser' && <Zap className="w-4 h-4" />}
              {entities.current.player.weapon === 'mouthwash' && <Waves className="w-4 h-4" />}
              <span className="text-xs uppercase">{entities.current.player.weapon}</span>
          </div>
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 md:w-96 bg-slate-900/90 p-2 rounded border-2 border-red-900 pointer-events-none">
              <div className="flex justify-between text-xs text-red-500 font-bold mb-1 uppercase">
                  <span>The Cavity King</span>
                  <span>{Math.ceil((bossHp/bossMaxHp)*100)}%</span>
              </div>
              <div className="w-full h-4 bg-red-950 rounded overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-200" style={{ width: `${(bossHp/bossMaxHp)*100}%` }} />
              </div>
          </div>
      )}

      {/* Mobile Controls */}
      {isMobile && (
          <div className="absolute bottom-4 left-0 right-0 px-8 flex justify-between select-none touch-none">
              <div className="flex gap-4">
                  <button 
                    className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                    onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                  >←</button>
                  <button 
                    className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                    onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                  >→</button>
              </div>
              <div className="flex gap-4">
                  <button 
                    className="w-16 h-16 bg-blue-500/40 rounded-full flex items-center justify-center active:bg-blue-500/60 border-2 border-blue-400"
                    onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                    onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                  >FIRE</button>
                  <button 
                    className="w-16 h-16 bg-green-500/40 rounded-full flex items-center justify-center active:bg-green-500/60 border-2 border-green-400"
                    onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                    onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                  >JUMP</button>
              </div>
          </div>
      )}
    </div>
  );
};
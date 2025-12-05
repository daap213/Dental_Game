
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Player, Enemy, Projectile, Platform, Particle, PowerUp, Rect, WeaponType, LevelState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY, PLAYER_SIZE, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN, PLAYER_MAX_JUMPS } from '../constants';
import { generateBriefing, generateGameOverMessage } from '../services/geminiService';
import { Rocket, Heart, Zap, Waves, Crosshair, Sword, Wind } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (score: number, message: string) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  sessionId: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameState, setGameState, sessionId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [stage, setStage] = useState(1);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(0);
  const [bossName, setBossName] = useState("Boss");
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
    dash: false,
    jumpPressed: false,
    shootPressed: false,
    dashPressed: false
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
      state: 0,
      jumpCount: 0,
      maxJumps: PLAYER_MAX_JUMPS,
      dashTimer: 0,
      dashCooldown: 0
    };
  }

  // --- Initialization & Loop ---

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    if (gameState === GameState.MENU) {
       generateBriefing().then(setBriefing);
    }
  }, [gameState]);

  // Reset Game when sessionId changes
  useEffect(() => {
      if (sessionId > 0) {
          resetGame();
      }
  }, [sessionId]);

  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    
    // Clear inputs to prevent sticky keys/movement on restart
    inputs.current = {
        left: false, right: false, up: false, down: false,
        shoot: false, dash: false,
        jumpPressed: false, shootPressed: false, dashPressed: false
    };

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
      if (e.code === 'Escape') {
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
          return;
      }
      if (gameState !== GameState.PLAYING) return;
      
      // Prevent scrolling/page interaction for game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
      }

      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft': inputs.current.left = true; break;
        case 'KeyD':
        case 'ArrowRight': inputs.current.right = true; break;
        case 'KeyW':
        case 'ArrowUp': 
        case 'Space':
            if (!inputs.current.up) inputs.current.jumpPressed = true;
            inputs.current.up = true; 
            break;
        case 'KeyS':
        case 'ArrowDown': inputs.current.down = true; break;
        case 'KeyF':
        case 'KeyK': 
            if (!inputs.current.shoot) inputs.current.shootPressed = true;
            inputs.current.shoot = true; 
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyL':
            if (!inputs.current.dash) inputs.current.dashPressed = true;
            inputs.current.dash = true;
            break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft': inputs.current.left = false; break;
        case 'KeyD':
        case 'ArrowRight': inputs.current.right = false; break;
        case 'KeyW':
        case 'ArrowUp': 
        case 'Space':
            inputs.current.up = false; 
            break;
        case 'KeyS':
        case 'ArrowDown': inputs.current.down = false; break;
        case 'KeyF':
        case 'KeyK': 
            inputs.current.shoot = false; 
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
        case 'KeyL':
            inputs.current.dash = false;
            break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, setGameState]);


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

  const spawnBoss = (arenaStartX: number) => {
      const stage = entities.current.level.stage;
      const baseHp = 1000;
      let maxHp = baseHp + (stage * 500);
      let bossVariant: Enemy['bossVariant'] = 'king';
      let w = 120, h = 160;
      let color = COLORS.enemyBoss;
      let name = "The Cavity King";

      if (stage === 1) {
          bossVariant = 'king';
          name = "The Cavity King";
          maxHp = 1000;
          color = '#3f3f46'; // Zinc
      } else if (stage === 2) {
          bossVariant = 'phantom';
          name = "Plaque Phantom";
          maxHp = 1400;
          color = '#22d3ee'; // Cyan (Ghostly)
          w = 100; h = 100; // Smaller
      } else if (stage === 3) {
          bossVariant = 'tank';
          name = "Tartar Tank";
          maxHp = 2500;
          color = '#57534e'; // Stone
          w = 160; h = 140; // Wider
      } else if (stage === 4) {
          bossVariant = 'general';
          name = "General Gingivitis";
          maxHp = 2000;
          color = '#dc2626'; // Red
          w = 100; h = 180; // Tall
      } else {
          bossVariant = 'deity';
          name = "The Decay Deity";
          maxHp = 5000;
          color = '#0f172a'; // Slate-900
          w = 140; h = 140;
      }

      setBossName(name);

      entities.current.enemies.push({
          id: 'boss',
          x: arenaStartX + 500,
          y: CANVAS_HEIGHT - 250,
          w, h,
          vx: 0, vy: 0,
          hp: maxHp, maxHp: maxHp,
          type: 'enemy',
          subType: 'boss',
          bossVariant,
          phase: 1,
          color,
          facing: -1,
          isGrounded: true,
          aiTimer: 0,
          attackTimer: 0,
          frameTimer: 0,
          state: 0,
          bossState: 0
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
      state: 0,
      bossState: 0
    });
  };

  const update = (dt: number) => {
    const s = entities.current;
    const p = s.player;

    // --- Player Logic ---

    // Dash Logic
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    
    if (inputs.current.dashPressed && p.dashCooldown <= 0) {
        p.dashTimer = PLAYER_DASH_DURATION;
        p.dashCooldown = PLAYER_DASH_COOLDOWN;
        p.invincibleTimer = PLAYER_DASH_DURATION; // Invincible while dashing
        p.vx = p.facing * PLAYER_DASH_SPEED;
        p.vy = 0; // Hover during dash
        spawnParticle(p.x, p.y + p.h/2, '#fff', 10);
        inputs.current.dashPressed = false;
    }

    if (p.dashTimer > 0) {
        // Dashing Movement
        p.dashTimer -= dt;
        p.vx = p.facing * PLAYER_DASH_SPEED;
        p.vy = 0;
        // Spawn afterimages
        if (Math.random() > 0.5) {
            s.particles.push({
                id: Math.random().toString(),
                x: p.x, y: p.y, w: p.w, h: p.h,
                vx: 0, vy: 0, hp: 0, maxHp: 0, type: 'particle',
                lifeTime: 0.2, alpha: 0.5, color: p.color, facing: p.facing,
                isGrounded: false, frameTimer: 0, state: 0
            });
        }
    } else {
        // Normal Movement
        if (inputs.current.left) { p.vx -= PLAYER_SPEED * 0.2; p.facing = -1; }
        if (inputs.current.right) { p.vx += PLAYER_SPEED * 0.2; p.facing = 1; }
        
        // Friction
        if (!inputs.current.left && !inputs.current.right) p.vx *= FRICTION;
        
        // Clamp Speed
        p.vx = Math.max(Math.min(p.vx, PLAYER_SPEED), -PLAYER_SPEED);
        
        // Gravity
        p.vy += GRAVITY;
        p.vy = Math.min(p.vy, TERMINAL_VELOCITY);
    }

    // Jump / Double Jump
    if (inputs.current.jumpPressed) {
       if (p.isGrounded) {
           p.vy = PLAYER_JUMP;
           p.isGrounded = false;
           p.jumpCount = 1;
           spawnParticle(p.x + p.w/2, p.y + p.h, '#fff', 5);
       } else if (p.jumpCount < p.maxJumps && p.dashTimer <= 0) {
           p.vy = PLAYER_JUMP;
           p.jumpCount++;
           spawnParticle(p.x + p.w/2, p.y + p.h, '#88ccff', 5); // Blue particles for double jump
       }
       inputs.current.jumpPressed = false;
    }

    // Update Position
    p.x += p.vx;
    checkPlatformCollisions(p, s.platforms, true);

    p.y += p.vy;
    p.isGrounded = false; 
    checkPlatformCollisions(p, s.platforms, false);
    
    if (p.isGrounded) p.jumpCount = 0;

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
           if (p.weapon === 'laser') cooldown = 8;
           if (p.weapon === 'mouthwash') cooldown = 30;
           if (p.weapon === 'floss') cooldown = 18;
           if (p.weapon === 'toothbrush') cooldown = 20;
           
           p.frameTimer = cooldown;
           
           // Auto-fire only for some weapons
           if (p.weapon !== 'laser' && p.weapon !== 'toothbrush') inputs.current.shootPressed = false; 
       }
    }
    if (p.frameTimer > 0) p.frameTimer--;
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

    // --- Camera ---
    if (!s.level.bossSpawned) {
        let targetCamX = p.x - CANVAS_WIDTH * 0.3;
        targetCamX = Math.max(0, Math.min(targetCamX, s.level.levelWidth - CANVAS_WIDTH));
        s.camera.x += (targetCamX - s.camera.x) * 0.1;
    } else {
        // Pan to the arena
        let targetCamX = s.level.levelWidth - CANVAS_WIDTH;
        s.camera.x += (targetCamX - s.camera.x) * 0.05; // Smooth pan
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

    // Boss Failsafe
    if (s.level.bossSpawned) {
        const bossExists = s.enemies.some(e => e.subType === 'boss');
        if (!bossExists) {
             s.level.bossSpawned = false;
        }
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
        if (proj.projectileType === 'sword' || proj.projectileType === 'floss') {
            // Melee weapons follow player
             if (proj.owner === 'player') {
                proj.x = p.x + (p.facing === 1 ? p.w : -proj.w);
                proj.y = p.y + p.h/2 - proj.h/2;
            }
        } else {
            proj.x += proj.vx;
            proj.y += proj.vy;
            if (proj.projectileType === 'mortar') proj.vy += GRAVITY * 0.5;
        }
        
        proj.lifeTime -= dt;
        
        if (proj.projectileType === 'wave') {
            proj.y += Math.sin(Date.now() / 50) * 5;
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
                    if (enemy.attackTimer > 2.0 && Math.abs(enemy.x - p.x) < 50) {
                        spawnProjectile(enemy.x, enemy.y + 20, 0, 'enemy', 'normal');
                        enemy.attackTimer = 0;
                    }
                    break;
                case 'tartar_turret':
                    enemy.vx = 0;
                    enemy.vy += GRAVITY;
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
                    enemy.vx = enemy.x > p.x ? -6 : 6;
                    if (enemy.isGrounded && Math.random() < 0.05) enemy.vy = -12;
                    enemy.vy += GRAVITY;
                    break;
                case 'boss':
                    setBossHp(enemy.hp);
                    // Phase change for Final Boss
                    if (enemy.bossVariant === 'deity' && enemy.hp < enemy.maxHp / 2 && enemy.phase === 1) {
                         enemy.phase = 2;
                         enemy.color = '#7f1d1d'; // Dark Red
                         s.shake = 30;
                         spawnParticle(enemy.x, enemy.y, '#ff0000', 50);
                    }

                    // --- BOSS AI SWITCH ---
                    if (enemy.bossVariant === 'phantom') {
                        // Phantom: Floats, Dashes
                        enemy.vy = Math.sin(Date.now() / 300) * 2;
                        if (enemy.bossState === 0) { // Hover
                             enemy.vx = (p.x - enemy.x) * 0.02;
                             if (enemy.aiTimer > 2.0) {
                                 enemy.bossState = 1; enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 1) { // Prep Dash
                             enemy.vx = 0;
                             if (enemy.aiTimer > 0.5) {
                                 enemy.bossState = 2;
                                 enemy.vx = (p.x < enemy.x) ? -15 : 15;
                                 enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 2) { // Dashing
                             if (enemy.aiTimer > 1.0) { // Dash complete
                                 enemy.bossState = 3; enemy.aiTimer = 0; enemy.vx = 0;
                             }
                        } else if (enemy.bossState === 3) { // Shoot
                             if (enemy.aiTimer > 0.5) {
                                 for(let i=-1; i<=1; i++) {
                                     spawnProjectile(enemy.x + enemy.w/2, enemy.y + enemy.h/2, p.facing, 'enemy', 'normal');
                                 }
                                 enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                        }
                    } 
                    else if (enemy.bossVariant === 'tank') {
                        // Tank: Slow, Mortars, Shockwaves
                        if (enemy.bossState === 0) { // March
                             enemy.vx = (p.x - enemy.x) > 0 ? 1 : -1;
                             enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 3.0) {
                                 enemy.bossState = Math.random() > 0.5 ? 1 : 2; 
                                 enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 1) { // Mortar
                             enemy.vx = 0; enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 1.0) {
                                  // Fire Mortar
                                  s.projectiles.push({
                                      id: Math.random().toString(),
                                      x: enemy.x + enemy.w/2, y: enemy.y,
                                      w: 16, h: 16,
                                      vx: (p.x - enemy.x) * 0.015, vy: -12, // Arc
                                      hp: 1, maxHp: 1, type: 'projectile', projectileType: 'mortar',
                                      damage: 25, owner: 'enemy', lifeTime: 3,
                                      color: '#78716c', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                  });
                                  enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 2) { // Ground Wave
                             enemy.vx = 0; enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 1.0) {
                                  s.projectiles.push({
                                      id: Math.random().toString(),
                                      x: enemy.x + (p.x > enemy.x ? enemy.w : 0), y: enemy.y + enemy.h - 10,
                                      w: 40, h: 20, vx: (p.x > enemy.x ? 8 : -8), vy: 0,
                                      hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                                      damage: 20, owner: 'enemy', lifeTime: 3,
                                      color: COLORS.projectileWave, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                  });
                                  enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                        }
                    }
                    else if (enemy.bossVariant === 'general') {
                         // General: High Hover, Summon, Laser
                         enemy.vy = Math.sin(Date.now() / 600) * 0.5;
                         if (enemy.y > 100) enemy.y -= 1; // Stay high
                         
                         if (enemy.bossState === 0) { // Idle/Move
                             enemy.vx = (p.x - enemy.x) * 0.01;
                             if (enemy.aiTimer > 2.0) {
                                 enemy.bossState = Math.random() > 0.6 ? 2 : 1; 
                                 enemy.aiTimer = 0;
                             }
                         } else if (enemy.bossState === 1) { // Summon
                             enemy.vx = 0;
                             if (enemy.aiTimer > 1.0) {
                                 // Summon Minion
                                 const minion = {
                                    id: Math.random().toString(),
                                    x: enemy.x + enemy.w/2, y: enemy.y + enemy.h,
                                    w: 20, h: 20, vx: (Math.random()-0.5)*10, vy: -5,
                                    hp: 10, maxHp: 10, type: 'enemy', subType: 'bacteria' as const,
                                    color: COLORS.enemyBacteria, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
                                };
                                s.enemies.push(minion);
                                enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                         } else if (enemy.bossState === 2) { // Laser
                             enemy.vx = 0;
                             if (enemy.aiTimer > 0.5) {
                                 // Laser down
                                 s.projectiles.push({
                                    id: Math.random().toString(),
                                    x: enemy.x + enemy.w/2 - 10, y: enemy.y + enemy.h,
                                    w: 20, h: 400, vx: 0, vy: 15, // Fast drop
                                    hp: 1, maxHp: 1, type: 'projectile', projectileType: 'laser',
                                    damage: 30, owner: 'enemy', lifeTime: 0.5,
                                    color: '#ef4444', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                 });
                                 enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                         }
                    }
                    else if (enemy.bossVariant === 'deity') {
                        // DEITY - PHASE 1 & 2
                        if (enemy.phase === 1) {
                            enemy.vx = (CANVAS_WIDTH/2 + s.camera.x - enemy.x - enemy.w/2) * 0.05; // Stay center
                            enemy.vy = Math.sin(Date.now() / 400) * 1;
                            
                            // Spiral Shoot
                             if (enemy.attackTimer > 0.2) {
                                 const angle = (Date.now() / 200);
                                 for(let i=0; i<3; i++) {
                                    const offset = (Math.PI * 2 / 3) * i;
                                    s.projectiles.push({
                                        id: Math.random().toString(),
                                        x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                                        w: 12, h: 12,
                                        vx: Math.cos(angle + offset) * 5, vy: Math.sin(angle + offset) * 5,
                                        hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                        damage: 15, owner: 'enemy', lifeTime: 5,
                                        color: '#ef4444', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                    });
                                 }
                                 enemy.attackTimer = 0;
                             }
                        } else {
                            // Phase 2: Aggressive
                            if (enemy.bossState === 0) { // Chase
                                enemy.vx = (p.x - enemy.x) * 0.05;
                                enemy.vy = (p.y - enemy.y) * 0.05;
                                if (enemy.aiTimer > 2.0) { enemy.bossState = 1; enemy.aiTimer = 0; }
                            } else if (enemy.bossState === 1) { // Slam
                                enemy.vy = 15; // Fast drop
                                enemy.vx = 0;
                                // Slam detection handles in collision
                            }
                        }
                    }
                    else {
                        // Default (Cavity King) Logic
                        if (enemy.bossState === 0) { // Idle/Hover
                            enemy.vy = Math.sin(Date.now() / 500) * 0.5;
                            enemy.vx = (p.x - enemy.x) * 0.01;
                            if (enemy.aiTimer > 2.0) {
                                enemy.aiTimer = 0;
                                const r = Math.random();
                                if (r < 0.3) enemy.bossState = 4; // Shoot
                                else if (r < 0.6) enemy.bossState = 2; // Charge Slam
                                else enemy.bossState = 1; // Chase
                            }
                        } else if (enemy.bossState === 4) { // Shoot Pattern
                           enemy.vx = 0;
                            if (enemy.attackTimer > 0.5) {
                                for(let i=-2; i<=2; i++) {
                                   s.projectiles.push({
                                       id: Math.random().toString(),
                                       x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                                       w: 12, h: 12,
                                       vx: -8, vy: i * 3,
                                       hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                       damage: 15, owner: 'enemy', lifeTime: 4,
                                       color: COLORS.enemyCandy, facing: -1, isGrounded: false, frameTimer: 0, state: 0
                                   });
                                }
                                enemy.attackTimer = 0;
                                enemy.bossState = 0; // Return to idle
                                enemy.aiTimer = 0;
                            }
                        } else if (enemy.bossState === 2) { // Slam - Go Up
                           enemy.vy = -5;
                           if (enemy.y < 50) {
                               enemy.bossState = 3; // Slam Down
                               enemy.vx = (p.x - enemy.x) * 0.1; // Track player X slightly
                           }
                        } else if (enemy.bossState === 3) { // Slam Down
                           enemy.vy += 1; // Gravity accel
                        } else if (enemy.bossState === 1) { // Summon/Chase
                            if (enemy.aiTimer > 1.0) {
                               const minion = {
                                   id: Math.random().toString(),
                                   x: enemy.x + enemy.w/2, y: enemy.y + 20,
                                   w: 20, h: 20, vx: -5, vy: -5,
                                   hp: 10, maxHp: 10, type: 'enemy', subType: 'sugar_rusher' as const,
                                   color: COLORS.enemyRusher, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
                               };
                               s.enemies.push(minion);
                               enemy.bossState = 0;
                               enemy.aiTimer = 0;
                            }
                        }
                    }

                    break;
            }

            // Apply movement
            enemy.x += enemy.vx;
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'boss') {
                checkPlatformCollisions(enemy, s.platforms, true);
            }
            
            // Boss passes through platforms logic
            if (enemy.subType === 'boss') {
                 // Clamp Boss to Arena
                 const arenaLeft = s.level.levelWidth - 800;
                 if (enemy.x < arenaLeft) enemy.x = arenaLeft;
                 if (enemy.x > s.level.levelWidth - enemy.w) enemy.x = s.level.levelWidth - enemy.w;

                 // ALWAYS Apply Y movement
                 enemy.y += enemy.vy;

                 // Special Slam Ground Check
                 if (enemy.bossState === 3 || (enemy.bossVariant === 'deity' && enemy.bossState === 1)) {
                     const floorY = CANVAS_HEIGHT - 40; 
                     if (enemy.y + enemy.h > floorY) {
                         enemy.y = floorY - enemy.h;
                         enemy.isGrounded = true;
                         enemy.vy = 0;
                         
                         // Slam Effect
                         s.shake = 20; 
                         s.projectiles.push({
                            id: Math.random().toString(), x: enemy.x, y: enemy.y + enemy.h - 20,
                            w: 40, h: 20, vx: -8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                            damage: 25, owner: 'enemy', lifeTime: 3, color: COLORS.projectileWave, facing: -1, isGrounded: false, frameTimer: 0, state: 0
                         });
                         s.projectiles.push({
                            id: Math.random().toString(), x: enemy.x + enemy.w, y: enemy.y + enemy.h - 20,
                            w: 40, h: 20, vx: 8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                            damage: 25, owner: 'enemy', lifeTime: 3, color: COLORS.projectileWave, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                         });
                         enemy.bossState = 0;
                         enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossVariant === 'tank') {
                     // Tank is grounded
                     if (enemy.y + enemy.h > CANVAS_HEIGHT - 40) {
                         enemy.y = CANVAS_HEIGHT - 40 - enemy.h;
                         enemy.vy = 0;
                     }
                 }
            } else {
                 enemy.y += enemy.vy;
                 enemy.isGrounded = false;
                 if (enemy.subType !== 'candy_bomber') {
                    checkPlatformCollisions(enemy, s.platforms, false);
                 }
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
                    if (proj.projectileType !== 'laser' && proj.projectileType !== 'floss' && proj.projectileType !== 'sword') {
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
            } else {
                if (pu.subType === 'spread') p.weapon = 'spread';
                if (pu.subType === 'laser') p.weapon = 'laser';
                if (pu.subType === 'mouthwash') p.weapon = 'mouthwash';
                if (pu.subType === 'floss') p.weapon = 'floss';
                if (pu.subType === 'toothbrush') p.weapon = 'toothbrush';
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
            // WHIP: Long range, short duration
            entities.current.projectiles.push({
                ...base,
                x, y, w: 100, h: 20, vx: 0, vy: 0,
                hp: 1, maxHp: 1, damage: 60, lifeTime: 0.15, projectileType: 'floss', color: '#fff'
            } as Projectile);
      } else if (type === 'toothbrush') {
            // SWORD: Short range, high arc
            entities.current.projectiles.push({
                ...base,
                x, y, w: 60, h: 60, vx: 0, vy: 0,
                hp: 1, maxHp: 1, damage: 80, lifeTime: 0.2, projectileType: 'sword', color: COLORS.projectileMelee
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
      if (Math.random() > 0.6) return;
      const typeRoll = Math.random();
      let subType: PowerUp['subType'] = 'health';
      let color = '#ef4444';
      
      if (typeRoll > 0.85) { subType = 'spread'; color = COLORS.projectilePlayer; }
      else if (typeRoll > 0.70) { subType = 'laser'; color = COLORS.projectileLaser; }
      else if (typeRoll > 0.55) { subType = 'mouthwash'; color = COLORS.projectileWave; }
      else if (typeRoll > 0.40) { subType = 'floss'; color = '#fff'; }
      else if (typeRoll > 0.25) { subType = 'toothbrush'; color = '#e2e8f0'; }

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
  
  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

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
             drawRoundRect(ctx, p.x, p.y, p.w, p.h, 10);
        } else {
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
        if (pu.subType === 'floss') icon = 'F';
        if (pu.subType === 'toothbrush') icon = 'T';
        ctx.fillText(icon, pu.x + 6, pu.y + 14 + yOff);
    });

    // Enemies
    entities.current.enemies.forEach(e => {
        ctx.fillStyle = e.color;
        
        if (e.subType === 'bacteria') {
            ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x + 8, e.y + 12, 4, 0, Math.PI*2); ctx.fill(); ctx.arc(e.x + 24, e.y + 12, 4, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(e.x + 8, e.y + 12, 2, 0, Math.PI*2); ctx.fill(); ctx.arc(e.x + 24, e.y + 12, 2, 0, Math.PI*2); ctx.fill();
        } else if (e.subType === 'plaque_monster') {
            ctx.fillRect(e.x, e.y, e.w, e.h);
            ctx.fillStyle = '#b45309';
            for(let i=0; i<e.w; i+=10) {
                ctx.beginPath(); ctx.moveTo(e.x + i, e.y); ctx.lineTo(e.x + i + 5, e.y - 5); ctx.lineTo(e.x + i + 10, e.y); ctx.fill();
            }
        } else if (e.subType === 'tartar_turret') {
            ctx.fillRect(e.x, e.y + 20, e.w, 20);
            ctx.fillStyle = '#5b21b6';
            ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 15, 15, 0, Math.PI, true); ctx.fill();
        } else if (e.subType === 'boss') {
            
            if (e.bossVariant === 'phantom') {
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.beginPath();
                ctx.moveTo(e.x, e.y + e.h);
                ctx.quadraticCurveTo(e.x, e.y, e.x + e.w/2, e.y);
                ctx.quadraticCurveTo(e.x + e.w, e.y, e.x + e.w, e.y + e.h);
                // Jagged bottom
                for(let i=e.x+e.w; i>e.x; i-=20) {
                    ctx.lineTo(i-10, e.y+e.h-20);
                    ctx.lineTo(i-20, e.y+e.h);
                }
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(e.x+30, e.y+40, 10, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x+70, e.y+40, 10, 0, Math.PI*2); ctx.fill();
                ctx.restore();
            } else if (e.bossVariant === 'tank') {
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.fillStyle = '#292524'; // Treads
                ctx.fillRect(e.x - 10, e.y + e.h - 30, e.w + 20, 30);
                // Cannon
                ctx.fillStyle = '#57534e';
                ctx.save();
                ctx.translate(e.x + e.w/2, e.y + 20);
                ctx.rotate(Math.PI / 4);
                ctx.fillRect(0, -10, 60, 20);
                ctx.restore();
            } else if (e.bossVariant === 'general') {
                // Red blobby mass
                 ctx.beginPath();
                 ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI * 2);
                 ctx.fill();
                 // Eye
                 ctx.fillStyle = '#fca5a5';
                 ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 50, 30, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = '#000';
                 ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 50, 10, 0, Math.PI*2); ctx.fill();
            } else if (e.bossVariant === 'deity') {
                // Black Void
                ctx.fillStyle = e.phase === 2 ? '#7f1d1d' : '#0f172a';
                ctx.beginPath();
                ctx.arc(e.x + e.w/2, e.y + e.h/2, e.w/2 + (Math.sin(Date.now()/100)*5), 0, Math.PI*2);
                ctx.fill();
                // Glowing Eyes
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(e.x + 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + e.w - 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                // Standard Cavity King
                drawRoundRect(ctx, e.x, e.y, e.w, e.h - 40, 20);
                ctx.beginPath();
                ctx.moveTo(e.x + 20, e.y + e.h - 40);
                ctx.lineTo(e.x + 40, e.y + e.h);
                ctx.lineTo(e.x + 60, e.y + e.h - 20);
                ctx.lineTo(e.x + 80, e.y + e.h);
                ctx.lineTo(e.x + 100, e.y + e.h - 40);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 100, 30, 20, 0, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#ef4444'; 
                ctx.beginPath(); ctx.arc(e.x + 40, e.y + 60, 10, 0, Math.PI*2); ctx.fill(); ctx.arc(e.x + e.w - 40, e.y + 60, 10, 0, Math.PI*2); ctx.fill();
            }

            // Invincibility flash
            if (e.invincibleTimer > 0) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(e.x, e.y, e.w, e.h);
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            ctx.fillRect(e.x, e.y, e.w, e.h);
        }
    });

    // Player (Tooth)
    const p = entities.current.player;
    if (p.invincibleTimer <= 0 || Math.floor(Date.now() / 50) % 2 === 0) {
        ctx.fillStyle = p.color;
        
        // Dash Ghost effect
        if (p.dashTimer > 0) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#a5f3fc';
        }

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
        ctx.globalAlpha = 1.0;
        
        // Face
        ctx.fillStyle = '#000';
        ctx.fillRect(p.facing === 1 ? p.x + 18 : p.x + 6, p.y + 12, 4, 4); // Eye
        ctx.fillRect(p.facing === 1 ? p.x + 26 : p.x + 14, p.y + 12, 4, 4); // Eye
        
        // Rambo Headband
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(p.x, p.y + 8, p.w, 4);
        if (p.facing === 1) ctx.fillRect(p.x - 8, p.y + 8, 8, 4);
        else ctx.fillRect(p.x + p.w, p.y + 8, 8, 4);

        // Weapon Rendering
        if (p.weapon === 'toothbrush') {
             // Toothbrush handle
             ctx.fillStyle = '#22d3ee';
             ctx.fillRect(p.facing === 1 ? p.x + 10 : p.x + 22, p.y + 20, 4, 15);
        } else if (p.weapon === 'floss') {
             // Floss box
             ctx.fillStyle = '#fff';
             ctx.fillRect(p.facing === 1 ? p.x + 15 : p.x + 5, p.y + 20, 10, 10);
        } else {
             // Gun
             ctx.fillStyle = '#4b5563';
             const gunX = p.facing === 1 ? p.x + 20 : p.x - 10;
             ctx.fillRect(gunX, p.y + 20, 22, 6);
             let tipColor = '#9ca3af';
             if (p.weapon === 'laser') tipColor = COLORS.projectileLaser;
             if (p.weapon === 'mouthwash') tipColor = COLORS.projectileWave;
             ctx.fillStyle = tipColor;
             ctx.fillRect(p.facing === 1 ? gunX + 20 : gunX, p.y + 19, 4, 8);
        }
    }

    // Projectiles
    entities.current.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        if (proj.projectileType === 'floss') {
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            // Draw a snapping line
            ctx.beginPath();
            ctx.moveTo(0, proj.h/2);
            ctx.lineTo(proj.w, proj.h/2);
            ctx.stroke();
            // End bit
            ctx.beginPath(); ctx.arc(proj.w, proj.h/2, 4, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        } else if (proj.projectileType === 'sword') {
            // Draw Swipe Arc
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(proj.w/2, proj.h, proj.w, Math.PI, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (proj.projectileType === 'laser') {
            ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
            ctx.shadowBlur = 0;
        } else if (proj.projectileType === 'mortar') {
             ctx.fillStyle = '#444';
             ctx.beginPath(); ctx.arc(proj.x+proj.w/2, proj.y+proj.h/2, 8, 0, Math.PI*2); ctx.fill();
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
            if (!inputs.current.up && pressed) inputs.current.jumpPressed = true;
            inputs.current.up = pressed;
            break;
          case 'shoot': 
            if (!inputs.current.shoot && pressed) inputs.current.shootPressed = true;
            inputs.current.shoot = pressed;
            break;
          case 'dash':
            if (!inputs.current.dash && pressed) inputs.current.dashPressed = true;
            inputs.current.dash = pressed;
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
                  <div className="flex gap-4 flex-wrap justify-center">
                      <span className="bg-slate-700 px-2 py-1 rounded">WASD / ARROWS : Move</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">SPACE : Jump (x2)</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">F / K : Shoot</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">SHIFT / L : Dash</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">ESC : Pause</span>
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
              {entities.current.player.weapon === 'floss' && <Wind className="w-4 h-4" />}
              {entities.current.player.weapon === 'toothbrush' && <Sword className="w-4 h-4" />}
              <span className="text-xs uppercase">{entities.current.player.weapon}</span>
          </div>
      </div>

      {/* Boss Health Bar */}
      {bossHp > 0 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 md:w-96 bg-slate-900/90 p-2 rounded border-2 border-red-900 pointer-events-none">
              <div className="flex justify-between text-xs text-red-500 font-bold mb-1 uppercase">
                  <span>{bossName}</span>
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
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('left', true)} onTouchEnd={handleTouch('left', false)}
                    onMouseDown={handleTouch('left', true)} onMouseUp={handleTouch('left', false)}
                  >←</button>
                  <button 
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center active:bg-white/40"
                    onTouchStart={handleTouch('right', true)} onTouchEnd={handleTouch('right', false)}
                    onMouseDown={handleTouch('right', true)} onMouseUp={handleTouch('right', false)}
                  >→</button>
              </div>
              <div className="flex gap-4">
                  <button 
                    className="w-14 h-14 bg-yellow-500/40 rounded-full flex items-center justify-center active:bg-yellow-500/60 border-2 border-yellow-400"
                    onTouchStart={handleTouch('dash', true)} onTouchEnd={handleTouch('dash', false)}
                    onMouseDown={handleTouch('dash', true)} onMouseUp={handleTouch('dash', false)}
                  >D</button>
                  <button 
                    className="w-14 h-14 bg-blue-500/40 rounded-full flex items-center justify-center active:bg-blue-500/60 border-2 border-blue-400"
                    onTouchStart={handleTouch('shoot', true)} onTouchEnd={handleTouch('shoot', false)}
                    onMouseDown={handleTouch('shoot', true)} onMouseUp={handleTouch('shoot', false)}
                  >F</button>
                  <button 
                    className="w-14 h-14 bg-green-500/40 rounded-full flex items-center justify-center active:bg-green-500/60 border-2 border-green-400"
                    onTouchStart={handleTouch('jump', true)} onTouchEnd={handleTouch('jump', false)}
                    onMouseDown={handleTouch('jump', true)} onMouseUp={handleTouch('jump', false)}
                  >J</button>
              </div>
          </div>
      )}
    </div>
  );
};

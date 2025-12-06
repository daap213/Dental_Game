
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Player, Enemy, Projectile, Platform, Particle, PowerUp, LevelState, Rect, WeaponType, InputMethod } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY, PLAYER_SIZE, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN, PLAYER_MAX_JUMPS, MAX_WEAPON_LEVEL } from '../constants';
import { generateGameOverMessage } from '../services/geminiService';
import { checkRectCollide } from '../utils/physics';

// Modules
import { AudioManager } from '../game/audio';
import { generateLevel, drawBackground, drawPlatforms, drawTransition } from '../game/level';
import { spawnBoss, spawnEnemy, drawEnemies, updateEnemyAI } from '../game/enemies';
import { spawnProjectile, drawHeldWeapon, drawProjectiles, spawnPowerUp, drawPowerUp } from '../game/weapons';
import { GameHUD } from './GameHUD';

interface GameCanvasProps {
  onGameOver: (score: number, message: string) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  sessionId: number;
  inputMethod: InputMethod;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameState, setGameState, sessionId, inputMethod }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [stage, setStage] = useState(1);
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(0);
  const [bossName, setBossName] = useState("Boss");
  const [isMobile, setIsMobile] = useState(false);

  // Audio Manager (Singleton-ish per component mount)
  const audioManager = useRef(new AudioManager());

  // Mutable Game State
  const entities = useRef<{
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    particles: Particle[];
    powerups: PowerUp[];
    platforms: Platform[];
    camera: { x: number; y: number };
    level: LevelState;
    waveTimer: number;
    shake: number;
    levelTransitioning: boolean;
    transition: { phase: 'none' | 'closing' | 'opening'; progress: number };
  }>({
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    particles: [],
    powerups: [],
    platforms: [],
    camera: { x: 0, y: 0 },
    level: { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 8000 },
    waveTimer: 0,
    shake: 0,
    levelTransitioning: false,
    transition: { phase: 'none', progress: 0 }
  });

  const inputs = useRef({
    left: false, right: false, aimUp: false, down: false, shoot: false, dash: false,
    jumpPressed: false, shootPressed: false, dashPressed: false,
    mouseX: 0, mouseY: 0
  });

  function createPlayer(): Player {
    return {
      id: 'player', x: 100, y: 200, w: PLAYER_SIZE, h: PLAYER_SIZE, vx: 0, vy: 0,
      hp: 100, maxHp: 100, type: 'player', color: COLORS.player, facing: 1, isGrounded: false,
      invincibleTimer: 0, slowTimer: 0, weapon: 'normal', weaponLevel: 1, 
      weaponLevels: { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 },
      ammo: -1, score: 0,
      frameTimer: 0, state: 0, jumpCount: 0, maxJumps: PLAYER_MAX_JUMPS, dashTimer: 0, dashCooldown: 0
    };
  }

  // --- Initialization & Loop ---

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
      if (sessionId > 0) {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          resetGame();
      }
  }, [sessionId]);

  // Audio Volume Control
  useEffect(() => {
      audioManager.current.setAmbientVolume(gameState === GameState.PLAYING ? 0.15 : (gameState === GameState.PAUSED ? 0.05 : 0));
  }, [gameState]);

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
      if (entities.current.player.hp <= 0) handleGameOver();
      else animationFrameId = requestAnimationFrame(loop);
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const resetGame = () => {
    const s = entities.current;
    s.player = createPlayer();
    s.enemies = []; s.projectiles = []; s.particles = []; s.powerups = [];
    s.level = { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 8000 };
    s.platforms = generateLevel(s.level.levelWidth);
    s.camera = { x: 0, y: 0 };
    s.waveTimer = 0; s.shake = 0; s.levelTransitioning = false;
    s.transition = { phase: 'none', progress: 0 };
    
    inputs.current = {
        left: false, right: false, aimUp: false, down: false, shoot: false, dash: false,
        jumpPressed: false, shootPressed: false, dashPressed: false, mouseX: 0, mouseY: 0
    };

    setScore(0); setHp(100); setStage(1); setBossHp(0);
  };

  const performLevelReset = () => {
      const s = entities.current;
      s.levelTransitioning = false; s.level.stage++; s.level.bossSpawned = false;
      s.level.distanceTraveled = 0; s.level.levelWidth += 2000;
      s.player.x = 100; s.player.y = 200; s.player.hp = Math.min(s.player.hp + 50, 100);
      setHp(s.player.hp);
      s.enemies = []; s.projectiles = []; s.powerups = [];
      s.platforms = generateLevel(s.level.levelWidth);
      s.camera.x = 0; setStage(s.level.stage); setBossHp(0);
      s.player.invincibleTimer = 3.0;
  };

  const handleGameOver = async () => {
    audioManager.current.playGameOver();
    setGameState(GameState.GAME_OVER);
    const player = entities.current.player;
    const msg = await generateGameOverMessage(player.score, "Tooth Decay");
    onGameOver(player.score, msg);
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioManager.current.init();
      if (e.code === 'Escape') {
          setGameState(gameState === GameState.PLAYING ? GameState.PAUSED : GameState.PLAYING);
          return;
      }
      if (gameState !== GameState.PLAYING) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': inputs.current.left = true; break;
        case 'KeyD': case 'ArrowRight': inputs.current.right = true; break;
        case 'KeyW': case 'ArrowUp': inputs.current.aimUp = true; break;
        case 'Space': if (!inputs.current.jumpPressed) inputs.current.jumpPressed = true; break;
        case 'KeyS': case 'ArrowDown': inputs.current.down = true; break;
        case 'KeyF': case 'KeyK': 
            if (!inputs.current.shoot) inputs.current.shootPressed = true;
            inputs.current.shoot = true; break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyL':
            if (!inputs.current.dash) inputs.current.dashPressed = true;
            inputs.current.dash = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      switch (e.code) {
        case 'KeyA': case 'ArrowLeft': inputs.current.left = false; break;
        case 'KeyD': case 'ArrowRight': inputs.current.right = false; break;
        case 'KeyW': case 'ArrowUp': inputs.current.aimUp = false; break;
        case 'Space': break;
        case 'KeyS': case 'ArrowDown': inputs.current.down = false; break;
        case 'KeyF': case 'KeyK': inputs.current.shoot = false; break;
        case 'ShiftLeft': case 'ShiftRight': case 'KeyL': inputs.current.dash = false; break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
        audioManager.current.init();
        if (gameState !== GameState.PLAYING) return;
        if (inputMethod === 'keyboard' && !isMobile) return; // Ignore mouse clicks in keyboard mode

        if (e.button === 0) { if (!inputs.current.shoot) inputs.current.shootPressed = true; inputs.current.shoot = true; } 
        else if (e.button === 2) { if (!inputs.current.dash) inputs.current.dashPressed = true; inputs.current.dash = true; }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        if (inputMethod === 'keyboard' && !isMobile) return;

        if (e.button === 0) inputs.current.shoot = false;
        if (e.button === 2) inputs.current.dash = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        if (inputMethod === 'keyboard' && !isMobile) return; 

        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            inputs.current.mouseX = (e.clientX - rect.left) * scaleX;
            inputs.current.mouseY = (e.clientY - rect.top) * scaleY;
        }
    };

    const handleContextMenu = (e: MouseEvent) => { if (gameState === GameState.PLAYING) e.preventDefault(); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameState, setGameState, inputMethod, isMobile]);

  const handleTouch = (action: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      audioManager.current.init();
      switch(action) {
          case 'left': inputs.current.left = pressed; break;
          case 'right': inputs.current.right = pressed; break;
          case 'up': inputs.current.aimUp = pressed; break;
          case 'down': inputs.current.down = pressed; break;
          case 'jump': if (!inputs.current.jumpPressed && pressed) inputs.current.jumpPressed = true; break;
          case 'shoot': if (!inputs.current.shoot && pressed) inputs.current.shootPressed = true; inputs.current.shoot = pressed; break;
          case 'dash': if (!inputs.current.dash && pressed) inputs.current.dashPressed = true; inputs.current.dash = pressed; break;
      }
  };

  // --- Update Loop ---

  const update = (dt: number) => {
    const s = entities.current;
    if (s.platforms.length === 0) s.platforms = generateLevel(s.level.levelWidth);
    
    const p = s.player;

    // Transition Logic
    if (s.transition.phase === 'closing') {
        s.transition.progress += dt * 0.8;
        if (s.transition.progress >= 1) {
            s.transition.progress = 1;
            performLevelReset();
            s.transition.phase = 'opening';
        }
        return;
    } else if (s.transition.phase === 'opening') {
        s.transition.progress -= dt * 0.8;
        if (s.transition.progress <= 0) {
            s.transition.progress = 0; s.transition.phase = 'none';
        }
        return;
    }

    // Player Physics
    if (p.slowTimer > 0) p.slowTimer -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    
    if (inputs.current.dashPressed && p.dashCooldown <= 0) {
        p.dashTimer = PLAYER_DASH_DURATION;
        p.dashCooldown = PLAYER_DASH_COOLDOWN;
        p.invincibleTimer = PLAYER_DASH_DURATION;
        p.vx = p.facing * PLAYER_DASH_SPEED; p.vy = 0;
        spawnParticle(p.x, p.y + p.h/2, '#fff', 10);
        inputs.current.dashPressed = false;
    }

    if (p.dashTimer > 0) {
        p.dashTimer -= dt; p.vx = p.facing * PLAYER_DASH_SPEED; p.vy = 0;
        if (Math.random() > 0.5) spawnParticle(p.x, p.y, p.color, 1);
    } else {
        const speed = p.slowTimer > 0 ? PLAYER_SPEED * 0.5 : PLAYER_SPEED;
        if (inputs.current.left) { p.vx -= speed * 0.2; p.facing = -1; }
        if (inputs.current.right) { p.vx += speed * 0.2; p.facing = 1; }
        if (!inputs.current.left && !inputs.current.right) p.vx *= FRICTION;
        p.vx = Math.max(Math.min(p.vx, speed), -speed);
        p.vy += GRAVITY; p.vy = Math.min(p.vy, TERMINAL_VELOCITY);
    }

    if (inputs.current.jumpPressed) {
       if (p.isGrounded) {
           p.vy = PLAYER_JUMP; p.isGrounded = false; p.jumpCount = 1;
           spawnParticle(p.x + p.w/2, p.y + p.h, '#fff', 5);
       } else if (p.jumpCount < p.maxJumps && p.dashTimer <= 0) {
           p.vy = PLAYER_JUMP; p.jumpCount++;
           spawnParticle(p.x + p.w/2, p.y + p.h, '#88ccff', 5);
       }
       inputs.current.jumpPressed = false;
    }

    p.x += p.vx; checkPlatformCollisions(p, s.platforms, true);
    p.y += p.vy; p.isGrounded = false; checkPlatformCollisions(p, s.platforms, false);
    if (p.isGrounded) p.jumpCount = 0;
    if (p.x < 0) p.x = 0;
    if (s.level.bossSpawned) {
        const arenaLeft = s.level.levelWidth - 800;
        if (p.x < arenaLeft) p.x = arenaLeft;
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    } else {
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    }
    if (p.y > CANVAS_HEIGHT + 100) p.hp = 0;

    // Shooting Logic (Strictly separated by Input Method)
    if (inputs.current.shootPressed && p.frameTimer <= 0) {
        let dx = 0, dy = 0;

        if (inputMethod === 'mouse' && !isMobile) {
            // MOUSE AIMING (Desktop)
            const mWX = inputs.current.mouseX + s.camera.x; 
            const mWY = inputs.current.mouseY + s.camera.y;
            const pCX = p.x + p.w/2; 
            const pCY = p.y + p.h/2;
            dx = mWX - pCX; 
            dy = mWY - pCY;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0) { dx /= len; dy /= len; } else { dx = p.facing; dy = 0; }
            p.facing = mWX < pCX ? -1 : 1; // Face mouse
        } else {
            // KEYBOARD / MOBILE AIMING (Directional)
            if (inputs.current.aimUp) { 
                dy = -1; 
                dx = inputs.current.left ? -1 : (inputs.current.right ? 1 : 0); 
                // Normalize diagonal
                if (dx !== 0) { const len = Math.sqrt(dx*dx + dy*dy); dx /= len; dy /= len; }
            } else { 
                dx = p.facing; 
                dy = 0; 
            }
        }

        let sX = p.x + p.w/2; let sY = p.y + p.h/2;
        if (dy < -0.5) sY = p.y - 10; else sY = p.y + 10;
        if (Math.abs(dx) > 0.5) sX = p.x + p.w/2 + (Math.sign(dx) * 20);

        audioManager.current.playWeaponSound(p.weapon);
        spawnProjectile(s.projectiles, sX, sY, dx, dy, 'player', p.weapon, p);
        
        let cd = 10;
        if (p.weapon === 'normal') cd = p.weaponLevel >= 2 ? 6 : 10;
        if (p.weapon === 'spread') cd = 20; if (p.weapon === 'laser') cd = 20;
        if (p.weapon === 'mouthwash') cd = p.weaponLevel >= 2 ? 22 : 30;
        if (p.weapon === 'floss') cd = 18; if (p.weapon === 'toothbrush') cd = p.weaponLevel >= 2 ? 15 : 20;
        p.frameTimer = cd;
        if (p.weapon !== 'laser' && p.weapon !== 'toothbrush') inputs.current.shootPressed = false; 
    }
    if (p.frameTimer > 0) p.frameTimer--;
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

    // Camera
    if (!s.level.bossSpawned) {
        let targetX = p.x - CANVAS_WIDTH * 0.3;
        targetX = Math.max(0, Math.min(targetX, s.level.levelWidth - CANVAS_WIDTH));
        s.camera.x += (targetX - s.camera.x) * 0.1;
    } else {
        let targetX = s.level.levelWidth - CANVAS_WIDTH;
        s.camera.x += (targetX - s.camera.x) * 0.05;
    }
    if (s.shake > 0) {
        s.camera.x += (Math.random() - 0.5) * s.shake; s.camera.y += (Math.random() - 0.5) * s.shake;
        s.shake *= 0.9; if (s.shake < 0.5) s.shake = 0;
    } else s.camera.y = 0;

    // Spawning
    if (!s.level.bossSpawned && !s.levelTransitioning && p.x > s.level.levelWidth - 600) {
        s.level.bossSpawned = true;
        spawnBoss(s.level, setBossName, setBossMaxHp, setBossHp, audioManager.current, s.enemies);
    }
    if (s.level.bossSpawned && !s.levelTransitioning) {
        if (!s.enemies.some(e => e.subType === 'boss')) s.level.bossSpawned = false;
    }
    s.waveTimer += dt;
    if (!s.level.bossSpawned && !s.levelTransitioning && s.waveTimer > Math.max(0.5, 2.0 - (score / 10000) - (s.level.stage * 0.1))) {
        spawnEnemy(s.level, s.camera.x, s.enemies);
        s.waveTimer = 0;
    }

    // --- Entity Updates (Projectiles, Enemies, Particles) ---
    s.projectiles.forEach(proj => {
        if (proj.projectileType === 'sword' || proj.projectileType === 'floss') {
             if (proj.owner === 'player') {
                const centerX = p.x + p.w/2; const centerY = p.y + p.h/2;
                if (proj.projectileType === 'sword') { proj.x = centerX + (proj.vx * 20) - proj.w/2; proj.y = centerY + (proj.vy * 20) - proj.h/2; } 
                else { const d = Math.max(proj.w, proj.h)/2 + 10; proj.x = centerX + (proj.vx * d) - proj.w/2; proj.y = centerY + (proj.vy * d) - proj.h/2; }
            }
        } else if (proj.projectileType !== 'sludge') {
            proj.x += proj.vx; proj.y += proj.vy;
            if (proj.projectileType === 'mortar' || proj.projectileType === 'acid') proj.vy += GRAVITY * 0.5;
        }
        proj.lifeTime -= dt;
        if (proj.projectileType === 'wave') proj.y += Math.sin(Date.now() / 50) * 5;
        // Boss Homing
        if (proj.projectileType === 'bullet' && proj.owner === 'enemy' && proj.damage > 20) {
             const dx = p.x - proj.x; const dy = p.y - proj.y; const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist > 0 && dist < 400) { proj.vx += (dx/dist)*0.2; proj.vy += (dy/dist)*0.2; }
        }
    });
    s.projectiles = s.projectiles.filter(p => p.lifeTime > 0);

    s.enemies.forEach(enemy => {
        enemy.aiTimer += dt; enemy.attackTimer += dt; enemy.frameTimer += dt;
        const dist = Math.abs(p.x - enemy.x);
        if (dist < CANVAS_WIDTH + 100 || enemy.subType === 'boss') {
            updateEnemyAI(enemy, p, s, audioManager.current, setBossHp);
            
            enemy.x += enemy.vx;
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'acid_spitter' && enemy.subType !== 'boss') checkPlatformCollisions(enemy, s.platforms, true);
            
            if (enemy.subType === 'boss') {
                 const arenaLeft = s.level.levelWidth - 800;
                 if (enemy.x < arenaLeft) enemy.x = arenaLeft;
                 if (enemy.x > s.level.levelWidth - enemy.w) enemy.x = s.level.levelWidth - enemy.w;
                 enemy.y += enemy.vy;
                 const floorY = CANVAS_HEIGHT - 60; 
                 if (enemy.bossState === 3 || (enemy.bossVariant === 'deity' && enemy.bossState === 1)) {
                     if (enemy.y + enemy.h > floorY) {
                         enemy.y = floorY - enemy.h; enemy.isGrounded = true; enemy.vy = 0; s.shake = 20; 
                         audioManager.current.playBossAttack('slam');
                         s.projectiles.push({ id: Math.random().toString(), x: enemy.x, y: enemy.y+enemy.h-20, w: 40, h: 20, vx: -8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave', damage: 25, owner: 'enemy', lifeTime: 3, hitIds: [], color: COLORS.projectileWave, facing: -1, isGrounded: false, frameTimer: 0, state: 0 });
                         s.projectiles.push({ id: Math.random().toString(), x: enemy.x+enemy.w, y: enemy.y+enemy.h-20, w: 40, h: 20, vx: 8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave', damage: 25, owner: 'enemy', lifeTime: 3, hitIds: [], color: COLORS.projectileWave, facing: 1, isGrounded: false, frameTimer: 0, state: 0 });
                         enemy.bossState = 0; enemy.aiTimer = 0;
                     }
                 } else if (enemy.bossVariant === 'tank') {
                     if (enemy.y + enemy.h > floorY) { enemy.y = floorY - enemy.h; enemy.vy = 0; }
                 }
            } else {
                 enemy.y += enemy.vy; enemy.isGrounded = false;
                 if (enemy.subType !== 'candy_bomber') checkPlatformCollisions(enemy, s.platforms, false);
            }
        }
    });

    // Collisions
    s.projectiles.forEach(proj => {
        if (proj.owner === 'player') {
            s.enemies.forEach(enemy => {
                if (enemy.bossVariant === 'phantom' && enemy.bossState === 5) return;
                const piercingTypes = ['laser', 'floss', 'sword', 'wave'];
                if (piercingTypes.includes(proj.projectileType) && proj.hitIds.includes(enemy.id)) return;

                if (checkRectCollide(proj, enemy)) {
                    enemy.hp -= proj.damage;
                    if (piercingTypes.includes(proj.projectileType)) proj.hitIds.push(enemy.id);
                    else proj.lifeTime = 0;
                    spawnParticle(proj.x, proj.y, '#fff', 3);
                    if (enemy.hp <= 0 && !enemy.dead) {
                        enemy.dead = true;
                        p.score += (enemy.subType === 'boss' ? 5000 : 100); setScore(p.score); s.shake = 5;
                        spawnPowerUp(entities.current.powerups, enemy.x, enemy.y);
                        for(let i=0; i<8; i++) spawnParticle(enemy.x+enemy.w/2, enemy.y+enemy.h/2, enemy.color, 10);
                        if (enemy.subType === 'boss' && !s.levelTransitioning) {
                            s.levelTransitioning = true;
                            setTimeout(() => { if (entities.current.transition.phase === 'none') entities.current.transition.phase = 'closing'; }, 2000);
                        }
                    }
                }
            });
        }
    });
    s.enemies = s.enemies.filter(e => !e.dead);

    let playerHit = false; let hitDamage = 20;
    s.enemies.forEach(enemy => { if (checkRectCollide(p, enemy)) playerHit = true; });
    s.projectiles.forEach(proj => {
        if (proj.owner === 'enemy' && checkRectCollide(p, proj)) {
            if (proj.projectileType === 'sludge') p.slowTimer = 0.5;
            else { playerHit = true; hitDamage = proj.damage; proj.lifeTime = 0; }
        }
    });
    if (playerHit && p.invincibleTimer <= 0) {
        p.hp -= hitDamage; setHp(p.hp); p.invincibleTimer = 2.0; p.vy = -6; p.vx = -5 * p.facing; s.shake = 10;
    }

    s.powerups.forEach(pu => {
        if (checkRectCollide(p, pu)) {
            if (pu.subType === 'health') { p.hp = Math.min(p.hp + 30, 100); setHp(p.hp); }
            else {
                const newWeapon = pu.subType as WeaponType;
                if (!p.weaponLevels) p.weaponLevels = { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 };
                if (p.weapon === newWeapon) {
                    if (p.weaponLevels[newWeapon] < MAX_WEAPON_LEVEL) {
                        p.weaponLevels[newWeapon]++;
                        p.weaponLevel = p.weaponLevels[newWeapon];
                        spawnParticle(p.x, p.y, '#fbbf24', 10); 
                        setScore(s => s + 500);
                    } else {
                        setScore(s => s + 1000);
                    }
                } else {
                    p.weapon = newWeapon;
                    p.weaponLevel = p.weaponLevels[newWeapon];
                }
            }
            pu.dead = true;
        }
    });
    s.powerups = s.powerups.filter(pu => !pu.dead);

    s.particles.forEach(part => { part.x += part.vx; part.y += part.vy; part.lifeTime -= dt; part.alpha = part.lifeTime; });
    s.particles = s.particles.filter(p => p.lifeTime > 0);
  };

  // --- Drawing ---
  const draw = (ctx: CanvasRenderingContext2D) => {
    const s = entities.current;
    const p = s.player;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(ctx, s.camera.x);

    ctx.save();
    ctx.translate(-s.camera.x, -s.camera.y);

    drawPlatforms(ctx, s.platforms);
    s.powerups.forEach(pu => {
        drawPowerUp(ctx, pu);
    });

    drawEnemies(ctx, s.enemies);
    drawProjectiles(ctx, s.projectiles, p);

    s.particles.forEach(part => {
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.fillRect(part.x, part.y, part.w, part.h);
        ctx.globalAlpha = 1.0;
    });

    // Draw Player
    if (p.hp > 0 && (p.invincibleTimer <= 0 || Math.floor(Date.now() / 100) % 2 === 0)) {
        ctx.save();
        // Player Sprite (Detailed Retro Tooth)
        const px = p.x; const py = p.y;
        
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(px + p.w/2, py + p.h - 2, 10, 4, 0, 0, Math.PI*2); ctx.fill();

        // Body (Tooth Shape)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        // Top bumps
        ctx.moveTo(px + 4, py + 8);
        ctx.quadraticCurveTo(px + p.w/4, py, px + p.w/2, py + 6);
        ctx.quadraticCurveTo(px + 3*p.w/4, py, px + p.w - 4, py + 8);
        // Sides
        ctx.quadraticCurveTo(px + p.w, py + p.h/2, px + p.w - 6, py + p.h - 4);
        // Bottom (Roots)
        ctx.lineTo(px + p.w/2 + 4, py + p.h);
        ctx.lineTo(px + p.w/2, py + p.h - 8);
        ctx.lineTo(px + p.w/2 - 4, py + p.h);
        ctx.lineTo(px + 6, py + p.h - 4);
        ctx.quadraticCurveTo(px, py + p.h/2, px + 4, py + 8);
        ctx.fill();

        // Shading/Gradient
        const grad = ctx.createLinearGradient(px, py, px, py + p.h);
        grad.addColorStop(0, 'rgba(255,255,255,0.8)');
        grad.addColorStop(1, 'rgba(200,200,200,0.2)');
        ctx.fillStyle = grad; ctx.fill();

        // Face
        const lookOffset = p.facing * 2;
        ctx.fillStyle = '#1e293b';
        // Eyes (Combat Bandana or Sunglasses look?) - Let's go with Determined Eyes
        ctx.beginPath();
        ctx.ellipse(px + p.w/2 + 4 + lookOffset, py + 14, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        ctx.ellipse(px + p.w/2 - 4 + lookOffset, py + 14, 3, 4, 0, 0, Math.PI*2); ctx.fill();
        
        // Sweatband (Rambo style)
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px + 2, py + 8, p.w - 4, 4);
        if (p.facing === -1) ctx.fillRect(px + p.w - 4, py + 8, 8, 4); // Knot
        else ctx.fillRect(px - 4, py + 8, 8, 4);

        // Arms (holding weapon) logic is handled by drawHeldWeapon mostly, but let's add simple hands
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(px + p.w/2 + (p.facing*10), py + 22, 5, 0, Math.PI*2); ctx.fill();

        drawHeldWeapon(ctx, p, {
             usingMouse: inputMethod === 'mouse' && !isMobile,
             aimUp: inputs.current.aimUp,
             mouseX: inputs.current.mouseX,
             mouseY: inputs.current.mouseY,
             cameraX: s.camera.x,
             cameraY: s.camera.y
        });

        ctx.restore();
    }

    ctx.restore();

    drawTransition(ctx, s.transition.progress, s.level.stage);
  };

  const spawnParticle = (x: number, y: number, color: string, count: number) => {
      for(let i=0; i<count; i++) {
          entities.current.particles.push({
              id: Math.random().toString(), x, y, w: 4, h: 4, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
              hp: 0, maxHp: 0, type: 'particle', lifeTime: 0.5+Math.random()*0.5, alpha: 1, color, facing: 1, isGrounded: false, frameTimer: 0, state: 0
          });
      }
  };
  
  const checkPlatformCollisions = (entity: Entity, platforms: Platform[], horizontal: boolean) => {
     for (const plat of platforms) {
         if (checkRectCollide(entity, plat)) {
             if (horizontal) {
                 if (entity.vx > 0) entity.x = plat.x - entity.w; else if (entity.vx < 0) entity.x = plat.x + plat.w;
                 entity.vx = 0;
             } else {
                 if (entity.vy > 0) { entity.y = plat.y - entity.h; entity.isGrounded = true; entity.vy = 0; }
                 else if (entity.vy < 0) { entity.y = plat.y + plat.h; entity.vy = 0; }
             }
         }
     }
  };

  return (
    <>
      <canvas 
        ref={canvasRef} 
        width={CANVAS_WIDTH} 
        height={CANVAS_HEIGHT} 
        className="block w-full h-full object-contain pointer-events-none"
        style={{ imageRendering: 'pixelated' }}
      />
      <GameHUD 
        player={entities.current.player} 
        score={score} 
        stage={stage} 
        hp={hp} 
        bossHp={bossHp} 
        bossMaxHp={bossMaxHp}
        bossName={bossName}
        isMobile={isMobile}
        handleTouch={handleTouch}
      />
    </>
  );
};

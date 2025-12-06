
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Player, Enemy, Projectile, Platform, Particle, PowerUp, LevelState, Rect, WeaponType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY, PLAYER_SIZE, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN, PLAYER_MAX_JUMPS, MAX_WEAPON_LEVEL } from '../constants';
import { generateGameOverMessage } from '../services/geminiService';
import { checkRectCollide } from '../utils/physics';

// Modules
import { AudioManager } from '../game/audio';
import { generateLevel, drawBackground, drawPlatforms, drawTransition } from '../game/level';
import { spawnBoss, spawnEnemy, drawEnemies } from '../game/enemies';
import { spawnProjectile, drawHeldWeapon, drawProjectiles } from '../game/weapons';
import { GameHUD } from './GameHUD';

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
    mouseX: 0, mouseY: 0, usingMouse: false
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
        jumpPressed: false, shootPressed: false, dashPressed: false, mouseX: 0, mouseY: 0, usingMouse: false
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
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) inputs.current.usingMouse = false;

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
        inputs.current.usingMouse = true;
        if (e.button === 0) { if (!inputs.current.shoot) inputs.current.shootPressed = true; inputs.current.shoot = true; } 
        else if (e.button === 2) { if (!inputs.current.dash) inputs.current.dashPressed = true; inputs.current.dash = true; }
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        if (e.button === 0) inputs.current.shoot = false;
        if (e.button === 2) inputs.current.dash = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (gameState !== GameState.PLAYING) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            inputs.current.mouseX = (e.clientX - rect.left) * scaleX;
            inputs.current.mouseY = (e.clientY - rect.top) * scaleY;
            inputs.current.usingMouse = true;
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
  }, [gameState, setGameState]);

  const handleTouch = (action: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      audioManager.current.init();
      switch(action) {
          case 'left': inputs.current.left = pressed; break;
          case 'right': inputs.current.right = pressed; break;
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

    // Shooting
    if (inputs.current.shootPressed && p.frameTimer <= 0) {
        let dx = 0, dy = 0;
        if (inputs.current.usingMouse) {
            const mWX = inputs.current.mouseX + s.camera.x; const mWY = inputs.current.mouseY + s.camera.y;
            const pCX = p.x + p.w/2; const pCY = p.y + p.h/2;
            dx = mWX - pCX; dy = mWY - pCY;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0) { dx /= len; dy /= len; } else { dx = p.facing; dy = 0; }
            p.facing = mWX < pCX ? -1 : 1;
        } else {
            if (inputs.current.aimUp) { dy = -1; dx = inputs.current.left ? -1 : (inputs.current.right ? 1 : 0); }
            else { dx = p.facing; dy = 0; }
            if (dx !== 0 && dy !== 0) { const len = Math.sqrt(dx*dx+dy*dy); dx/=len; dy/=len; }
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
            updateEnemyAI(enemy, p, s, audioManager.current);
            
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
                        spawnPowerUp(enemy.x, enemy.y);
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
                // WEAPON PICKUP LOGIC
                const newWeapon = pu.subType as WeaponType;
                
                // Ensure weaponLevels is initialized (defensive check)
                if (!p.weaponLevels) p.weaponLevels = { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 };

                if (p.weapon === newWeapon) {
                    // Upgrade current weapon
                    if (p.weaponLevels[newWeapon] < MAX_WEAPON_LEVEL) {
                        p.weaponLevels[newWeapon]++;
                        p.weaponLevel = p.weaponLevels[newWeapon];
                        spawnParticle(p.x, p.y, '#fbbf24', 10); 
                        setScore(s => s + 500);
                    } else {
                        setScore(s => s + 1000);
                    }
                } else {
                    // Switch weapon
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

  // --- Helpers ---
  const spawnParticle = (x: number, y: number, color: string, count: number) => {
      for(let i=0; i<count; i++) {
          entities.current.particles.push({
              id: Math.random().toString(), x, y, w: 4, h: 4, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
              hp: 0, maxHp: 0, type: 'particle', lifeTime: 0.5+Math.random()*0.5, alpha: 1, color, facing: 1, isGrounded: false, frameTimer: 0, state: 0
          });
      }
  };
  const spawnPowerUp = (x: number, y: number) => {
      if (Math.random() > 0.6) return;
      const r = Math.random(); let sub: PowerUp['subType'] = 'health'; let c = '#ef4444';
      if (r > 0.85) { sub = 'spread'; c = COLORS.projectilePlayer; } else if (r > 0.7) { sub = 'laser'; c = COLORS.projectileLaser; }
      else if (r > 0.55) { sub = 'mouthwash'; c = COLORS.projectileWave; } else if (r > 0.4) { sub = 'floss'; c = '#fff'; }
      else if (r > 0.25) { sub = 'toothbrush'; c = '#e2e8f0'; }
      entities.current.powerups.push({ id: Math.random().toString(), x, y, w: 20, h: 20, vx: 0, vy: 0, hp: 0, maxHp: 0, type: 'powerup', subType: sub, color: c, facing: 1, isGrounded: false, frameTimer: 0, state: 0 });
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

  // Simplified AI Logic Block
  const updateEnemyAI = (enemy: Enemy, p: Player, s: any, audio: AudioManager) => {
     switch(enemy.subType) {
        case 'bacteria': enemy.vx = enemy.x > p.x ? -2 : 2; if(enemy.isGrounded && Math.random()<0.01) enemy.vy = -8; enemy.vy += GRAVITY; break;
        case 'plaque_monster': enemy.vx = enemy.x > p.x ? -1 : 1; enemy.vy += GRAVITY; break;
        case 'candy_bomber': enemy.vy = Math.sin(Date.now()/200); enemy.vx = -3; 
            if(enemy.attackTimer > 2 && Math.abs(enemy.x-p.x)<50) { spawnProjectile(s.projectiles, enemy.x, enemy.y+20, 0, 1, 'enemy', 'normal'); enemy.attackTimer=0; } break;
        case 'tartar_turret': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer > 3 && Math.abs(p.x-enemy.x)<400) { 
                const angle = Math.atan2(p.y-enemy.y, p.x-enemy.x);
                s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h/2,w:8,h:8,vx:Math.cos(angle)*5,vy:Math.sin(angle)*5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:10,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileEnemy,facing:1,isGrounded:false,frameTimer:0,state:0});
                enemy.attackTimer=0; 
            } break;
        case 'sugar_rusher': enemy.vx = enemy.x > p.x ? -6 : 6; if(enemy.isGrounded && Math.random()<0.05) enemy.vy = -12; enemy.vy += GRAVITY; break;
        case 'sugar_fiend': enemy.vx = Math.abs(p.x-enemy.x)<150 ? (enemy.x>p.x?4:-4) : (enemy.x>p.x?-3:3); enemy.vy += GRAVITY;
            if(enemy.attackTimer>1) { s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-5,w:24,h:10,vx:0,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'sludge',damage:0,owner:'enemy',lifeTime:4,hitIds:[],color:COLORS.projectileSludge,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; } break;
        case 'acid_spitter': enemy.vx = 0; enemy.vy += GRAVITY;
            if(enemy.attackTimer>2.5 && Math.abs(p.x-enemy.x)<500) { const dx=p.x-enemy.x; const dy=p.y-enemy.y-100; s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:12,h:12,vx:dx*0.02,vy:dy*0.02-5,hp:1,maxHp:1,type:'projectile',projectileType:'acid',damage:15,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileAcid,facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; } break;
        case 'gingivitis_grunt': enemy.vy += GRAVITY; 
            if(enemy.bossState === 1) { enemy.vx = enemy.facing * 8; if(enemy.aiTimer > 1) { enemy.bossState=0; enemy.aiTimer=0; } }
            else { enemy.vx = enemy.x > p.x ? -1 : 1; enemy.facing = enemy.vx > 0 ? 1 : -1; if(Math.abs((p.y+p.h)-(enemy.y+enemy.h))<30 && Math.abs(p.x-enemy.x)<300 && enemy.aiTimer>2) { enemy.bossState=1; enemy.aiTimer=0; spawnParticle(enemy.x, enemy.y, '#fff', 5); } } break;
        case 'boss': 
             setBossHp(enemy.hp);
             if (enemy.bossVariant === 'deity' && enemy.hp < enemy.maxHp/2 && enemy.phase===1) { enemy.phase=2; enemy.color='#7f1d1d'; s.shake=30; spawnParticle(enemy.x, enemy.y, '#f00', 50); }
             if(enemy.bossVariant==='phantom') {
                 if(enemy.bossState===5) { enemy.vx=0; enemy.vy=0; if(enemy.aiTimer>2) { enemy.x=p.x>400?p.x-200:p.x+200; enemy.y=p.y-100; enemy.bossState=0; enemy.aiTimer=0; spawnParticle(enemy.x,enemy.y,'#22d3ee',20); } return; }
                 enemy.vy = Math.sin(Date.now()/300)*2;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.03; if(enemy.aiTimer>1.5) { enemy.bossState=Math.random()>0.7?5:1; enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { enemy.vx=0; if(enemy.aiTimer>0.5) { enemy.bossState=2; audio.playBossAttack('charge'); enemy.vx=(p.x<enemy.x)?-18:18; enemy.aiTimer=0; } }
                 else if(enemy.bossState===2) { enemy.vy=(p.y-enemy.y)*0.1; if(enemy.aiTimer>0.8) { enemy.bossState=3; enemy.aiTimer=0; enemy.vx=0; } }
                 else if(enemy.bossState===3 && enemy.aiTimer>0.3) { audio.playBossAttack('shoot'); for(let i=-2;i<=2;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2, enemy.y+enemy.h/2, p.facing, 0, 'enemy', 'normal'); enemy.bossState=0; enemy.aiTimer=0; }
             } else if (enemy.bossVariant==='tank') {
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)>0?2:-2; enemy.vy+=GRAVITY; if(enemy.aiTimer>2.5) { enemy.bossState=Math.random()>0.5?1:2; enemy.aiTimer=0; } }
                 else if(enemy.bossState===1) { enemy.vx=0; enemy.vy+=GRAVITY; if(enemy.aiTimer>0.8) { audio.playBossAttack('mortar'); for(let i=0;i<3;i++) s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y,w:16,h:16,vx:(p.x-enemy.x)*(0.01+i*0.005),vy:-14,hp:1,maxHp:1,type:'projectile',projectileType:'mortar',damage:25,owner:'enemy',lifeTime:4,hitIds:[],color:'#78716c',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; } }
                 else if(enemy.bossState===2) { enemy.vx=0; enemy.vy+=GRAVITY; if(enemy.aiTimer>0.8) { audio.playBossAttack('slam'); [-1,1].forEach(d=>s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+enemy.h-10,w:40,h:40,vx:d*10,vy:0,hp:1,maxHp:1,type:'projectile',projectileType:'wave',damage:20,owner:'enemy',lifeTime:3,hitIds:[],color:COLORS.projectileWave,facing:1,isGrounded:false,frameTimer:0,state:0})); enemy.bossState=0; enemy.aiTimer=0; } }
             } else if (enemy.bossVariant==='general') {
                 enemy.vy = Math.sin(Date.now()/600)*0.5; if(enemy.y>100) enemy.y-=1;
                 if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.02; if(enemy.aiTimer>1.5) { const r=Math.random(); enemy.bossState=r<0.33?1:(r<0.66?2:5); enemy.aiTimer=0; } }
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { audio.playBossAttack('summon'); for(let i=0;i<3;i++) s.enemies.push({id:Math.random().toString(),x:enemy.x+enemy.w/2+(i*30-30),y:enemy.y+enemy.h,w:20,h:20,vx:(Math.random()-0.5)*12,vy:-8,hp:15,maxHp:15,type:'enemy',subType:'bacteria',color:COLORS.enemyBacteria,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0}); enemy.bossState=0; enemy.aiTimer=0; }
                 else if(enemy.bossState===2 && enemy.aiTimer>0.5) { audio.playBossAttack('laser'); s.projectiles.push({id:Math.random().toString(),x:enemy.x+enemy.w/2,y:enemy.y+enemy.h,w:30,h:400,vx:(p.x-enemy.x)*0.03,vy:15,hp:1,maxHp:1,type:'projectile',projectileType:'laser',damage:30,owner:'enemy',lifeTime:1,hitIds:[],color:'#ef4444',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; }
                 else if(enemy.bossState===5 && enemy.aiTimer>0.5) { audio.playBossAttack('summon'); s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y,w:24,h:24,vx:0,vy:5,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:25,owner:'enemy',lifeTime:5,hitIds:[],color:'#a855f7',facing:1,isGrounded:false,frameTimer:0,state:0}); enemy.bossState=0; enemy.aiTimer=0; }
             } else if (enemy.bossVariant==='deity') {
                 if(enemy.phase===1) { enemy.vx=(CANVAS_WIDTH/2+s.camera.x-enemy.x-enemy.w/2)*0.05; enemy.vy=Math.sin(Date.now()/400); if(enemy.attackTimer>0.2) { audio.playBossAttack('shoot'); const ang=Date.now()/200; for(let i=0;i<3;i++) spawnProjectile(s.projectiles, enemy.x+enemy.w/2,enemy.y+enemy.h/2, Math.cos(ang+i*2), Math.sin(ang+i*2), 'enemy', 'normal'); enemy.attackTimer=0; } }
                 else { if(enemy.bossState===0) { enemy.vx=(p.x-enemy.x)*0.05; enemy.vy=(p.y-enemy.y)*0.05; if(enemy.aiTimer>2) { enemy.bossState=1; enemy.aiTimer=0; } } else if(enemy.bossState===1) { enemy.vy=15; enemy.vx=0; } }
             } else { // King
                 if(enemy.bossState===0) { enemy.vy=Math.sin(Date.now()/500)*0.5; enemy.vx=(p.x-enemy.x)*0.01; if(enemy.aiTimer>2) { enemy.aiTimer=0; const r=Math.random(); enemy.bossState=r<0.3?4:(r<0.6?2:1); } }
                 else if(enemy.bossState===4 && enemy.attackTimer>0.5) { audio.playBossAttack('shoot'); for(let i=-2;i<=2;i++) s.projectiles.push({id:Math.random().toString(),x:enemy.x,y:enemy.y,w:12,h:12,vx:-8,vy:i*3,hp:1,maxHp:1,type:'projectile',projectileType:'bullet',damage:15,owner:'enemy',lifeTime:4,hitIds:[],color:COLORS.enemyCandy,facing:-1,isGrounded:false,frameTimer:0,state:0}); enemy.attackTimer=0; enemy.bossState=0; enemy.aiTimer=0; }
                 else if(enemy.bossState===2) { enemy.vy=-5; if(enemy.y<50) { enemy.bossState=3; enemy.vx=(p.x-enemy.x)*0.1; } }
                 else if(enemy.bossState===3) enemy.vy+=1;
                 else if(enemy.bossState===1 && enemy.aiTimer>1) { audio.playBossAttack('summon'); s.enemies.push({id:Math.random().toString(),x:enemy.x,y:enemy.y+20,w:20,h:20,vx:-5,vy:-5,hp:10,maxHp:10,type:'enemy',subType:'sugar_rusher',color:COLORS.enemyRusher,facing:-1,isGrounded:false,aiTimer:0,attackTimer:0,frameTimer:0,state:0,bossState:0}); enemy.bossState=0; enemy.aiTimer=0; }
             }
             break;
     }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    drawBackground(ctx, entities.current.camera.x);
    ctx.save();
    ctx.translate(-entities.current.camera.x, -entities.current.camera.y);

    drawPlatforms(ctx, entities.current.platforms);

    entities.current.powerups.forEach(pu => {
        ctx.fillStyle = pu.color; ctx.beginPath();
        const yOff = Math.sin(Date.now() / 200) * 3;
        ctx.arc(pu.x + pu.w/2, pu.y + pu.h/2 + yOff, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif';
        const icon = pu.subType === 'spread' ? 'S' : pu.subType === 'laser' ? 'L' : pu.subType === 'mouthwash' ? 'W' : pu.subType === 'floss' ? 'F' : pu.subType === 'toothbrush' ? 'T' : '+';
        ctx.fillText(icon, pu.x + 6, pu.y + 14 + yOff);
    });

    drawEnemies(ctx, entities.current.enemies);

    // Player
    const p = entities.current.player;
    if (p.invincibleTimer <= 0 || Math.floor(Date.now() / 50) % 2 === 0) {
        ctx.fillStyle = p.color;
        if (p.dashTimer > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#a5f3fc'; }
        if (p.slowTimer > 0) ctx.fillStyle = '#f9a8d4';

        ctx.beginPath();
        ctx.moveTo(p.x, p.y + 10);
        ctx.quadraticCurveTo(p.x + p.w/4, p.y, p.x + p.w/2, p.y + 5);
        ctx.quadraticCurveTo(p.x + 3*p.w/4, p.y, p.x + p.w, p.y + 10);
        ctx.lineTo(p.x + p.w, p.y + p.h - 10);
        ctx.lineTo(p.x + p.w - 5, p.y + p.h); ctx.lineTo(p.x + p.w/2 + 5, p.y + p.h - 10); ctx.lineTo(p.x + p.w/2 - 5, p.y + p.h - 10); ctx.lineTo(p.x + 5, p.y + p.h); ctx.lineTo(p.x, p.y + p.h - 10);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1.0;
        
        ctx.fillStyle = '#000'; ctx.fillRect(p.facing === 1 ? p.x + 18 : p.x + 6, p.y + 12, 4, 4); ctx.fillRect(p.facing === 1 ? p.x + 26 : p.x + 14, p.y + 12, 4, 4);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(p.x, p.y + 8, p.w, 4); if (p.facing === 1) ctx.fillRect(p.x - 8, p.y + 8, 8, 4); else ctx.fillRect(p.x + p.w, p.y + 8, 8, 4);

        drawHeldWeapon(ctx, p, {usingMouse: inputs.current.usingMouse, aimUp: inputs.current.aimUp, mouseX: inputs.current.mouseX, mouseY: inputs.current.mouseY, cameraX: entities.current.camera.x, cameraY: entities.current.camera.y});
    }

    drawProjectiles(ctx, entities.current.projectiles, p);

    entities.current.particles.forEach(part => {
        ctx.globalAlpha = part.alpha; ctx.fillStyle = part.color; ctx.fillRect(part.x, part.y, part.w, part.h); ctx.globalAlpha = 1.0;
    });

    ctx.restore();
    drawTransition(ctx, entities.current.transition.progress, entities.current.level.stage);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full max-w-[800px] max-h-[450px] bg-black shadow-2xl border-4 border-slate-700 cursor-crosshair"
      />
      <GameHUD 
        player={entities.current.player}
        score={score} stage={stage} hp={hp}
        bossHp={bossHp} bossMaxHp={bossMaxHp} bossName={bossName}
        isMobile={isMobile} handleTouch={handleTouch}
      />
    </div>
  );
};

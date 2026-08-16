
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Platform, Projectile, WeaponType, InputMethod, Perk, LoadoutType, Language, Difficulty, CharacterType } from '../types';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY,
    PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN,
    SHIELD_REGEN_DELAY, SHIELD_REGEN_RATE,
    KNOCKBACK_X, KNOCKBACK_Y,
    FIXED_STEP,
    HIT_INVULNERABILITY, RESPAWN_INVULNERABILITY, HIT_FLASH,
    STAGE_CLEAR_DELAY, LEVEL_UP_HEAL, HEALTH_PICKUP,
    SCORE_PER_KILL, SCORE_PER_BOSS, SCORE_WEAPON_LEVEL_UP, SCORE_WEAPON_MAXED,
} from '../game/data/physics';
import { COLORS } from '../game/data/palette';
import { generateGameOverMessage } from '../services/geminiService';
import { checkRectCollide } from '../game/physics';

// Modules
import { AudioManager } from '../game/audio';
import { generateLevel } from '../game/level';
import { createWorld, hudChanged, syncHud, snapshotHud, type World, type HudSnapshot } from '../game/world';
import { planSteps } from '../game/loop';
import { fallIntoPit, type RunConfig } from '../game/player';
import { renderScene } from '../game/render/scene';
import { setupPixelContext } from '../game/render/pixel';
import { spawnBoss, spawnEnemy, updateEnemyAI, spawnHiddenBoss, cullEnemies } from '../game/enemies';
import { spawnProjectile, spawnPowerUp, cullPowerUps } from '../game/weapons';
import { getRandomPerks, applyPerk } from '../game/perks';
import { getDifficulty } from '../game/data/difficulty';
import { contactDamageFor, waveInterval, HIDDEN_BOSS, ENEMY_CULL_MARGIN } from '../game/data/enemies';
import { getFireCooldown, HOMING_DAMAGE_THRESHOLD, MAX_LEVEL } from '../game/data/weapons';
import { createTriggerState, advanceTriggers, isBossSpeedkill } from '../game/triggers';
import { claimScoreMilestone, claimKillMilestone } from '../game/progression';
import { TEXT } from '../i18n';
import { GameHUD } from './GameHUD';

/**
 * Proyectiles que atraviesan: siguen vivos tras impactar y anotan a quién ya han
 * golpeado en `hitIds`. Está aquí arriba y como Set porque el bucle de colisiones
 * lo consulta una vez por cada par proyectil-enemigo de cada frame.
 */
const PIERCING_TYPES = new Set<Projectile['projectileType']>(['laser', 'floss', 'sword', 'wave']);

interface GameCanvasProps {
  onGameOver: (score: number, message: string) => void;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  sessionId: number;
  inputMethod: InputMethod;
  loadout: LoadoutType;
  difficulty: Difficulty;
  character: CharacterType;
  onPerkSelectStart: (perks: Perk[]) => void;
  selectedPerkId: string | null;
  onPerkApplied: () => void;
  onVictory: () => void;
  lang: Language;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ onGameOver, gameState, setGameState, sessionId, inputMethod, loadout, difficulty, character, onPerkSelectStart, selectedPerkId, onPerkApplied, onVictory, lang }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Audio Manager (Singleton-ish per component mount)
  const audioManager = useRef(new AudioManager());

  const runConfig: RunConfig = { loadout, difficulty, character };

  // Mutable Game State
  //
  // Se crea a la primera y solo a la primera. `useRef(createWorld(...))` evalúa
  // el argumento en **cada** render y tira el resultado, así que generaba un
  // mundo entero —con su nivel de hasta 16.000 px de plataformas— por render,
  // que ahora son muchos: el HUD se publica en cuanto cambia algo.
  // El molde `null as unknown as World` es el patrón de inicialización perezosa
  // de refs: se rellena en el primer render, antes de que nadie pueda leerlo.
  const entities = useRef<World>(null as unknown as World);
  if (entities.current === null) entities.current = createWorld(runConfig);

  // El HUD arranca con la instantánea de ese mismo mundo, sin construir otro.
  const [hud, setHud] = useState<HudSnapshot>(() => snapshotHud(entities.current));
  const [isMobile, setIsMobile] = useState(false);

  const inputs = useRef({
    left: false, right: false, aimUp: false, down: false, shoot: false, dash: false,
    jumpPressed: false, shootPressed: false, dashPressed: false,
    mouseX: 0, mouseY: 0,
    /**
     * Si el ratón ya se ha movido dentro de la partida. Hasta entonces
     * `mouseX/mouseY` son 0,0 y apuntar al ratón significaba disparar hacia la
     * esquina superior izquierda del nivel: el primer disparo salía hacia atrás.
     */
    mouseSeen: false,
  });



  // --- Initialization & Loop ---

  useEffect(() => {
    // `ontouchstart`/`maxTouchPoints` dan true en cualquier portátil con
    // pantalla táctil, que entonces perdía el apuntado con ratón y se comía el
    // mando en pantalla. Lo que interesa es si el puntero *principal* es basto.
    const coarse = window.matchMedia('(pointer: coarse)');
    setIsMobile(coarse.matches);

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    coarse.addEventListener('change', onChange);
    return () => coarse.removeEventListener('change', onChange);
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

  // Handle Perk Application
  useEffect(() => {
      if (selectedPerkId) {
          applyPerk(entities.current.player, selectedPerkId);
          // El HUD se refresca solo: el bucle llama a syncHud cada frame, y sigue
          // corriendo mientras se elige perk.

          // Anti-tecla-pegada: el menú se ha comido los keyup, así que se
          // fuerzan todas las entradas a soltado. Hay que volver a pulsar.
          inputs.current.left = false;
          inputs.current.right = false;
          inputs.current.aimUp = false;
          inputs.current.down = false;
          inputs.current.shoot = false;
          inputs.current.dash = false;
          inputs.current.jumpPressed = false;
          inputs.current.shootPressed = false;
          inputs.current.dashPressed = false;

          onPerkApplied();
      }
  }, [selectedPerkId]);

  useEffect(() => {
    // Global listener for key up to prevent stuck keys when menu closes
    const handleGlobalKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'KeyA': case 'ArrowLeft': inputs.current.left = false; break;
            case 'KeyD': case 'ArrowRight': inputs.current.right = false; break;
            case 'KeyW': case 'ArrowUp': inputs.current.aimUp = false; break;
            case 'KeyS': case 'ArrowDown': inputs.current.down = false; break;
            case 'KeyF': case 'KeyK': inputs.current.shoot = false; break;
            case 'ShiftLeft': case 'ShiftRight': case 'KeyL': inputs.current.dash = false; break;
        }
    };
    const handleGlobalMouseUp = (e: MouseEvent) => {
        if (e.button === 0) inputs.current.shoot = false;
        if (e.button === 2) inputs.current.dash = false;
    };
    
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
        window.removeEventListener('keyup', handleGlobalKeyUp);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, []);

  useEffect(() => {
    if (gameState !== GameState.PLAYING && gameState !== GameState.PERK_SELECTION) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Sin interpolación al estampar sprites horneados: el CSS `image-rendering`
    // solo afecta al escalado final del elemento, no a `drawImage`.
    setupPixelContext(ctx);

    let animationFrameId: number;
    let lastTime = performance.now();

    // Saldo de tiempo real pendiente de simular. La simulación avanza en pasos
    // de FIXED_STEP, así que las magnitudes por paso (velocidad, gravedad,
    // cadencia) y las por segundo (dash, escudo, oleadas) mantienen su relación
    // a cualquier frecuencia de refresco. Antes, a 144 Hz el jugador se movía y
    // disparaba 2,4 veces más rápido mientras los jefes atacaban al mismo ritmo.
    let accumulator = 0;

    // Última instantánea publicada a React, para no re-renderizar sin cambios.
    // Es una copia: guardar la referencia a `world.hud` hacía que la comparación
    // fuese del objeto contra sí mismo y el HUD no se refrescaba nunca.
    let published = snapshotHud(entities.current);

    const loop = (time: number) => {
      const elapsed = (time - lastTime) / 1000;
      lastTime = time;

      if (gameState === GameState.PLAYING) {
          // planSteps limita cuánto tiempo real entra en un frame, así que un
          // parón no se recupera de golpe: el juego no se acelera a tirones.
          const plan = planSteps(accumulator, elapsed);
          accumulator = plan.carry;

          for (let i = 0; i < plan.steps; i++) {
              update(FIXED_STEP);

              // Un suceso congela el juego (elegir perk, victoria): no seguir
              // simulando pasos que la UI aún no ha visto.
              if (entities.current.events.length > 0) break;
          }
      }

      draw(ctx);

      // Puente motor -> UI: se drena una vez por frame, nunca desde dentro
      // de la simulación.
      const world = entities.current;
      for (const event of world.events) {
          if (event.type === 'perk-offer') onPerkSelectStart(event.perks);
          else if (event.type === 'victory') onVictory();
      }
      world.events.length = 0;

      syncHud(world);
      if (hudChanged(world.hud, published)) {
          published = snapshotHud(world);
          setHud(published);
      }

      if (gameState === GameState.PLAYING && entities.current.player.hp <= 0 && entities.current.player.lives <= 0) {
           handleGameOver();
      } else {
           animationFrameId = requestAnimationFrame(loop);
      }
    };
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState]);

  const resetGame = () => {
    entities.current = createWorld(runConfig);
    const s = entities.current;

    inputs.current = {
        left: false, right: false, aimUp: false, down: false, shoot: false, dash: false,
        jumpPressed: false, shootPressed: false, dashPressed: false,
        mouseX: 0, mouseY: 0, mouseSeen: false
    };

    setHud(snapshotHud(s));
  };

  const performLevelReset = () => {
      const s = entities.current;
      
      if (s.level.stage >= 5) {
          s.events.push({ type: 'victory' });
          return;
      }

      s.levelTransitioning = false; s.level.stage++; s.level.bossSpawned = false;
      s.level.bossDefeated = false; s.stageClearTimer = 0;
      s.level.distanceTraveled = 0; s.level.levelWidth += 2000;
      s.player.x = 100; s.player.y = 200;
      // Small heal on level up
      s.player.hp = Math.min(s.player.hp + LEVEL_UP_HEAL, s.player.maxHp);

      s.enemies = []; s.projectiles = []; s.powerups = [];
      s.platforms = generateLevel(s.level.levelWidth);
      s.camera.x = 0; s.hud.bossHp = 0;
      s.player.invincibleTimer = RESPAWN_INVULNERABILITY;

      // Los relojes del jefe oculto se cuentan por nivel.
      s.triggers = createTriggerState(s.player.x);
  };

  const handleGameOver = async () => {
    audioManager.current.playGameOver();
    const player = entities.current.player;

    // La puntuación se publica ya, con un texto de espera. Antes se cambiaba de
    // pantalla al instante pero la puntuación y el diagnóstico solo llegaban al
    // resolverse la llamada a Gemini, así que hasta entonces se veía la
    // puntuación de la partida anterior (o 0 en la primera).
    onGameOver(player.score, TEXT[lang].gameover.analyzing);

    const msg = await generateGameOverMessage(player.score, "Tooth Decay", lang);
    onGameOver(player.score, msg);
  };

  const triggerPerkSelection = () => {
      // Se pasa el jugador para no ofrecer mejoras que no harían nada.
      entities.current.events.push({ type: 'perk-offer', perks: getRandomPerks(3, lang, entities.current.player) });
  };

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioManager.current.init();
      // Escape solo alterna entre jugando y pausa. Antes cualquier estado que
      // no fuera PLAYING pasaba a PLAYING, así que pulsarlo en el menú
      // arrancaba la partida sin pasar por START: sin incrementar `sessionId`,
      // `resetGame` no corría y se jugaba con la configuración con la que se
      // montó el componente, ignorando clase, dificultad y armamento elegidos.
      if (e.code === 'Escape') {
          if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
          else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
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
        if (inputMethod === 'keyboard' && !isMobile) return; 

        if (e.button === 0) { if (!inputs.current.shoot) inputs.current.shootPressed = true; inputs.current.shoot = true; } 
        else if (e.button === 2) { if (!inputs.current.dash) inputs.current.dashPressed = true; inputs.current.dash = true; }
    };

    const handleMouseUp = (e: MouseEvent) => {
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
            inputs.current.mouseSeen = true;
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

  const update = (dt: number) => {
    const s = entities.current;
    if (s.platforms.length === 0) s.platforms = generateLevel(s.level.levelWidth);
    
    const p = s.player;
    const config = getDifficulty(difficulty);

    // --- Jefe oculto ---
    // Los relojes se llevan en el mundo y se cuentan con dt, no con Date.now():
    // pausar o cambiar de pestaña ya no acerca la invocación.
    if (advanceTriggers(s.triggers, dt, p.x, {
        bossSpawned: s.level.bossSpawned,
        transitioning: s.levelTransitioning,
    })) {
        spawnHiddenBoss(s, audioManager.current, lang);
        s.triggers.fired = true;
    }

    if (p.shieldRegenTimer > 0) p.shieldRegenTimer -= dt;
    else if (p.shield < p.maxShield) {
        p.shield = Math.min(p.maxShield, p.shield + (SHIELD_REGEN_RATE * dt));
    }

    if (claimScoreMilestone(p.runStats, p.score, config.milestoneMult)) {
        triggerPerkSelection();
        return;
    }
    if (claimKillMilestone(p.runStats, config.milestoneMult)) {
        triggerPerkSelection();
        return;
    }

    // Cuenta atrás para cerrar las mandíbulas tras limpiar el stage. Vive en el
    // mundo, así que reiniciar la partida la cancela sola.
    if (s.stageClearTimer > 0) {
        s.stageClearTimer -= dt;
        if (s.stageClearTimer <= 0) {
            s.stageClearTimer = 0;
            if (s.transition.phase === 'none') s.transition.phase = 'closing';
        }
    }

    if (s.transition.phase === 'closing') {
        if (s.transition.progress === 0) audioManager.current.playChew();
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

    if (p.slowTimer > 0) p.slowTimer -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    
    if (p.dashCooldown <= 0 && p.consecutiveDashes < p.stats.maxDashes && p.isGrounded) {
         p.consecutiveDashes = p.stats.maxDashes; 
    }

    const currentDashCooldown = PLAYER_DASH_COOLDOWN * p.stats.dashCooldownMultiplier;
    
    if (inputs.current.dashPressed) {
        if (p.dashTimer <= 0 && p.consecutiveDashes > 0) {
            p.consecutiveDashes--;
            p.dashTimer = PLAYER_DASH_DURATION;
            if (p.consecutiveDashes <= 0) {
                 p.dashCooldown = currentDashCooldown;
            } else {
                 p.dashCooldown = 0.2; 
            }
            p.invincibleTimer = PLAYER_DASH_DURATION;
            p.vx = p.facing * PLAYER_DASH_SPEED; p.vy = 0;
            spawnParticle(p.x, p.y + p.h/2, '#fff', 10);
            inputs.current.dashPressed = false;
        }
    }

    if (p.dashTimer > 0) {
        p.dashTimer -= dt; p.vx = p.facing * PLAYER_DASH_SPEED; p.vy = 0;
        if (Math.random() > 0.5) spawnParticle(p.x, p.y, p.color, 1);
    } else {
        const speed = (p.slowTimer > 0 ? PLAYER_SPEED * 0.5 : PLAYER_SPEED) * p.stats.speedMultiplier;
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
    
    if (p.isGrounded) {
        p.jumpCount = 0;
        if (p.dashCooldown <= 0) p.consecutiveDashes = p.stats.maxDashes;
    }
    
    if (p.x < 0) p.x = 0;
    if (s.level.bossSpawned) {
        const arenaLeft = s.level.levelWidth - 800;
        if (p.x < arenaLeft) p.x = arenaLeft;
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    } else {
        if (p.x > s.level.levelWidth - p.w) p.x = s.level.levelWidth - p.w;
    }
    
    // Caerse por un hueco: reposiciona en suelo firme y cobra el golpe. Antes
    // solo ponía hp a 0, lo que con una vida extra dejaba al jugador cayendo
    // para siempre: ni muerte, ni reaparición, ni game over.
    if (p.y > CANVAS_HEIGHT + 100) {
        const survived = fallIntoPit(p, s.platforms);
        // Golpe seco, no el sonido de game over: caerse casi nunca es mortal.
        audioManager.current.playBossAttack('slam');
        s.shake = 12;
        spawnParticle(p.x + p.w / 2, p.y + p.h, '#f472b6', 12);
        if (survived && s.level.bossSpawned) {
            // La arena del jefe tiene sus propios límites: que reaparezca dentro.
            const arenaLeft = s.level.levelWidth - 800;
            if (p.x < arenaLeft) p.x = arenaLeft;
        }
    }

    // Disparo mantenido: la cadencia la manda el arma (`getFireCooldown`), no la
    // velocidad a la que se pueda pulsar la tecla. Antes solo el láser y el
    // cepillo disparaban seguido —y no paraban nunca, porque `shootPressed` no
    // se limpiaba al soltar—, mientras el resto exigía una pulsación por bala.
    const wantsToShoot = inputs.current.shoot || inputs.current.shootPressed;

    if (wantsToShoot && p.frameTimer <= 0) {
        let dx: number, dy: number;

        // Hasta que el ratón se mueva no hay a dónde apuntar: se dispara al frente.
        if (inputMethod === 'mouse' && !isMobile && inputs.current.mouseSeen) {
            const mWX = inputs.current.mouseX + s.camera.x; 
            const mWY = inputs.current.mouseY + s.camera.y;
            const pCX = p.x + p.w/2; 
            const pCY = p.y + p.h/2;
            dx = mWX - pCX; 
            dy = mWY - pCY;
            const len = Math.sqrt(dx*dx + dy*dy);
            if (len > 0) { dx /= len; dy /= len; } else { dx = p.facing; dy = 0; }
            p.facing = mWX < pCX ? -1 : 1; 
        } else {
            if (inputs.current.aimUp) { 
                dy = -1; 
                dx = inputs.current.left ? -1 : (inputs.current.right ? 1 : 0); 
                if (dx !== 0) { const len = Math.sqrt(dx*dx + dy*dy); dx /= len; dy /= len; }
            } else { 
                dx = p.facing; 
                dy = 0; 
            }
        }

        let sX = p.x + p.w/2;
        const sY = dy < -0.5 ? p.y - 10 : p.y + 10;
        if (Math.abs(dx) > 0.5) sX = p.x + p.w/2 + (Math.sign(dx) * 20);

        audioManager.current.playWeaponSound(p.weapon);
        // El multiplicador de daño lo aplica spawnProjectile al crear cada
        // proyectil. No se toca el array después de disparar.
        spawnProjectile(s.projectiles, sX, sY, dx, dy, 'player', p.weapon, p);

        p.frameTimer = getFireCooldown(p.weapon, p.weaponLevel);
        inputs.current.shootPressed = false;
    }
    if (p.frameTimer > 0) p.frameTimer--;
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;

    // Relojes de presentación: de aquí salen la pose y el destello de impacto.
    p.animTimer += dt;
    if (p.hitTimer > 0) p.hitTimer -= dt;

    if (!s.level.bossSpawned) {
        let targetX = p.x - CANVAS_WIDTH * 0.3;
        targetX = Math.max(0, Math.min(targetX, s.level.levelWidth - CANVAS_WIDTH));
        s.camera.x += (targetX - s.camera.x) * 0.1;
    } else {
        const targetX = s.level.levelWidth - CANVAS_WIDTH;
        s.camera.x += (targetX - s.camera.x) * 0.05;
    }
    if (s.shake > 0) {
        s.camera.x += (Math.random() - 0.5) * s.shake; s.camera.y += (Math.random() - 0.5) * s.shake;
        s.shake *= 0.9; if (s.shake < 0.5) s.shake = 0;
    } else s.camera.y = 0;

    // El jefe del stage aparece una sola vez: `bossDefeated` impide que se
    // vuelva a generar si el jugador sigue en la arena tras matarlo.
    if (!s.level.bossSpawned && !s.level.bossDefeated && !s.levelTransitioning && p.x > s.level.levelWidth - 600) {
        s.level.bossSpawned = true;
        s.triggers.bossSpawnTime = s.triggers.levelTime;
        spawnBoss(s, audioManager.current, lang);
    }
    if (s.level.bossSpawned && !s.levelTransitioning) {
        if (!s.enemies.some(e => e.subType === 'boss')) s.level.bossSpawned = false;
    }
    s.waveTimer += dt;
    if (!s.level.bossSpawned && !s.levelTransitioning && s.waveTimer > waveInterval(p.score, s.level.stage)) {
        spawnEnemy(s.level, s.camera.x, s.enemies);
        s.waveTimer = 0;
    }

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
            
            // Curve logic for high damage bullets (Hidden Boss uses this)
            if (proj.projectileType === 'bullet' && proj.owner === 'enemy' && proj.damage > HOMING_DAMAGE_THRESHOLD) {
                 const dx = p.x - proj.x; const dy = p.y - proj.y; const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist > 0 && dist < 400) { proj.vx += (dx/dist)*0.2; proj.vy += (dy/dist)*0.2; }
            }
        }
        proj.lifeTime -= dt;
        // Ondulación de las ondas. Se calcula con la vida del propio proyectil y
        // no con el reloj del sistema: es simulación, y así dos partidas iguales
        // se comportan igual (misma frecuencia que antes, 20 rad/s).
        if (proj.projectileType === 'wave') proj.y += Math.sin(proj.lifeTime * 20) * 5;
    });
    s.projectiles = s.projectiles.filter(p => p.lifeTime > 0);

    s.enemies.forEach(enemy => {
        enemy.aiTimer += dt; enemy.attackTimer += dt; enemy.frameTimer += dt;
        enemy.animTimer += dt;
        if (enemy.hitTimer > 0) enemy.hitTimer -= dt;
        if (enemy.actionTimer > 0) enemy.actionTimer -= dt;
        const dist = Math.abs(p.x - enemy.x);
        if (dist < CANVAS_WIDTH + 100 || enemy.subType === 'boss') {
            updateEnemyAI(enemy, p, s, audioManager.current);
            
            enemy.x += enemy.vx;
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'acid_spitter' && enemy.subType !== 'boss') checkPlatformCollisions(enemy, s.platforms, true);
            
            if (enemy.subType === 'boss') {
                 if (enemy.bossVariant !== 'wisdom_warden') {
                    const arenaLeft = s.level.levelWidth - 800;
                    if (enemy.x < arenaLeft) enemy.x = arenaLeft;
                    if (enemy.x > s.level.levelWidth - enemy.w) enemy.x = s.level.levelWidth - enemy.w;
                 }
                 
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
                const pierces = PIERCING_TYPES.has(proj.projectileType);
                if (pierces && proj.hitIds.includes(enemy.id)) return;

                if (checkRectCollide(proj, enemy)) {
                    enemy.hp -= proj.damage;
                    enemy.hitTimer = HIT_FLASH;
                    if (pierces) proj.hitIds.push(enemy.id);
                    else proj.lifeTime = 0;
                    spawnParticle(proj.x, proj.y, '#fff', 3);
                    if (enemy.hp <= 0 && !enemy.dead) {
                        enemy.dead = true;
                        const isHiddenBoss = enemy.bossVariant === HIDDEN_BOSS.variant;
                        p.score += (enemy.subType === 'boss' ? SCORE_PER_BOSS : SCORE_PER_KILL);

                        s.triggers.kills++;
                        p.runStats.killCount++;
                        s.shake = 5;

                        // El jefe oculto siempre suelta objeto.
                        const dropRate = isHiddenBoss ? 1.0 : config.dropRate;

                        const limitType = loadout === 'all' ? undefined : loadout;
                        spawnPowerUp(s.powerups, enemy.x, enemy.y, dropRate, limitType);

                        for(let i=0; i<8; i++) spawnParticle(enemy.x+enemy.w/2, enemy.y+enemy.h/2, enemy.color, 10);

                        if (enemy.subType === 'boss') {
                            // Que la barra desaparezca con él: se quedaba pegada
                            // al 1% hasta el cambio de stage.
                            s.hud.bossHp = 0;

                            if (isHiddenBoss) {
                                // Premia con una mejora, pero no limpia el stage:
                                // puede aparecer a 300 px del inicio del nivel, y
                                // avanzar de stage con él se saltaba el nivel
                                // entero y a su jefe.
                                triggerPerkSelection();
                            } else {
                                s.level.bossDefeated = true;

                                // Matarlo muy rápido invoca al guardián. El cierre
                                // del stage espera a que no quede ningún jefe vivo.
                                if (!s.triggers.fired && isBossSpeedkill(s.triggers)) {
                                    spawnHiddenBoss(s, audioManager.current, lang);
                                    s.triggers.fired = true;
                                }
                            }
                        }
                    }
                }
            });
        }
    });
    s.enemies = s.enemies.filter(e => !e.dead);
    // Los que quedan muy atrás dejan de existir: si no, el array crece durante
    // toda la partida y encarece este mismo bucle.
    s.enemies = cullEnemies(s.enemies, s.camera.x);

    // Stage limpio: el jefe ha caído y no queda ningún jefe vivo (el oculto puede
    // haber aparecido al matarlo rápido). La cuenta atrás vive en el mundo.
    if (s.level.bossDefeated && !s.levelTransitioning && !s.enemies.some(e => e.subType === 'boss')) {
        triggerPerkSelection();
        s.levelTransitioning = true;
        s.stageClearTimer = STAGE_CLEAR_DELAY;
    }

    let playerHit = false;
    let hitDamage = 0;
    // Desde dónde llega el golpe, para empujar al jugador en sentido contrario.
    let hitFromX = p.x + p.w / 2;

    s.enemies.forEach(enemy => {
        if (checkRectCollide(p, enemy)) {
            const dmg = contactDamageFor(enemy);
            if (dmg >= hitDamage) { hitDamage = dmg; hitFromX = enemy.x + enemy.w / 2; }
            playerHit = true;
        }
    });
    s.projectiles.forEach(proj => {
        if (proj.owner === 'enemy' && checkRectCollide(p, proj)) {
            if (proj.projectileType === 'sludge') p.slowTimer = 0.5;
            else {
                playerHit = true;
                if (proj.damage >= hitDamage) { hitDamage = proj.damage; hitFromX = proj.x + proj.w / 2; }
                proj.lifeTime = 0;
            }
        }
    });

    if (playerHit && p.invincibleTimer <= 0) {
        p.hitTimer = HIT_FLASH;
        hitDamage = hitDamage * p.stats.damageTakenMultiplier;
        hitDamage = Math.max(1, hitDamage * (1 - p.stats.damageReduction));

        if (p.shield > 0) {
             p.shield -= hitDamage;
             if (p.shield < 0) {
                 const overflow = Math.abs(p.shield);
                 p.hp -= overflow;
                 p.shield = 0;
             }
             p.shieldRegenTimer = SHIELD_REGEN_DELAY;
        } else {
             p.hp -= hitDamage; 
        }
        
        if (p.hp <= 0 && p.lives > 0) {
             p.lives--;
             p.hp = p.maxHp;
             p.invincibleTimer = RESPAWN_INVULNERABILITY;
             spawnParticle(p.x, p.y, '#ffd700', 30);
             s.shake = 20;
             audioManager.current.playPowerUp();
        } else {
             p.invincibleTimer = HIT_INVULNERABILITY;
             // Empuje en sentido contrario a de dónde viene el golpe. Antes usaba
             // `p.facing`, así que un golpe por la espalda te empujaba hacia él.
             const away = (p.x + p.w / 2) < hitFromX ? -1 : 1;
             p.vy = KNOCKBACK_Y;
             p.vx = KNOCKBACK_X * away;
             s.shake = 10;
        }
    }

    s.powerups.forEach(pu => {
        if (checkRectCollide(p, pu)) {
            if (pu.subType === 'health') { p.hp = Math.min(p.hp + HEALTH_PICKUP, p.maxHp); }
            else {
                const newWeapon = pu.subType as WeaponType;
                if (!p.weaponLevels) p.weaponLevels = { normal: 1, spread: 1, laser: 1, mouthwash: 1, floss: 1, toothbrush: 1 };
                if (p.weapon === newWeapon) {
                    if (p.weaponLevels[newWeapon] < MAX_LEVEL) {
                        p.weaponLevels[newWeapon]++;
                        p.weaponLevel = p.weaponLevels[newWeapon];
                        spawnParticle(p.x, p.y, '#fbbf24', 10);
                        p.score += SCORE_WEAPON_LEVEL_UP;
                    } else {
                        p.score += SCORE_WEAPON_MAXED;
                    }
                } else {
                    p.weapon = newWeapon;
                    p.weaponLevel = p.weaponLevels[newWeapon];
                }
            }
            pu.dead = true;
        }
    });
    s.powerups = cullPowerUps(s.powerups.filter(pu => !pu.dead), s.camera.x, ENEMY_CULL_MARGIN);

    s.particles.forEach(part => { part.x += part.vx; part.y += part.vy; part.lifeTime -= dt; part.alpha = part.lifeTime; });
    s.particles = s.particles.filter(p => p.lifeTime > 0);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const s = entities.current;
    renderScene(ctx, s, {
        usingMouse: inputMethod === 'mouse' && !isMobile && inputs.current.mouseSeen,
        aimUp: inputs.current.aimUp,
        mouseX: inputs.current.mouseX,
        mouseY: inputs.current.mouseY,
        cameraX: s.camera.x,
        cameraY: s.camera.y
    });
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
      {/* El lienzo llena su contenedor, que `App` ya dimensiona en un múltiplo
          exacto de 800×450: así cada píxel lógico ocupa un número entero de
          píxeles de pantalla, que es la condición para que el pixel art se vea
          nítido y no hormiguee al desplazarse. */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pointer-events-none block h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* El HUD solo lee la instantánea publicada: nada de `entities.current`
          durante el render, que además era lo que hacía que el escudo, las vidas
          o el arma se quedasen desactualizados. */}
      <GameHUD
        hud={hud}
        isMobile={isMobile}
        handleTouch={handleTouch}
        lang={lang}
      />
    </>
  );
};

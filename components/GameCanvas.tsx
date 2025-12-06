
import React, { useRef, useEffect, useState } from 'react';
import { GameState, Entity, Player, Enemy, Projectile, Platform, Particle, PowerUp, Rect, WeaponType, LevelState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, COLORS, PLAYER_SPEED, PLAYER_JUMP, FRICTION, TERMINAL_VELOCITY, PLAYER_SIZE, PLAYER_DASH_SPEED, PLAYER_DASH_DURATION, PLAYER_DASH_COOLDOWN, PLAYER_MAX_JUMPS, MAX_WEAPON_LEVEL } from '../constants';
import { generateBriefing, generateGameOverMessage } from '../services/geminiService';
import { Rocket, Heart, Zap, Waves, Crosshair, Sword, Wind, ChevronsUp, Snail } from 'lucide-react';

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

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  const startAmbient = (ctx: AudioContext) => {
      if (ambientGainRef.current) return;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(ctx.destination);
      ambientGainRef.current = masterGain;

      const t = ctx.currentTime;

      // Layer 1: Low Rumble (Machinery/Body)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 50;
      const filter1 = ctx.createBiquadFilter();
      filter1.type = 'lowpass';
      filter1.frequency.value = 120;
      const gain1 = ctx.createGain();
      gain1.gain.value = 0.15;
      osc1.connect(filter1).connect(gain1).connect(masterGain);
      osc1.start(t);

      // Layer 2: High Whine (Drill Standby)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 1000; 
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.005; // Very subtle
      osc2.connect(gain2).connect(masterGain);
      osc2.start(t);

      // Modulate the rumble slightly
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain).connect(osc1.frequency);
      lfo.start(t);

      // Layer 3: Suction (Filtered Noise)
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 800;
      noiseFilter.Q.value = 1;
      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.05;
      noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
      noise.start(t);
  };

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      startAmbient(audioCtxRef.current);
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  // Manage Ambient Volume based on State
  useEffect(() => {
      if (!ambientGainRef.current || !audioCtxRef.current) return;
      
      const now = audioCtxRef.current.currentTime;
      const gain = ambientGainRef.current.gain;
      
      if (gameState === GameState.PLAYING) {
          gain.setTargetAtTime(0.15, now, 0.5);
      } else if (gameState === GameState.PAUSED) {
          gain.setTargetAtTime(0.05, now, 0.5);
      } else {
          gain.setTargetAtTime(0, now, 0.5);
      }
  }, [gameState]);

  const playGameOverSound = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    // Power down slide
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 2);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 2);

    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 2);

    // Sad chord arpeggio
    [300, 250, 200, 150].forEach((freq, i) => {
         const o = ctx.createOscillator();
         o.type = 'triangle';
         o.frequency.value = freq;
         const g = ctx.createGain();
         g.gain.setValueAtTime(0, t + i*0.4);
         g.gain.linearRampToValueAtTime(0.2, t + i*0.4 + 0.1);
         g.gain.linearRampToValueAtTime(0, t + i*0.4 + 0.8);
         o.connect(g).connect(ctx.destination);
         o.start(t + i*0.4);
         o.stop(t + i*0.4 + 0.8);
    });
  };

  const playBossIntroSound = (variant: Enemy['bossVariant']) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;

    if (variant === 'phantom') {
        // Ghostly wail
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
        
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 10;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain).connect(osc.frequency);
        lfo.start(t);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
        gain.gain.linearRampToValueAtTime(0, t + 2);

        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 2);

    } else if (variant === 'tank') {
        // Mechanical grind/clank
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.linearRampToValueAtTime(20, t + 1);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1);

        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 1);

    } else if (variant === 'general') {
        // Alarm / Fanfare
        [440, 554, 659].forEach((f, i) => { // Major triad
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.value = f;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t + i*0.1);
            g.gain.linearRampToValueAtTime(0.1, t + i*0.1 + 0.05);
            g.gain.linearRampToValueAtTime(0, t + i*0.1 + 0.3);
            osc.connect(g).connect(ctx.destination);
            osc.start(t + i*0.1);
            osc.stop(t + i*0.1 + 0.3);
        });

    } else if (variant === 'deity') {
        // Doom Drone
        [55, 110, 165].forEach(f => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(100, t);
            filter.frequency.linearRampToValueAtTime(1000, t + 2);

            const g = ctx.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 1);
            g.gain.linearRampToValueAtTime(0, t + 4);

            osc.connect(filter).connect(g).connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 4);
        });

    } else {
        // King - Heavy Thud
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    }
  };

  const playBossAttackSound = (attack: 'shoot' | 'slam' | 'charge' | 'laser' | 'summon' | 'mortar') => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    switch (attack) {
        case 'shoot':
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.1);
            osc.start(t);
            osc.stop(t + 0.1);
            break;
        case 'slam': // Deep Impact
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.4);
            osc.start(t);
            osc.stop(t + 0.4);
            break;
        case 'charge': // Dash Whoosh
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(100, t);
            osc.frequency.linearRampToValueAtTime(300, t + 0.3);
            gain.gain.setValueAtTime(0.1, t);
            gain.gain.linearRampToValueAtTime(0, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
            break;
        case 'laser': // Energy Sweep
             osc.type = 'sawtooth';
             osc.frequency.setValueAtTime(500, t);
             osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
             gain.gain.setValueAtTime(0.1, t);
             gain.gain.linearRampToValueAtTime(0, t + 0.8);
             osc.start(t);
             osc.stop(t + 0.8);
             break;
        case 'summon': // Rising Magic
             osc.type = 'sine';
             osc.frequency.setValueAtTime(300, t);
             osc.frequency.linearRampToValueAtTime(600, t + 0.5);
             gain.gain.setValueAtTime(0.1, t);
             gain.gain.linearRampToValueAtTime(0, t + 0.5);
             osc.start(t);
             osc.stop(t + 0.5);
             break;
        case 'mortar': // Launch Thud
             osc.type = 'square';
             osc.frequency.setValueAtTime(150, t);
             osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
             gain.gain.setValueAtTime(0.2, t);
             gain.gain.linearRampToValueAtTime(0, t + 0.3);
             osc.start(t);
             osc.stop(t + 0.3);
             break;
    }
  };

  const playWeaponSound = (type: WeaponType) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    switch (type) {
      case 'normal': // Pew
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t);
        osc.stop(t + 0.1);
        break;
      case 'spread': // Heavy Shot
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
      case 'laser': // Sci-fi Slide
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
      case 'mouthwash': // Bubble/Wobble
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        // Frequency modulation for bubble effect manually
        osc.frequency.linearRampToValueAtTime(600, t + 0.05);
        osc.frequency.linearRampToValueAtTime(300, t + 0.2);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.2);
        break;
      case 'floss': // Sharp high pitch crack
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;
      case 'toothbrush': // Swoosh (Low Sine sweep)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.15);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t);
        osc.stop(t + 0.15);
        break;
    }
  };

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
    levelTransitioning: boolean;
    transition: {
        phase: 'none' | 'closing' | 'opening';
        progress: number; // 0 to 1
    };
  }>({
    player: createPlayer(),
    enemies: [],
    projectiles: [],
    particles: [],
    powerups: [],
    platforms: [],
    bgProps: [],
    camera: { x: 0, y: 0 },
    level: { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 8000 },
    waveTimer: 0,
    shake: 0,
    levelTransitioning: false,
    transition: { phase: 'none', progress: 0 }
  });

  const inputs = useRef({
    left: false,
    right: false,
    aimUp: false,
    down: false,
    shoot: false,
    dash: false,
    jumpPressed: false,
    shootPressed: false,
    dashPressed: false,
    // Mouse Inputs
    mouseX: 0,
    mouseY: 0,
    usingMouse: false
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
      slowTimer: 0,
      weapon: 'normal',
      weaponLevel: 1,
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
          // Remove focus from buttons to prevent accidental key triggers
          if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
          }
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
    entities.current.level = { stage: 1, distanceTraveled: 0, bossSpawned: false, levelWidth: 8000 };
    
    // Generate initial level immediately
    entities.current.platforms = generateLevel(entities.current.level.levelWidth);
    entities.current.bgProps = generateBgProps(entities.current.level.levelWidth);
    
    entities.current.camera = { x: 0, y: 0 };
    entities.current.waveTimer = 0;
    entities.current.shake = 0;
    entities.current.levelTransitioning = false;
    entities.current.transition = { phase: 'none', progress: 0 };
    
    // Clear inputs to prevent sticky keys/movement on restart
    inputs.current = {
        left: false, right: false, aimUp: false, down: false,
        shoot: false, dash: false,
        jumpPressed: false, shootPressed: false, dashPressed: false,
        mouseX: 0, mouseY: 0, usingMouse: false
    };

    setScore(0);
    setHp(100);
    setStage(1);
    setBossHp(0);
  };

  const startLevelTransition = () => {
      // Don't start multiple times
      if (entities.current.transition.phase !== 'none') return;
      entities.current.transition.phase = 'closing';
  };

  const performLevelReset = () => {
      const s = entities.current;
      s.levelTransitioning = false;
      s.level.stage++;
      s.level.bossSpawned = false;
      s.level.distanceTraveled = 0;
      s.level.levelWidth += 2000; // Longer levels
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
      initAudio(); // Initialize audio on first key press
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

      // If directional keys are used, disable mouse aiming
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
          inputs.current.usingMouse = false;
      }

      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft': inputs.current.left = true; break;
        case 'KeyD':
        case 'ArrowRight': inputs.current.right = true; break;
        case 'KeyW':
        case 'ArrowUp': 
            inputs.current.aimUp = true; 
            break;
        case 'Space':
            if (!inputs.current.jumpPressed) inputs.current.jumpPressed = true;
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
            inputs.current.aimUp = false; 
            break;
        case 'Space':
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

    const handleMouseDown = (e: MouseEvent) => {
        initAudio(); // Initialize audio on click
        if (gameState !== GameState.PLAYING) return;
        
        inputs.current.usingMouse = true;
        
        // Left Click: Shoot
        if (e.button === 0) {
            if (!inputs.current.shoot) inputs.current.shootPressed = true;
            inputs.current.shoot = true;
        } 
        // Right Click: Dash
        else if (e.button === 2) {
            if (!inputs.current.dash) inputs.current.dashPressed = true;
            inputs.current.dash = true;
        }
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
            // Calculate scale in case canvas is resized via CSS
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            
            inputs.current.mouseX = (e.clientX - rect.left) * scaleX;
            inputs.current.mouseY = (e.clientY - rect.top) * scaleY;
            inputs.current.usingMouse = true;
        }
    };

    const handleContextMenu = (e: MouseEvent) => {
        if (gameState === GameState.PLAYING) {
            e.preventDefault();
        }
    };

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


  // --- Game Logic ---

  const handleGameOver = async () => {
    playGameOverSound();
    setGameState(GameState.GAME_OVER);
    const player = entities.current.player;
    const msg = await generateGameOverMessage(player.score, "Tooth Decay");
    onGameOver(player.score, msg);
  };

  const generateLevel = (width: number): Platform[] => {
    const platforms: Platform[] = [];
    
    // SAFE START ZONE: Guaranteed ground for the first 800 pixels
    platforms.push({ x: 0, y: CANVAS_HEIGHT - 40, w: 800, h: 40, type: 'platform', isGround: true });
    
    // Continuous Floor with gaps logic, starting AFTER the safe zone
    let x = 800;
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
    
    // Boss Arena floor at end (ensure overlap)
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
      const baseHp = 1500; // Increased base HP
      let maxHp = baseHp + (stage * 800); // Higher scaling
      let bossVariant: Enemy['bossVariant'] = 'king';
      let w = 120, h = 160;
      let color = COLORS.enemyBoss;
      let name = "The Cavity King";

      if (stage === 1) {
          bossVariant = 'king';
          name = "The Cavity King";
          maxHp = 1500;
          color = '#3f3f46'; // Zinc
      } else if (stage === 2) {
          bossVariant = 'phantom';
          name = "Plaque Phantom";
          maxHp = 2200;
          color = '#22d3ee'; // Cyan (Ghostly)
          w = 100; h = 100; // Smaller
      } else if (stage === 3) {
          bossVariant = 'tank';
          name = "Tartar Tank";
          maxHp = 3500;
          color = '#57534e'; // Stone
          w = 160; h = 140; // Wider
      } else if (stage === 4) {
          bossVariant = 'general';
          name = "General Gingivitis";
          maxHp = 3000;
          color = '#dc2626'; // Red
          w = 100; h = 180; // Tall
      } else {
          bossVariant = 'deity';
          name = "The Decay Deity";
          maxHp = 6000;
          color = '#0f172a'; // Slate-900
          w = 140; h = 140;
      }

      setBossName(name);
      playBossIntroSound(bossVariant);

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
    let w = 32, h = 32, hp = 20 + (entities.current.level.stage * 4), color = COLORS.enemyBacteria;
    
    // Spawn table based on difficulty
    if (rand > 0.95) {
        subType = 'plaque_monster';
        w = 48; h = 36; hp = 80 + (entities.current.level.stage * 10); color = COLORS.enemyPlaque;
    } else if (rand > 0.9) {
        subType = 'gingivitis_grunt';
        w = 40; h = 48; hp = 60 + (entities.current.level.stage * 5); color = COLORS.enemyGrunt;
    } else if (rand > 0.8) {
        subType = 'tartar_turret';
        w = 32; h = 48; hp = 50; color = COLORS.enemyTurret;
    } else if (rand > 0.7) {
        subType = 'acid_spitter';
        w = 36; h = 36; hp = 40; color = COLORS.enemyAcidSpitter;
    } else if (rand > 0.6) {
        subType = 'candy_bomber';
        w = 40; h = 24; hp = 30; color = COLORS.enemyCandy;
    } else if (rand > 0.5) {
        subType = 'sugar_fiend';
        w = 28; h = 28; hp = 25; color = COLORS.enemySugarFiend;
    } else if (rand > 0.4) {
        subType = 'sugar_rusher';
        w = 24; h = 24; hp = 20; color = COLORS.enemyRusher;
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
    
    // FAILSAFE: If platforms are missing (bug prevention), regenerate
    if (s.platforms.length === 0) {
        s.platforms = generateLevel(s.level.levelWidth);
    }
    
    const p = s.player;

    // --- Transition Update ---
    if (s.transition.phase === 'closing') {
        s.transition.progress += dt * 0.8; // Speed of close
        if (s.transition.progress >= 1) {
            s.transition.progress = 1;
            performLevelReset();
            s.transition.phase = 'opening';
        }
        return; // Pause game updates during transition (optional, or keep running background)
    } else if (s.transition.phase === 'opening') {
        s.transition.progress -= dt * 0.8;
        if (s.transition.progress <= 0) {
            s.transition.progress = 0;
            s.transition.phase = 'none';
        }
        // Game updates resume? Or maybe let bg run but not player control?
        // For now, let's return to prevent player moving while mouth opens
        return;
    }

    // --- Player Logic ---

    // Slow Timer
    if (p.slowTimer > 0) p.slowTimer -= dt;

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
        const speed = p.slowTimer > 0 ? PLAYER_SPEED * 0.5 : PLAYER_SPEED;
        if (inputs.current.left) { p.vx -= speed * 0.2; p.facing = -1; }
        if (inputs.current.right) { p.vx += speed * 0.2; p.facing = 1; }
        
        // Friction
        if (!inputs.current.left && !inputs.current.right) p.vx *= FRICTION;
        
        // Clamp Speed
        p.vx = Math.max(Math.min(p.vx, speed), -speed);
        
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
           // Calculate shooting direction
           let dx = 0;
           let dy = 0;
           
           if (inputs.current.usingMouse) {
                // Mouse Aiming
                const mouseWorldX = inputs.current.mouseX + s.camera.x;
                const mouseWorldY = inputs.current.mouseY + s.camera.y;
                const pCenterX = p.x + p.w/2;
                const pCenterY = p.y + p.h/2;
                
                dx = mouseWorldX - pCenterX;
                dy = mouseWorldY - pCenterY;
                
                // Normalize
                const len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0) {
                    dx /= len;
                    dy /= len;
                } else {
                    dx = p.facing; dy = 0;
                }

                // Update facing based on mouse
                if (mouseWorldX < pCenterX) p.facing = -1;
                else p.facing = 1;

           } else {
               // Keyboard Aiming
               if (inputs.current.aimUp) {
                   dy = -1;
                   if (inputs.current.left) dx = -1;
                   else if (inputs.current.right) dx = 1;
                   else dx = 0; // Straight up
               } else {
                   dx = p.facing;
                   dy = 0;
               }
               // Normalize keyboard diagonal
               if (dx !== 0 && dy !== 0) {
                   const len = Math.sqrt(dx*dx + dy*dy);
                   dx /= len;
                   dy /= len;
               }
           }

           // Adjust Spawn Point based on direction
           let spawnX = p.x + p.w/2;
           let spawnY = p.y + p.h/2;
           
           // If mostly aiming up, spawn higher
           if (dy < -0.5) spawnY = p.y - 10;
           else spawnY = p.y + 10;
           
           // If mostly aiming side, spawn forward
           if (Math.abs(dx) > 0.5) spawnX = p.x + p.w/2 + (Math.sign(dx) * 20);

           playWeaponSound(p.weapon); // Play Sound
           spawnProjectile(spawnX, spawnY, dx, dy, 'player', p.weapon);
           
           // Fire rate based on weapon AND level
           let cooldown = 10;
           if (p.weapon === 'normal') cooldown = p.weaponLevel >= 2 ? 6 : 10; // Faster at Lvl 2
           if (p.weapon === 'spread') cooldown = 20;
           if (p.weapon === 'laser') cooldown = 20;
           if (p.weapon === 'mouthwash') cooldown = p.weaponLevel >= 2 ? 22 : 30; // Faster at Lvl 2
           if (p.weapon === 'floss') cooldown = 18;
           if (p.weapon === 'toothbrush') cooldown = p.weaponLevel >= 2 ? 15 : 20; // Faster at Lvl 2
           
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
    // Ensure we don't spawn if level is ending (transitioning)
    if (!s.level.bossSpawned && !s.levelTransitioning && p.x > s.level.levelWidth - 600) {
        s.level.bossSpawned = true;
        spawnBoss(s.level.levelWidth - 800);
    }

    // Boss Failsafe
    // Only run if not already transitioning, to prevent respawning a dead boss
    if (s.level.bossSpawned && !s.levelTransitioning) {
        const bossExists = s.enemies.some(e => e.subType === 'boss');
        if (!bossExists) {
             s.level.bossSpawned = false;
        }
    }

    // Enemy Spawning (only if no boss)
    s.waveTimer += dt;
    if (!s.level.bossSpawned && !s.levelTransitioning && s.waveTimer > Math.max(0.5, 2.0 - (score / 10000) - (s.level.stage * 0.1))) {
        spawnEnemy(s.camera.x);
        s.waveTimer = 0;
    }

    // --- Entity Updates ---
    
    // Projectiles
    s.projectiles.forEach(proj => {
        if (proj.projectileType === 'sword' || proj.projectileType === 'floss') {
            // Melee weapons follow player with offset based on direction (vx, vy stored the aim direction)
             if (proj.owner === 'player') {
                const centerX = p.x + p.w/2;
                const centerY = p.y + p.h/2;
                
                if (proj.projectileType === 'sword') {
                    const offset = 20;
                    proj.x = centerX + (proj.vx * offset) - proj.w/2;
                    proj.y = centerY + (proj.vy * offset) - proj.h/2;
                } else if (proj.projectileType === 'floss') {
                    const range = Math.max(proj.w, proj.h);
                    const dist = range / 2 + 10;
                    proj.x = centerX + (proj.vx * dist) - proj.w/2;
                    proj.y = centerY + (proj.vy * dist) - proj.h/2;
                }
            }
        } else {
            // Standard Movement
            if (proj.projectileType !== 'sludge') {
                proj.x += proj.vx;
                proj.y += proj.vy;
            }
            if (proj.projectileType === 'mortar' || proj.projectileType === 'acid') proj.vy += GRAVITY * 0.5;
        }
        
        proj.lifeTime -= dt;
        
        if (proj.projectileType === 'wave') {
            proj.y += Math.sin(Date.now() / 50) * 5;
        }

        // Homing projectile logic
        if (proj.projectileType === 'bullet' && proj.owner === 'enemy' && proj.damage > 20) {
             // Simple homing for boss projectiles
             const dx = p.x - proj.x;
             const dy = p.y - proj.y;
             const dist = Math.sqrt(dx*dx + dy*dy);
             if (dist > 0 && dist < 400) {
                 proj.vx += (dx/dist) * 0.2;
                 proj.vy += (dy/dist) * 0.2;
                 // Cap speed
                 const speed = Math.sqrt(proj.vx*proj.vx + proj.vy*proj.vy);
                 if (speed > 6) {
                     proj.vx = (proj.vx/speed) * 6;
                     proj.vy = (proj.vy/speed) * 6;
                 }
             }
        }
    });
    s.projectiles = s.projectiles.filter(p => p.lifeTime > 0);

    // Enemies
    s.enemies.forEach(enemy => {
        enemy.aiTimer += dt;
        enemy.attackTimer += dt;
        enemy.frameTimer += dt;

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
                        spawnProjectile(enemy.x, enemy.y + 20, 0, 1, 'enemy', 'normal');
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
                            damage: 10, owner: 'enemy', lifeTime: 3, hitIds: [],
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
                case 'sugar_fiend':
                    // Runs away if too close, else random movement
                    // Drops 'Sticky' trails
                    if (dist < 150) {
                        enemy.vx = enemy.x > p.x ? 4 : -4; // Run away
                    } else {
                        enemy.vx = enemy.x > p.x ? -3 : 3; // Approach
                    }
                    
                    enemy.vy += GRAVITY;
                    
                    if (enemy.attackTimer > 1.0) {
                        // Drop Sticky Puddle
                        s.projectiles.push({
                            id: Math.random().toString(),
                            x: enemy.x, y: enemy.y + enemy.h - 5,
                            w: 24, h: 10,
                            vx: 0, vy: 0,
                            hp: 1, maxHp: 1, type: 'projectile', projectileType: 'sludge',
                            damage: 0, owner: 'enemy', lifeTime: 4, hitIds: [], // 0 Damage, just slow
                            color: COLORS.projectileSludge, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                        });
                        enemy.attackTimer = 0;
                    }
                    break;
                case 'acid_spitter':
                    // Stationary, shoots acid blobs
                    enemy.vx = 0;
                    enemy.vy += GRAVITY;
                    if (enemy.attackTimer > 2.5 && dist < 500) {
                        // Lob Acid
                        const dx = p.x - enemy.x;
                        const dy = p.y - enemy.y - 100; // Aim higher for arc
                        const power = 0.02;
                        
                        s.projectiles.push({
                            id: Math.random().toString(),
                            x: enemy.x + enemy.w/2, y: enemy.y,
                            w: 12, h: 12,
                            vx: dx * power, vy: dy * power - 5, // Upward Lob
                            hp: 1, maxHp: 1, type: 'projectile', projectileType: 'acid',
                            damage: 15, owner: 'enemy', lifeTime: 3, hitIds: [],
                            color: COLORS.projectileAcid, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                        });
                        enemy.attackTimer = 0;
                    }
                    break;
                case 'gingivitis_grunt':
                    // Patrols slowly. Charges if aligned Y.
                    enemy.vy += GRAVITY;
                    const yDiff = Math.abs((p.y + p.h) - (enemy.y + enemy.h));
                    
                    if (enemy.bossState === 1) { // Charging
                         enemy.vx = enemy.facing * 8; // Fast
                         if (enemy.aiTimer > 1.0) { // Charge duration
                             enemy.bossState = 0; // Tired
                             enemy.aiTimer = 0;
                         }
                    } else { // Patrol
                         enemy.vx = enemy.x > p.x ? -1 : 1;
                         enemy.facing = enemy.vx > 0 ? 1 : -1;
                         
                         // Check for charge
                         if (yDiff < 30 && dist < 300 && dist > 50 && enemy.aiTimer > 2.0) {
                             enemy.bossState = 1;
                             enemy.aiTimer = 0;
                             // Charge warning particle?
                             spawnParticle(enemy.x, enemy.y, '#fff', 5);
                         }
                    }
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
                        // State 5: Vanish/Invisible
                        if (enemy.bossState === 5) {
                            enemy.vx = 0; enemy.vy = 0;
                            // Invincible/Invisible logic in render/hit detection
                            if (enemy.aiTimer > 2.0) {
                                // Reappear near player
                                enemy.x = p.x > 400 ? p.x - 200 : p.x + 200;
                                enemy.y = p.y - 100;
                                enemy.bossState = 0; enemy.aiTimer = 0;
                                spawnParticle(enemy.x, enemy.y, '#22d3ee', 20);
                            }
                            return; // Skip other logic
                        }

                        enemy.vy = Math.sin(Date.now() / 300) * 2;
                        if (enemy.bossState === 0) { // Hover
                             enemy.vx = (p.x - enemy.x) * 0.03;
                             if (enemy.aiTimer > 1.5) { // Faster cycle
                                 // Randomly vanish or dash
                                 enemy.bossState = Math.random() > 0.7 ? 5 : 1; 
                                 enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 1) { // Prep Dash
                             enemy.vx = 0;
                             if (enemy.aiTimer > 0.5) {
                                 enemy.bossState = 2;
                                 playBossAttackSound('charge'); // CHARGE SOUND
                                 enemy.vx = (p.x < enemy.x) ? -18 : 18; // Faster Dash
                                 enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 2) { // Dashing
                             // Tracking swoop (vertical)
                             enemy.vy = (p.y - enemy.y) * 0.1;
                             
                             if (enemy.aiTimer > 0.8) { // Dash complete
                                 enemy.bossState = 3; enemy.aiTimer = 0; enemy.vx = 0;
                             }
                        } else if (enemy.bossState === 3) { // Shoot
                             if (enemy.aiTimer > 0.3) {
                                 playBossAttackSound('shoot'); // SHOOT SOUND
                                 // Fire 5 bullets spread
                                 for(let i=-2; i<=2; i++) {
                                     spawnProjectile(enemy.x + enemy.w/2, enemy.y + enemy.h/2, p.facing, 0, 'enemy', 'normal');
                                     const bullet = s.projectiles[s.projectiles.length - 1];
                                     bullet.vy = i * 2; // Spread
                                 }
                                 enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                        }
                    } 
                    else if (enemy.bossVariant === 'tank') {
                        // Tank: Slow, Mortars, Shockwaves
                        if (enemy.bossState === 0) { // March
                             enemy.vx = (p.x - enemy.x) > 0 ? 2 : -2; // Faster
                             enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 2.5) {
                                 enemy.bossState = Math.random() > 0.5 ? 1 : 2; 
                                 enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 1) { // Mortar Barrage
                             enemy.vx = 0; enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 0.8) {
                                  playBossAttackSound('mortar'); // MORTAR SOUND
                                  // Fire 3 Mortars (Carpet Bomb)
                                  for(let i=0; i<3; i++) {
                                      const power = 0.01 + (i * 0.005);
                                      s.projectiles.push({
                                          id: Math.random().toString(),
                                          x: enemy.x + enemy.w/2, y: enemy.y,
                                          w: 16, h: 16,
                                          vx: (p.x - enemy.x) * power * (1 + Math.random()*0.2), 
                                          vy: -14 + (Math.random()*2), 
                                          hp: 1, maxHp: 1, type: 'projectile', projectileType: 'mortar',
                                          damage: 25, owner: 'enemy', lifeTime: 4, hitIds: [],
                                          color: '#78716c', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                      });
                                  }
                                  enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                        } else if (enemy.bossState === 2) { // Ground Wave
                             enemy.vx = 0; enemy.vy += GRAVITY;
                             if (enemy.aiTimer > 0.8) {
                                  playBossAttackSound('slam'); // SLAM/WAVE SOUND
                                  // Shoot waves in both directions
                                  [-1, 1].forEach(dir => {
                                      s.projectiles.push({
                                          id: Math.random().toString(),
                                          x: enemy.x + (dir === 1 ? enemy.w : 0), y: enemy.y + enemy.h - 10,
                                          w: 40, h: 40, // Taller wave
                                          vx: dir * 10, vy: 0,
                                          hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                                          damage: 20, owner: 'enemy', lifeTime: 3, hitIds: [],
                                          color: COLORS.projectileWave, facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                      });
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
                             enemy.vx = (p.x - enemy.x) * 0.02;
                             if (enemy.aiTimer > 1.5) {
                                 const r = Math.random();
                                 if (r < 0.33) enemy.bossState = 1; // Summon
                                 else if (r < 0.66) enemy.bossState = 2; // Laser
                                 else enemy.bossState = 5; // Homing Orb
                                 enemy.aiTimer = 0;
                             }
                         } else if (enemy.bossState === 1) { // Summon Horde
                             enemy.vx = 0;
                             if (enemy.aiTimer > 1.0) {
                                 playBossAttackSound('summon'); // SUMMON SOUND
                                 // Summon 3 Minions
                                 for(let i=0; i<3; i++) {
                                     const minion: Enemy = {
                                        id: Math.random().toString(),
                                        x: enemy.x + enemy.w/2 + (i*30 - 30), y: enemy.y + enemy.h,
                                        w: 20, h: 20, vx: (Math.random()-0.5)*12, vy: -8,
                                        hp: 15, maxHp: 15, type: 'enemy', subType: 'bacteria',
                                        color: COLORS.enemyBacteria, facing: -1, isGrounded: false, aiTimer: 0, attackTimer: 0, frameTimer: 0, state: 0, bossState: 0
                                    };
                                    s.enemies.push(minion);
                                 }
                                enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                         } else if (enemy.bossState === 2) { // Sweeping Laser
                             enemy.vx = 0;
                             if (enemy.aiTimer > 0.5) {
                                 playBossAttackSound('laser'); // LASER SOUND
                                 // Laser down that moves
                                 s.projectiles.push({
                                    id: Math.random().toString(),
                                    x: enemy.x + enemy.w/2 - 10, y: enemy.y + enemy.h,
                                    w: 30, h: 400, vx: (p.x - enemy.x) * 0.03, vy: 15, // Moves horizontally
                                    hp: 1, maxHp: 1, type: 'projectile', projectileType: 'laser',
                                    damage: 30, owner: 'enemy', lifeTime: 1.0, hitIds: [], // Lasts longer
                                    color: '#ef4444', facing: 1, isGrounded: false, frameTimer: 0, state: 0
                                 });
                                 enemy.bossState = 0; enemy.aiTimer = 0;
                             }
                         } else if (enemy.bossState === 5) { // Homing Infection
                             if (enemy.aiTimer > 0.5) {
                                 playBossAttackSound('summon'); // ORB SOUND
                                 s.projectiles.push({
                                     id: Math.random().toString(),
                                     x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                                     w: 24, h: 24,
                                     vx: 0, vy: 5,
                                     hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                     damage: 25, owner: 'enemy', lifeTime: 5, hitIds: [],
                                     color: '#a855f7', facing: 1, isGrounded: false, frameTimer: 0, state: 0
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
                                 playBossAttackSound('shoot'); // SHOOT SOUND (Frequent)
                                 const angle = (Date.now() / 200);
                                 for(let i=0; i<3; i++) {
                                    const offset = (Math.PI * 2 / 3) * i;
                                    s.projectiles.push({
                                        id: Math.random().toString(),
                                        x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                                        w: 12, h: 12,
                                        vx: Math.cos(angle + offset) * 5, vy: Math.sin(angle + offset) * 5,
                                        hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                        damage: 15, owner: 'enemy', lifeTime: 5, hitIds: [],
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
                                playBossAttackSound('shoot'); // SHOOT SOUND
                                for(let i=-2; i<=2; i++) {
                                   s.projectiles.push({
                                       id: Math.random().toString(),
                                       x: enemy.x + enemy.w/2, y: enemy.y + enemy.h/2,
                                       w: 12, h: 12,
                                       vx: -8, vy: i * 3,
                                       hp: 1, maxHp: 1, type: 'projectile', projectileType: 'bullet',
                                       damage: 15, owner: 'enemy', lifeTime: 4, hitIds: [],
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
                               playBossAttackSound('summon'); // SUMMON SOUND
                               const minion: Enemy = {
                                   id: Math.random().toString(),
                                   x: enemy.x + enemy.w/2, y: enemy.y + 20,
                                   w: 20, h: 20, vx: -5, vy: -5,
                                   hp: 10, maxHp: 10, type: 'enemy', subType: 'sugar_rusher',
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
            if (enemy.subType !== 'candy_bomber' && enemy.subType !== 'acid_spitter' && enemy.subType !== 'boss') {
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
                         playBossAttackSound('slam'); // SLAM IMPACT SOUND
                         s.projectiles.push({
                            id: Math.random().toString(), x: enemy.x, y: enemy.y + enemy.h - 20,
                            w: 40, h: 20, vx: -8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                            damage: 25, owner: 'enemy', lifeTime: 3, hitIds: [], color: COLORS.projectileWave, facing: -1, isGrounded: false, frameTimer: 0, state: 0
                         });
                         s.projectiles.push({
                            id: Math.random().toString(), x: enemy.x + enemy.w, y: enemy.y + enemy.h - 20,
                            w: 40, h: 20, vx: 8, vy: 0, hp: 1, maxHp: 1, type: 'projectile', projectileType: 'wave',
                            damage: 25, owner: 'enemy', lifeTime: 3, hitIds: [], color: COLORS.projectileWave, facing: 1, isGrounded: false, frameTimer: 0, state: 0
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
                // If enemy is 'vanished' (State 5 for Phantom), don't hit
                if (enemy.bossVariant === 'phantom' && enemy.bossState === 5) return;
                
                // --- PIERCING LOGIC FIX: Check if already hit this enemy ---
                const piercingTypes = ['laser', 'floss', 'sword', 'wave'];
                if (piercingTypes.includes(proj.projectileType)) {
                    if (proj.hitIds && proj.hitIds.includes(enemy.id)) {
                        return; // Already hit this enemy with this piercing shot
                    }
                }

                if (checkRectCollide(proj, enemy)) {
                    enemy.hp -= proj.damage;
                    
                    // Add to hit list for piercing types
                    if (piercingTypes.includes(proj.projectileType)) {
                        proj.hitIds.push(enemy.id);
                    }
                    
                    // Destroy non-piercing projectiles
                    if (!piercingTypes.includes(proj.projectileType)) {
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
                            if (!s.levelTransitioning) {
                                s.levelTransitioning = true;
                                setTimeout(startLevelTransition, 2000); // Start Transition after delay
                            }
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
    let hitDamage = 20;

    s.enemies.forEach(enemy => {
        if (checkRectCollide(p, enemy)) {
            playerHit = true;
        }
    });
    s.projectiles.forEach(proj => {
        if (proj.owner === 'enemy' && checkRectCollide(p, proj)) {
            if (proj.projectileType === 'sludge') {
                // Sludge trap logic - No damage, just slow
                p.slowTimer = 0.5; // Apply slow for 0.5s (refreshes if standing in it)
            } else {
                playerHit = true;
                hitDamage = proj.damage;
                proj.lifeTime = 0;
            }
        }
    });

    if (playerHit && p.invincibleTimer <= 0) {
        p.hp -= hitDamage;
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
                // Weapon Pickup Logic
                if (p.weapon === pu.subType) {
                    // Upgrade existing weapon
                    if (p.weaponLevel < MAX_WEAPON_LEVEL) {
                        p.weaponLevel++;
                        spawnParticle(p.x + p.w/2, p.y, '#fbbf24', 10); // Gold particles for upgrade
                        setScore(s => s + 500); // Bonus score
                    } else {
                        setScore(s => s + 1000); // Max level bonus
                    }
                } else {
                    // Switch weapon
                    p.weapon = pu.subType;
                    p.weaponLevel = 1;
                }
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

  const spawnProjectile = (x: number, y: number, dx: number, dy: number, owner: 'player' | 'enemy', type: WeaponType | 'normal') => {
      const base: Partial<Projectile> = {
          id: Math.random().toString(),
          owner,
          facing: dx === 0 ? 1 : Math.sign(dx) as 1|-1,
          isGrounded: false,
          frameTimer: 0,
          state: 0,
          type: 'projectile',
          hitIds: [] // Initialize empty hit list
      };

      if (owner === 'enemy') {
          entities.current.projectiles.push({
              ...base,
              x, y, w: 10, h: 10, vx: dx * 6, vy: 0, // Enemy mostly shoots straight for now unless boss
              hp: 1, maxHp: 1, damage: 10, lifeTime: 2, projectileType: 'bullet', color: COLORS.projectileEnemy
          } as Projectile);
          return;
      }

      // Player Weapons with Level Scaling
      const level = entities.current.player.weaponLevel;
      const vx = dx;
      const vy = dy;

      if (type === 'spread') {
          const bulletCount = 3 + (level - 1) * 2; // 3, 5, 7
          const spreadFactor = level === 3 ? 1.0 : 1.5; 
          const start = -Math.floor(bulletCount/2);
          const end = Math.floor(bulletCount/2);
          
          // Perpendicular Vector for Spread (-y, x)
          const perpX = -dy;
          const perpY = dx;

          for(let i=start; i<=end; i++) {
            // Apply spread along perpendicular axis
            const svx = (vx * 12) + (perpX * i * spreadFactor);
            const svy = (vy * 12) + (perpY * i * spreadFactor);
            
            entities.current.projectiles.push({
                ...base,
                x, y, w: 8, h: 8, vx: svx, vy: svy,
                hp: 1, maxHp: 1, damage: 6, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
            } as Projectile);
          }
      } else if (type === 'laser') {
            const width = level >= 2 ? (level === 3 ? 12 : 6) : 4;
            const dmg = 15 + ((level-1) * 5); // Hits once per enemy now
            
            entities.current.projectiles.push({
                ...base,
                x, y, w: width, h: width, vx: vx * 20, vy: vy * 20,
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.8, projectileType: 'laser', color: COLORS.projectileLaser
            } as Projectile);

      } else if (type === 'mouthwash') {
            const speed = 8 + (level * 2);
            const dmg = 20 + ((level-1)*10);
            
            entities.current.projectiles.push({
                ...base,
                x, y, w: 16 + (level*4), h: 16 + (level*4), vx: vx * speed, vy: vy * speed,
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 2.0, projectileType: 'wave', color: COLORS.projectileWave
            } as Projectile);

            if (level === 3) {
                // Double Wave (Offset slightly)
                 entities.current.projectiles.push({
                    ...base,
                    x: x - (dy * 20), y: y + (dx * 20), w: 20, h: 20, vx: vx * speed, vy: vy * speed,
                    hp: 1, maxHp: 1, damage: dmg, lifeTime: 2.0, projectileType: 'wave', color: COLORS.projectileWave
                } as Projectile);
            }

      } else if (type === 'floss') {
            const range = 100 + ((level-1)*50); 
            const dmg = 25 + ((level-1)*10);
            const thickness = 20 + ((level-1)*10);
            
            // Adjust hitbox dimensions based on attack direction
            // If attacking more vertically, width is thickness and height is range
            const isVertical = Math.abs(dy) > Math.abs(dx);
            const w = isVertical ? thickness : range;
            const h = isVertical ? range : thickness;

            entities.current.projectiles.push({
                ...base,
                x, y, w, h, vx: dx, vy: dy, // Store direction in vx/vy for rendering
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.15, projectileType: 'floss', color: '#fff'
            } as Projectile);

      } else if (type === 'toothbrush') {
            // SWORD
            const size = 60 + ((level-1)*30);
            const dmg = 35 + ((level-1)*15);

            entities.current.projectiles.push({
                ...base,
                x, y, w: size, h: size, vx: dx, vy: dy, // Store direction in vx/vy for rendering
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 0.2, projectileType: 'sword', color: COLORS.projectileMelee
            } as Projectile);
      } else {
        // Normal
        const dmg = 8;
        // Level 3 = Double Shot
        if (level === 3) {
             const perpX = -dy;
             const perpY = dx;
             const offset = 5;

             entities.current.projectiles.push({
                ...base,
                x: x - (perpX*offset), y: y - (perpY*offset), w: 10, h: 6, vx: vx * 12, vy: vy * 12,
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
            } as Projectile);
             entities.current.projectiles.push({
                ...base,
                x: x + (perpX*offset), y: y + (perpY*offset), w: 10, h: 6, vx: vx * 12, vy: vy * 12,
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
            } as Projectile);
        } else {
             entities.current.projectiles.push({
                ...base,
                x, y, w: 10, h: 6, vx: vx * 12, vy: vy * 12,
                hp: 1, maxHp: 1, damage: dmg, lifeTime: 1.0, projectileType: 'bullet', color: COLORS.projectilePlayer
            } as Projectile);
        }
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

  // --- Rendering Helpers ---
  
  const drawRoundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y, x + h, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  };

  // ... (Previous enemy draw functions remain same: drawBacteria, drawPlaque, etc.)
  const drawBacteria = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      ctx.fillStyle = e.color;
      const pulses = Math.sin(e.frameTimer * 10) * 2;
      const r = e.w / 2 + pulses;
      
      // Spiky Body
      ctx.beginPath();
      const spikes = 12;
      for (let i = 0; i < spikes; i++) {
          const angle = (i / spikes) * Math.PI * 2;
          const outerR = r + 4;
          const innerR = r - 2;
          const xOut = e.x + e.w/2 + Math.cos(angle) * outerR;
          const yOut = e.y + e.h/2 + Math.sin(angle) * outerR;
          const xIn = e.x + e.w/2 + Math.cos(angle + Math.PI/spikes) * innerR;
          const yIn = e.y + e.h/2 + Math.sin(angle + Math.PI/spikes) * innerR;
          if (i===0) ctx.moveTo(xOut, yOut);
          else ctx.lineTo(xOut, yOut);
          ctx.lineTo(xIn, yIn);
      }
      ctx.closePath();
      ctx.fill();

      // Eyes (Mismatched)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(e.x + 10, e.y + 12, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + 24, e.y + 10, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(e.x + 10, e.y + 12, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + 24, e.y + 10, 1.5, 0, Math.PI*2); ctx.fill();
  };

  const drawPlaque = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      ctx.fillStyle = e.color;
      // Slime shape
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h);
      // Top curve (lumpy)
      ctx.bezierCurveTo(e.x, e.y, e.x + e.w * 0.3, e.y - 10, e.x + e.w * 0.5, e.y + 5);
      ctx.bezierCurveTo(e.x + e.w * 0.7, e.y - 5, e.x + e.w, e.y, e.x + e.w, e.y + e.h);
      ctx.closePath();
      ctx.fill();

      // Dripping sludge bits at bottom (visual only)
      ctx.fillStyle = '#92400e'; // Darker amber
      ctx.beginPath();
      ctx.arc(e.x + 10, e.y + e.h - 5, 5, 0, Math.PI*2);
      ctx.arc(e.x + e.w - 15, e.y + e.h - 2, 6, 0, Math.PI*2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 15, 8, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 15, 2, 0, Math.PI*2); ctx.fill();
  };

  const drawCandy = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Wrapper fins
      ctx.fillStyle = '#f87171'; // Lighter red
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + e.h/2);
      ctx.lineTo(e.x - 8, e.y);
      ctx.lineTo(e.x - 8, e.y + e.h);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(e.x + e.w, e.y + e.h/2);
      ctx.lineTo(e.x + e.w + 8, e.y);
      ctx.lineTo(e.x + e.w + 8, e.y + e.h);
      ctx.closePath();
      ctx.fill();

      // Main candy body (Oval)
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2, e.h/2, 0, 0, Math.PI*2);
      ctx.fill();

      // Stripes
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + 10, e.y + 5);
      ctx.lineTo(e.x + 10, e.y + e.h - 5);
      ctx.moveTo(e.x + 20, e.y + 2);
      ctx.lineTo(e.x + 20, e.y + e.h - 2);
      ctx.moveTo(e.x + 30, e.y + 5);
      ctx.lineTo(e.x + 30, e.y + e.h - 5);
      ctx.stroke();
  };

  const drawTurret = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Rocky base
      ctx.fillStyle = '#4c1d95'; // Darker violet
      ctx.beginPath();
      ctx.moveTo(e.x - 5, e.y + e.h);
      ctx.lineTo(e.x + e.w/2, e.y + e.h - 10);
      ctx.lineTo(e.x + e.w + 5, e.y + e.h);
      ctx.closePath();
      ctx.fill();

      // Crystal Top
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 20);
      ctx.lineTo(e.x + e.w/2, e.y); // Pointy top
      ctx.lineTo(e.x + e.w, e.y + 20);
      ctx.lineTo(e.x + e.w/2, e.y + e.h - 5);
      ctx.closePath();
      ctx.fill();

      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y);
      ctx.lineTo(e.x + e.w - 5, e.y + 20);
      ctx.lineTo(e.x + e.w/2, e.y + 30);
      ctx.fill();
  };

  const drawRusher = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Diamond shape
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y);
      ctx.lineTo(e.x + e.w, e.y + e.h/2);
      ctx.lineTo(e.x + e.w/2, e.y + e.h);
      ctx.lineTo(e.x, e.y + e.h/2);
      ctx.closePath();
      ctx.fill();
      
      // Inner brightness
      ctx.fillStyle = '#fce7f3';
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y + 6);
      ctx.lineTo(e.x + e.w - 6, e.y + e.h/2);
      ctx.lineTo(e.x + e.w/2, e.y + e.h - 6);
      ctx.lineTo(e.x + 6, e.y + e.h/2);
      ctx.fill();
  };
  
  const drawSugarFiend = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Jagged Crystal Shards (Pink)
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y);
      ctx.lineTo(e.x + e.w, e.y + e.h * 0.3);
      ctx.lineTo(e.x + e.w * 0.8, e.y + e.h);
      ctx.lineTo(e.x + e.w * 0.2, e.y + e.h);
      ctx.lineTo(e.x, e.y + e.h * 0.3);
      ctx.closePath();
      ctx.fill();
      
      // Highlights
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.moveTo(e.x + e.w/2, e.y + 5);
      ctx.lineTo(e.x + e.w - 5, e.y + e.h * 0.3);
      ctx.lineTo(e.x + e.w/2, e.y + e.h * 0.6);
      ctx.fill();
      
      // Evil Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(e.x + 8, e.y + 12, 4, 4);
      ctx.fillRect(e.x + 16, e.y + 12, 4, 4);
  };

  const drawAcidSpitter = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Bloated Sac
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x + e.w/2, e.y + e.h/2 + 5, e.w/2, 0, Math.PI*2);
      ctx.fill();
      
      // Pulsating Top
      const pulse = Math.sin(Date.now() / 200) * 3;
      ctx.fillStyle = '#bef264';
      ctx.beginPath();
      ctx.arc(e.x + e.w/2, e.y + 5, 8 + pulse, 0, Math.PI*2);
      ctx.fill();
      
      // Mouth
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(e.x + e.w/2, e.y + 15, 6, 8, 0, 0, Math.PI*2);
      ctx.fill();
  };

  const drawGingivitisGrunt = (ctx: CanvasRenderingContext2D, e: Enemy) => {
      // Armored Body (Red)
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.w, e.h);
      
      // Shield
      ctx.fillStyle = '#7f1d1d'; // Dark red
      const shieldX = e.facing === -1 ? e.x - 5 : e.x + e.w - 5;
      ctx.fillRect(shieldX, e.y + 5, 10, e.h - 10);
      
      // Helmet Vizor
      ctx.fillStyle = '#000';
      ctx.fillRect(e.x + 5, e.y + 8, e.w - 10, 6);
      ctx.fillStyle = '#ef4444'; // Eye glow
      ctx.fillRect(e.x + (e.facing === 1 ? 20 : 10), e.y + 9, 6, 4);
  };

  const drawTransition = (ctx: CanvasRenderingContext2D) => {
      const p = entities.current.transition.progress;
      if (p <= 0) return;

      // Cubic ease
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      
      const centerH = CANVAS_HEIGHT / 2;
      const topY = -150 + ((centerH + 150) * ease); 
      const botY = CANVAS_HEIGHT + 150 - ((centerH + 150) * ease);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // --- Draw Realistic Tooth Helper ---
      const drawRealisticTooth = (tx: number, ty: number, w: number, h: number, type: 'incisor'|'canine'|'molar', isTop: boolean) => {
          ctx.save();
          
          // Shadow/Depth behind tooth
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.beginPath();
          if (isTop) {
              ctx.moveTo(tx, ty); // Root
              if (type === 'incisor') {
                  ctx.bezierCurveTo(tx, ty + h*0.6, tx - 2, ty + h - 5, tx + 5, ty + h);
                  ctx.lineTo(tx + w - 5, ty + h);
                  ctx.bezierCurveTo(tx + w + 2, ty + h - 5, tx + w, ty + h*0.6, tx + w, ty);
              } else if (type === 'canine') {
                  ctx.bezierCurveTo(tx, ty + h*0.5, tx + 2, ty + h - 10, tx + w/2, ty + h + 5);
                  ctx.bezierCurveTo(tx + w - 2, ty + h - 10, tx + w, ty + h*0.5, tx + w, ty);
              } else { 
                  ctx.bezierCurveTo(tx - 5, ty + h*0.8, tx, ty + h, tx + 5, ty + h - 2);
                  ctx.quadraticCurveTo(tx + w/4, ty + h + 5, tx + w/2, ty + h - 5);
                  ctx.quadraticCurveTo(tx + 3*w/4, ty + h + 5, tx + w - 5, ty + h - 2);
                  ctx.bezierCurveTo(tx + w, ty + h, tx + w + 5, ty + h*0.8, tx + w, ty);
              }
          } else {
               ctx.moveTo(tx, ty); 
               if (type === 'incisor') {
                  ctx.bezierCurveTo(tx, ty - h*0.6, tx - 2, ty - h + 5, tx + 5, ty - h); 
                  ctx.lineTo(tx + w - 5, ty - h); 
                  ctx.bezierCurveTo(tx + w + 2, ty - h + 5, tx + w, ty - h*0.6, tx + w, ty); 
              } else if (type === 'canine') {
                  ctx.bezierCurveTo(tx, ty - h*0.5, tx + 2, ty - h + 10, tx + w/2, ty - h - 5); 
                  ctx.bezierCurveTo(tx + w - 2, ty - h + 10, tx + w, ty - h*0.5, tx + w, ty); 
              } else { 
                  ctx.bezierCurveTo(tx - 5, ty - h*0.8, tx, ty - h, tx + 5, ty - h + 2); 
                  ctx.quadraticCurveTo(tx + w/4, ty - h - 5, tx + w/2, ty - h + 5); 
                  ctx.quadraticCurveTo(tx + 3*w/4, ty - h - 5, tx + w - 5, ty - h + 2); 
                  ctx.bezierCurveTo(tx + w, ty - h, tx + w + 5, ty - h*0.8, tx + w, ty); 
              }
          }
          ctx.closePath();

          // Enamel Gradient (3D effect)
          const grad = ctx.createRadialGradient(
              tx + w*0.4, isTop ? ty + h*0.4 : ty - h*0.4, 5,
              tx + w/2, isTop ? ty + h/2 : ty - h/2, w
          );
          grad.addColorStop(0, '#fffff0'); // Highlight
          grad.addColorStop(0.5, '#fefce8'); // Base
          grad.addColorStop(1, '#e2e8f0'); // Shadow edge
          ctx.fillStyle = grad;
          ctx.fill();

          // Root Stain
          const stain = ctx.createLinearGradient(0, isTop ? ty : ty - h*0.4, 0, isTop ? ty + h*0.4 : ty);
          stain.addColorStop(isTop ? 0 : 1, 'rgba(217, 119, 6, 0.15)');
          stain.addColorStop(isTop ? 1 : 0, 'rgba(255,255,255,0)');
          ctx.fillStyle = stain;
          ctx.fill();
          
          // Shine
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath();
          if (isTop) ctx.ellipse(tx + w*0.3, ty + h*0.35, w*0.15, h*0.2, -0.2, 0, Math.PI*2);
          else ctx.ellipse(tx + w*0.3, ty - h*0.35, w*0.15, h*0.2, 0.2, 0, Math.PI*2);
          ctx.fill();

          ctx.restore();
      };

      const drawJaw = (yPos: number, isTop: boolean) => {
          const curveHeight = 80;
          
          // 1. Gum Base (Fleshy texture)
          ctx.beginPath();
          if (isTop) {
              ctx.moveTo(0, -300);
              ctx.lineTo(0, yPos); 
              ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos + curveHeight, CANVAS_WIDTH*0.7, yPos + curveHeight, CANVAS_WIDTH, yPos);
              ctx.lineTo(CANVAS_WIDTH, -300);
          } else {
              ctx.moveTo(0, CANVAS_HEIGHT + 300);
              ctx.lineTo(0, yPos);
              ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos - curveHeight, CANVAS_WIDTH*0.7, yPos - curveHeight, CANVAS_WIDTH, yPos);
              ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT + 300);
          }
          
          const gumGrad = ctx.createLinearGradient(0, isTop ? yPos - 200 : yPos + 200, 0, yPos);
          gumGrad.addColorStop(0, '#831843'); // Dark textured
          gumGrad.addColorStop(1, '#db2777'); // Pink
          ctx.fillStyle = gumGrad;
          ctx.fill();

          // Texture dots
          ctx.save();
          ctx.clip();
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          for(let i=0; i<100; i++) {
              ctx.beginPath();
              ctx.arc(Math.random()*CANVAS_WIDTH, isTop ? yPos - Math.random()*200 : yPos + Math.random()*200, Math.random()*3, 0, Math.PI*2);
              ctx.fill();
          }
          ctx.restore();

          // 2. Teeth
          const toothCount = 12;
          const toothW = 45;
          const totalW = toothCount * toothW;
          const startX = (CANVAS_WIDTH - totalW) / 2;
          
          for(let i=0; i<toothCount; i++) {
             const t = i / (toothCount - 1);
             const archOffset = (4 * t * (1-t)) * curveHeight * 0.9;
             const tx = startX + i * toothW;
             const ty = isTop ? yPos + archOffset : yPos - archOffset;
             
             let type: 'incisor' | 'canine' | 'molar' = 'molar';
             if (i >= 4 && i <= 7) type = 'incisor';
             else if (i === 3 || i === 8) type = 'canine';
             
             drawRealisticTooth(tx, ty, toothW-4, 70, type, isTop);
          }
          
          // 3. Lips (Glossy)
          ctx.beginPath();
          if (isTop) {
              ctx.moveTo(0, yPos - 30);
              ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos + curveHeight - 30, CANVAS_WIDTH*0.7, yPos + curveHeight - 30, CANVAS_WIDTH, yPos - 30);
              ctx.bezierCurveTo(CANVAS_WIDTH*0.5, yPos + curveHeight - 80, CANVAS_WIDTH*0.5, yPos + curveHeight - 80, 0, yPos - 30);
          } else {
               ctx.moveTo(0, yPos + 30);
               ctx.bezierCurveTo(CANVAS_WIDTH*0.3, yPos - curveHeight + 30, CANVAS_WIDTH*0.7, yPos - curveHeight + 30, CANVAS_WIDTH, yPos + 30);
               ctx.bezierCurveTo(CANVAS_WIDTH*0.5, yPos - curveHeight + 80, CANVAS_WIDTH*0.5, yPos - curveHeight + 80, 0, yPos + 30);
          }
          ctx.fillStyle = '#be185d';
          ctx.fill();
          // Lip Shine
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 4;
          ctx.stroke();
      };

      drawJaw(topY, true);
      drawJaw(botY, false);
      
      // Throat darkness when nearly closed
      if (p > 0.4) {
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#2a0a18';
          ctx.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.globalCompositeOperation = 'source-over';
      }

      if (p > 0.95) {
          ctx.fillStyle = '#fff';
          ctx.font = '24px "Press Start 2P", system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#be185d'; ctx.shadowBlur = 10;
          ctx.fillText(`STAGE ${stage} COMPLETE`, CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 25);
          ctx.fillStyle = '#fef08a'; // Yellow
          ctx.fillText("BRUSHING...", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 + 25);
          ctx.shadowBlur = 0;
      }

      ctx.restore();
  };

  const drawHeldWeapon = (ctx: CanvasRenderingContext2D, p: Player) => {
      const type = p.weapon;
      const facing = p.facing;
      
      // Pivot point (Hand position roughly)
      const hx = p.x + (facing === 1 ? 22 : 10);
      const hy = p.y + 20;

      ctx.save();
      ctx.translate(hx, hy);
      
      // Aim rotation
      let rotation = 0;
      if (inputs.current.usingMouse) {
          // Calculate angle to mouse
          const mouseWorldX = inputs.current.mouseX + entities.current.camera.x;
          const mouseWorldY = inputs.current.mouseY + entities.current.camera.y;
          const dx = mouseWorldX - hx;
          const dy = mouseWorldY - hy;
          rotation = Math.atan2(dy, dx);
          
          if (facing === -1) {
              rotation = rotation - Math.PI; 
          }
      } else {
          // Keyboard Aim
          if (inputs.current.aimUp) {
            if (inputs.current.left || inputs.current.right) {
                // Diagonal
                rotation = -Math.PI / 4 * facing;
            } else {
                // Straight up
                rotation = -Math.PI / 2 * facing;
            }
          }
      }
      ctx.rotate(rotation);

      // Draw relative to translated/rotated context
      const drawX = 0;
      const drawY = 0;

      if (type === 'toothbrush') {
          // Big Two-handed Toothbrush Sword (Always angled slightly if not aiming)
          if (!inputs.current.aimUp && !inputs.current.usingMouse) ctx.rotate(facing === 1 ? -Math.PI / 4 : Math.PI / 4);
          
          // Handle
          ctx.fillStyle = '#38bdf8'; // Light Blue
          ctx.fillRect(0, -3, 30 * facing, 6);
          // Neck
          ctx.fillStyle = '#fff';
          ctx.fillRect(30 * facing, -2, 10 * facing, 4);
          // Head
          ctx.fillRect(40 * facing, -4, 12 * facing, 8);
          // Bristles
          ctx.fillStyle = '#0284c7'; // Darker Blue
          const startX = 42 * facing;
          const bristleH = -6;
          for(let i=0; i<3; i++) {
              ctx.fillRect(startX + (i*3*facing), -4, 2*facing, bristleH);
          }

      } else if (type === 'floss') {
          // Floss Container
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.roundRect(-5, -5, 14, 14, 3);
          ctx.fill();
          // Label
          ctx.fillStyle = '#10b981'; // Mint green label
          ctx.fillRect(-2, -2, 8, 8);
          
          // String hanging out a bit
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(7*facing, 0);
          ctx.lineTo(15*facing, 5);
          ctx.stroke();

      } else if (type === 'mouthwash') {
          // Mouthwash Bottle Cannon
          ctx.fillStyle = 'rgba(45, 212, 191, 0.8)'; // Teal translucent
          const bw = 24;
          const bh = 14;
          // Draw horizontal bottle
          if (facing === 1) ctx.fillRect(0, -6, bw, bh);
          else ctx.fillRect(-bw, -6, bw, bh);

          // Liquid inside
          ctx.fillStyle = '#0d9488'; // Teal liquid
          if (facing === 1) ctx.fillRect(2, 0, bw-4, bh-6);
          else ctx.fillRect(-bw+2, 0, bw-4, bh-6);

          // Neck/Cap
          ctx.fillStyle = '#fff'; // White Cap
          if (facing === 1) ctx.fillRect(bw, -4, 6, 10);
          else ctx.fillRect(-bw-6, -4, 6, 10);

      } else if (type === 'laser') {
          // Sci-fi Laser Tool (Curing Light)
          // Main Body (Tapered)
          ctx.fillStyle = '#64748b'; // Slate
          ctx.beginPath();
          if (facing === 1) {
              ctx.moveTo(0, -4); ctx.lineTo(20, -2); ctx.lineTo(20, 8); ctx.lineTo(0, 10);
          } else {
              ctx.moveTo(0, -4); ctx.lineTo(-20, -2); ctx.lineTo(-20, 8); ctx.lineTo(0, 10);
          }
          ctx.fill();

          // Glowing Tip
          ctx.fillStyle = '#06b6d4'; // Cyan
          if (facing === 1) ctx.fillRect(20, -1, 4, 8);
          else ctx.fillRect(-24, -1, 4, 8);

      } else {
          // Normal/Spread Gun (Drill-like Blaster)
          ctx.fillStyle = '#4b5563'; // Grey Body
          const gunX = facing === 1 ? 0 : -22;
          ctx.fillRect(gunX, -3, 22, 6);
          
          // Handle grip
          ctx.fillStyle = '#1f2937';
          ctx.fillRect(facing === 1 ? 0 : -6, 0, 6, 8);

          // Tip
          ctx.fillStyle = '#9ca3af'; // Silver tip
          ctx.fillRect(facing === 1 ? gunX + 22 : gunX - 4, -2, 4, 4);
      }
      ctx.restore();
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
        if (p.isGround) {
             ctx.fillStyle = COLORS.ground;
             drawRoundRect(ctx, p.x, p.y, p.w, p.h, 10);
             // Gums texture
             ctx.fillStyle = 'rgba(0,0,0,0.1)';
             ctx.beginPath();
             for(let i=p.x; i<p.x+p.w; i+=80) {
                 ctx.ellipse(i, p.y + p.h, 30, 20, 0, Math.PI, 0); // Scalloped gum line bottom
             }
             ctx.fill();
        } else {
             // BRACES PLATFORM DESIGN
             
             // 1. Draw the Tooth Base (White/Enamel)
             ctx.fillStyle = '#f8fafc'; // Slate-50 (Whiteish)
             // Rounded top corners, somewhat sharper bottom or rooty
             ctx.beginPath();
             drawRoundRect(ctx, p.x, p.y, p.w, p.h, 8);
             ctx.fill();
             
             // 2. Shade/Outline
             ctx.strokeStyle = '#cbd5e1'; // Slate-300
             ctx.lineWidth = 2;
             ctx.stroke();

             // 3. Draw Brackets and Wire
             const toothWidth = 40;
             const yMid = p.y + p.h / 2;
             
             // Wire
             ctx.strokeStyle = '#64748b'; // Slate-500
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.moveTo(p.x, yMid);
             ctx.lineTo(p.x + p.w, yMid);
             ctx.stroke();

             // Brackets
             ctx.fillStyle = '#94a3b8'; // Metallic Slate
             const bracketSize = 12;
             
             for (let i = 0; i < p.w / toothWidth; i++) {
                 const bx = p.x + (i * toothWidth) + (toothWidth/2) - (bracketSize/2);
                 const by = yMid - (bracketSize/2);
                 
                 // Bracket Square
                 ctx.fillRect(bx, by, bracketSize, bracketSize);
                 
                 // Bracket Shine
                 ctx.fillStyle = '#e2e8f0';
                 ctx.fillRect(bx+2, by+2, 4, 4);
                 ctx.fillStyle = '#94a3b8'; // Reset
                 
                 // Tooth Separator Line (Vertical)
                 if (i > 0) {
                     ctx.strokeStyle = '#e2e8f0';
                     ctx.lineWidth = 1;
                     ctx.beginPath();
                     ctx.moveTo(p.x + (i * toothWidth), p.y + 2);
                     ctx.lineTo(p.x + (i * toothWidth), p.y + p.h - 2);
                     ctx.stroke();
                 }
             }
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
        // Invisible state for Phantom
        if (e.bossVariant === 'phantom' && e.bossState === 5) {
             ctx.globalAlpha = 0.2; // Almost invisible
        } else {
             ctx.globalAlpha = 1.0;
        }

        if (e.subType === 'bacteria') {
            drawBacteria(ctx, e);
        } else if (e.subType === 'plaque_monster') {
            drawPlaque(ctx, e);
        } else if (e.subType === 'candy_bomber') {
            drawCandy(ctx, e);
        } else if (e.subType === 'tartar_turret') {
            drawTurret(ctx, e);
        } else if (e.subType === 'sugar_rusher') {
            drawRusher(ctx, e);
        } else if (e.subType === 'sugar_fiend') {
            drawSugarFiend(ctx, e);
        } else if (e.subType === 'acid_spitter') {
            drawAcidSpitter(ctx, e);
        } else if (e.subType === 'gingivitis_grunt') {
            drawGingivitisGrunt(ctx, e);
        } else if (e.subType === 'boss') {
            
            ctx.fillStyle = e.color;
            if (e.bossVariant === 'phantom') {
                ctx.save();
                // Ghost Body
                ctx.beginPath();
                ctx.moveTo(e.x, e.y + e.h);
                ctx.quadraticCurveTo(e.x, e.y, e.x + e.w/2, e.y);
                ctx.quadraticCurveTo(e.x + e.w, e.y, e.x + e.w, e.y + e.h);
                // Jagged bottom
                for(let i=e.x+e.w; i>e.x; i-=20) {
                    ctx.lineTo(i-10, e.y+e.h-20 + Math.sin(Date.now()/100 + i)*5);
                    ctx.lineTo(i-20, e.y+e.h);
                }
                ctx.fill();
                // Glow Eyes
                ctx.fillStyle = '#fff';
                ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(e.x+30, e.y+40, 8, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x+70, e.y+40, 8, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.restore();
            } else if (e.bossVariant === 'tank') {
                // Treads
                ctx.fillStyle = '#292524'; 
                ctx.beginPath();
                ctx.roundRect(e.x - 10, e.y + e.h - 30, e.w + 20, 30, 5);
                ctx.fill();
                // Tread wheels
                ctx.fillStyle = '#57534e';
                for(let i=0; i<3; i++) {
                     ctx.beginPath(); ctx.arc(e.x + 20 + (i*60), e.y + e.h - 15, 10, 0, Math.PI*2); ctx.fill();
                }
                // Main Block
                ctx.fillStyle = e.color;
                ctx.fillRect(e.x, e.y, e.w, e.h - 20);
                // Detail Lines
                ctx.fillStyle = 'rgba(0,0,0,0.2)';
                ctx.fillRect(e.x, e.y + 20, e.w, 5);
                ctx.fillRect(e.x, e.y + 60, e.w, 5);
                // Cannon
                ctx.fillStyle = '#44403c';
                ctx.save();
                ctx.translate(e.x + e.w/2, e.y + 20);
                ctx.rotate(-Math.PI / 4);
                ctx.fillRect(0, -12, 70, 24); // Barrel
                ctx.strokeStyle = '#000'; ctx.lineWidth=2; ctx.strokeRect(0, -12, 70, 24);
                ctx.restore();
            } else if (e.bossVariant === 'general') {
                // Red blobby mass (Inflamed Gum)
                 ctx.beginPath();
                 // Wobble
                 const wobble = Math.sin(Date.now()/300)*5;
                 ctx.ellipse(e.x + e.w/2, e.y + e.h/2, e.w/2 + wobble, e.h/2 - wobble, 0, 0, Math.PI * 2);
                 ctx.fill();
                 
                 // Military Cap
                 ctx.fillStyle = '#1e3a8a'; // Blue cap
                 ctx.fillRect(e.x + 10, e.y, e.w - 20, 30);
                 ctx.fillStyle = '#000'; // Brim
                 ctx.beginPath(); ctx.moveTo(e.x, e.y + 30); ctx.lineTo(e.x + e.w, e.y+30); ctx.lineTo(e.x + e.w + 10, e.y + 40); ctx.lineTo(e.x - 10, e.y + 40); ctx.fill();

                 // Eye (Cyclops)
                 ctx.fillStyle = '#fca5a5';
                 ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 25, 0, Math.PI*2); ctx.fill();
                 ctx.fillStyle = '#000';
                 ctx.beginPath(); ctx.arc(e.x + e.w/2, e.y + 70, 8, 0, Math.PI*2); ctx.fill();
            } else if (e.bossVariant === 'deity') {
                // Black Void
                ctx.fillStyle = e.phase === 2 ? '#7f1d1d' : '#0f172a';
                ctx.beginPath();
                const spikes = 20;
                const r = e.w/2 + (Math.sin(Date.now()/100)*5);
                for(let i=0; i<spikes*2; i++) {
                    const angle = (Math.PI*2*i)/(spikes*2);
                    const len = i%2===0 ? r : r*0.8;
                    ctx.lineTo(e.x + e.w/2 + Math.cos(angle)*len, e.y + e.h/2 + Math.sin(angle)*len);
                }
                ctx.fill();
                // Glowing Eyes
                ctx.fillStyle = '#ef4444';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(e.x + 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(e.x + e.w - 40, e.y + 60, 15, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                // Cavity King (Cracked Molar)
                ctx.fillStyle = e.color;
                // Crown
                ctx.fillStyle = '#fbbf24'; // Gold
                ctx.beginPath();
                ctx.moveTo(e.x, e.y + 20);
                ctx.lineTo(e.x, e.y - 20); ctx.lineTo(e.x + 20, e.y + 10);
                ctx.lineTo(e.x + 40, e.y - 30); ctx.lineTo(e.x + 60, e.y + 10);
                ctx.lineTo(e.x + 80, e.y - 30); ctx.lineTo(e.x + 100, e.y + 10);
                ctx.lineTo(e.x + 120, e.y - 20); ctx.lineTo(e.x + 120, e.y + 20);
                ctx.fill();
                
                // Tooth Body
                ctx.fillStyle = e.color;
                drawRoundRect(ctx, e.x, e.y + 20, e.w, e.h - 60, 20);
                // Roots
                ctx.beginPath();
                ctx.moveTo(e.x + 20, e.y + e.h - 40);
                ctx.lineTo(e.x + 40, e.y + e.h);
                ctx.lineTo(e.x + 60, e.y + e.h - 20); // Split
                ctx.lineTo(e.x + 80, e.y + e.h);
                ctx.lineTo(e.x + 100, e.y + e.h - 40);
                ctx.fill();
                
                // Face
                ctx.fillStyle = '#000';
                ctx.beginPath(); ctx.ellipse(e.x + e.w/2, e.y + 80, 20, 30, 0, 0, Math.PI*2); ctx.fill(); // Mouth
                ctx.fillStyle = '#ef4444'; 
                ctx.beginPath(); ctx.arc(e.x + 30, e.y + 50, 8, 0, Math.PI*2); ctx.fill(); 
                ctx.beginPath(); ctx.arc(e.x + e.w - 30, e.y + 50, 8, 0, Math.PI*2); ctx.fill();
                
                // Crack
                ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(e.x + 20, e.y + 20); ctx.lineTo(e.x + 40, e.y + 60); ctx.lineTo(e.x + 30, e.y + 90); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;
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
        
        // Slow Color Overlay
        if (p.slowTimer > 0) {
            ctx.fillStyle = '#f9a8d4'; // Pink Tint
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

        // Render Held Weapon
        drawHeldWeapon(ctx, p);
    }

    // Projectiles
    entities.current.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        
        if (proj.projectileType === 'floss') {
            // Drawn as a thin string connecting player to a "Pick"
            ctx.save();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            // Connect to player hand (rough estimate)
            const handX = p.x + (p.facing === 1 ? 25 : 5);
            const handY = p.y + 20;
            
            // Draw line to projectile center
            const endX = proj.x + proj.w/2;
            const endY = proj.y + proj.h/2;

            ctx.moveTo(handX, handY);
            // Little slack curve based on distance
            const midX = (handX + endX)/2;
            const midY = (handY + endY)/2 + 5;
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();

            // The Pick at the end
            ctx.translate(endX, endY);
            // Rotate pick based on projectile direction (using vx/vy which store direction)
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.rotate(angle);

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI*2);
            ctx.fill();
            // Sharp bit
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(10, 0);
            ctx.lineTo(0, 4);
            ctx.fill();

            ctx.restore();

        } else if (proj.projectileType === 'sword') {
            // Draw Brush Stroke Arc
            ctx.save();
            
            // Rotate context to the projectile's direction
            const centerX = proj.x + proj.w/2;
            const centerY = proj.y + proj.h/2;
            ctx.translate(centerX, centerY);
            
            const angle = Math.atan2(proj.vy, proj.vx);
            ctx.rotate(angle);

            ctx.strokeStyle = '#22d3ee'; // Cyan
            ctx.lineWidth = 1;
            
            // Draw arc facing "forward" (which is 0 degrees after rotation)
            // Arc from -45 to +45 degrees
            const radius = proj.w/2;
            const startAngle = -Math.PI / 3;
            const endAngle = Math.PI / 3;
            
            // Draw multiple bristle lines for effect
            for(let i=0; i<3; i++) {
                 ctx.beginPath();
                 // Scale radius slightly for layering
                 const r = radius - (i*5);
                 ctx.arc(0, 0, r, startAngle, endAngle);
                 ctx.strokeStyle = `rgba(34, 211, 238, ${1 - i*0.2})`;
                 ctx.lineWidth = 4 - i;
                 ctx.stroke();
            }
            // White shine
            ctx.beginPath();
            ctx.arc(0, 0, radius-2, startAngle, endAngle);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.restore();

        } else if (proj.projectileType === 'wave') {
            // Mouthwash Bubbles
            ctx.save();
            ctx.translate(proj.x, proj.y);
            ctx.fillStyle = '#5eead4'; // Teal-300
            
            // Draw random bubbles within rect
            // Using frameTimer or static position for bubble texture
            const bubbleCount = 5;
            for(let i=0; i<bubbleCount; i++) {
                const bx = (i / bubbleCount) * proj.w;
                const by = Math.sin(Date.now()/50 + i) * (proj.h/4) + proj.h/2;
                const size = 3 + (i%3);
                ctx.beginPath();
                ctx.arc(bx, by, size, 0, Math.PI*2);
                ctx.fill();
            }
            
            ctx.restore();
            
        } else if (proj.projectileType === 'laser') {
            // Core beam
            ctx.save();
            ctx.fillStyle = '#fff';
            ctx.fillRect(proj.x, proj.y + proj.h * 0.25, proj.w, proj.h * 0.5);
            // Outer glow
            ctx.fillStyle = proj.color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(proj.x, proj.y, proj.w, proj.h);
            ctx.globalAlpha = 1.0;
            ctx.restore();
            
        } else if (proj.projectileType === 'mortar' || proj.projectileType === 'acid') {
             // Blob / Mortar
             ctx.beginPath(); ctx.arc(proj.x+proj.w/2, proj.y+proj.h/2, proj.w/2, 0, Math.PI*2); ctx.fill();
        } else if (proj.projectileType === 'sludge') {
             // Sticky Sludge Puddle
             ctx.fillStyle = proj.color;
             ctx.beginPath();
             ctx.ellipse(proj.x + proj.w/2, proj.y + proj.h/2, proj.w/2, proj.h/3, 0, 0, Math.PI * 2);
             ctx.fill();
             // Bubbles
             ctx.fillStyle = '#fff';
             if (Math.random() > 0.5) ctx.fillRect(proj.x + 5, proj.y + 4, 2, 2);
             if (Math.random() > 0.5) ctx.fillRect(proj.x + proj.w - 8, proj.y + 2, 2, 2);
        } else {
             // Standard Bullet
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

    // Draw Transition Overlay (Last so it covers everything)
    drawTransition(ctx);
  };

  // --- Mobile Controls Helpers ---
  const handleTouch = (action: string, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      initAudio(); // Initialize audio on touch
      switch(action) {
          case 'left': inputs.current.left = pressed; break;
          case 'right': inputs.current.right = pressed; break;
          case 'jump': 
            if (!inputs.current.jumpPressed && pressed) inputs.current.jumpPressed = true;
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
                      <span className="bg-slate-700 px-2 py-1 rounded">A / D : Move</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">W : Aim Up</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">SPACE : Jump (x2)</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">CLICK / F : Shoot</span>
                      <span className="bg-slate-700 px-2 py-1 rounded">SHIFT / R-CLICK : Dash</span>
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
        className="w-full h-full max-w-[800px] max-h-[450px] bg-black shadow-2xl border-4 border-slate-700 cursor-crosshair"
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
              <span className="text-xs uppercase mr-2">{entities.current.player.weapon}</span>
              <div className="flex items-center text-yellow-400 border-l border-slate-600 pl-2">
                  <ChevronsUp className="w-3 h-3 mr-1" />
                  <span className="text-xs font-bold">LVL {entities.current.player.weaponLevel}</span>
              </div>
              {entities.current.player.slowTimer > 0 && (
                   <div className="flex items-center text-pink-400 border-l border-slate-600 pl-2 animate-pulse">
                        <Snail className="w-3 h-3 mr-1" />
                        <span className="text-xs font-bold">SLOWED</span>
                   </div>
              )}
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

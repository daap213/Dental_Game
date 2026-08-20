
import { WeaponType, Enemy } from '../types';

export class AudioManager {
  ctx: AudioContext | null = null;
  ambientGain: GainNode | null = null;

  /**
   * Dos buses, y por eso existen.
   *
   * Todos los efectos se conectaban **directamente a `destination`** en quince
   * sitios, así que no había ni un punto por el que pasara el sonido: no existía
   * el concepto de volumen, sólo el atenuado de la cama ambiental. Con un bus
   * para música y otro para efectos, el jugador puede bajar la música y
   * conservar los avisos, que es lo que la gente hace de verdad.
   *
   * `out()` es lo que sustituye a `this.ctx.destination` en todos los efectos.
   * Cae al destino si aún no hay bus, para que un sonido disparado antes del
   * primer `init()` no se pierda en silencio.
   */
  musicBus: GainNode | null = null;
  sfxBus: GainNode | null = null;

  private music = 1;
  private sfx = 1;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Los buses van al destino **directamente**, no por `out()`: `out()`
      // devuelve el bus de efectos, así que enchufarlos ahí crearía un lazo del
      // bus consigo mismo y colgaría el grafo de audio.
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.music;
      this.musicBus.connect(this.ctx.destination);

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfx;
      this.sfxBus.connect(this.ctx.destination);

      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Salida de los efectos. Todo sonido puntual pasa por aquí. */
  private out(): AudioNode {
    return this.sfxBus ?? this.ctx!.destination;
  }

  /**
   * Atenuado de la cama ambiental según el estado de la partida.
   *
   * **No es el volumen de la música y no lo sustituye**: esto sube y baja con la
   * pausa, y el nivel del jugador multiplica por encima en el bus. Son un
   * *ducking* y un nivel, y componen.
   */
  setAmbientVolume(volume: number) {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(volume, now, 0.5);
  }

  /** Nivel de música elegido por el jugador, de 0 a 1. */
  setMusicVolume(volume: number) {
    this.music = Math.max(0, Math.min(1, volume));
    if (!this.ctx || !this.musicBus) return;
    this.musicBus.gain.setTargetAtTime(this.music, this.ctx.currentTime, 0.05);
  }

  /** Nivel de efectos elegido por el jugador, de 0 a 1. */
  setSfxVolume(volume: number) {
    this.sfx = Math.max(0, Math.min(1, volume));
    if (!this.ctx || !this.sfxBus) return;
    this.sfxBus.gain.setTargetAtTime(this.sfx, this.ctx.currentTime, 0.05);
  }

  startAmbient() {
    if (!this.ctx || this.ambientGain) return;

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(this.musicBus ?? this.ctx.destination);
    this.ambientGain = masterGain;

    const t = this.ctx.currentTime;

    // Layer 1: Low Rumble
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 50;
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.value = 120;
    const gain1 = this.ctx.createGain();
    gain1.gain.value = 0.15;
    osc1.connect(filter1).connect(gain1).connect(masterGain);
    osc1.start(t);

    // Layer 2: High Whine
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1000;
    const gain2 = this.ctx.createGain();
    gain2.gain.value = 0.005;
    osc2.connect(gain2).connect(masterGain);
    osc2.start(t);

    // LFO for Rumble
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 10;
    lfo.connect(lfoGain).connect(osc1.frequency);
    lfo.start(t);

    // Layer 3: Suction (Noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    noise.start(t);
  }

  playPowerUp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Ascending chime sound (Revive/PowerUp)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.linearRampToValueAtTime(880, t + 0.1);
    osc.frequency.linearRampToValueAtTime(1760, t + 0.3);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    osc.connect(gain).connect(this.out());
    osc.start(t); osc.stop(t + 0.3);
  }

  playChew() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    
    // Simulate multiple chomps/crunches
    for(let i=0; i<3; i++) {
        const start = t + (i * 0.12);
        
        // Noise (Crunch/Squish)
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
            data[j] = (Math.random() * 2 - 1) * (1 - j/bufferSize);
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(800, start);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, start + 0.1);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.6, start);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
        
        noise.connect(noiseFilter).connect(noiseGain).connect(this.out());
        noise.start(start);

        // Low Thud (Jaw closing impact)
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, start);
        osc.frequency.exponentialRampToValueAtTime(40, start + 0.1);
        
        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.4, start);
        oscGain.gain.exponentialRampToValueAtTime(0.01, start + 0.1);
        
        osc.connect(oscGain).connect(this.out());
        osc.start(start);
    }
  }

  playWeaponSound(type: WeaponType) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.out());

    switch (type) {
      case 'normal':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
        break;
      case 'spread':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        break;
      case 'laser':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.3);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
        break;
      case 'mouthwash':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.linearRampToValueAtTime(600, t + 0.05);
        osc.frequency.linearRampToValueAtTime(300, t + 0.2);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t); osc.stop(t + 0.2);
        break;
      case 'floss':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(3000, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t); osc.stop(t + 0.05);
        break;
      case 'toothbrush':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.15);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.05);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        break;
      // Arco: un chasquido corto y seco de cuerda soltándose.
      case 'bow':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
        gain.gain.setValueAtTime(0.07, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        osc.start(t); osc.stop(t + 0.08);
        break;
      // Guadaña: un siseo grave y largo, el peso del barrido.
      case 'scythe':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(90, t + 0.25);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.07, t + 0.06);
        gain.gain.linearRampToValueAtTime(0, t + 0.25);
        osc.start(t); osc.stop(t + 0.25);
        break;
      default: {
        /**
         * Un arma sin sonido sale **muda**, y eso no se nota revisando código: se nota
         * jugando, y para entonces ya está. Con `never`, olvidarse de un arma es un error
         * de compilación en vez de un silencio.
         */
        const unhandled: never = type;
        void unhandled;
        break;
      }
    }
  }

  playHiddenBossIntro() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Eerie, dissonant chord
      [330, 415, 494, 622].forEach(f => {
          const osc = this.ctx!.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);
          osc.frequency.linearRampToValueAtTime(f * 0.9, t + 3);
          const g = this.ctx!.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.2, t + 0.5);
          g.gain.linearRampToValueAtTime(0, t + 4);
          osc.connect(g).connect(this.out());
          osc.start(t); osc.stop(t + 4);
      });
  }

  playBossIntro(variant: Enemy['bossVariant']) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (variant === 'wisdom_warden') {
        this.playHiddenBossIntro();
        return;
    }

    if (variant === 'phantom') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 1.5);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 10;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 50;
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(t);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.5);
      gain.gain.linearRampToValueAtTime(0, t + 2);
      osc.connect(gain).connect(this.out());
      osc.start(t); osc.stop(t + 2);
    } else if (variant === 'calculus') {
      /**
       * Piedra que se agrieta, no un motor.
       *
       * Aquí había una sierra cayendo de 50 a 20 Hz: un diésel al ralentí, y sonaba a eso
       * porque el jefe era un carro de combate. Un depósito mineral no tiene motor, así que
       * la entrada son dos capas: **ruido filtrado** que abre y se cierra —el crujido de una
       * costra que cede— sobre un **golpe grave** que le da el peso de las tres mil quinientas
       * de vida que tiene.
       */
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.4);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const grind = this.ctx.createBufferSource();
      grind.buffer = buffer;
      // El filtro barre hacia abajo: lo que empieza como raspado acaba como derrumbe.
      const crackle = this.ctx.createBiquadFilter();
      crackle.type = 'bandpass';
      crackle.Q.value = 1.6;
      crackle.frequency.setValueAtTime(2600, t);
      crackle.frequency.exponentialRampToValueAtTime(320, t + 1.2);
      const grindGain = this.ctx.createGain();
      grindGain.gain.setValueAtTime(0, t);
      grindGain.gain.linearRampToValueAtTime(0.34, t + 0.18);
      grindGain.gain.exponentialRampToValueAtTime(0.01, t + 1.3);
      grind.connect(crackle).connect(grindGain).connect(this.out());
      grind.start(t);
      grind.stop(t + 1.4);

      // Y el golpe: una masa que se asienta.
      const thud = this.ctx.createOscillator();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(90, t);
      thud.frequency.exponentialRampToValueAtTime(34, t + 0.7);
      const thudGain = this.ctx.createGain();
      thudGain.gain.setValueAtTime(0.4, t);
      thudGain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      thud.connect(thudGain).connect(this.out());
      thud.start(t);
      thud.stop(t + 0.8);
    } else if (variant === 'general') {
        [440, 554, 659].forEach((f, i) => { 
            const osc = this.ctx!.createOscillator();
            osc.type = 'square';
            osc.frequency.value = f;
            const g = this.ctx!.createGain();
            g.gain.setValueAtTime(0, t + i*0.1);
            g.gain.linearRampToValueAtTime(0.1, t + i*0.1 + 0.05);
            g.gain.linearRampToValueAtTime(0, t + i*0.1 + 0.3);
            osc.connect(g).connect(this.out());
            osc.start(t + i*0.1); osc.stop(t + i*0.1 + 0.3);
        });
    } else if (variant === 'deity') {
        [55, 110, 165].forEach(f => {
            const osc = this.ctx!.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            const filter = this.ctx!.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(100, t);
            filter.frequency.linearRampToValueAtTime(1000, t + 2);
            const g = this.ctx!.createGain();
            g.gain.setValueAtTime(0, t);
            g.gain.linearRampToValueAtTime(0.2, t + 1);
            g.gain.linearRampToValueAtTime(0, t + 4);
            osc.connect(filter).connect(g).connect(this.out());
            osc.start(t); osc.stop(t + 4);
        });
    } else { // King
        const osc = this.ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.5);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
        osc.connect(gain).connect(this.out());
        osc.start(t); osc.stop(t + 0.5);
    }
  }

  playBossAttack(attack: 'shoot' | 'slam' | 'charge' | 'laser' | 'summon' | 'mortar') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.out());

    switch (attack) {
      case 'shoot':
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.1);
        osc.start(t); osc.stop(t + 0.1);
        break;
      case 'slam':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.4);
        osc.start(t); osc.stop(t + 0.4);
        break;
      case 'charge':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.3);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        osc.start(t); osc.stop(t + 0.3);
        break;
      case 'laser':
         osc.type = 'sawtooth';
         osc.frequency.setValueAtTime(500, t);
         osc.frequency.exponentialRampToValueAtTime(100, t + 0.8);
         gain.gain.setValueAtTime(0.1, t);
         gain.gain.linearRampToValueAtTime(0, t + 0.8);
         osc.start(t); osc.stop(t + 0.8);
         break;
      case 'summon':
         osc.type = 'sine';
         osc.frequency.setValueAtTime(300, t);
         osc.frequency.linearRampToValueAtTime(600, t + 0.5);
         gain.gain.setValueAtTime(0.1, t);
         gain.gain.linearRampToValueAtTime(0, t + 0.5);
         osc.start(t); osc.stop(t + 0.5);
         break;
      case 'mortar':
         osc.type = 'square';
         osc.frequency.setValueAtTime(150, t);
         osc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
         gain.gain.setValueAtTime(0.2, t);
         gain.gain.linearRampToValueAtTime(0, t + 0.3);
         osc.start(t); osc.stop(t + 0.3);
         break;
    }
  }

  playGameOver() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(10, t + 2);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0, t + 2);
    osc.connect(gain).connect(this.out());
    osc.start(t); osc.stop(t + 2);

    [300, 250, 200, 150].forEach((freq, i) => {
         const o = this.ctx!.createOscillator();
         o.type = 'triangle';
         o.frequency.value = freq;
         const g = this.ctx!.createGain();
         g.gain.setValueAtTime(0, t + i*0.4);
         g.gain.linearRampToValueAtTime(0.2, t + i*0.4 + 0.1);
         g.gain.linearRampToValueAtTime(0, t + i*0.4 + 0.8);
         o.connect(g).connect(this.out());
         o.start(t + i*0.4); o.stop(t + i*0.4 + 0.8);
    });
  }
}

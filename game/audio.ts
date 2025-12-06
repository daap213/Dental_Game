
import { WeaponType, Enemy } from '../types';

export class AudioManager {
  ctx: AudioContext | null = null;
  ambientGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setAmbientVolume(volume: number) {
    if (!this.ctx || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.ambientGain.gain.setTargetAtTime(volume, now, 0.5);
  }

  startAmbient() {
    if (!this.ctx || this.ambientGain) return;

    const masterGain = this.ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(this.ctx.destination);
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

  playWeaponSound(type: WeaponType) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.ctx.destination);

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
    }
  }

  playBossIntro(variant: Enemy['bossVariant']) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

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
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 2);
    } else if (variant === 'tank') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(50, t);
      osc.frequency.linearRampToValueAtTime(20, t + 1);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 1);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 1);
    } else if (variant === 'general') {
        [440, 554, 659].forEach((f, i) => { 
            const osc = this.ctx!.createOscillator();
            osc.type = 'square';
            osc.frequency.value = f;
            const g = this.ctx!.createGain();
            g.gain.setValueAtTime(0, t + i*0.1);
            g.gain.linearRampToValueAtTime(0.1, t + i*0.1 + 0.05);
            g.gain.linearRampToValueAtTime(0, t + i*0.1 + 0.3);
            osc.connect(g).connect(this.ctx!.destination);
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
            osc.connect(filter).connect(g).connect(this.ctx!.destination);
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
        osc.connect(gain).connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.5);
    }
  }

  playBossAttack(attack: 'shoot' | 'slam' | 'charge' | 'laser' | 'summon' | 'mortar') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain).connect(this.ctx.destination);

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
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 2);

    [300, 250, 200, 150].forEach((freq, i) => {
         const o = this.ctx!.createOscillator();
         o.type = 'triangle';
         o.frequency.value = freq;
         const g = this.ctx!.createGain();
         g.gain.setValueAtTime(0, t + i*0.4);
         g.gain.linearRampToValueAtTime(0.2, t + i*0.4 + 0.1);
         g.gain.linearRampToValueAtTime(0, t + i*0.4 + 0.8);
         o.connect(g).connect(this.ctx!.destination);
         o.start(t + i*0.4); o.stop(t + i*0.4 + 0.8);
    });
  }
}

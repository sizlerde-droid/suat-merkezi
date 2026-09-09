// Web Audio & Speech helper for seniors

class SoundManager {
  private ctx: AudioContext | null = null;
  private melodyInterval: number | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Senior-friendly tactile click sound
  playClick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // ignore
    }
  }

  // Pleasant success chime for bill paid / password saved
  playSuccess() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.1;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch {
      // ignore
    }
  }

  // Melodic audio player for Turkish songs
  playMelody(melodyKey: string, onStep?: (noteName: string) => void) {
    this.stopMelody();
    const ctx = this.getContext();
    if (!ctx) return;

    // Frequencies for iconic tunes (e.g. Nihavend, Rast, Kürdî, Yeşilçam classic themes)
    const tunes: Record<string, number[]> = {
      zeki_muren: [
        392, 440, 493.88, 523.25, 493.88, 440, 392, 440, 523.25, 493.88, 440, 392, 349.23, 392, 440, 392
      ],
      baris_manco: [
        329.63, 329.63, 392, 440, 493.88, 440, 392, 329.63, 293.66, 329.63, 392, 329.63
      ],
      neset_ertas: [
        293.66, 329.63, 349.23, 392, 440, 392, 349.23, 329.63, 293.66, 261.63, 293.66, 329.63, 293.66
      ],
      yesilcam_theme: [
        440, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 493.88, 440, 392, 440, 523.25
      ],
      fikrimin_gulu: [
        392, 440, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 392, 349.23, 392, 440
      ],
      alaturka_radio: [
        349.23, 392, 440, 466.16, 523.25, 466.16, 440, 392, 349.23, 329.63, 349.23, 392
      ],
    };

    const notes = tunes[melodyKey] || tunes.zeki_muren;
    let step = 0;

    const playNext = () => {
      if (!this.ctx) return;
      const freq = notes[step % notes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Warm, vintage acoustic sound using lowpass filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1400;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.55);

      if (onStep) {
        onStep(`Nota: ${(freq).toFixed(0)} Hz`);
      }

      step++;
    };

    playNext();
    this.melodyInterval = window.setInterval(playNext, 600);
  }

  stopMelody() {
    if (this.melodyInterval !== null) {
      clearInterval(this.melodyInterval);
      this.melodyInterval = null;
    }
  }

  // Turkish Text to Speech
  speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // cancel pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'tr-TR';
      utterance.rate = 0.88; // slightly slower and very clear for elderly listeners
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(v => v.lang.startsWith('tr') || v.lang.includes('TR'));
      if (trVoice) {
        utterance.voice = trVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch {
      // fallback safely
    }
  }

  stopSpeaking() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const sound = new SoundManager();

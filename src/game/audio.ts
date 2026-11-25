class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private volume = 0.65;

  public configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainScale = 0.25,
    freqEnd?: number,
    delay = 0
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;

    const pitchVar = 0.94 + Math.random() * 0.12;
    osc.frequency.setValueAtTime(freq * pitchVar, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd * pitchVar), now + duration);
    }

    const peak = Math.max(0.001, this.volume * gainScale);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public click(): void {
    this.playTone(540, 0.06, 'triangle', 0.12, 720);
  }

  public footstep(): void {
    this.playTone(135, 0.055, 'triangle', 0.08, 85);
  }

  public jump(): void {
    this.playTone(230, 0.16, 'sine', 0.18, 490);
  }

  public land(): void {
    this.playTone(145, 0.11, 'triangle', 0.16, 70);
  }

  public placeBlock(): void {
    this.playTone(320, 0.09, 'square', 0.1, 440);
  }

  public removeBlock(): void {
    this.playTone(290, 0.09, 'sawtooth', 0.09, 150);
  }

  public collect(): void {
    this.playTone(587.33, 0.12, 'sine', 0.2, 880, 0);
    this.playTone(880, 0.18, 'triangle', 0.18, 1174.66, 0.07);
  }

  public success(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.18, 'triangle', 0.2, undefined, idx * 0.075);
    });
  }

  public levelUp(): void {
    const notes = [440, 554.37, 659.25, 880, 1108.73];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.24, 'sine', 0.24, undefined, idx * 0.08);
    });
  }

  public error(): void {
    this.playTone(220, 0.14, 'sawtooth', 0.14, 150, 0);
    this.playTone(165, 0.18, 'sawtooth', 0.14, 120, 0.1);
  }
}

export const soundEngine = new SoundEngine();

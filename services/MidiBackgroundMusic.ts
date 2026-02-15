type NoteName =
  | 'C3'
  | 'E3'
  | 'F3'
  | 'G3'
  | 'A3'
  | 'B3'
  | 'C4'
  | 'D4'
  | 'E4'
  | 'G4'
  | 'A4';

type PatternNote = NoteName | null;

const NOTE_FREQUENCIES: Record<NoteName, number> = {
  C3: 130.81,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392,
  A4: 440,
};

const LEAD_PATTERN: PatternNote[] = [
  'E4', null, 'G4', 'A4', null, 'G4', 'E4', 'D4',
  'E4', null, 'G4', 'A4', null, 'B3', 'C4', null,
];

const BASS_PATTERN: PatternNote[] = [
  'C3', null, 'C3', null, 'A3', null, 'A3', null,
  'F3', null, 'F3', null, 'G3', null, 'G3', null,
];

export class MidiBackgroundMusic {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private intervalId: number | null = null;
  private isMuted = false;
  private currentStep = 0;
  private nextNoteTime = 0;

  private readonly bpm = 132;
  private readonly scheduleAheadTime = 0.2;
  private readonly lookAheadMs = 80;
  private readonly gainLevel = 0.08;

  public start() {
    if (typeof window === 'undefined') return;

    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    if (!this.audioContext) {
      this.audioContext = new AudioContextCtor();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.gainLevel;
      this.masterGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }

    if (this.intervalId !== null || this.isMuted) return;

    this.nextNoteTime = this.audioContext.currentTime;
    this.intervalId = window.setInterval(() => this.scheduler(), this.lookAheadMs);
  }

  public stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;

    if (!this.audioContext || !this.masterGain) return;

    this.masterGain.gain.setTargetAtTime(
      muted ? 0 : this.gainLevel,
      this.audioContext.currentTime,
      0.02,
    );

    if (muted) {
      this.stop();
      return;
    }

    this.start();
  }

  public dispose() {
    this.stop();

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
      this.masterGain = null;
    }

    this.currentStep = 0;
    this.nextNoteTime = 0;
  }

  private scheduler() {
    if (!this.audioContext) return;

    while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.playStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const secondsPerBeat = 60 / this.bpm;
    const stepDuration = secondsPerBeat / 2;
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % LEAD_PATTERN.length;
  }

  private playStep(step: number, time: number) {
    const leadNote = LEAD_PATTERN[step];
    const bassNote = BASS_PATTERN[step];

    if (leadNote) {
      this.playNote(NOTE_FREQUENCIES[leadNote], time, 0.13, 'triangle', 0.55);
    }

    if (bassNote) {
      this.playNote(NOTE_FREQUENCIES[bassNote], time, 0.18, 'square', 0.3);
    }
  }

  private playNote(frequency: number, time: number, duration: number, type: OscillatorType, velocity: number) {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    oscillator.connect(gain);
    gain.connect(this.masterGain);

    oscillator.start(time);
    oscillator.stop(time + duration + 0.03);
  }
}

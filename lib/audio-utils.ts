import { NOTE_FREQUENCIES } from "./meditation-data"

let audioContext: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export async function playNote(note: string, octave: number, duration: number = 0.8, volume: number = 0.4) {
  const ctx = getAudioContext();

  // Ensure the audio context is running, especially after a user gesture
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const frequency = NOTE_FREQUENCIES[`${note}${octave}` as keyof typeof NOTE_FREQUENCIES];
  if (!frequency) {
    console.warn(`Frequency not found for note: ${note}${octave}`);
    return;
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = 'sine'; // Sine wave for a clean tone
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Fade in and out for a smoother sound
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05); // Fade in
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration); // Fade out

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

export async function bufferToWav(audioBuffer: AudioBuffer, highCompatibility: boolean, onProgress: (progress: number) => void, isMobile: boolean): Promise<Blob> {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = highCompatibility ? (isMobile && audioBuffer.duration > 60 * 15 ? 1 : 3) : 3; // 1 for PCM, 3 for Float32
  const bitDepth = highCompatibility ? (format === 1 ? 16 : 32) : 32; // 16-bit PCM or 32-bit Float

  const headerSize = 44;
  const dataSize = audioBuffer.length * numberOfChannels * (bitDepth / 8);
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // file size
  writeString(view, 8, 'WAVE');

  // FMT sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, format, true); // audio format (1 = PCM, 3 = Float)
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * (bitDepth / 8), true); // byte rate
  view.setUint16(32, numberOfChannels * (bitDepth / 8), true); // block align
  view.setUint16(34, bitDepth, true); // bits per sample

  // DATA sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write the audio data
  const floatToSample = (val: number) => {
    if (format === 1) { // PCM
      val = Math.max(-1, Math.min(1, val));
      return val < 0 ? val * 0x8000 : val * 0x7FFF;
    } else { // Float32
      return val;
    }
  };

  const writeData = (offset: number, value: number) => {
    if (format === 1) { // PCM
      view.setInt16(offset, value, true);
    } else { // Float32
      view.setFloat32(offset, value, true);
    }
  };

  let offset = headerSize;
  const channelData = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channelData.push(audioBuffer.getChannelData(i));
  }

  const totalSamples = audioBuffer.length;
  const bytesPerSample = bitDepth / 8;

  for (let i = 0; i < totalSamples; i++) {
    if (i % (Math.floor(totalSamples / 100) + 1) === 0) { // Update progress roughly 100 times
      onProgress(i / totalSamples);
    }
    for (let channel = 0; channel < numberOfChannels; channel++) {
      writeData(offset, floatToSample(channelData[channel][i]));
      offset += bytesPerSample;
    }
  }
  onProgress(1); // Ensure 100% progress is reported

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) {
    view.setUint8(offset + i, s.charCodeAt(i));
  }
}

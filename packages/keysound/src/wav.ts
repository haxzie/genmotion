/**
 * Interleaved float samples as a WAV file.
 *
 * WAV rather than mp3 because there is no encoder here and no reason for one:
 * the file goes straight into the project's `assets/`, where ffmpeg mixes it for
 * the export, and a few seconds of keystrokes is a few hundred kilobytes. 16-bit
 * is enough for a sound whose peak sits at -1dBFS and whose quietest moment is
 * silence.
 */

const BITS = 16;
const CHANNELS = 2;

/** Rounds toward the nearest, and clamps rather than wrapping on an overshoot. */
function toPcm16(sample: number): number {
  const clamped = Math.max(-1, Math.min(1, sample));
  return Math.round(clamped * (clamped < 0 ? 0x8000 : 0x7fff));
}

export function toWav(interleaved: Float32Array, sampleRate: number): Uint8Array {
  const frames = Math.floor(interleaved.length / CHANNELS);
  const dataBytes = frames * CHANNELS * (BITS / 8);
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * CHANNELS * (BITS / 8), true);
  view.setUint16(32, CHANNELS * (BITS / 8), true);
  view.setUint16(34, BITS, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < frames * CHANNELS; i++) {
    view.setInt16(44 + i * 2, toPcm16(interleaved[i] ?? 0), true);
  }

  return new Uint8Array(buffer);
}

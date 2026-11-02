/**
 * The one audio format /api/transcribe takes: WAV, 16-bit PCM, mono, at
 * 16 kHz, Whisper's own rate. The browser records in whatever it does best
 * (WebM/Opus, MP4/AAC), decodes it, and encodes this; the server reads the
 * header, so the format is certain and the duration exact. Pure and safe in
 * both places.
 */

export const WAV_RATE = 16_000;
const BYTES_PER_SAMPLE = 2;
const HEADER_BYTES = 44;

/**
 * Mono at WAV_RATE from a decoded recording's channels at `rate`: the
 * channels averaged, then each output sample the mean of the input samples it
 * covers, which keeps speech and drops what's above 8 kHz well enough.
 */
export function toMono16k(channels: readonly Float32Array[], rate: number): Float32Array {
  const length = channels[0]?.length ?? 0;
  const ratio = rate / WAV_RATE;
  const out = new Float32Array(Math.floor(length / ratio));
  for (let index = 0; index < out.length; index++) {
    const from = Math.floor(index * ratio);
    const to = Math.max(from + 1, Math.min(length, Math.floor((index + 1) * ratio)));
    let sum = 0;
    for (const channel of channels) {
      for (let sample = from; sample < to; sample++) sum += channel[sample] ?? 0;
    }
    out[index] = sum / ((to - from) * channels.length);
  }
  return out;
}

/** A WAV file of `samples` (−1 to 1) at WAV_RATE, mono, 16-bit. */
export function encodeWav(samples: Float32Array): Uint8Array<ArrayBuffer> {
  const dataBytes = samples.length * BYTES_PER_SAMPLE;
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, WAV_RATE, true);
  view.setUint32(28, WAV_RATE * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, 8 * BYTES_PER_SAMPLE, true);
  text(36, "data");
  view.setUint32(40, dataBytes, true);
  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(HEADER_BYTES + index * BYTES_PER_SAMPLE, clipped * 0x7fff, true);
  });
  return bytes;
}

/**
 * The seconds of audio in `bytes` if it's a WAV this endpoint takes (16-bit
 * PCM, mono, WAV_RATE), or null for anything else. Chunks other than `fmt `
 * and `data` are skipped, so a WAV from elsewhere with extra chunks still
 * reads; a data chunk longer than the file counts only what's there.
 */
export function readWav(bytes: Uint8Array): { seconds: number } | null {
  if (bytes.length < HEADER_BYTES) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (text(0) !== "RIFF" || text(8) !== "WAVE") return null;
  let format = false;
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const id = text(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      if (size < 16 || body + 16 > bytes.length) return null;
      format =
        view.getUint16(body, true) === 1 &&
        view.getUint16(body + 2, true) === 1 &&
        view.getUint32(body + 4, true) === WAV_RATE &&
        view.getUint16(body + 14, true) === 8 * BYTES_PER_SAMPLE;
      if (!format) return null;
    } else if (id === "data") {
      if (!format) return null;
      const data = Math.min(size, bytes.length - body);
      return { seconds: data / (WAV_RATE * BYTES_PER_SAMPLE) };
    }
    // Chunks are padded to an even length.
    offset = body + size + (size % 2);
  }
  return null;
}

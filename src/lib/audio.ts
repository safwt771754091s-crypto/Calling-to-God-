/**
 * Per-ayah recitation. everyayah.com hosts the whole Quran as
 * SSSAAA.mp3 (zero-padded surah, zero-padded ayah). The "Alafasy_128kbps"
 * edition is widely mirrored and CORS/CDN friendly.
 */
const EDITION = "Alafasy_128kbps";
const BASE = "https://everyayah.com/data";

function pad(n: number, width: number): string {
  return n.toString().padStart(width, "0");
}

export function ayahAudioUrl(surah: number, ayah: number): string {
  return `${BASE}/${EDITION}/${pad(surah, 3)}${pad(ayah, 3)}.mp3`;
}

export const LETTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ");

export const COMBO_WINDOW_MS = 2600;
export const BITE_RADIUS = 62;

export function waveConfig(wave) {
  const w = Math.max(1, Math.floor(wave));
  return {
    wave: w,
    count: 5 + w * 2,
    spawnIntervalMs: Math.max(320, 1700 - w * 120),
    speed: 32 + (w - 1) * 7,
    maxAlive: Math.min(14, 4 + w),
  };
}

export function pickTarget(zombies, letter) {
  let target = null;
  for (const zombie of zombies) {
    if (!zombie.alive || zombie.letter !== letter) continue;
    if (!target || zombie.distance < target.distance) target = zombie;
  }
  return target;
}

export function assignLetter(usedLetters, random = Math.random) {
  const available = LETTERS.filter((letter) => !usedLetters.has(letter));
  const pool = available.length ? available : LETTERS;
  return pool[Math.floor(random() * pool.length)];
}

export function letterFromKey(key) {
  if (typeof key !== "string" || key.length !== 1) return null;
  const upper = key.toUpperCase();
  return LETTERS.includes(upper) ? upper : null;
}

export function scoreForKill(combo, wave) {
  const base = 100 + Math.max(0, combo) * 20;
  return Math.round(base * (1 + (Math.max(1, wave) - 1) * 0.05));
}

export function accuracy(hits, misses) {
  const total = hits + misses;
  return total === 0 ? 1 : hits / total;
}

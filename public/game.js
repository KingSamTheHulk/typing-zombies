import {
  BITE_RADIUS,
  COMBO_WINDOW_MS,
  accuracy,
  assignLetter,
  letterFromKey,
  pickTarget,
  scoreForKill,
  waveConfig,
} from "./engine.js";

const TAU = Math.PI * 2;
const BEST_KEY = "dead-letters-best";
const MUTE_KEY = "dead-letters-muted";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

function angleLerp(from, to, t) {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
}

function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const waveEl = document.getElementById("wave");
const bestEl = document.getElementById("best");
const accEl = document.getElementById("acc");
const killsEl = document.getElementById("kills");
const healthEl = document.getElementById("health");
const comboEl = document.getElementById("combo");
const comboCountEl = document.getElementById("comboCount");
const bannerEl = document.getElementById("banner");
const overlay = document.getElementById("overlay");
const soundBtn = document.getElementById("soundBtn");
const soundIcon = document.getElementById("soundIcon");
const startBtn = document.getElementById("startBtn");
const againBtn = document.getElementById("againBtn");
const resumeBtn = document.getElementById("resumeBtn");
const overKicker = document.getElementById("overKicker");
const overTitle = document.getElementById("overTitle");
const overSub = document.getElementById("overSub");
const overScore = document.getElementById("overScore");
const overWave = document.getElementById("overWave");
const overKills = document.getElementById("overKills");
const overAcc = document.getElementById("overAcc");
const overRecord = document.getElementById("overRecord");

let W = 0;
let H = 0;
let HORIZON = 0;
let dpr = 1;
let skyGrad = null;
let groundGrad = null;
let fogGrad = null;
let vignetteGrad = null;
let coneGrad = null;
let moonGlow = null;
const moon = { x: 0, y: 0, r: 0 };
let skyline = [];
let stars = [];
let motes = [];

const ZOMBIE_PALETTES = [
  { skin: "#a3b884", shirt: "#37432f", pants: "#262b20" },
  { skin: "#b0b792", shirt: "#483a2e", pants: "#2c2620" },
  { skin: "#93aa7c", shirt: "#2f4038", pants: "#222a24" },
  { skin: "#b7b39c", shirt: "#463245", pants: "#2a232b" },
];

const player = { x: 0, y: 0, aim: -Math.PI / 2, muzzleFlash: 0, recoil: 0 };

const game = {
  phase: "menu",
  time: 0,
  wave: 0,
  waveCfg: null,
  spawned: 0,
  spawnTimer: 0,
  clearedTimer: 0,
  waveClearing: false,
  score: 0,
  best: 0,
  health: 5,
  maxHealth: 5,
  combo: 0,
  lastKillAt: -Infinity,
  hits: 0,
  misses: 0,
  kills: 0,
  shake: 0,
  hurtFlash: 0,
  zombies: [],
  tracers: [],
  sparks: [],
  blood: [],
  shells: [],
  floaters: [],
  decals: [],
};

try {
  game.best = Number(localStorage.getItem(BEST_KEY)) || 0;
} catch {
  game.best = 0;
}

let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === "1";
} catch {
  muted = false;
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  HORIZON = H * 0.34;
  player.x = W / 2;
  player.y = H - Math.max(76, H * 0.1);
  buildSkyline();
  buildStars();
  buildMotes();
  buildGradients();
}

function buildGradients() {
  skyGrad = ctx.createLinearGradient(0, 0, 0, HORIZON);
  skyGrad.addColorStop(0, "#04070a");
  skyGrad.addColorStop(0.62, "#07100c");
  skyGrad.addColorStop(1, "#10251a");

  groundGrad = ctx.createLinearGradient(0, HORIZON, 0, H);
  groundGrad.addColorStop(0, "#0d1a12");
  groundGrad.addColorStop(0.45, "#070d09");
  groundGrad.addColorStop(1, "#030504");

  fogGrad = ctx.createLinearGradient(0, HORIZON - 50, 0, HORIZON + 150);
  fogGrad.addColorStop(0, "rgba(120, 190, 140, 0)");
  fogGrad.addColorStop(0.45, "rgba(90, 160, 110, 0.11)");
  fogGrad.addColorStop(1, "rgba(80, 150, 105, 0)");

  vignetteGrad = ctx.createRadialGradient(
    W / 2,
    H * 0.55,
    Math.min(W, H) * 0.22,
    W / 2,
    H * 0.55,
    Math.max(W, H) * 0.78,
  );
  vignetteGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignetteGrad.addColorStop(0.7, "rgba(0, 0, 0, 0.35)");
  vignetteGrad.addColorStop(1, "rgba(0, 0, 0, 0.82)");

  const coneLen = Math.min(W, H) * 0.55;
  coneGrad = ctx.createRadialGradient(0, 0, 12, 0, 0, coneLen);
  coneGrad.addColorStop(0, "rgba(190, 255, 175, 0.14)");
  coneGrad.addColorStop(0.5, "rgba(145, 225, 155, 0.05)");
  coneGrad.addColorStop(1, "rgba(120, 200, 140, 0)");

  moon.x = W * 0.8;
  moon.y = HORIZON * 0.52;
  moon.r = Math.max(22, Math.min(W, H) * 0.055);
  moonGlow = ctx.createRadialGradient(moon.x, moon.y, moon.r * 0.4, moon.x, moon.y, moon.r * 4.2);
  moonGlow.addColorStop(0, "rgba(160, 225, 175, 0.2)");
  moonGlow.addColorStop(1, "rgba(150, 220, 170, 0)");
}

function buildSkyline() {
  skyline = [];
  let x = -40;
  while (x < W + 80) {
    const cross = Math.random() < 0.28;
    const w = cross ? rand(14, 26) : rand(30, 92);
    const h = cross ? rand(28, 58) : rand(46, 158);
    skyline.push({ x, w, h, cross });
    x += w + rand(6, 34);
  }
}

function buildStars() {
  stars = Array.from({ length: 64 }, () => ({
    x: Math.random() * W,
    y: Math.random() * HORIZON * 0.92,
    r: rand(0.3, 1.4),
    p: Math.random() * TAU,
  }));
}

function buildMotes() {
  motes = Array.from({ length: 42 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: rand(0.5, 1.9),
    speed: rand(4, 16),
    drift: rand(4, 16),
    phase: Math.random() * TAU,
  }));
}

let audio = null;

function initAudio() {
  if (audio) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  const ac = new AC();
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  audio = { ac, noise: buffer };
}

function noiseBurst({ type = "lowpass", freq = 1200, q = 0.8, gain = 0.6, duration = 0.2, sweep = 0 } = {}) {
  if (!audio || muted) return;
  const { ac, noise } = audio;
  const now = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noise;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, now);
  if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(40, freq + sweep), now + duration);
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(now);
  src.stop(now + duration + 0.02);
}

function tone({ type = "sine", from = 220, to = 80, gain = 0.3, duration = 0.2, delay = 0 } = {}) {
  if (!audio || muted) return;
  const { ac } = audio;
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, from), now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

const sfxShot = () => {
  noiseBurst({ type: "lowpass", freq: 2400, gain: 0.7, duration: 0.16, sweep: -2100 });
  tone({ type: "sine", from: 132, to: 44, gain: 0.5, duration: 0.16 });
};
const sfxKill = () => {
  noiseBurst({ type: "bandpass", freq: 720, q: 1.1, gain: 0.34, duration: 0.18, sweep: -520 });
  tone({ type: "square", from: 190, to: 58, gain: 0.1, duration: 0.12 });
};
const sfxMiss = () => tone({ type: "square", from: 880, to: 680, gain: 0.05, duration: 0.04 });
const sfxHurt = () => {
  tone({ type: "sawtooth", from: 320, to: 58, gain: 0.28, duration: 0.4 });
  noiseBurst({ type: "lowpass", freq: 520, gain: 0.4, duration: 0.3 });
};
const sfxWave = () => {
  tone({ type: "triangle", from: 440, to: 440, gain: 0.11, duration: 0.14 });
  tone({ type: "triangle", from: 660, to: 660, gain: 0.11, duration: 0.16, delay: 0.13 });
};
const sfxOver = () => {
  tone({ type: "sawtooth", from: 220, to: 52, gain: 0.3, duration: 1.1 });
  tone({ type: "sine", from: 160, to: 40, gain: 0.25, duration: 1.3, delay: 0.1 });
};

function updateSoundButton() {
  soundIcon.textContent = muted ? "×" : "♪";
  soundBtn.classList.toggle("muted", muted);
  soundBtn.setAttribute("aria-pressed", String(!muted));
}

function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable */
  }
  initAudio();
  if (audio?.ac.state === "suspended") audio.ac.resume();
  updateSoundButton();
  document.activeElement?.blur?.();
}

function nearestZombie() {
  let best = null;
  for (const z of game.zombies) {
    if (!z.alive) continue;
    if (!best || z.distance < best.distance) best = z;
  }
  return best;
}

function gunOrigin() {
  return { x: player.x, y: player.y - 58 };
}

function gunMuzzle() {
  const g = gunOrigin();
  const len = 56 - player.recoil;
  return { x: g.x + Math.cos(player.aim) * len, y: g.y + Math.sin(player.aim) * len };
}

function startWave(n) {
  game.wave = n;
  game.waveCfg = waveConfig(n);
  game.spawned = 0;
  game.spawnTimer = 0.7;
  game.clearedTimer = 0;
  game.waveClearing = false;
  showBanner(`WAVE ${n}`);
  sfxWave();
  updateHUD();
}

function showBanner(text) {
  bannerEl.textContent = text;
  bannerEl.classList.remove("show");
  void bannerEl.offsetWidth;
  bannerEl.classList.add("show");
}

function spawnZombie() {
  const used = new Set();
  for (const z of game.zombies) if (z.alive) used.add(z.letter);
  const letter = assignLetter(used);
  const margin = Math.max(46, W * 0.07);
  const x = margin + Math.random() * Math.max(1, W - margin * 2);
  const y = -40;
  const speed = game.waveCfg.speed * rand(0.88, 1.16);
  game.zombies.push({
    x,
    y,
    letter,
    alive: true,
    speed,
    distance: Math.hypot(player.x - x, player.y - y),
    phase: Math.random() * TAU,
    palette: Math.floor(Math.random() * ZOMBIE_PALETTES.length),
  });
}

function updateZombie(z, dt) {
  z.phase += dt * (2 + z.speed * 0.02);
  const dx = player.x - z.x;
  const dy = player.y - z.y;
  const d = Math.hypot(dx, dy) || 1;

  let sx = 0;
  let sy = 0;
  for (const o of game.zombies) {
    if (o === z || !o.alive) continue;
    const ox = z.x - o.x;
    const oy = z.y - o.y;
    const od2 = ox * ox + oy * oy;
    if (od2 > 0.01 && od2 < 72 * 72) {
      const od = Math.sqrt(od2);
      const push = (72 - od) / 72;
      sx += (ox / od) * push;
      sy += (oy / od) * push;
    }
  }

  const ux = dx / d;
  const uy = dy / d;
  const sway = Math.sin(z.phase) * 0.45;
  const spd = z.speed;
  z.x += (ux * spd + -uy * sway * spd + sx * spd * 1.4) * dt;
  z.y += (uy * spd + ux * sway * spd + sy * spd * 1.4) * dt;
  z.x = clamp(z.x, 26, W - 26);

  z.distance = Math.hypot(player.x - z.x, player.y - z.y);
  if (z.distance < BITE_RADIUS) bite(z);
}

function bite(z) {
  if (!z.alive) return;
  z.alive = false;
  game.health = Math.max(0, game.health - 1);
  game.combo = 0;
  game.hurtFlash = 1;
  game.shake = Math.max(game.shake, 18);
  addBlood(z.x, z.y - 24, 18);
  addFloater(z.x, z.y - 72, "-1", "#ff6b7d");
  sfxHurt();
  updateHUD();
  if (game.health <= 0) endGame();
}

function fire(letter) {
  const target = pickTarget(game.zombies, letter);
  const g = gunOrigin();

  if (target) {
    player.aim = Math.atan2(target.y - 12 - g.y, target.x - g.x);
  }

  player.muzzleFlash = 1;
  player.recoil = 10;
  game.shake = Math.max(game.shake, 5);
  sfxShot();

  const muzzle = gunMuzzle();
  const reach = Math.min(W, H) * 0.62;
  const endX = target ? target.x : g.x + Math.cos(player.aim) * reach;
  const endY = target ? target.y - 12 : g.y + Math.sin(player.aim) * reach;

  addTracer(muzzle.x, muzzle.y, endX, endY);
  addSparks(muzzle.x, muzzle.y, player.aim);
  addShell(muzzle);

  if (target) {
    target.alive = false;
    game.kills += 1;
    game.hits += 1;
    game.combo += 1;
    game.lastKillAt = game.time;
    const points = scoreForKill(game.combo, game.wave);
    game.score += points;
    addBlood(target.x, target.y - 20, 16);
    addDecal(target.x, target.y);
    addFloater(target.x, target.y - 56, `+${points}`, "#b6ff8f");
    game.shake = Math.max(game.shake, 8);
    sfxKill();
    if (game.combo >= 2) {
      comboEl.classList.remove("combo");
      void comboEl.offsetWidth;
      comboEl.classList.add("combo");
    }
  } else {
    game.misses += 1;
    game.combo = 0;
    sfxMiss();
  }

  updateHUD();
}

function endGame() {
  if (game.phase === "over") return;
  game.phase = "over";
  sfxOver();

  const record = game.score > game.best;
  if (record) {
    game.best = game.score;
    try {
      localStorage.setItem(BEST_KEY, String(game.best));
    } catch {
      /* storage unavailable */
    }
  }

  overKicker.textContent = game.wave >= 8 ? "The horde overwhelmed you" : "The dead got through";
  overTitle.textContent = game.wave >= 8 ? "OVERRUN" : "YOU DIED";
  overSub.textContent = `You held out until wave ${game.wave}. The letters stopped coming.`;
  overScore.textContent = game.score.toLocaleString();
  overWave.textContent = String(game.wave);
  overKills.textContent = String(game.kills);
  overAcc.textContent = `${Math.round(accuracy(game.hits, game.misses) * 100)}%`;
  overRecord.textContent = record ? "★ NEW BEST SCORE" : `BEST ${game.best.toLocaleString()}`;
  updateHUD();
  showOverlay("over");
}

function onWaveCleared() {
  const bonus = 100 * game.wave;
  game.score += bonus;
  game.health = Math.min(game.maxHealth, game.health + 1);
  addFloater(W / 2, H * 0.42, `WAVE CLEAR  +${bonus}`, "#b6ff8f");
  addFloater(W / 2, H * 0.42 + 28, "+1 HEALTH", "#ff8a9a");
  updateHUD();
}

function updateGame(dt) {
  game.time += dt;
  const cfg = game.waveCfg;

  const near = nearestZombie();
  if (near) {
    const g = gunOrigin();
    const want = Math.atan2(near.y - 12 - g.y, near.x - g.x);
    player.aim = angleLerp(player.aim, want, 1 - Math.exp(-dt * 7));
  }

  if (game.spawned < cfg.count) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0 && game.zombies.length < cfg.maxAlive) {
      spawnZombie();
      game.spawned += 1;
      game.spawnTimer = cfg.spawnIntervalMs / 1000;
    }
  }

  for (const z of game.zombies) {
    if (!z.alive) continue;
    updateZombie(z, dt);
    if (game.phase !== "playing") break;
  }
  game.zombies = game.zombies.filter((z) => z.alive);

  if (game.phase !== "playing") return;

  if (game.combo > 0 && (game.time - game.lastKillAt) * 1000 > COMBO_WINDOW_MS) {
    game.combo = 0;
    updateHUD();
  }

  if (game.spawned >= cfg.count && game.zombies.length === 0) {
    if (!game.waveClearing) {
      game.waveClearing = true;
      game.clearedTimer = 1.6;
      onWaveCleared();
    }
    game.clearedTimer -= dt;
    if (game.clearedTimer <= 0) startWave(game.wave + 1);
  }
}

function addTracer(x1, y1, x2, y2) {
  game.tracers.push({ x1, y1, x2, y2, life: 0.12, max: 0.12 });
}

function addSparks(x, y, aim) {
  for (let i = 0; i < 10; i += 1) {
    const a = aim + rand(-0.55, 0.55);
    const sp = rand(160, 680);
    const life = rand(0.14, 0.4);
    game.sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life,
      max: life,
      size: rand(1, 2.7),
    });
  }
}

function addShell(m) {
  const a = player.aim + Math.PI / 2 + rand(-0.2, 0.2);
  game.shells.push({
    x: m.x,
    y: m.y,
    vx: Math.cos(a) * rand(80, 170),
    vy: Math.sin(a) * rand(80, 170) - 130,
    rot: rand(0, TAU),
    spin: rand(-22, 22),
    life: 1.2,
  });
}

function addBlood(x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * TAU;
    const sp = rand(50, 380);
    const life = rand(0.4, 0.95);
    game.blood.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - rand(40, 180),
      life,
      max: life,
      size: rand(1.5, 4),
    });
  }
}

function addDecal(x, y) {
  game.decals.push({
    x: x + rand(-4, 4),
    y: y + rand(-2, 12),
    rx: rand(8, 22),
    ry: rand(3, 8),
    life: rand(4, 8),
    max: 8,
  });
  if (game.decals.length > 42) game.decals.shift();
}

function addFloater(x, y, text, color) {
  game.floaters.push({ x, y, text, color, life: 1.15, max: 1.15 });
}

function updateEffects(dt) {
  for (const p of game.tracers) p.life -= dt;
  game.tracers = game.tracers.filter((p) => p.life > 0);

  for (const p of game.sparks) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 2 * dt;
    p.vy *= 1 - 2 * dt;
  }
  game.sparks = game.sparks.filter((p) => p.life > 0);

  for (const p of game.blood) {
    p.life -= dt;
    p.vy += 920 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  game.blood = game.blood.filter((p) => p.life > 0);

  for (const s of game.shells) {
    s.life -= dt;
    s.vy += 1300 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.rot += s.spin * dt;
  }
  game.shells = game.shells.filter((s) => s.life > 0);

  for (const f of game.floaters) {
    f.life -= dt;
    f.y -= 42 * dt;
  }
  game.floaters = game.floaters.filter((f) => f.life > 0);

  for (const d of game.decals) d.life -= dt;
  game.decals = game.decals.filter((d) => d.life > 0);

  game.shake = Math.max(0, game.shake - dt * 46);
  game.hurtFlash = Math.max(0, game.hurtFlash - dt * 1.6);
  player.muzzleFlash = Math.max(0, player.muzzleFlash - dt * 12);
  player.recoil = Math.max(0, player.recoil - dt * 70);
}

function draw(t) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const shakeX = game.shake > 0 ? rand(-game.shake, game.shake) : 0;
  const shakeY = game.shake > 0 ? rand(-game.shake, game.shake) : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(t);
  drawMotes(t);
  drawDecals();
  drawFlashlight();

  const list = game.zombies.filter((z) => z.alive).sort((a, b) => a.y - b.y);
  for (const z of list) drawZombie(z, t);

  drawPlayer(t);
  drawTracers();
  drawSparks();
  drawBlood();
  drawShells();
  drawFloaters();

  ctx.restore();

  drawHurtFlash();
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(0, 0, W, H);
}

function drawBackground(t) {
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, HORIZON + 2);

  for (const s of stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.8 + s.p));
    ctx.fillStyle = `rgba(205, 232, 205, ${0.2 + 0.4 * tw})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.fill();
  }

  ctx.fillStyle = moonGlow;
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r * 4.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(212, 236, 204, 0.92)";
  ctx.beginPath();
  ctx.arc(moon.x, moon.y, moon.r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(120, 148, 118, 0.35)";
  ctx.beginPath();
  ctx.arc(moon.x - moon.r * 0.3, moon.y - moon.r * 0.22, moon.r * 0.22, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moon.x + moon.r * 0.26, moon.y + moon.r * 0.16, moon.r * 0.16, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(moon.x + moon.r * 0.04, moon.y - moon.r * 0.46, moon.r * 0.1, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#040805";
  for (const s of skyline) {
    const baseY = HORIZON + 2;
    const cx = s.x + s.w / 2;
    if (s.cross) {
      ctx.fillRect(cx - 3, baseY - s.h, 6, s.h);
      ctx.fillRect(cx - s.w / 2, baseY - s.h + 11, s.w, 6);
    } else {
      ctx.fillRect(cx - 3, baseY - s.h * 0.5, 6, s.h * 0.5);
      for (let i = 0; i < 3; i += 1) {
        const fw = s.w * (1 - i * 0.24);
        const fy = baseY - s.h * (0.4 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(cx, fy - s.h * 0.34);
        ctx.lineTo(cx - fw / 2, fy);
        ctx.lineTo(cx + fw / 2, fy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, HORIZON, W, H - HORIZON + 2);

  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, HORIZON - 50, W, 200);

  ctx.strokeStyle = "rgba(120, 185, 135, 0.05)";
  ctx.lineWidth = 1;
  const rows = 7;
  for (let i = 1; i <= rows; i += 1) {
    const y = HORIZON + (H - HORIZON) * Math.pow(i / rows, 1.8);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = -7; i <= 7; i += 1) {
    ctx.moveTo(W / 2 + i * 14, HORIZON);
    ctx.lineTo(W / 2 + i * W * 0.13, H + 20);
  }
  ctx.stroke();
}

function drawMotes(t) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const m of motes) {
    const y = (((m.y - t * m.speed) % H) + H) % H;
    const x = m.x + Math.sin(t * 0.5 + m.phase) * m.drift;
    const a = 0.12 + 0.16 * Math.abs(Math.sin(t * 1.6 + m.phase));
    ctx.fillStyle = `rgba(150, 255, 140, ${a})`;
    ctx.beginPath();
    ctx.arc(x, y, m.r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawDecals() {
  for (const d of game.decals) {
    const a = clamp(d.life / d.max, 0, 1) * 0.5;
    ctx.fillStyle = `rgba(86, 12, 20, ${a})`;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFlashlight() {
  const g = gunOrigin();
  const len = Math.min(W, H) * 0.55;
  const spread = 0.34;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(player.aim);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, -Math.sin(spread) * len);
  ctx.lineTo(len, Math.sin(spread) * len);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawZombie(z, t) {
  const depth = clamp((z.y + 40) / (player.y + 40), 0, 1);
  const scale = 0.52 + depth * 0.98;
  const pal = ZOMBIE_PALETTES[z.palette % ZOMBIE_PALETTES.length];
  const bob = Math.sin(z.phase * 2) * 1.5 * scale;
  const swing = Math.sin(z.phase * 2);

  ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
  ctx.beginPath();
  ctx.ellipse(z.x, z.y + 2, 20 * scale, 6 * scale, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(z.x, z.y + bob);
  ctx.scale(scale, scale);

  ctx.fillStyle = pal.pants;
  roundRect(-10 + swing * 1.5, -18, 8, 19, 3);
  ctx.fill();
  roundRect(2 - swing * 1.5, -18, 8, 19, 3);
  ctx.fill();

  ctx.fillStyle = "#14140f";
  ctx.beginPath();
  ctx.ellipse(-6 + swing * 1.5, 0, 6.5, 3, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6 - swing * 1.5, 0, 6.5, 3, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = pal.shirt;
  roundRect(-14, -40, 28, 27, 8);
  ctx.fill();
  for (let i = -13; i <= 9; i += 7) {
    ctx.beginPath();
    ctx.moveTo(i, -15);
    ctx.lineTo(i + 3.5, -8);
    ctx.lineTo(i + 7, -15);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(96, 18, 26, 0.5)";
  ctx.beginPath();
  ctx.ellipse(5, -31, 5, 4, 0.5, 0, TAU);
  ctx.fill();

  const armSwing = Math.sin(z.phase * 2 + Math.PI / 2) * 2.5;
  ctx.strokeStyle = pal.skin;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-12, -36);
  ctx.lineTo(-24, -23 - armSwing);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, -36);
  ctx.lineTo(24, -23 + armSwing);
  ctx.stroke();
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(-24, -23 - armSwing, 4.6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(24, -23 + armSwing, 4.6, 0, TAU);
  ctx.fill();

  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.arc(0, -50, 12.5, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "rgba(20, 30, 18, 0.25)";
  ctx.beginPath();
  ctx.ellipse(0, -44, 8, 5, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#151c13";
  ctx.beginPath();
  ctx.ellipse(-4.6, -52, 3.2, 3.8, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(4.6, -52, 3.2, 3.8, 0, 0, TAU);
  ctx.fill();

  const glow = 0.6 + 0.4 * Math.sin(t * 6 + z.phase);
  ctx.shadowColor = "rgba(255, 60, 50, 0.95)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = `rgba(255, 68, 58, ${0.7 + 0.3 * glow})`;
  ctx.beginPath();
  ctx.arc(-4.6, -52, 1.7, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4.6, -52, 1.7, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#241017";
  roundRect(-4.5, -45.5, 9, 3, 1.2);
  ctx.fill();

  ctx.restore();

  drawLetterBadge(z, scale, bob, depth, t);
}

function drawLetterBadge(z, scale, bob, depth, t) {
  const r = clamp(13 * scale, 13, 22);
  const cy = z.y + bob - 62.5 * scale - r - 4;
  const threat = depth;
  const pulse = threat > 0.55 ? 0.7 + 0.3 * Math.sin(t * 10) : 1;
  const color =
    threat > 0.55
      ? `rgba(255, ${Math.round(95 - (threat - 0.55) * 130)}, 70, ${pulse})`
      : "rgba(150, 255, 150, 0.95)";

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = threat > 0.55 ? 18 : 10;
  ctx.fillStyle = "rgba(5, 11, 8, 0.92)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(z.x, cy, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(r * 1.15)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(z.letter, z.x, cy + 1);
  ctx.restore();
}

function drawPlayer(t) {
  const x = player.x;
  const y = player.y;
  const breathe = Math.sin(t * 2) * 0.6;

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  ctx.ellipse(x, y, 36, 12, 0, 0, TAU);
  ctx.fill();

  ctx.translate(0, breathe);

  ctx.fillStyle = "#18212c";
  roundRect(x - 17, y - 30, 13, 31, 6);
  ctx.fill();
  roundRect(x + 4, y - 30, 13, 31, 6);
  ctx.fill();

  ctx.fillStyle = "#0e1319";
  roundRect(x - 19, y - 6, 16, 8, 4);
  ctx.fill();
  roundRect(x + 3, y - 6, 16, 8, 4);
  ctx.fill();

  ctx.fillStyle = "#222d3d";
  roundRect(x - 23, y - 70, 46, 44, 13);
  ctx.fill();

  ctx.fillStyle = "#2b384a";
  roundRect(x - 27, y - 72, 54, 17, 9);
  ctx.fill();

  ctx.fillStyle = "#3a2e22";
  roundRect(x - 15, y - 66, 30, 27, 8);
  ctx.fill();
  ctx.strokeStyle = "#251d14";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 57);
  ctx.lineTo(x + 15, y - 57);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 49);
  ctx.lineTo(x + 15, y - 49);
  ctx.stroke();

  ctx.fillStyle = "#2a374b";
  ctx.beginPath();
  ctx.arc(x, y - 82, 14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#161d27";
  ctx.beginPath();
  ctx.arc(x, y - 84, 14, Math.PI, TAU);
  ctx.fill();
  ctx.restore();

  const g = gunOrigin();
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.rotate(player.aim);
  ctx.translate(-player.recoil, 0);

  ctx.strokeStyle = "#2b384a";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-4, 4);
  ctx.lineTo(16, 2);
  ctx.stroke();

  ctx.fillStyle = "#3a2a1a";
  roundRect(-18, -4, 22, 8, 3);
  ctx.fill();
  ctx.fillStyle = "#232a2c";
  roundRect(0, -5, 24, 10, 2);
  ctx.fill();
  ctx.fillStyle = "#151a1c";
  ctx.fillRect(22, -2.5, 38, 5);
  ctx.fillStyle = "#3c4243";
  roundRect(28, -6, 13, 12, 3);
  ctx.fill();
  ctx.fillStyle = "#0d1112";
  ctx.fillRect(56, -4, 3, 8);
  ctx.restore();

  if (player.muzzleFlash > 0) drawMuzzleFlash();
}

function drawMuzzleFlash() {
  const f = player.muzzleFlash;
  const m = gunMuzzle();
  const radius = 30 * f + 8;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, radius);
  grad.addColorStop(0, `rgba(255, 255, 224, ${0.95 * f})`);
  grad.addColorStop(0.4, `rgba(255, 196, 96, ${0.7 * f})`);
  grad.addColorStop(1, "rgba(255, 120, 40, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(m.x, m.y, radius, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 242, 186, ${0.85 * f})`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i += 1) {
    const a = player.aim + (i / 6) * TAU + 0.3;
    ctx.beginPath();
    ctx.moveTo(m.x, m.y);
    ctx.lineTo(m.x + Math.cos(a) * radius * 0.95, m.y + Math.sin(a) * radius * 0.95);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTracers() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const tr of game.tracers) {
    const a = clamp(tr.life / tr.max, 0, 1);
    ctx.strokeStyle = `rgba(150, 255, 140, ${0.32 * a})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(tr.x1, tr.y1);
    ctx.lineTo(tr.x2, tr.y2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 232, 160, ${0.75 * a})`;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "rgba(255, 210, 110, 0.9)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(tr.x1, tr.y1);
    ctx.lineTo(tr.x2, tr.y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawSparks() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of game.sparks) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = `rgba(255, 220, 145, ${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawBlood() {
  for (const p of game.blood) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = `rgba(${Math.round(150 + 40 * a)}, 18, 28, ${0.85 * a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, TAU);
    ctx.fill();
  }
}

function drawShells() {
  for (const s of game.shells) {
    const a = clamp(s.life / 1.2, 0, 1);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fillStyle = `rgba(222, 182, 92, ${a})`;
    ctx.fillRect(-2.5, -1.2, 5, 2.4);
    ctx.restore();
  }
}

function drawFloaters() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  for (const f of game.floaters) {
    const a = clamp(f.life / f.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = f.color;
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
}

function drawHurtFlash() {
  if (game.hurtFlash <= 0) return;
  const a = game.hurtFlash;
  const grad = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.2,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.72,
  );
  grad.addColorStop(0, "rgba(190, 0, 24, 0)");
  grad.addColorStop(1, `rgba(190, 0, 24, ${0.55 * a})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function renderHealth() {
  const total = game.maxHealth;
  const filled = game.health;
  let html = "";
  for (let i = 0; i < total; i += 1) {
    html += `<span class="heart${i < filled ? "" : " empty"}"></span>`;
  }
  healthEl.innerHTML = html;
}

function updateHUD() {
  scoreEl.textContent = game.score.toLocaleString();
  waveEl.textContent = String(game.wave);
  bestEl.textContent = Math.max(game.best, game.score).toLocaleString();
  killsEl.textContent = String(game.kills);
  accEl.textContent = `${Math.round(accuracy(game.hits, game.misses) * 100)}%`;
  comboEl.hidden = game.combo < 2;
  if (game.combo >= 2) comboCountEl.textContent = String(game.combo);
  renderHealth();
}

function showOverlay(view) {
  overlay.hidden = false;
  for (const section of overlay.querySelectorAll("[data-view]")) {
    section.hidden = section.dataset.view !== view;
  }
}

function startGame() {
  initAudio();
  if (audio?.ac.state === "suspended") audio.ac.resume();

  game.phase = "playing";
  game.time = 0;
  game.score = 0;
  game.wave = 0;
  game.waveCfg = null;
  game.spawned = 0;
  game.spawnTimer = 0;
  game.clearedTimer = 0;
  game.waveClearing = false;
  game.health = game.maxHealth;
  game.combo = 0;
  game.lastKillAt = -Infinity;
  game.hits = 0;
  game.misses = 0;
  game.kills = 0;
  game.shake = 0;
  game.hurtFlash = 0;
  game.zombies = [];
  game.tracers = [];
  game.sparks = [];
  game.blood = [];
  game.shells = [];
  game.floaters = [];
  game.decals = [];

  player.aim = -Math.PI / 2;
  player.muzzleFlash = 0;
  player.recoil = 0;

  overlay.hidden = true;
  document.activeElement?.blur?.();

  updateHUD();
  startWave(1);
  last = performance.now();
}

function togglePause() {
  if (game.phase === "playing") {
    game.phase = "paused";
    showOverlay("pause");
  } else if (game.phase === "paused") {
    game.phase = "playing";
    overlay.hidden = true;
    document.activeElement?.blur?.();
    last = performance.now();
  }
}

function onKeyDown(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

  if (event.key === "Escape") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (game.phase === "menu") {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startGame();
    }
    return;
  }

  if (game.phase === "over") {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      startGame();
    }
    return;
  }

  if (game.phase === "paused") {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      togglePause();
    }
    return;
  }

  if (event.repeat) return;
  const letter = letterFromKey(event.key);
  if (!letter) return;
  event.preventDefault();
  fire(letter);
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (game.phase === "playing") updateGame(dt);
  if (game.phase === "playing" || game.phase === "over") updateEffects(dt);

  draw(t);
  requestAnimationFrame(frame);
}

let last = performance.now();

window.addEventListener("resize", resize);
window.addEventListener("keydown", onKeyDown);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.phase === "playing") togglePause();
});

startBtn.addEventListener("click", startGame);
againBtn.addEventListener("click", startGame);
resumeBtn.addEventListener("click", togglePause);
soundBtn.addEventListener("click", toggleMute);

resize();
updateSoundButton();
updateHUD();
showOverlay("start");
requestAnimationFrame(frame);

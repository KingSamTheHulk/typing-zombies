import test from "node:test";
import assert from "node:assert/strict";
import {
  LETTERS,
  assignLetter,
  accuracy,
  letterFromKey,
  pickTarget,
  scoreForKill,
  waveConfig,
} from "../public/engine.js";

test("waveConfig scales up and stays bounded", () => {
  const first = waveConfig(1);
  const later = waveConfig(9);
  assert.equal(first.wave, 1);
  assert.ok(later.count > first.count);
  assert.ok(later.speed > first.speed);
  assert.ok(later.spawnIntervalMs < first.spawnIntervalMs);
  assert.ok(later.maxAlive <= 14);
  assert.ok(waveConfig(40).spawnIntervalMs >= 320);
});

test("letterFromKey only accepts single letters", () => {
  assert.equal(letterFromKey("a"), "A");
  assert.equal(letterFromKey("Z"), "Z");
  assert.equal(letterFromKey("Enter"), null);
  assert.equal(letterFromKey("1"), null);
  assert.equal(letterFromKey("Shift"), null);
  assert.equal(letterFromKey(""), null);
});

test("pickTarget chooses the closest living zombie with the letter", () => {
  const zombies = [
    { letter: "A", alive: true, distance: 300 },
    { letter: "B", alive: true, distance: 120 },
    { letter: "A", alive: true, distance: 40 },
    { letter: "A", alive: false, distance: 10 },
  ];
  assert.equal(pickTarget(zombies, "A")?.distance, 40);
  assert.equal(pickTarget(zombies, "C"), null);
});

test("assignLetter avoids letters already on screen", () => {
  const used = new Set(LETTERS.slice(0, 25));
  assert.equal(assignLetter(used), "Z");
});

test("assignLetter falls back to the full alphabet when tapped out", () => {
  const used = new Set(LETTERS);
  const letter = assignLetter(used, () => 0);
  assert.equal(letter, "A");
});

test("scoreForKill rewards combo and later waves", () => {
  assert.ok(scoreForKill(1, 1) > 0);
  assert.ok(scoreForKill(5, 1) > scoreForKill(1, 1));
  assert.ok(scoreForKill(1, 5) > scoreForKill(1, 1));
});

test("accuracy handles empty and mixed histories", () => {
  assert.equal(accuracy(0, 0), 1);
  assert.equal(accuracy(3, 1), 0.75);
});

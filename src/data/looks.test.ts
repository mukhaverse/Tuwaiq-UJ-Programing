// Rules for what a member's look may change. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { palette } from "../lib/palette.js";
import { COLOURS, allowedChanges, checkLook, cleanWear, sameLook, shapesFor, type LookMember } from "./looks.ts";

const base: LookMember = { role: "member", badges: 2, accessories: [], current: { char: "blob", body: "butter", wear: [] } };

test("colours are every palette key but ink", () => {
  assert.deepEqual([...COLOURS].sort(), Object.keys(palette).filter((k) => k !== "ink").sort());
});

test("tiers", () => {
  assert.equal(allowedChanges(0), "none");
  assert.equal(allowedChanges(1), "shape");
  assert.equal(allowedChanges(5), "all");
});

test("reserved shapes", () => {
  assert.ok(shapesFor("leader").includes("sun"));
  assert.ok(!shapesFor("leader").includes("planet"));
  assert.ok(!shapesFor("member").includes("sun"));
  assert.ok(shapesFor("co-leader").includes("planet"));
});

test("0 badges can't change anything", () => {
  assert.equal(checkLook({ ...base, badges: 0 }, { char: "cat", body: "butter", wear: [] }), "Earn a badge first to change this character.");
});

test("1 badge: shape ok", () => {
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "butter", wear: [] }), null);
});

test("1 badge: colour refused", () => {
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "mint", wear: [] }), "With one badge, only the shape can change.");
});

test("1 badge: accessory refused", () => {
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "blob", body: "butter", wear: ["cap"] }), "With one badge, only the shape can change.");
});

test("2 badges: starter ok", () => {
  assert.equal(checkLook(base, { char: "cat", body: "mint", wear: ["cap", "shades"] }), null);
});

test("extra needs the award", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["push-cap"] }), "They don't have that accessory yet.");
  assert.equal(checkLook({ ...base, accessories: ["push-cap"] }, { ...base.current, wear: ["push-cap"] }), null);
});

test("one per slot", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["cap", "beanie"] }), "Only one accessory per spot.");
});

test("unknowns", () => {
  assert.equal(checkLook(base, { ...base.current, char: "dragon" }), "Unknown shape.");
  assert.equal(checkLook(base, { ...base.current, body: "ink" }), "Unknown colour.");
  assert.equal(checkLook(base, { ...base.current, wear: ["jetpack"] }), "Unknown accessory.");
});

test("reserved shape for a member", () => {
  assert.equal(checkLook(base, { ...base.current, char: "sun" }), "That shape is only for the leader.");
});

test("cleanWear drops unknown, unawarded and duplicates", () => {
  assert.deepEqual(cleanWear(["jetpack", "push-cap", "cap", "beanie"], []), ["cap"]);
});

test("cleanWear tolerates junk", () => {
  assert.deepEqual(cleanWear("nope", []), []);
});

test("sameLook ignores wear order", () => {
  assert.ok(sameLook({ char: "a", body: "b", wear: ["cap", "shades"] }, { char: "a", body: "b", wear: ["shades", "cap"] }));
});

test("1 badge: keeps a starter accessory they already wear while changing shape", () => {
  const wearing = { ...base, badges: 1, current: { char: "blob", body: "butter", wear: ["cap"] } };
  assert.equal(checkLook(wearing, { char: "cat", body: "butter", wear: ["cap"] }), null);
});

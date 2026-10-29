// Rules for what a member's look may change. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { palette } from "../lib/palette.js";
import { COLOURS, allowedChanges, canWear, checkLook, cleanWear, sameLook, shapesFor, type LookMember } from "./looks.ts";

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
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "mint", wear: [] }), "With one badge, only the shape and hat can change.");
});

test("1 badge: a hat ok, with a new shape too", () => {
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "blob", body: "butter", wear: ["crown"] }), null);
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "butter", wear: ["gradcap"] }), null);
});

test("1 badge: other accessories refused", () => {
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "blob", body: "butter", wear: ["shades"] }), "With one badge, only the shape and hat can change.");
  assert.equal(checkLook({ ...base, badges: 1 }, { char: "blob", body: "butter", wear: ["crown", "smile"] }), "With one badge, only the shape and hat can change.");
});

test("1 badge: swapping a hat keeps what else they already wear", () => {
  const wearing = { ...base, badges: 1, current: { char: "blob", body: "butter", wear: ["crown", "shades"] } };
  assert.equal(checkLook(wearing, { char: "blob", body: "butter", wear: ["sprout", "shades"] }), null);
  assert.equal(checkLook(wearing, { char: "blob", body: "butter", wear: ["sprout"] }), "With one badge, only the shape and hat can change.");
});

test("hats unlock at 1 badge, the rest at 2", () => {
  assert.ok(canWear({ badges: 1, accessories: [] }, "crown"));
  assert.ok(!canWear({ badges: 0, accessories: [] }, "crown"));
  assert.ok(!canWear({ badges: 1, accessories: [] }, "glasses"));
  assert.ok(canWear({ badges: 2, accessories: [] }, "glasses"));
});

test("2 badges: starter ok", () => {
  assert.equal(checkLook(base, { char: "cat", body: "mint", wear: ["crown", "shades"] }), null);
});

test("extra needs the award", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["push-cap"] }), "They don't have that accessory yet.");
  assert.equal(checkLook({ ...base, accessories: ["push-cap"] }, { ...base.current, wear: ["push-cap"] }), null);
});

test("one per slot", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["crown", "gradcap"] }), "Only one accessory per spot.");
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
  assert.deepEqual(cleanWear(["jetpack", "push-cap", "crown", "gradcap", "cap"], []), ["crown"]);
});

test("cleanWear tolerates junk", () => {
  assert.deepEqual(cleanWear("nope", []), []);
});

test("sameLook ignores wear order", () => {
  assert.ok(sameLook({ char: "a", body: "b", wear: ["crown", "shades"] }, { char: "a", body: "b", wear: ["shades", "crown"] }));
});

test("1 badge: keeps a starter accessory they already wear while changing shape", () => {
  const wearing = { ...base, badges: 1, current: { char: "blob", body: "butter", wear: ["crown"] } };
  assert.equal(checkLook(wearing, { char: "cat", body: "butter", wear: ["crown"] }), null);
});

test("graduation cap is a starter, the beanie is gone", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["gradcap"] }), null);
  assert.equal(checkLook(base, { ...base.current, wear: ["beanie"] }), "Unknown accessory.");
});

test("mustache and mouth have their own spots", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["glasses", "mustache", "fangs"] }), null);
  assert.equal(checkLook(base, { ...base.current, wear: ["smile", "fang"] }), "Only one accessory per spot.");
});

test("cap, bow, scarf and bow tie are gone", () => {
  for (const id of ["cap", "bow", "scarf", "bowtie"]) assert.equal(checkLook(base, { ...base.current, wear: [id] }), "Unknown accessory.");
});

test("the baby stroller is only for whoever it's given to", () => {
  assert.equal(checkLook(base, { ...base.current, wear: ["stroller"] }), "They don't have that accessory yet.");
  assert.equal(checkLook({ ...base, accessories: ["stroller"] }, { ...base.current, wear: ["crown", "stroller"] }), null);
});

// Rules for who can be which committee character. Run with `npm test`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMITTEES, COMMITTEE_NAMES, CREW_SETS, canBeCharacter, setsFor } from "./crew.ts";

test("every committee has a name and at least one set", () => {
  for (const c of COMMITTEES) {
    assert.ok(COMMITTEE_NAMES[c]);
    assert.ok(setsFor(c).length > 0);
  }
});

test("a character id is only used once", () => {
  const ids = CREW_SETS.flatMap((s) => s.characters.map((c) => c.id));
  assert.equal(new Set(ids).size, ids.length);
});

test("operations can use both of its sets", () => {
  assert.ok(canBeCharacter("operations", "tent"));
  assert.ok(canBeCharacter("operations", "gear"));
});

test("a committee can't use another committee's characters", () => {
  assert.ok(!canBeCharacter("operations", "camera"));
  assert.ok(!canBeCharacter("media", "tent"));
});

test("unknown characters are refused", () => {
  assert.ok(!canBeCharacter("media", "blob"));
});
